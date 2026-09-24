import {useEffect, useRef} from "react";
import {useTranslation} from "react-i18next";

export const moods = ["calm", "happy", "energetic", "melancholy", "focused", "nostalgic"] as const;
export type JournalDraft = {title: string; artist: string; listened_on: string; mood: string; rating: number | null; note: string};
export type JournalEntry = JournalDraft & {id: string; created_at: string};
export const today = () => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
export const emptyDraft = (): JournalDraft => ({title: "", artist: "", listened_on: today(), mood: "calm", rating: null, note: ""});

export default function JournalForm({draft, onChange, onSave, onCancel, saving, editing}: {
    draft: JournalDraft; onChange: (draft: JournalDraft) => void; onSave: () => void; onCancel: () => void; saving: boolean; editing: boolean;
}) {
    const {t} = useTranslation();
    const titleRef = useRef<HTMLInputElement>(null);
    useEffect(() => {titleRef.current?.focus();}, []);
    const field = "mt-2 w-full rounded-xl border border-line bg-canvas px-3 py-2.5 text-ink focus:outline-none focus:ring-2 focus:ring-violet-500";
    return <form onSubmit={e => {e.preventDefault(); onSave();}} className="bg-panel border border-line rounded-2xl p-5 sm:p-7 space-y-5" aria-label={t("journal_editor")}>
        <h2 className="text-xl font-bold">{t(editing ? "journal_edit" : "journal_new")}</h2>
        <fieldset disabled={saving} className="grid gap-4 sm:grid-cols-2 disabled:opacity-60">
            <label className="text-sm">{t("journal_music")}<input ref={titleRef} required maxLength={200} value={draft.title} onChange={e => onChange({...draft, title: e.target.value})} className={field} placeholder={t("journal_music_placeholder")}/></label>
            <label className="text-sm">{t("journal_artist")}<input maxLength={200} value={draft.artist} onChange={e => onChange({...draft, artist: e.target.value})} className={field}/></label>
            <label className="text-sm">{t("journal_date")}<input type="date" required value={draft.listened_on} onChange={e => onChange({...draft, listened_on: e.target.value})} className={field}/></label>
            <label className="text-sm">{t("journal_mood")}<select value={draft.mood} onChange={e => onChange({...draft, mood: e.target.value})} className={field}>{moods.map(mood => <option key={mood} value={mood}>{t(`journal_mood_${mood}`)}</option>)}</select></label>
            <label className="text-sm">{t("journal_rating")}<select value={draft.rating ?? ""} onChange={e => onChange({...draft, rating: e.target.value ? Number(e.target.value) : null})} className={field}><option value="">{t("journal_unrated")}</option>{[1, 2, 3, 4, 5].map(n => <option value={n} key={n}>{n} / 5</option>)}</select></label>
            <label className="text-sm sm:col-span-2">{t("journal_note")}<textarea rows={5} maxLength={4000} value={draft.note} onChange={e => onChange({...draft, note: e.target.value})} className={field + " resize-y min-h-32"} placeholder={t("journal_note_placeholder")}/><span className="block text-right text-xs text-muted mt-1">{draft.note.length} / 4000</span></label>
        </fieldset>
        <div className="flex flex-wrap gap-3"><button disabled={saving || !draft.title.trim()} className="primary-action" type="submit">{t(saving ? "journal_saving" : "journal_save")}</button><button disabled={saving} type="button" onClick={onCancel} className="secondary-action">{t("journal_cancel")}</button></div>
        <p className="text-xs text-muted">{t("journal_private_hint")}</p>
    </form>;
}
