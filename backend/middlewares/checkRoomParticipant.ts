import {Request, Response, NextFunction} from 'express';
import {PrismaDb} from '../config/database.js';
import {BadRequest, Forbidden, NotFound} from '../utils/errors.js';
import {isRoomParticipant} from '../modules/db/rooms/room.helper.js';

/**
 * Autorise l'accès à un salon si public, ou si l'utilisateur en est l'hôte,
 * un participant, ou un admin. Même logique que checkPlaylistViewer.
 */
export async function checkRoomParticipant(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const loggedUser = req.user;
        const roomId: string = req.params.id;

        if (!loggedUser) throw new BadRequest("User not authenticated");
        if (!roomId) throw new BadRequest("Room ID is required");

        if (loggedUser.role === 'ADMIN') {
            return next();
        }

        const room = await PrismaDb.rooms.findUnique({
            where: {id: roomId},
            select: {is_public: true},
        });

        if (!room) {
            throw new NotFound("Room not found");
        }

        if (room.is_public) {
            return next();
        }

        const allowed: boolean = await isRoomParticipant(roomId, loggedUser.id);

        if (!allowed) {
            throw new Forbidden("Access denied: this room is private");
        }

        next();
    } catch (err) {
        next(err);
    }
}
