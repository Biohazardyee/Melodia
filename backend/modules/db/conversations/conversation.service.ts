import {PrismaDb} from "../../../config/database.js";
import {NotFound, BadRequest} from "../../../utils/errors.js";
import {isEmptyString} from "../../../utils/helpers.js";
import {bufferToImageDataUri} from "../../../utils/imageDataUri.js";
import {
    ConversationAddDto,
    ConversationAddResponseDto,
    ConversationResponseDeleteDto,
    ConversationResponseDto,
    UserConversationResponseDto,
} from "../../../types/conversations/conversations.dto.js";
import {
    Users,
    Conversations,
    Prisma,
} from "../../../generated/prisma/browser.js";
import {assertParticipant, assertCanRespond} from "./conversation.policy.js";
import {emitToUser} from "../../web_socket/socket.registry.js";
import {conversationMapper} from "../../../mappers/conversations/conversations.mapper.js";

export class ConversationService {
    async requireParticipant(id: string, userId: string) {
        const conversation = await PrismaDb.conversations.findUnique({where: {id}});
        if (!conversation) throw new NotFound("Conversation not found");
        assertParticipant(conversation, userId);
        return conversation;
    }

    async respond(id: string, userId: string, action: string) {
        if (action !== "accept" && action !== "decline") throw new BadRequest("Invalid request action");
        const conversation = await PrismaDb.$transaction(async (tx) => {
            await tx.$queryRaw`SELECT id FROM "Conversations" WHERE id = ${id} FOR UPDATE`;
            const current = await tx.conversations.findUnique({where: {id}});
            if (!current) throw new NotFound("Conversation not found");
            assertCanRespond(current, userId);
            if (current.status === "ACCEPTED") return current;
            return tx.conversations.update({where: {id}, data: {
                status: action === "accept" ? "ACCEPTED" : "DECLINED",
            }});
        });
        for (const participant of [conversation.user1_id, conversation.user2_id]) {
            emitToUser(participant, "conversation_updated", {conversation_id: id});
        }
        return {id: conversation.id, status: conversation.status};
    }

    async create(data: ConversationAddDto): Promise<ConversationAddResponseDto> {
        if (isEmptyString(data.user1_id)) {
            throw new BadRequest("User1_id cannot be empty");
        }

        if (isEmptyString(data.user2_id)) {
            throw new BadRequest("User2_id cannot be empty");
        }

        if (data.user1_id === data.user2_id) throw new BadRequest("You cannot message yourself");

        const user1: Users | null = await PrismaDb.users.findUnique({
            where: {
                id: data.user1_id,
            },
        });

        if (!user1) {
            throw new BadRequest("The user doesn't exist");
        }

        const user2: Users | null = await PrismaDb.users.findUnique({
            where: {
                id: data.user2_id,
            },
        });

        if (!user2) {
            throw new BadRequest("The user doesn't exist");
        }

        const conversation = await PrismaDb.conversations.findFirst({
            where: {
                OR: [
                    {user1_id: data.user1_id, user2_id: data.user2_id},
                    {user1_id: data.user2_id, user2_id: data.user1_id},
                ],
            },
        });

        if (conversation) {
            return conversationMapper.toAddDto(conversation);
        }

        // Only the recipient following the sender grants direct inbox access.
        const recipientFollowsSender = await PrismaDb.follows.findUnique({
            where: {user_id_follow_user_id: {user_id: data.user2_id, follow_user_id: data.user1_id}},
        });

        const [sortedUser1, sortedUser2] = [data.user1_id, data.user2_id].sort();

        const createData: Prisma.ConversationsUncheckedCreateInput = {
            user1_id: sortedUser1,
            user2_id: sortedUser2,
            initiated_by: data.user1_id,
            status: recipientFollowsSender ? "ACCEPTED" : "PENDING",
        };

        const conversationToCreate = await PrismaDb.conversations.upsert({
            where: {user1_id_user2_id: {user1_id: sortedUser1, user2_id: sortedUser2}},
            create: createData,
            update: {},
        }).catch(async (error) => {
            // Prisma can emulate an empty-update upsert: handle concurrent opens.
            if (error?.code !== "P2002") throw error;
            const existing = await PrismaDb.conversations.findUnique({
                where: {user1_id_user2_id: {user1_id: sortedUser1, user2_id: sortedUser2}},
            });
            if (!existing) throw error;
            return existing;
        });

        return conversationMapper.toAddDto(conversationToCreate);
    }

    async getAll(): Promise<ConversationResponseDto[]> {
        const conversations: Conversations[] =
            await PrismaDb.conversations.findMany({
                orderBy: {
                    created_at: "desc",
                },
            });
        return conversationMapper.toDtoList(conversations);
    }

    async getById(id: string): Promise<ConversationResponseDto> {
        if (isEmptyString(id)) {
            throw new BadRequest("ID cannot be empty");
        }

        const conversation: Conversations | null =
            await PrismaDb.conversations.findUnique({
                where: {
                    id,
                },
            });

        if (!conversation) {
            throw new NotFound("Conversation not found");
        }

        return conversationMapper.toDto(conversation);
    }

    async getUserConversations(
        userId: string,
        includeId?: string,
    ): Promise<UserConversationResponseDto[]> {
        const conversations = await PrismaDb.conversations.findMany({
            where: {
                AND: [
                    {OR: [{user1_id: userId}, {user2_id: userId}]},
                    {OR: [{messages: {some: {}}}, {initiated_by: userId}, ...(includeId ? [{id: includeId}] : [])]},
                ],
            },
            orderBy: {
                created_at: "desc",
            },
            select: {
                id: true,
                status: true,
                initiated_by: true,
                invitation_sent: true,
                user1: {
                    select: {
                        id: true,
                        username: true,
                        pseudo: true,
                        profile_picture: true,
                        role: true,
                        equipped_avatar_border: true,
                        equipped_font: true,
                        equipped_text_effect: true,
                    },
                },
                user2: {
                    select: {
                        id: true,
                        username: true,
                        pseudo: true,
                        profile_picture: true,
                        role: true,
                        equipped_avatar_border: true,
                        equipped_font: true,
                        equipped_text_effect: true,
                    },
                },
                messages: {
                    orderBy: {created_at: "desc"},
                    take: 1,
                    select: {content: true, created_at: true},
                },
                _count: {
                    select: {
                        messages: {where: {is_read: false, sender_id: {not: userId}}},
                    },
                },
            },
        });

        return conversations.map((conv) => ({
            id: conv.id,
            status: conv.status,
            initiated_by: conv.initiated_by,
            invitation_sent: conv.invitation_sent,
            messages: conv.messages,
            _count: conv.status === "DECLINED" ? {messages: 0} : conv._count,
            user1: {
                id: conv.user1.id,
                username: conv.user1.username,
                pseudo: conv.user1.pseudo,
                role: conv.user1.role,
                profile_picture: bufferToImageDataUri(conv.user1.profile_picture),
                equipped_avatar_border: conv.user1.equipped_avatar_border,
                equipped_font: conv.user1.equipped_font,
                equipped_text_effect: conv.user1.equipped_text_effect,
            },
            user2: {
                id: conv.user2.id,
                username: conv.user2.username,
                pseudo: conv.user2.pseudo,
                role: conv.user2.role,
                profile_picture: bufferToImageDataUri(conv.user2.profile_picture),
                equipped_avatar_border: conv.user2.equipped_avatar_border,
                equipped_font: conv.user2.equipped_font,
                equipped_text_effect: conv.user2.equipped_text_effect,
            },
        }));
    }

    async update(): Promise<null> {
        return null;
    }

    async delete(id: string): Promise<ConversationResponseDeleteDto> {
        if (isEmptyString(id)) {
            throw new BadRequest("ID cannot be empty");
        }

        const conversation: Conversations | null =
            await PrismaDb.conversations.findUnique({
                where: {
                    id,
                },
            });

        if (!conversation) {
            throw new NotFound("Conversation not found");
        }

        const conversationToDelete: Conversations =
            await PrismaDb.conversations.delete({
                where: {
                    id,
                },
            });

        return conversationMapper.toDeleteDto(conversationToDelete);
    }
}

export const conversationService = new ConversationService();
