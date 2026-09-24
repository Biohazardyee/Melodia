import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { PrismaDb } from '../../config/database.js';
import { BadRequest, Forbidden, InternalError, Unauthorized } from '../../utils/errors.js';
import {
    SpotifyAlbumRef,
    SpotifyNowPlaying,
    SpotifyPlaylistAlbumsResult,
    SpotifyPlaylistSummary,
    SpotifyProfile,
    SpotifyStatusDto,
    SpotifyTokenResponse,
    SpotifyTrackSummary,
} from '../../types/spotify/spotify.dto.js';

dotenv.config();

const CLIENT_ID: string | undefined = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET: string | undefined = process.env.SPOTIFY_CLIENT_SECRET;
const CALLBACK_URL: string | undefined = process.env.SPOTIFY_CALLBACK_URL;
const SCOPES = 'user-read-email user-read-private playlist-read-private playlist-read-collaborative user-read-currently-playing streaming user-read-playback-state user-modify-playback-state';

// Scopes required for Listening Rooms (Web Playback SDK). Accounts linked before
// these scopes existed have `scope: null` and are flagged via needs_relink.
const ROOM_REQUIRED_SCOPES = ['streaming', 'user-read-playback-state', 'user-modify-playback-state'];

const MAX_PLAYLISTS_PAGES = 5; // 5 * 50 = 250 playlists max
const MAX_TRACKS_PAGES = 5; // 5 * 100 = 500 tracks max par playlist

export class SpotifyService {

    buildAuthorizeUrl(userId: string): string {
        if (!CLIENT_ID || !CALLBACK_URL) {
            throw new InternalError('Spotify integration is not configured');
        }

        const secret: string | undefined = process.env.JWT_SECRET;
        if (!secret) {
            throw new InternalError('Server configuration error');
        }

        const state: string = jwt.sign({ user_id: userId }, secret, { expiresIn: '10m' });

        const params = new URLSearchParams({
            response_type: 'code',
            client_id: CLIENT_ID,
            scope: SCOPES,
            redirect_uri: CALLBACK_URL,
            state,
            show_dialog: 'true',
        });

        return `https://accounts.spotify.com/authorize?${params.toString()}`;
    }

    verifyState(state: string): string {
        const secret: string | undefined = process.env.JWT_SECRET;
        if (!secret) {
            throw new InternalError('Server configuration error');
        }

        try {
            const decoded: any = jwt.verify(state, secret);
            return decoded.user_id;
        } catch (err) {
            throw new Unauthorized('Invalid or expired Spotify link request');
        }
    }

    private async requestToken(body: Record<string, string>, errorFallback: string): Promise<SpotifyTokenResponse> {
        const basicAuth: string = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');

        const tokenResponse: Response = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: `Basic ${basicAuth}`,
            },
            body: new URLSearchParams(body),
        });

        const tokenData: SpotifyTokenResponse = await tokenResponse.json();

        if (!tokenResponse.ok || tokenData.error) {
            throw new BadRequest(tokenData.error_description || errorFallback);
        }

        return tokenData;
    }

    async exchangeCodeAndLink(userId: string, code: string): Promise<void> {
        if (!CLIENT_ID || !CLIENT_SECRET || !CALLBACK_URL) {
            throw new InternalError('Spotify integration is not configured');
        }

        const tokenData: SpotifyTokenResponse = await this.requestToken({
            grant_type: 'authorization_code',
            code,
            redirect_uri: CALLBACK_URL,
        }, 'Failed to exchange Spotify authorization code');

        const profileResponse: Response = await fetch('https://api.spotify.com/v1/me', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const profile: SpotifyProfile = await profileResponse.json();

        if (!profileResponse.ok || !profile.id) {
            throw new BadRequest('Failed to fetch Spotify profile');
        }

        if (!tokenData.refresh_token) {
            throw new BadRequest('Spotify did not return a refresh token');
        }

        console.log(`✅ Spotify linked for user ${userId} — granted scope: "${tokenData.scope}" (requested: "${SCOPES}")`);

        await PrismaDb.spotifyAccounts.upsert({
            where: { user_id: userId },
            update: {
                spotify_id: profile.id,
                display_name: profile.display_name,
                access_token: tokenData.access_token,
                refresh_token: tokenData.refresh_token,
                expires_at: new Date(Date.now() + tokenData.expires_in * 1000),
                product: profile.product ?? null,
                scope: tokenData.scope ?? null,
                country: profile.country ?? null,
            },
            create: {
                user_id: userId,
                spotify_id: profile.id,
                display_name: profile.display_name,
                access_token: tokenData.access_token,
                refresh_token: tokenData.refresh_token,
                expires_at: new Date(Date.now() + tokenData.expires_in * 1000),
                product: profile.product ?? null,
                scope: tokenData.scope ?? null,
                country: profile.country ?? null,
            },
        });
    }

    async getStatus(userId: string): Promise<SpotifyStatusDto> {
        const account = await PrismaDb.spotifyAccounts.findUnique({ where: { user_id: userId } });

        if (!account) {
            return { connected: false };
        }

        const grantedScopes: string[] = (account.scope || '').split(' ');
        const needsRelink: boolean = ROOM_REQUIRED_SCOPES.some((s) => !grantedScopes.includes(s));

        return {
            connected: true,
            display_name: account.display_name,
            product: account.product,
            needs_relink: needsRelink,
        };
    }

    async disconnect(userId: string): Promise<void> {
        await PrismaDb.spotifyAccounts.deleteMany({ where: { user_id: userId } });
    }

    async getValidAccessToken(userId: string): Promise<string> {
        if (!CLIENT_ID || !CLIENT_SECRET) {
            throw new InternalError('Spotify integration is not configured');
        }

        const account = await PrismaDb.spotifyAccounts.findUnique({ where: { user_id: userId } });

        if (!account) {
            throw new BadRequest('Spotify account is not linked');
        }

        const isExpired: boolean = account.expires_at.getTime() <= Date.now() + 60_000;
        if (!isExpired) {
            return account.access_token;
        }

        const tokenData: SpotifyTokenResponse = await this.requestToken({
            grant_type: 'refresh_token',
            refresh_token: account.refresh_token,
        }, 'Failed to refresh Spotify access token');

        await PrismaDb.spotifyAccounts.update({
            where: { user_id: userId },
            data: {
                access_token: tokenData.access_token,
                refresh_token: tokenData.refresh_token || account.refresh_token,
                expires_at: new Date(Date.now() + tokenData.expires_in * 1000),
            },
        });

        return tokenData.access_token;
    }

    async getPlaylists(userId: string): Promise<SpotifyPlaylistSummary[]> {
        const accessToken: string = await this.getValidAccessToken(userId);

        const playlists: SpotifyPlaylistSummary[] = [];
        let url: string | null = 'https://api.spotify.com/v1/me/playlists?limit=50';
        let pages = 0;

        while (url && pages < MAX_PLAYLISTS_PAGES) {
            const response: Response = await fetch(url, {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            const data: any = await response.json();

            if (!response.ok) {
                if (response.status === 403) {
                    throw new BadRequest('Permissions Spotify insuffisantes. Déconnecte puis reconnecte ton compte Spotify dans les paramètres pour autoriser l\'accès à tes playlists.');
                }
                throw new BadRequest(data.error?.message || 'Failed to fetch Spotify playlists');
            }

            for (const item of data.items || []) {
                if (!item) continue;
                playlists.push({
                    id: item.id,
                    name: item.name,
                    image: item.images?.[0]?.url || null,
                    tracksTotal: item.items?.total ?? item.tracks?.total ?? 0,
                });
            }

            url = data.next || null;
            pages++;
        }

        return playlists;
    }

    async getPlaylistAlbums(userId: string, playlistId: string): Promise<SpotifyPlaylistAlbumsResult> {
        const accessToken: string = await this.getValidAccessToken(userId);

        const seen = new Set<string>();
        const albums: SpotifyAlbumRef[] = [];
        let totalTracks = 0;
        let skippedTracks = 0;

        const fields = encodeURIComponent('items(item(name,artists(name),album(name,images))),next');
        let url: string | null = `https://api.spotify.com/v1/playlists/${encodeURIComponent(playlistId)}/items?fields=${fields}&limit=100`;
        let pages = 0;

        while (url && pages < MAX_TRACKS_PAGES) {
            const response: Response = await fetch(url, {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            const data: any = await response.json();

            if (!response.ok) {
                if (response.status === 403) {
                    throw new BadRequest('Cette playlist Spotify n\'est accessible que si tu en es le propriétaire ou collaborateur (restriction de l\'API Spotify). Réessaie avec une de tes propres playlists.');
                }
                throw new BadRequest(data.error?.message || 'Failed to fetch Spotify playlist items');
            }

            for (const entry of data.items || []) {
                const track = entry?.item;

                // Piste supprimée/indisponible (ex: contenu retiré de Spotify) : entry.item est null
                if (!track) continue;

                totalTracks++;

                const album = track?.album;
                const artist = track?.artists?.[0]?.name;

                // Fichiers locaux, épisodes de podcast, etc. n'ont pas d'album/artiste exploitable
                if (!album?.name || !artist) {
                    skippedTracks++;
                    continue;
                }

                const key = `${artist.toLowerCase()}|||${album.name.toLowerCase()}`;
                if (seen.has(key)) continue;
                seen.add(key);

                albums.push({
                    name: album.name,
                    artist,
                    cover: album.images?.[0]?.url || null,
                });
            }

            url = data.next || null;
            pages++;
        }

        return {albums, totalTracks, skippedTracks};
    }

    /**
     * Renvoie le titre en cours d'écoute d'un utilisateur, ou null s'il n'a pas
     * lié Spotify, n'écoute rien en ce moment, ou écoute un podcast/pub.
     * Échoue silencieusement (retourne null) plutôt que de faire planter la
     * page profil pour un widget secondaire.
     */
    async getCurrentlyPlaying(userId: string): Promise<SpotifyNowPlaying | null> {
        let accessToken: string;
        try {
            accessToken = await this.getValidAccessToken(userId);
        } catch (err) {
            return null;
        }

        const response: Response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (response.status === 204 || response.status === 404 || !response.ok) {
            return null;
        }

        const data: any = await response.json();

        if (!data?.item || data.currently_playing_type !== 'track') {
            return null;
        }

        return {
            isPlaying: !!data.is_playing,
            trackName: data.item.name,
            artist: (data.item.artists || []).map((a: any) => a.name).join(', ') || 'Artiste inconnu',
            albumName: data.item.album?.name || '',
            albumArt: data.item.album?.images?.[0]?.url || null,
            progressMs: data.progress_ms || 0,
            durationMs: data.item.duration_ms || 0,
            spotifyUrl: data.item.external_urls?.spotify || null,
        };
    }

    /**
     * Vérifie que le compte est Premium et dispose des scopes Web Playback SDK
     * avant de laisser l'utilisateur créer/rejoindre un Listening Room.
     */
    async assertRoomEligible(userId: string): Promise<void> {
        const status = await this.getStatus(userId);

        if (!status.connected) {
            throw new Forbidden('Lie ton compte Spotify pour utiliser les Salons d\'écoute.');
        }
        if (status.product !== 'premium') {
            throw new Forbidden('Spotify Premium est requis pour utiliser les Salons d\'écoute.');
        }
        if (status.needs_relink) {
            throw new Forbidden('Reconnecte ton compte Spotify pour activer les Salons d\'écoute.');
        }
    }

    /**
     * Jeton d'accès pour le Web Playback SDK (callback getOAuthToken côté front).
     */
    async getPlaybackToken(userId: string): Promise<string> {
        await this.assertRoomEligible(userId);
        return this.getValidAccessToken(userId);
    }

    async searchTracks(userId: string, query: string): Promise<SpotifyTrackSummary[]> {
        const accessToken: string = await this.getValidAccessToken(userId);

        const account = await PrismaDb.spotifyAccounts.findUnique({ where: { user_id: userId } });
        const market: string = account?.country || 'US';

        // NB : cette app Spotify (mode "Development") est plafonnée à limit<=10 sur
        // /v1/search — au-delà, Spotify répond 400 "Invalid limit" (message trompeur,
        // ce n'est pas une valeur hors bornes au sens de la doc publique). Passer en
        // "Extended Quota Mode" sur le dashboard développeur lèverait cette limite.
        const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10&market=${encodeURIComponent(market)}`;
        const response: Response = await fetch(url, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data: any = await response.json();

        if (!response.ok) {
            throw new BadRequest(data.error?.message || 'Failed to search Spotify tracks');
        }

        return (data.tracks?.items || []).map((track: any): SpotifyTrackSummary => ({
            uri: track.uri,
            name: track.name,
            artist: (track.artists || []).map((a: any) => a.name).join(', ') || 'Artiste inconnu',
            album: track.album?.name || '',
            albumArt: track.album?.images?.[0]?.url || null,
            durationMs: track.duration_ms || 0,
        }));
    }
}

export const spotifyService = new SpotifyService();
