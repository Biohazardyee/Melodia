import type {Request, Response, NextFunction} from "express";

import {Controller} from "../../controller.js";
import {BadRequest} from "../../../utils/errors.js";
import {RoomService, roomService} from "./room.service.js";
import {RoomAddDto, RoomQueueAddDto, RoomResponseDto} from "../../../types/rooms/room.dto.js";

class RoomController extends Controller {
    constructor(private readonly service: RoomService = roomService) {
        super();
    }

    async add(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const hostId: string = (req as any).user.id;

            const createData: RoomAddDto = {
                host_id: hostId,
                name: req.body.name,
                is_public: req.body.is_public !== false,
                password: req.body.password,
            };

            if (!createData.name) {
                throw new BadRequest("Name is required");
            }

            const room: RoomResponseDto = await this.service.create(createData);

            res.status(201).json({message: "Room created successfully", room});
        } catch (error) {
            next(error);
        }
    }

    async getAll(_req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const rooms: RoomResponseDto[] = await this.service.getPublicRooms();
            res.status(200).json({message: "Public rooms retrieved successfully", rooms});
        } catch (error) {
            next(error);
        }
    }

    async getMine(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId: string = (req as any).user.id;
            const rooms: RoomResponseDto[] = await this.service.getMyRooms(userId);
            res.status(200).json({message: "Your rooms retrieved successfully", rooms});
        } catch (error) {
            next(error);
        }
    }

    async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.params.id) {
                throw new BadRequest("Missing required fields");
            }

            const requesterId: string = (req as any).user.id;
            const room: RoomResponseDto = await this.service.getById(req.params.id, requesterId);

            res.status(200).json({message: "Room retrieved successfully", room});
        } catch (error) {
            next(error);
        }
    }

    async join(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const roomId: string = req.params.id;
            const userId: string = (req as any).user.id;
            const password: string | undefined = req.body?.password;

            if (!roomId) {
                throw new BadRequest("Room id is required");
            }

            const room: RoomResponseDto = await this.service.join(roomId, userId, password);

            res.status(200).json({message: "Joined room successfully", room});
        } catch (error) {
            next(error);
        }
    }

    async leave(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const roomId: string = req.params.id;
            const userId: string = (req as any).user.id;

            if (!roomId) {
                throw new BadRequest("Room id is required");
            }

            const result = await this.service.leave(roomId, userId);

            res.status(200).json({message: "Left the room successfully", ...result});
        } catch (error) {
            next(error);
        }
    }

    async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const roomId: string = req.params.id;
            const requesterId: string = (req as any).user.id;

            if (!roomId) {
                throw new BadRequest("Room id is required");
            }

            await this.service.delete(roomId, requesterId);

            res.status(200).json({message: "Room deleted successfully"});
        } catch (error) {
            next(error);
        }
    }

    async getQueue(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const roomId: string = req.params.id;

            if (!roomId) {
                throw new BadRequest("Room id is required");
            }

            const queue = await this.service.getQueue(roomId);

            res.status(200).json({queue});
        } catch (error) {
            next(error);
        }
    }

    async addQueueItem(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const roomId: string = req.params.id;
            const userId: string = (req as any).user.id;

            const addData: RoomQueueAddDto = {
                room_id: roomId,
                added_by_id: userId,
                track_uri: req.body.track_uri,
                track_name: req.body.track_name,
                artist_name: req.body.artist_name,
                album_art_url: req.body.album_art_url,
                duration_ms: req.body.duration_ms,
            };

            if (!addData.track_uri || !addData.track_name) {
                throw new BadRequest("track_uri and track_name are required");
            }

            const item = await this.service.addQueueItem(addData);

            res.status(201).json({message: "Track added to queue", item});
        } catch (error) {
            next(error);
        }
    }

    async removeQueueItem(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const roomId: string = req.params.id;
            const itemId: string = req.params.itemId;
            const requesterId: string = (req as any).user.id;

            if (!roomId || !itemId) {
                throw new BadRequest("Room id and item id are required");
            }

            await this.service.removeQueueItem(roomId, itemId, requesterId);

            res.status(200).json({message: "Track removed from queue"});
        } catch (error) {
            next(error);
        }
    }

    async invite(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const roomId: string = req.params.id;
            const requesterId: string = (req as any).user.id;
            const username: string = req.body.username;

            if (!roomId || !username) {
                throw new BadRequest("Room id and username are required");
            }

            await this.service.invite(roomId, requesterId, username);

            res.status(200).json({message: "Invitation sent"});
        } catch (error) {
            next(error);
        }
    }

    async update(_req: Request, _res: Response, _next: NextFunction): Promise<null> {
        // Renaming/visibility toggle isn't part of v1 — rooms are created once and closed by the host.
        return null;
    }
}

export default new RoomController();
