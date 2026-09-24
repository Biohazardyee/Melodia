import {PrismaDb} from "../../../config/database.js";

/**
 * Vrai si l'utilisateur est l'hôte OU un participant du salon d'écoute.
 */
export async function isRoomParticipant(roomId: string, userId: string): Promise<boolean> {
    const room = await PrismaDb.rooms.findUnique({
        where: {id: roomId},
        select: {host_id: true},
    });

    if (!room) return false;
    if (room.host_id === userId) return true;

    const participant = await PrismaDb.roomParticipants.findUnique({
        where: {
            room_id_user_id: {
                room_id: roomId,
                user_id: userId,
            },
        },
    });

    return !!participant;
}
