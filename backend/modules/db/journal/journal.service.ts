import {PrismaDb} from "../../../config/database.js";
import {Prisma} from "../../../generated/prisma/client.js";
import {NotFound} from "../../../utils/errors.js";
import {parseJournalEntry, parseJournalQuery} from "./journal.validation.js";

export class JournalService {
    async list(userId: string, query: Record<string, unknown>) {
        const {q, month, mood, page} = parseJournalQuery(query);
        const where: Prisma.JournalEntriesWhereInput = {
            user_id: userId,
            ...(month ? {listened_on: {startsWith: month + "-"}} : {}),
            ...(mood ? {mood} : {}),
            ...(q ? {OR: ["title", "artist", "note"].map(key => ({[key]: {contains: q, mode: "insensitive"}}))} : {}),
        };
        const [entries, total, stats] = await PrismaDb.$transaction([
            PrismaDb.journalEntries.findMany({where, orderBy: [{listened_on: "desc"}, {created_at: "desc"}, {id: "desc"}], skip: (page - 1) * 30, take: 30}),
            PrismaDb.journalEntries.count({where}),
            PrismaDb.journalEntries.aggregate({where, _avg: {rating: true}}),
        ]);
        return {entries, total, page, hasMore: page * 30 < total, averageRating: stats._avg.rating};
    }

    async create(userId: string, input: unknown) {
        return PrismaDb.journalEntries.create({data: {...parseJournalEntry(input), user_id: userId}});
    }

    async update(userId: string, id: string, input: unknown) {
        // Ownership is part of the write itself; never trust user_id from the body.
        const result = await PrismaDb.journalEntries.updateMany({where: {id, user_id: userId}, data: parseJournalEntry(input)});
        if (!result.count) throw new NotFound("Journal entry not found");
    }

    async delete(userId: string, id: string) {
        const result = await PrismaDb.journalEntries.deleteMany({where: {id, user_id: userId}});
        if (!result.count) throw new NotFound("Journal entry not found");
    }
}

export const journalService = new JournalService();
