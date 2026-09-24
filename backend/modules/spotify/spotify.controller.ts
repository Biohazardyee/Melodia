import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { spotifyService } from './spotify.service.js';
import { spotifyImportService } from './spotify.import.service.js';
import { BadRequest, Unauthorized } from '../../utils/errors.js';

const FRONTEND_URL: string = process.env.FRONTEND_URL || process.env.WEB_CLIENT_URL || 'http://localhost:5173';

class SpotifyController {

    connect(req: Request, res: Response, next: NextFunction): void {
        try {
            const token: string | undefined = req.query.token as string | undefined;
            const secret: string | undefined = process.env.JWT_SECRET;

            if (!token || !secret) {
                throw new Unauthorized('Missing or invalid token');
            }

            const decoded: any = jwt.verify(token, secret);
            const authorizeUrl: string = spotifyService.buildAuthorizeUrl(decoded.id);

            res.redirect(authorizeUrl);
        } catch (err) {
            next(err);
        }
    }

    async callback(req: Request, res: Response, next: NextFunction): Promise<void> {
        const { code, state, error } = req.query;

        if (error || !code || !state) {
            res.redirect(`${FRONTEND_URL}/settings?spotify=error`);
            return;
        }

        try {
            const userId: string = spotifyService.verifyState(state as string);
            await spotifyService.exchangeCodeAndLink(userId, code as string);
            res.redirect(`${FRONTEND_URL}/settings?spotify=connected`);
        } catch (err) {
            console.error('❌ Spotify link error:', err);
            res.redirect(`${FRONTEND_URL}/settings?spotify=error`);
        }
    }

    async status(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId: string = (req as any).user.id;
            const status = await spotifyService.getStatus(userId);
            res.status(200).json(status);
        } catch (err) {
            next(err);
        }
    }

    async disconnect(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId: string = (req as any).user.id;
            await spotifyService.disconnect(userId);
            res.status(200).json({ message: 'Spotify account unlinked' });
        } catch (err) {
            next(err);
        }
    }

    async listPlaylists(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId: string = (req as any).user.id;
            const [playlists, importedIds] = await Promise.all([
                spotifyService.getPlaylists(userId),
                spotifyImportService.getImportedPlaylistIds(userId),
            ]);

            const playlistsWithStatus = playlists.map((playlist) => ({
                ...playlist,
                imported: importedIds.has(playlist.id),
            }));

            res.status(200).json({ message: 'Spotify playlists retrieved successfully', playlists: playlistsWithStatus });
        } catch (err) {
            next(err);
        }
    }

    async nowPlaying(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { userId } = req.params;
            if (!userId) {
                throw new BadRequest('userId is required');
            }

            const nowPlaying = await spotifyService.getCurrentlyPlaying(userId);

            res.status(200).json({ message: 'Now playing retrieved successfully', nowPlaying });
        } catch (err) {
            next(err);
        }
    }

    async playbackToken(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId: string = (req as any).user.id;
            const access_token: string = await spotifyService.getPlaybackToken(userId);
            res.status(200).json({ access_token });
        } catch (err) {
            next(err);
        }
    }

    async searchTracks(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId: string = (req as any).user.id;
            const query: string = (req.query.q as string || '').trim();

            if (!query) {
                throw new BadRequest('q is required');
            }

            const tracks = await spotifyService.searchTracks(userId, query);
            res.status(200).json({ tracks });
        } catch (err) {
            next(err);
        }
    }

    async importPlaylist(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId: string = (req as any).user.id;
            const { playlistId } = req.params;
            const { name, is_public, image } = req.body;

            if (!playlistId) {
                throw new BadRequest('playlistId is required');
            }
            if (!name || typeof name !== 'string' || !name.trim()) {
                throw new BadRequest('name is required');
            }

            const result = await spotifyImportService.importPlaylist(
                userId,
                playlistId,
                name.trim(),
                is_public !== false,
                typeof image === 'string' ? image : undefined,
            );

            res.status(201).json({ message: 'Spotify playlist imported successfully', ...result });
        } catch (err) {
            next(err);
        }
    }
}

export const spotifyController = new SpotifyController();
