import {Request, Response, NextFunction} from 'express';
import {PrismaDb} from '../config/database.js';
import {BadRequest, Forbidden, NotFound} from '../utils/errors.js';

/**
 * Autorise l'action uniquement si l'utilisateur est l'hôte du salon (ou admin).
 */
export async function checkRoomHost(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const loggedUser = req.user;
        const roomId: string = req.params.id;

        if (!loggedUser) throw new BadRequest("User not authenticated");
        if (!roomId) throw new BadRequest("Room ID is required");

        const room = await PrismaDb.rooms.findUnique({
            where: {id: roomId},
            select: {host_id: true},
        });

        if (!room) {
            throw new NotFound("Room not found");
        }

        const isAdmin = loggedUser.role === 'ADMIN';

        if (room.host_id === loggedUser.id || isAdmin) {
            return next();
        }

        throw new Forbidden("Access denied: only the host can perform this action");
    } catch (err) {
        next(err);
    }
}
