import { PlaylistResponseAddDto } from '../playlists/playlist.dto.js';

// Spotify API response shapes
export interface SpotifyTokenResponse {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope?: string;
    error?: string;
    error_description?: string;
}

export interface SpotifyProfile {
    id: string;
    display_name: string | null;
    product?: string | null; // "premium" | "free" | "open"
    country?: string | null; // ISO 3166-1 alpha-2
}

// Response interfaces
export interface SpotifyPlaylistSummary {
    id: string;
    name: string;
    image: string | null;
    tracksTotal: number;
    imported?: boolean;
}

export interface SpotifyAlbumRef {
    name: string;
    artist: string;
    cover: string | null;
}

export interface SpotifyPlaylistAlbumsResult {
    albums: SpotifyAlbumRef[];
    totalTracks: number;
    skippedTracks: number;
}

export interface ImportPlaylistResult {
    playlist: PlaylistResponseAddDto;
    importedAlbums: number;
    totalAlbums: number;
    totalTracks: number;
    skippedTracks: number;
}

export interface SpotifyNowPlaying {
    isPlaying: boolean;
    trackName: string;
    artist: string;
    albumName: string;
    albumArt: string | null;
    progressMs: number;
    durationMs: number;
    spotifyUrl: string | null;
}

export interface SpotifyStatusDto {
    connected: boolean;
    display_name?: string | null;
    product?: string | null;
    needs_relink?: boolean;
}

export interface SpotifyTrackSummary {
    uri: string;
    name: string;
    artist: string;
    album: string;
    albumArt: string | null;
    durationMs: number;
}
