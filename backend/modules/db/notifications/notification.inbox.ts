import {PrismaDb} from "../../../config/database.js";
import {BadRequest} from "../../../utils/errors.js";
import type {Prisma} from "../../../generated/prisma/browser.js";
import {notificationsMapper} from "../../../mappers/notifications/notifications.mapper.js";

export function parseInboxQuery(query: Record<string, unknown>) {
    const integer = (value: unknown, fallback: number, max: number) => {
        if (value === undefined) return fallback;
        if (typeof value !== "string" || !/^\d+$/.test(value)) throw new BadRequest("Invalid pagination");
        const number = Number(value);
        if (!Number.isSafeInteger(number) || number < 1 || number > max) throw new BadRequest("Invalid pagination");
        return number;
    };
    const filter = query.filter ?? "all";
    if (filter !== "all" && filter !== "unread" && filter !== "updates") throw new BadRequest("Invalid notification filter");
    return {page: integer(query.page, 1, 100000), limit: integer(query.limit, 12, 50), filter};
}

export async function getInbox(userId: string, query: Record<string, unknown>) {
    const {page: requestedPage, limit, filter} = parseInboxQuery(query);
    const owner = {user_id: userId};
    const updates: Prisma.NotificationsWhereInput = {...owner, action: {in: ["recommendation", "badge_earned"]}};
    const where: Prisma.NotificationsWhereInput = filter === "unread" ? {...owner, is_read: false} : filter === "updates" ? updates : owner;
    return PrismaDb.$transaction(async tx => {
        const allCount = await tx.notifications.count({where: owner});
        const unreadCount = await tx.notifications.count({where: {...owner, is_read: false}});
        const updatesCount = await tx.notifications.count({where: updates});
        const total = filter === "unread" ? unreadCount : filter === "updates" ? updatesCount : allCount;
        const totalPages = Math.max(1, Math.ceil(total / limit));
        const page = Math.min(requestedPage, totalPages);
        const rows = await tx.notifications.findMany({
            where, skip: (page - 1) * limit, take: limit,
            orderBy: [{created_at: "desc"}, {id: "desc"}],
            include: {related_user: {select: {username: true, pseudo: true, profile_picture: true, equipped_avatar_border: true}}},
        });
        return {notifications: notificationsMapper.toDtoList(rows), page, limit, total, totalPages, allCount, unreadCount, updatesCount};
    }, {isolationLevel: "RepeatableRead"});
}

export async function readInbox(userId: string) {
    return PrismaDb.notifications.updateMany({
        where: {user_id: userId, is_read: false},
        data: {is_read: true, read_at: new Date()},
    });
}
