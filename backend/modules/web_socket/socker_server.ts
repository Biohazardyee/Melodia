import {Server} from "socket.io";
import http from "http";
import {PrismaDb} from "../../config/database.js";
import {messageService} from "../db/messages/message.service.js";
import {Conversations, Rooms, Users} from "../../generated/prisma/client.js";
import {MessageAddResponseDto} from "../../types/messages/messages.dto";
import jwt from "jsonwebtoken";
import {SocketUser} from "../../types/users/user.dto.js";
import {
    canSendNotification,
    truncateContent,
} from "../db/notifications/notification.helper.js";
import {sendPushNotification} from "../db/notifications/notification.push.js";
import {notificationService} from "../db/notifications/notification.service.js";
import {BatchPayload} from "../../generated/prisma/internal/prismaNamespace";
import {setIO} from "./socket.registry.js";
import {roomService} from "../db/rooms/room.service.js";
import {isRoomParticipant} from "../db/rooms/room.helper.js";

const roomChannel = (roomId: string): string => `room_${roomId}`;

/** is_playing ? position_ms + (now - position_updated_at) : position_ms */
const computeLivePosition = (room: Rooms): number => {
    if (!room.is_playing) return room.position_ms;
    const elapsed: number = Date.now() - room.position_updated_at.getTime();
    return room.position_ms + Math.max(0, elapsed);
};

export const initSocket = (server: http.Server) => {
    const io = new Server(server, {
        cors: {origin: "*"},
        pingTimeout: 60000,
        pingInterval: 25000,
    });

    // Rend l'instance Socket.IO accessible aux services (notifications temps réel)
    setIO(io);

    io.use(async (socket, next): Promise<void> => {
        try {
            const rawToken = socket.handshake.auth.token;
            const token = rawToken?.replace(/#$/, "");

            if (!token) {
                return next(new Error("Token missing"));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET!) as SocketUser;

            const userExists: Users | null = await PrismaDb.users.findUnique({
                where: {id: decoded.id},
            });

            if (!userExists) {
                console.error(
                    `[Socket Auth] Rejected: User ${decoded.id} not found in DB`,
                );
                return next(new Error("User not found"));
            }

            socket.data.user = decoded;

            next();
        } catch (err) {
            console.error("[Socket Auth] Error:", err);
            return next(new Error("Invalid token"));
        }
    });

    io.on("connection", (socket): void => {
        const user = socket.data.user as SocketUser;

        socket.join(`user_${user.id}`);

        socket.on("error", (err): void => {
            console.error(`[Socket Internal Error] User ${user.id}:`, err);
        });

        socket.on(
            "join_conversation",
            async (data: { conversation_id: string }): Promise<void> => {
                try {
                    const conversationId: string = data?.conversation_id;

                    if (!conversationId) {
                        console.warn(
                            `[Join Denied] User ${user.id} sent a missing or invalid conversation_id.`,
                        );
                        return;
                    }

                    const conversation: Conversations | null =
                        await PrismaDb.conversations.findUnique({
                            where: {id: conversationId},
                        });

                    if (
                        !conversation ||
                        (conversation.user1_id !== user.id &&
                            conversation.user2_id !== user.id)
                    ) {
                        console.warn(
                            `[Join Denied] User ${user.id} unauthorized for conv: ${conversationId}`,
                        );
                        return;
                    }

                    socket.join(conversationId);
                    if (conversation.status !== "ACCEPTED") return;

                    const updatedMessages: BatchPayload = await PrismaDb.messages.updateMany({
                        where: {
                            conversation_id: conversationId,
                            sender_id: {not: user.id},
                            is_read: false,
                        },
                        data: {is_read: true},
                    });

                    if (updatedMessages.count > 0) {
                        io.to(`user_${conversation.user1_id}`).emit(
                            "conversation_marked_read",
                            {conversation_id: conversationId},
                        );
                        io.to(`user_${conversation.user2_id}`).emit(
                            "conversation_marked_read",
                            {conversation_id: conversationId},
                        );
                    }
                } catch (err) {
                    console.error(`[Join Error] for user ${user.id}:`, err);
                }
            },
        );

        socket.on(
            "mark_as_read",
            async (data: { conversation_id: string }): Promise<void> => {
                try {
                    const conversationId: string = data?.conversation_id;
                    if (!conversationId) return;
                    const access = await PrismaDb.conversations.findUnique({where: {id: conversationId}});
                    if (!access || access.status !== "ACCEPTED" ||
                        (access.user1_id !== user.id && access.user2_id !== user.id)) return;

                    const updatedMessages: BatchPayload = await PrismaDb.messages.updateMany({
                        where: {
                            conversation_id: conversationId,
                            sender_id: {not: user.id},
                            is_read: false,
                        },
                        data: {is_read: true},
                    });

                    if (updatedMessages.count > 0) {
                        const conversation = await PrismaDb.conversations.findUnique({
                            where: {id: conversationId},
                        });

                        if (conversation) {
                            io.to(`user_${conversation.user1_id}`).emit(
                                "conversation_marked_read",
                                {conversation_id: conversationId},
                            );
                            io.to(`user_${conversation.user2_id}`).emit(
                                "conversation_marked_read",
                                {conversation_id: conversationId},
                            );
                        }
                    }
                } catch (err) {
                    console.error(`[Mark As Read Error] User ${user.id}:`, err);
                }
            },
        );

        socket.on(
            "leave_conversation",
            (data: { conversation_id: string }): void => {
                if (data?.conversation_id) {
                    socket.leave(data.conversation_id);
                }
            },
        );

        socket.on(
            "send_message",
            async (data: {
                conversation_id: string;
                content: string;
            }, ack?: (result: {ok: boolean; error?: string}) => void): Promise<void> => {
                try {
                    if (!data.conversation_id || !data.content) return;

                    const conversation: Conversations | null =
                        await PrismaDb.conversations.findUnique({
                            where: {id: data.conversation_id},
                        });

                    if (
                        !conversation ||
                        (conversation.user1_id !== user.id &&
                            conversation.user2_id !== user.id)
                    ) {
                        console.error(
                            `[Message Rejected] Unauthorized or invalid conversation: ${data.conversation_id}`,
                        );
                        return;
                    }

                    const message: MessageAddResponseDto = await messageService.create({
                        conversation_id: data.conversation_id,
                        sender_id: user.id,
                        content: data.content,
                    });

                    ack?.({ok: true});
                    const messageToEmit = {
                        ...message,
                        created_at: message.created_at || new Date().toISOString(),
                    };

                    io.to(`user_${conversation.user1_id}`).emit(
                        "update_conversation_list",
                        messageToEmit,
                    );
                    io.to(`user_${conversation.user2_id}`).emit(
                        "update_conversation_list",
                        messageToEmit,
                    );
                    io.to(`user_${conversation.user1_id}`).emit(
                        "receive_message",
                        messageToEmit,
                    );
                    io.to(`user_${conversation.user2_id}`).emit(
                        "receive_message",
                        messageToEmit,
                    );

                    const recipientId: string =
                        conversation.user1_id === user.id
                            ? conversation.user2_id
                            : conversation.user1_id;

                    const clientsInRoom: Set<string> | undefined = io.sockets.adapter.rooms.get(
                        data.conversation_id,
                    );
                    let isRecipientInDiscussion: boolean = false;

                    if (clientsInRoom) {
                        for (const clientId of clientsInRoom) {
                            const clientSocket = io.sockets.sockets.get(clientId);
                            if (clientSocket && clientSocket.data?.user?.id === recipientId) {
                                isRecipientInDiscussion = true;
                                break;
                            }
                        }
                    }

                    if (!isRecipientInDiscussion) {
                        try {
                            // notificationService.create émet déjà "notification_received" au destinataire
                            await notificationService.create({
                                user_id: recipientId,
                                action: "new_message" as any,
                                related_user_id: user.id,
                            });
                        } catch (notifErr) {
                            console.error(
                                `[Notification Error] Impossible de générer la notification en BDD:`,
                                notifErr,
                            );
                        }
                    }

                    const recipient = await PrismaDb.users.findUnique({
                        where: {id: recipientId},
                        select: {expo_push_token: true},
                    });

                    if (recipient?.expo_push_token) {
                        const isAllowed: boolean = await canSendNotification(
                            recipientId,
                            user.id,
                            "new_message",
                            0.5,
                        );
                        if (isAllowed) {
                            await sendPushNotification(
                                recipient.expo_push_token,
                                "Nouveau message",
                                `${user.username || "Quelqu'un"} : ${truncateContent(data.content, 50)}`,
                                {
                                    action: "new_message",
                                    conversation_id: data.conversation_id,
                                },
                            );
                        }
                    }
                } catch (err) {
                    ack?.({ok: false, error: err instanceof Error ? err.message : "Message failed"});
                    console.error(`[Message Error] User ${user.id}:`, err);
                }
            },
        );

        // ---------------------------------------------------------------
        // Listening Rooms — écoute Spotify synchronisée entre participants.
        // Le serveur ne fait que relayer/valider l'intention : chaque client
        // exécute la lecture Spotify avec SON PROPRE token (voir useSpotifyPlayer
        // côté front). Personne ne contrôle le compte Spotify d'un autre.
        // ---------------------------------------------------------------

        socket.on("join_room", async (data: { room_id: string }): Promise<void> => {
            try {
                const roomId: string = data?.room_id;
                if (!roomId) return;

                const allowed: boolean = await isRoomParticipant(roomId, user.id);
                if (!allowed) {
                    console.warn(`[Room Join Denied] User ${user.id} unauthorized for room: ${roomId}`);
                    return;
                }

                const room = await PrismaDb.rooms.findUnique({where: {id: roomId}});
                if (!room) return;

                socket.join(roomChannel(roomId));

                socket.emit("room_state", {
                    room_id: roomId,
                    current_track_uri: room.current_track_uri,
                    current_track_name: room.current_track_name,
                    current_artist_name: room.current_artist_name,
                    current_album_art_url: room.current_album_art_url,
                    current_duration_ms: room.current_duration_ms,
                    position_ms: computeLivePosition(room),
                    position_updated_at: room.position_updated_at.toISOString(),
                    is_playing: room.is_playing,
                    server_time: Date.now(),
                });

                socket.to(roomChannel(roomId)).emit("room_participant_joined", {
                    room_id: roomId,
                    user_id: user.id,
                });
            } catch (err) {
                console.error(`[Join Room Error] User ${user.id}:`, err);
            }
        });

        socket.on("leave_room", (data: { room_id: string }): void => {
            const roomId: string = data?.room_id;
            if (!roomId) return;

            socket.leave(roomChannel(roomId));
            socket.to(roomChannel(roomId)).emit("room_participant_left", {
                room_id: roomId,
                user_id: user.id,
            });
        });

        const handleRoomTransport = async (
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
        ): Promise<void> => {
            const room = await PrismaDb.rooms.findUnique({where: {id: roomId}});
            if (!room) return;

            if (room.host_id !== user.id) {
                console.warn(`[Room Transport Denied] User ${user.id} is not host of room: ${roomId}`);
                return;
            }

            const updatedRoom = await roomService.updatePlaybackState(roomId, state);

            io.to(roomChannel(roomId)).emit("room_playback_sync", {
                room_id: roomId,
                current_track_uri: state.current_track_uri !== undefined ? state.current_track_uri : room.current_track_uri,
                current_track_name: state.current_track_name !== undefined ? state.current_track_name : room.current_track_name,
                current_artist_name: state.current_artist_name !== undefined ? state.current_artist_name : room.current_artist_name,
                current_album_art_url: state.current_album_art_url !== undefined ? state.current_album_art_url : room.current_album_art_url,
                current_duration_ms: state.current_duration_ms !== undefined ? state.current_duration_ms : room.current_duration_ms,
                position_ms: state.position_ms,
                position_updated_at: updatedRoom.position_updated_at.toISOString(),
                is_playing: state.is_playing,
                server_time: Date.now(),
            });
        };

        socket.on(
            "room_play",
            async (data: {
                room_id: string;
                track_uri?: string;
                track_name?: string;
                artist_name?: string;
                album_art_url?: string | null;
                duration_ms?: number;
                position_ms?: number;
            }): Promise<void> => {
                try {
                    if (!data?.room_id) return;
                    await handleRoomTransport(data.room_id, {
                        current_track_uri: data.track_uri,
                        current_track_name: data.track_name,
                        current_artist_name: data.artist_name,
                        current_album_art_url: data.album_art_url,
                        current_duration_ms: data.duration_ms,
                        position_ms: data.position_ms ?? 0,
                        is_playing: true,
                    });
                } catch (err) {
                    console.error(`[Room Play Error] User ${user.id}:`, err);
                }
            },
        );

        socket.on("room_pause", async (data: { room_id: string; position_ms?: number }): Promise<void> => {
            try {
                if (!data?.room_id) return;
                const room = await PrismaDb.rooms.findUnique({where: {id: data.room_id}});
                if (!room) return;
                await handleRoomTransport(data.room_id, {
                    position_ms: data.position_ms ?? computeLivePosition(room),
                    is_playing: false,
                });
            } catch (err) {
                console.error(`[Room Pause Error] User ${user.id}:`, err);
            }
        });

        socket.on("room_seek", async (data: { room_id: string; position_ms: number }): Promise<void> => {
            try {
                if (!data?.room_id || data.position_ms === undefined) return;
                const room = await PrismaDb.rooms.findUnique({where: {id: data.room_id}});
                if (!room) return;
                await handleRoomTransport(data.room_id, {
                    position_ms: data.position_ms,
                    is_playing: room.is_playing,
                });
            } catch (err) {
                console.error(`[Room Seek Error] User ${user.id}:`, err);
            }
        });

        socket.on("room_skip", async (data: {room_id: string; expected_updated_at?: string}): Promise<void> => {
            try {
                if (!data?.room_id) return;
                const room = await roomService.advancePlayback(data.room_id, user.id, data.expected_updated_at);
                if (!room) return;
                io.to(roomChannel(room.id)).emit("room_playback_sync", {
                    room_id: room.id,
                    current_track_uri: room.current_track_uri,
                    current_track_name: room.current_track_name,
                    current_artist_name: room.current_artist_name,
                    current_album_art_url: room.current_album_art_url,
                    current_duration_ms: room.current_duration_ms,
                    position_ms: room.position_ms,
                    is_playing: room.is_playing,
                    position_updated_at: room.position_updated_at.toISOString(),
                    server_time: Date.now(),
                });
                const queue = await roomService.getQueue(room.id);
                io.to(roomChannel(room.id)).emit("room_queue_updated", {room_id: room.id, items: queue});
            } catch (err) {
                console.error(`[Room Skip Error] User ${user.id}:`, err);
            }
        });

        socket.on(
            "room_queue_add",
            async (data: {
                room_id: string;
                track_uri: string;
                track_name: string;
                artist_name: string;
                album_art_url?: string | null;
                duration_ms: number;
            }): Promise<void> => {
                try {
                    if (!data?.room_id || !data.track_uri) return;

                    const allowed: boolean = await isRoomParticipant(data.room_id, user.id);
                    if (!allowed) return;

                    await roomService.addQueueItem({
                        room_id: data.room_id,
                        added_by_id: user.id,
                        track_uri: data.track_uri,
                        track_name: data.track_name,
                        artist_name: data.artist_name,
                        album_art_url: data.album_art_url,
                        duration_ms: data.duration_ms,
                    });

                    const queue = await roomService.getQueue(data.room_id);
                    io.to(roomChannel(data.room_id)).emit("room_queue_updated", {room_id: data.room_id, items: queue});
                } catch (err) {
                    console.error(`[Room Queue Add Error] User ${user.id}:`, err);
                }
            },
        );

        socket.on("room_queue_remove", async (data: { room_id: string; item_id: string }): Promise<void> => {
            try {
                if (!data?.room_id || !data.item_id) return;

                await roomService.removeQueueItem(data.room_id, data.item_id, user.id);

                const queue = await roomService.getQueue(data.room_id);
                io.to(roomChannel(data.room_id)).emit("room_queue_updated", {room_id: data.room_id, items: queue});
            } catch (err) {
                console.error(`[Room Queue Remove Error] User ${user.id}:`, err);
            }
        });

        socket.on("room_chat_message", async (data: { room_id: string; content: string }): Promise<void> => {
            try {
                if (!data?.room_id || !data.content?.trim()) return;

                const allowed: boolean = await isRoomParticipant(data.room_id, user.id);
                if (!allowed) return;

                io.to(roomChannel(data.room_id)).emit("room_chat_message_received", {
                    room_id: data.room_id,
                    user: {id: user.id, username: user.username},
                    content: data.content.trim().slice(0, 500),
                    sent_at: new Date().toISOString(),
                });
            } catch (err) {
                console.error(`[Room Chat Error] User ${user.id}:`, err);
            }
        });

        socket.on("room_reaction", (data: { room_id: string; emoji: string }): void => {
            if (!data?.room_id || !data.emoji) return;
            socket.to(roomChannel(data.room_id)).emit("room_reaction_received", {
                room_id: data.room_id,
                user_id: user.id,
                emoji: data.emoji,
            });
        });

        socket.on("disconnect", (): void => {
            for (const joinedRoom of socket.rooms) {
                if (joinedRoom.startsWith("room_")) {
                    socket.to(joinedRoom).emit("room_participant_left", {
                        room_id: joinedRoom.replace("room_", ""),
                        user_id: user.id,
                    });
                }
            }
        });
    });

    return io;
};
