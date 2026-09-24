import express, { NextFunction, Request, Response, Router } from 'express';
import { spotifyController } from '../../modules/spotify/spotify.controller.js';
import { authGuard } from '../../middlewares/auth.js';

const router: Router = express.Router();

router.get('/connect', function (req: Request, res: Response, next: NextFunction): void {
    spotifyController.connect(req, res, next);
});

router.get('/callback', function (req: Request, res: Response, next: NextFunction): void {
    spotifyController.callback(req, res, next);
});

router.get('/status', authGuard, function (req: Request, res: Response, next: NextFunction): void {
    spotifyController.status(req, res, next);
});

router.delete('/disconnect', authGuard, function (req: Request, res: Response, next: NextFunction): void {
    spotifyController.disconnect(req, res, next);
});

router.get('/playlists', authGuard, function (req: Request, res: Response, next: NextFunction): void {
    spotifyController.listPlaylists(req, res, next);
});

router.post('/playlists/:playlistId/import', authGuard, function (req: Request, res: Response, next: NextFunction): void {
    spotifyController.importPlaylist(req, res, next);
});

router.get('/now-playing/:userId', authGuard, function (req: Request, res: Response, next: NextFunction): void {
    spotifyController.nowPlaying(req, res, next);
});

router.get('/playback-token', authGuard, function (req: Request, res: Response, next: NextFunction): void {
    spotifyController.playbackToken(req, res, next);
});

router.get('/search-tracks', authGuard, function (req: Request, res: Response, next: NextFunction): void {
    spotifyController.searchTracks(req, res, next);
});

export default router;
