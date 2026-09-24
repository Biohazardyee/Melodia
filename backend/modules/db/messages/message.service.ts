import {PrismaDb} from "../../../config/database.js";
import {BadRequest, NotFound} from "../../../utils/errors.js";
import {
    isEmptyString,
    isValidBoolean,
    isValidStringLength,
} from "../../../utils/helpers.js";
import {
    MessageAddDto,
    MessageAddResponseDto,
    MessageDeleteResponseDto,
    MessageResponseDto,
    MessageUpdateDto,
} from "../../../types/messages/messages.dto.js";
import {
    Conversations,
    Users,
    Prisma,
    Messages,
} from "../../../generated/prisma/client.js";
import {messagesMapper} from "../../../mappers/messages/messages.mapper.js";

import {assertCanSend} from "../conversations/conversation.policy.js";

export class MessageService {
    async create(data: MessageAddDto): Promise<MessageAddResponseDto> {
        if (isEmptyString(data.conversation_id)) {
            throw new BadRequest("ConversationID cannot be empty");
        }

        if (isEmptyString(data.sender_id)) {
            throw new BadRequest("SenderID cannot be empty");
        }

        if (isEmptyString(data.content)) {
            throw new BadRequest("Conversation content cannot be empty");
        }

        if (data.content.length > 1000) throw new BadRequest("Message cannot exceed 1000 characters");

        return PrismaDb.$transaction(async (tx) => {
            // Serialize sends and acceptance: concurrent requests cannot send two invitations.
            await tx.$queryRaw`SELECT id FROM "Conversations" WHERE id = ${data.conversation_id} FOR UPDATE`;
            const conversation: Conversations | null =
                await tx.conversations.findUnique({
                    where: {
                        id: data.conversation_id,
                    },
                });

            if (!conversation) {
                throw new BadRequest("Conversation not found");
            }

            assertCanSend(conversation, data.sender_id);

            const sender: Users | null = await tx.users.findUnique({
                where: {
                    id: data.sender_id,
                },
            });

            if (!sender) {
                throw new BadRequest("Sender not found");
            }

            const createData: Prisma.MessagesUncheckedCreateInput = {
                conversation_id: data.conversation_id,
                sender_id: data.sender_id,
                content: data.content,
            };

            const message: Messages = await tx.messages.create({
                data: createData,
            });

            if (conversation.status === "PENDING") {
                await tx.conversations.update({where: {id: conversation.id}, data: {invitation_sent: true}});
            }
            return messagesMapper.toAddDto(message);
        });
    }

    async getAll(): Promise<MessageResponseDto[]> {
        const messages: Messages[] = await PrismaDb.messages.findMany({
            orderBy: {
                created_at: "desc",
            },
        });

        return messagesMapper.toDtoList(messages);
    }

    async getById(id: string): Promise<MessageResponseDto> {
        if (isEmptyString(id)) {
            throw new BadRequest("Message id is required");
        }

        const message: Messages | null = await PrismaDb.messages.findUnique({
            where: {
                id,
            },
        });

        if (!message) {
            throw new NotFound("Report not found");
        }

        return messagesMapper.toDto(message);
    }

    async getByConversationId(
        conversationId: string,
    ): Promise<MessageResponseDto[]> {
        if (isEmptyString(conversationId)) {
            throw new BadRequest("Conversation ID is required");
        }

        const messages = await PrismaDb.messages.findMany({
            where: {
                conversation_id: conversationId,
            },
            orderBy: {
                created_at: "desc",
            },
        });

        return messagesMapper.toDtoList(messages);
    }

    async update(
        id: string,
        data: MessageUpdateDto,
    ): Promise<MessageResponseDto> {
        if (isEmptyString(id)) {
            throw new BadRequest("Message id cannot be empty");
        }

        const message: Messages | null = await PrismaDb.messages.findUnique({
            where: {
                id,
            },
        });

        if (!message) {
            throw new NotFound("Message not found");
        }

        const updateData: Prisma.MessagesUpdateInput = {};

        if (data.content !== undefined) {
            if (isEmptyString(data.content)) {
                throw new BadRequest("Content cannot be empty");
            }
            if (!isValidStringLength(data.content, 1000)) {
                throw new BadRequest("Content cannot be much than 1000 characters");
            }
            updateData.content = data.content;
        }

        if (data.is_read) {
            if (!isValidBoolean(data.is_read)) {
                throw new BadRequest("is_read must be a boolean");
            }
            updateData.is_read = data.is_read;
        }

        const messageToUpdate: Messages = await PrismaDb.messages.update({
            where: {
                id,
            },
            data: updateData,
        });

        return messagesMapper.toDto(messageToUpdate);
    }

    async delete(id: string): Promise<MessageDeleteResponseDto> {
        if (isEmptyString(id)) {
            throw new BadRequest("Message id cannot be empty");
        }

        const message: Messages | null = await PrismaDb.messages.findUnique({
            where: {
                id,
            },
        });

        if (!message) {
            throw new NotFound("Message not found");
        }

        const messageToDelete: Messages = await PrismaDb.messages.delete({
            where: {
                id,
            },
        });

        return messagesMapper.toDeleteDto(messageToDelete);
    }
}

export const messageService = new MessageService();
