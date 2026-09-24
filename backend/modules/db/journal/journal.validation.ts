import {BadRequest} from "../../../utils/errors.js";

export const JOURNAL_MOODS = ["calm", "happy", "energetic", "melancholy", "focused", "nostalgic"] as const;

export function parseJournalEntry(input: unknown) {
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new BadRequest("Invalid journal entry");
    const value = input as Record<string, unknown>;
    const text = (key: string, max: number, required = false) => {
        const raw = value[key];
        if (typeof raw !== "string" || raw.length > max || (required && !raw.trim())) throw new BadRequest(`Invalid ${key}`);
        return raw.trim();
    };
    const listened_on = text("listened_on", 10, true);
    const date = new Date(`${listened_on}T12:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(listened_on) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== listened_on) {
        throw new BadRequest("Invalid listening date");
    }
    const mood = text("mood", 20, true);
    if (!(JOURNAL_MOODS as readonly string[]).includes(mood)) throw new BadRequest("Invalid mood");
    const rating = value.rating;
    if (rating !== null && (!Number.isInteger(rating) || Number(rating) < 1 || Number(rating) > 5)) throw new BadRequest("Invalid rating");
    return {title: text("title", 200, true), artist: text("artist", 200), listened_on, mood, rating: rating as number | null, note: text("note", 4000)};
}

export function parseJournalQuery(input: Record<string, unknown>) {
    const q = typeof input.q === "string" ? input.q.trim().slice(0, 200) : "";
    const month = typeof input.month === "string" ? input.month : "";
    const mood = typeof input.mood === "string" ? input.mood : "";
    if (month && !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new BadRequest("Invalid month");
    if (mood && !(JOURNAL_MOODS as readonly string[]).includes(mood)) throw new BadRequest("Invalid mood");
    const page = input.page === undefined ? 1 : Number(input.page);
    if (!Number.isSafeInteger(page) || page < 1 || page > 10000) throw new BadRequest("Invalid page");
    return {q, month, mood, page};
}
