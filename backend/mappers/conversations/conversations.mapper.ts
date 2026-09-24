import {BaseMapper} from "../base.mapper.js";
import {
    ConversationAddResponseDto, ConversationResponseDeleteDto,
    ConversationResponseDto
} from "../../types/conversations/conversations.dto.js";
import {Conversations, Prisma} from "../../generated/prisma/client.js";


type ConversationWithMessages = Prisma.ConversationsGetPayload<{
    include: { messages: true }
}>;

class ConversationMapper extends BaseMapper<Conversations, ConversationResponseDto> {

    protected mapOne(conversation: ConversationWithMessages): ConversationResponseDto {
        return {
            id: conversation.id,
            user1_id: conversation.user1_id,
            user2_id: conversation.user2_id,
            status: conversation.status,
            initiated_by: conversation.initiated_by,
            invitation_sent: conversation.invitation_sent,
            messages: conversation.messages || [],
            created_at: conversation.created_at,
        }
    }

    toAddDto(conversation: Conversations): ConversationAddResponseDto {
        return {
            id: conversation.id,
            user1_id: conversation.user1_id,
            user2_id: conversation.user2_id,
            created_at: conversation.created_at
        }
    }

    toDeleteDto(conversation: Conversations): ConversationResponseDeleteDto {
        return {
            id: conversation.id,
        }
    }
}

export const conversationMapper = new ConversationMapper();
