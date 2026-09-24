import bcrypt from "bcrypt";
import {PrismaDb} from "../../../config/database.js";
import {BadRequest, Forbidden, NotFound} from "../../../utils/errors.js";
import {isEmptyString, isValidBoolean, isValidStringLength} from "../../../utils/helpers.js";
import {Rooms, Users} from "../../../generated/prisma/client.js";
import {
    RoomAddDto,
    RoomParticipantDto,
    RoomQueueAddDto,
    RoomQueueItemDto,
    RoomResponseDto,
} from "../../../types/rooms/room.dto.js";
import {isRoomParticipant} from "./room.helper.js";
import {spotifyService} from "../../spotify/spotify.service.js";
import {notificationService} from "../notifications/notification.service.js";
import {NotificationActions} from "../../../generated/prisma/enums.js";
import {canSendNotification} from "../notifications/notification.helper.js";
import {bufferToImageDataUri} from "../../../utils/imageDataUri.js";

const PARTICIPANT_SELECT = {
    id: true,
    username: true,
    pseudo: true,
    profile_picture: true,
} as const;

export class RoomService {
    /** Atomically consume a queue item and update playback. A stale tab cannot skip twice. */
    async advancePlayback(roomId: string, requesterId: string, expectedVersion?: string) {
        return PrismaDb.$transaction(async tx => {
            await tx.$queryRaw`SELECT id FROM "Rooms" WHERE id = ${roomId} FOR UPDATE`;
            const room = await tx.rooms.findUnique({where: {id: roomId}});
            if (!room) throw new NotFound("Room not found");
            if (room.host_id !== requesterId) throw new Forbidden("Only the host can skip");
            if (expectedVersion && room.position_updated_at.toISOString() !== expectedVersion) return null;
            const next = await tx.roomQueueItems.findFirst({where: {room_id: roomId}, orderBy: [{position: "asc"}, {id: "asc"}]});
            if (next) await tx.roomQueueItems.delete({where: {id: next.id}});
            return tx.rooms.update({where: {id: roomId}, data: {
                current_track_uri: next?.track_uri ?? null,
                current_track_name: next?.track_name ?? null,
                current_artist_name: next?.artist_name ?? null,
                current_album_art_url: next?.album_art_url ?? null,
                current_duration_ms: next?.duration_ms ?? null,
                position_ms: 0,
                is_playing: !!next,
                position_updated_at: new Date(Math.max(Date.now(), room.position_updated_at.getTime() + 1)),
            }});
        });
    }

    async create(data: RoomAddDto): Promise<RoomResponseDto> {
        if (isEmptyString(data.name)) {
            throw new BadRequest("Room name cannot be empty");
        }

        if (!isValidStringLength(data.name.trim(), 50)) {
            throw new BadRequest("Room name is too long (max 50 characters)");
        }

        if (isEmptyString(data.host_id)) {
            throw new BadRequest("host_id cannot be empty");
        }

        if (!isValidBoolean(data.is_public)) {
            throw new BadRequest("is_public must be a boolean value");
        }

        const existingHostedRoom = await PrismaDb.rooms.findFirst({
            where: {host_id: data.host_id},
            select: {id: true},
        });

        if (existingHostedRoom) {
            throw new BadRequest("Tu héberges déjà un salon. Ferme-le avant d'en créer un nouveau.");
        }

        let hashedPassword: string | null = null;

        if (!data.is_public) {
            if (isEmptyString(data.password)) {
                throw new BadRequest("A password is required for a private room");
            }
            if (!isValidStringLength(data.password!.trim(), 50)) {
                throw new BadRequest("Password is too long (max 50 characters)");
            }
            hashedPassword = await bcrypt.hash(data.password!.trim(), 10);
        }

        await spotifyService.assertRoomEligible(data.host_id);

        const room: Rooms = await PrismaDb.rooms.create({
            data: {
                host_id: data.host_id,
                name: data.name.trim(),
                is_public: data.is_public,
                password: hashedPassword,
            },
        });

        return this.toDto(room, data.host_id);
    }

    async getPublicRooms(): Promise<RoomResponseDto[]> {
        const rooms = await PrismaDb.rooms.findMany({
            where: {is_public: true},
            orderBy: {created_at: "desc"},
            include: {_count: {select: {participants: true}}},
        });

        return rooms.map((r): RoomResponseDto => ({
            ...this.toDto(r),
            participant_count: r._count.participants + 1, // +1 for the host
        }));
    }

    /**
     * Salons publics ou privés dont l'utilisateur est l'hôte ou participant —
     * seul moyen de retrouver un salon privé une fois qu'on l'a quitté, vu
     * qu'il n'apparaît jamais dans getPublicRooms().
     */
    async getMyRooms(userId: string): Promise<RoomResponseDto[]> {
        const rooms = await PrismaDb.rooms.findMany({
            where: {
                OR: [
                    {host_id: userId},
                    {participants: {some: {user_id: userId}}},
                ],
            },
            orderBy: {created_at: "desc"},
            include: {_count: {select: {participants: true}}},
        });

        return rooms.map((r): RoomResponseDto => ({
            ...this.toDto(r, userId),
            participant_count: r._count.participants + 1,
        }));
    }

    async getById(id: string, requesterId: string): Promise<RoomResponseDto> {
        if (isEmptyString(id)) {
            throw new BadRequest("Room id cannot be empty");
        }

        const room = await PrismaDb.rooms.findUnique({
            where: {id},
            include: {
                host: {select: PARTICIPANT_SELECT},
                participants: {include: {user: {select: PARTICIPANT_SELECT}}},
                queue_items: {orderBy: {position: "asc"}},
            },
        });

        if (!room) {
            throw new NotFound("Room not found");
        }

        return this.toDto(room, requesterId);
    }

    /**
     * Auto-join en libre-service : les salons publics se rejoignent librement,
     * les salons privés nécessitent le mot de passe défini à la création (en
     * plus de ça, l'hôte peut toujours ajouter directement quelqu'un via
     * invite(), sans mot de passe — même modèle que les collaborateurs de
     * playlist).
     */
    async join(roomId: string, userId: string, password?: string): Promise<RoomResponseDto> {
        const room = await PrismaDb.rooms.findUnique({where: {id: roomId}});
        if (!room) {
            throw new NotFound("Room not found");
        }

        const alreadyMember: boolean = room.host_id === userId || await isRoomParticipant(roomId, userId);

        if (!room.is_public && !alreadyMember) {
            if (isEmptyString(password)) {
                // The user's session is valid; only access to this room is missing.
                throw new Forbidden("Ce salon est privé, un mot de passe est requis.");
            }

            const matches: boolean = !!room.password && await bcrypt.compare(password!.trim(), room.password);
            if (!matches) {
                throw new Forbidden("Mot de passe incorrect.");
            }
        }

        await spotifyService.assertRoomEligible(userId);

        if (!alreadyMember) {
            await PrismaDb.roomParticipants.create({
                data: {room_id: roomId, user_id: userId},
            });
        }

        return this.getById(roomId, userId);
    }

    /** Renvoie {closed:true} si l'hôte a quitté (le salon est alors supprimé). */
    async leave(roomId: string, userId: string): Promise<{ closed: boolean }> {
        const room = await PrismaDb.rooms.findUnique({where: {id: roomId}});
        if (!room) {
            throw new NotFound("Room not found");
        }

        if (room.host_id === userId) {
            await PrismaDb.rooms.delete({where: {id: roomId}});
            return {closed: true};
        }

        await PrismaDb.roomParticipants.deleteMany({
            where: {room_id: roomId, user_id: userId},
        });

        return {closed: false};
    }

    async delete(roomId: string, requesterId: string): Promise<void> {
        const room = await PrismaDb.rooms.findUnique({where: {id: roomId}});
        if (!room) {
            throw new NotFound("Room not found");
        }

        if (room.host_id !== requesterId) {
            throw new Forbidden("Only the host can delete this room");
        }

        await PrismaDb.rooms.delete({where: {id: roomId}});
    }

    async getQueue(roomId: string): Promise<RoomQueueItemDto[]> {
        const items = await PrismaDb.roomQueueItems.findMany({
            where: {room_id: roomId},
            orderBy: {position: "asc"},
        });

        return items.map((i) => this.queueItemToDto(i));
    }

    async addQueueItem(data: RoomQueueAddDto): Promise<RoomQueueItemDto> {
        if (isEmptyString(data.room_id) || isEmptyString(data.track_uri)) {
            throw new BadRequest("room_id and track_uri are required");
        }

        const room = await PrismaDb.rooms.findUnique({where: {id: data.room_id}});
        if (!room) {
            throw new NotFound("Room not found");
        }

        const last = await PrismaDb.roomQueueItems.findFirst({
            where: {room_id: data.room_id},
            orderBy: {position: "desc"},
        });
        const nextPosition: number = (last?.position ?? -1) + 1;

        const item = await PrismaDb.roomQueueItems.create({
            data: {
                room_id: data.room_id,
                added_by_id: data.added_by_id,
                track_uri: data.track_uri,
                track_name: data.track_name,
                artist_name: data.artist_name,
                album_art_url: data.album_art_url ?? null,
                duration_ms: data.duration_ms,
                position: nextPosition,
            },
        });

        return this.queueItemToDto(item);
    }

    async removeQueueItem(roomId: string, itemId: string, requesterId: string): Promise<void> {
        const item = await PrismaDb.roomQueueItems.findUnique({where: {id: itemId}});
        if (!item || item.room_id !== roomId) {
            throw new NotFound("Queue item not found");
        }

        const room = await PrismaDb.rooms.findUnique({where: {id: roomId}});
        if (!room) {
            throw new NotFound("Room not found");
        }

        if (item.added_by_id !== requesterId && room.host_id !== requesterId) {
            throw new Forbidden("Only the host or the person who added this track can remove it");
        }

        await PrismaDb.roomQueueItems.delete({where: {id: itemId}});
    }

    /** Retire et renvoie le prochain morceau de la file (position la plus basse), ou null si elle est vide. */
    async popNextQueueItem(roomId: string) {
        const next = await PrismaDb.roomQueueItems.findFirst({
            where: {room_id: roomId},
            orderBy: {position: "asc"},
        });

        if (!next) return null;

        await PrismaDb.roomQueueItems.delete({where: {id: next.id}});
        return next;
    }

    /** Persiste l'état de lecture (utilisé par les handlers socket play/pause/seek/skip). */
    async updatePlaybackState(
        roomId: string,
        state: {
            current_track_uri?: string | null;
            current_track_name?: string | null;
            current_artist_name?: string | null;
            current_album_art_url?: string | null;
            current_duration_ms?: number | null;
            position_ms: number;
            is_playing: boolean;
        },
    ): Promise<Rooms> {
        return PrismaDb.rooms.update({
            where: {id: roomId},
            data: {
                ...(state.current_track_uri !== undefined ? {current_track_uri: state.current_track_uri} : {}),
                ...(state.current_track_name !== undefined ? {current_track_name: state.current_track_name} : {}),
                ...(state.current_artist_name !== undefined ? {current_artist_name: state.current_artist_name} : {}),
                ...(state.current_album_art_url !== undefined ? {current_album_art_url: state.current_album_art_url} : {}),
                ...(state.current_duration_ms !== undefined ? {current_duration_ms: state.current_duration_ms} : {}),
                position_ms: state.position_ms,
                is_playing: state.is_playing,
                position_updated_at: new Date(),
            },
        });
    }

    async invite(roomId: string, requesterId: string, username: string): Promise<void> {
        if (isEmptyString(username)) {
            throw new BadRequest("username is required");
        }

        const room = await PrismaDb.rooms.findUnique({where: {id: roomId}});
        if (!room) {
            throw new NotFound("Room not found");
        }

        if (room.host_id !== requesterId) {
            throw new Forbidden("Only the host can invite people to this room");
        }

        const targetUser: Users | null = await PrismaDb.users.findUnique({
            where: {username: username.trim()},
        });

        if (!targetUser) {
            throw new NotFound("User not found");
        }

        if (targetUser.id === room.host_id) {
            throw new BadRequest("The host is already in the room");
        }

        const existing = await PrismaDb.roomParticipants.findUnique({
            where: {room_id_user_id: {room_id: roomId, user_id: targetUser.id}},
        });

        if (!existing) {
            await PrismaDb.roomParticipants.create({
                data: {room_id: roomId, user_id: targetUser.id},
            });
        }

        const isAllowed: boolean = await canSendNotification(
            targetUser.id,
            requesterId,
            NotificationActions.room_invited,
            5,
        );

        if (isAllowed) {
            notificationService
                .create({
                    user_id: targetUser.id,
                    action: NotificationActions.room_invited,
                    related_user_id: requesterId,
                })
                .catch((err): void => console.error("Notification failed:", err));
        }
    }

    private toDto(room: any, requesterId?: string): RoomResponseDto {
        return {
            id: room.id,
            host_id: room.host_id,
            host: room.host ? {
                id: room.host.id,
                username: room.host.username,
                pseudo: room.host.pseudo,
                profile_picture: bufferToImageDataUri(room.host.profile_picture),
            } : undefined,
            name: room.name,
            is_public: room.is_public,
            current_track_uri: room.current_track_uri,
            current_track_name: room.current_track_name,
            current_artist_name: room.current_artist_name,
            current_album_art_url: room.current_album_art_url,
            current_duration_ms: room.current_duration_ms,
            position_ms: room.position_ms,
            is_playing: room.is_playing,
            position_updated_at: room.position_updated_at,
            is_host: requesterId ? room.host_id === requesterId : undefined,
            participants: room.participants?.map((p: any): RoomParticipantDto => ({
                id: p.user.id,
                username: p.user.username,
                pseudo: p.user.pseudo,
                profile_picture: bufferToImageDataUri(p.user.profile_picture),
            })),
            queue_items: room.queue_items?.map((i: any) => this.queueItemToDto(i)),
            created_at: room.created_at,
            updated_at: room.updated_at,
        };
    }

    private queueItemToDto(item: any): RoomQueueItemDto {
        return {
            id: item.id,
            track_uri: item.track_uri,
            track_name: item.track_name,
            artist_name: item.artist_name,
            album_art_url: item.album_art_url,
            duration_ms: item.duration_ms,
            added_by_id: item.added_by_id,
            position: item.position,
        };
    }
}

export const roomService = new RoomService();
