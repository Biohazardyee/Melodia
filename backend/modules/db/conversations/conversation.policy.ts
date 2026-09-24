import {Forbidden} from "../../../utils/errors.js";

type ConversationAccess = {
    user1_id: string;
    user2_id: string;
    status: string;
    initiated_by: string | null;
    invitation_sent: boolean;
};

export function assertParticipant(conversation: ConversationAccess, userId: string): void {
    if (conversation.user1_id !== userId && conversation.user2_id !== userId) {
        throw new Forbidden("Conversation access denied");
    }
}

export function assertCanSend(conversation: ConversationAccess, userId: string): void {
    assertParticipant(conversation, userId);
    if (conversation.status === "ACCEPTED") return;
    if (conversation.status === "PENDING" && conversation.initiated_by === userId && !conversation.invitation_sent) return;
    throw new Forbidden("MESSAGE_REQUEST_REQUIRED");
}

export function assertCanRespond(conversation: ConversationAccess, userId: string): void {
    assertParticipant(conversation, userId);
    if (!conversation.initiated_by || conversation.initiated_by === userId) {
        throw new Forbidden("Only the recipient can respond to a message request");
    }
}
