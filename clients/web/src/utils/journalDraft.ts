import type {JournalDraft} from "../components/journal/JournalForm";

type DraftSnapshot = {draft: JournalDraft; editingId: string | null};
// Memory only: survives SPA navigation, never writes private notes to disk.
const drafts = new Map<string, DraftSnapshot>();
export const readJournalDraft = (userId: string) => drafts.get(userId);
export const rememberJournalDraft = (userId: string, draft: DraftSnapshot | null) => {
    if (draft) drafts.set(userId, draft);
    else drafts.delete(userId);
};
