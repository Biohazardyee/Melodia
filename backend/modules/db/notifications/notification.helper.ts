import {PrismaDb} from "../../../config/database.js";
import {NotificationActions} from "../../../generated/prisma/enums";

export function generateNotificationContent(notif: any) {
    const sender = notif.related_user?.pseudo || notif.related_user?.username || "Quelqu'un";

    switch (notif.action) {
        case "new_follow":
            return {
                title: "Nouvel abonné !",
                body: `${sender} a commencé à vous suivre !`,
            };
        case "like_added":
            return {
                title: "Nouveau Like",
                body: `${sender} a aimé votre critique !`,
            };
        case "comment_added":
            return {
                title: "Nouveau commentaire",
                body: `${sender} a commenté votre publication !`,
            };
        case "recommendation":
            return {
                title: "Recommandation",
                body: `${sender} vous recommande un média !`,
            };
        case "badge_earned":
            return {
                title: "Nouveau badge débloqué !",
                body: "Tu as débloqué un nouveau badge, va voir ton profil !",
            };
        case "playlist_collaborator_added":
            return {
                title: "Playlist partagée",
                body: `${sender} t'a ajouté comme collaborateur sur une playlist !`,
            };
        case "room_invited":
            return {
                title: "Invitation à un salon d'écoute",
                body: `${sender} t'invite à rejoindre un salon d'écoute !`,
            };
        case "review_added":
            return {
                title: "Nouvelle critique",
                body: `${sender} a publié une nouvelle critique !`,
            };
        case "new_message":
            const messagePreview: string = notif.content ? `: ${notif.content}` : "";
            return {
                title: "Nouveau message",
                body: `Message de ${sender}${messagePreview}`,
            };
        default:
            return {
                title: "Nouvelle activité",
                body: "Vous avez une nouvelle notification !",
            };
    }
}

export async function getFollowerTokens(
    targetUserId: string,
): Promise<string[]> {
    const followers = await PrismaDb.follows.findMany({
        where: {follow_user_id: targetUserId},
        select: {
            user: {
                select: {expo_push_token: true},
            },
        },
    });

    return followers
        .map((f): string | null => f.user.expo_push_token)
        .filter((token: string | null): token is string => !!token);
}

export const truncateContent = (content: string, maxLength: number = 40): string => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + "...";
};

export async function canSendNotification(
    userId: string,
    relatedUserId: string,
    action: NotificationActions,
    minutes: number = 5,
): Promise<boolean> {
    const fiveMinutesAgo = new Date(Date.now() - minutes * 60 * 1000);

    const recentNotification = await PrismaDb.notifications.findFirst({
        where: {
            user_id: userId,
            related_user_id: relatedUserId,
            action: action,
            created_at: {
                gte: fiveMinutesAgo,
            },
        },
    });

    return !recentNotification;
}
