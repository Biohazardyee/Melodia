import {useEffect, useRef, useState} from "react";
import {useBeforeUnload, useSearchParams} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {BookHeart, Headphones, LockKeyhole, Plus, Search, Star, Pencil, Trash2} from "lucide-react";
import {toast} from "react-toastify";
import {jwtDecode} from "jwt-decode";
import {readJournalDraft, rememberJournalDraft} from "../utils/journalDraft";
import apiClient from "../api/client";
import {useConfirm} from "../context/ConfirmContext";
import JournalForm, {emptyDraft, moods, type JournalDraft, type JournalEntry} from "../components/journal/JournalForm";

type JournalResult = {entries: JournalEntry[]; total: number; page: number; hasMore: boolean; averageRating: number | null};

export default function Journal() {
    const {t, i18n} = useTranslation();
    const [params, setParams] = useSearchParams();
    const confirm = useConfirm();
    const [draftOwner] = useState(() => {try {return jwtDecode<{id: string}>(localStorage.getItem("token") || "").id;} catch {return "";}});
    const [restored] = useState(() => readJournalDraft(draftOwner));
    const [draft, setDraft] = useState<JournalDraft>(() => restored?.draft || ({...emptyDraft(), title: (params.get("title") || "").slice(0, 200), artist: (params.get("artist") || "").slice(0, 200)}));
    const [editorOpen, setEditorOpen] = useState(!!restored || params.has("title"));
    const [editingId, setEditingId] = useState<string | null>(restored?.editingId || null);
    const [dirty, setDirty] = useState(!!restored);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [month, setMonth] = useState("");
    const [mood, setMood] = useState("");
    const [search, setSearch] = useState("");
    const [query, setQuery] = useState("");
    const [page, setPage] = useState(1);
    const [revision, setRevision] = useState(0);
    const [result, setResult] = useState<JournalResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const editorRef = useRef<HTMLDivElement>(null);
    useBeforeUnload(event => {if (dirty) {event.preventDefault(); event.returnValue = "";}});
    useEffect(() => {
        if (draftOwner) rememberJournalDraft(draftOwner, dirty ? {draft, editingId} : null);
    }, [draftOwner, draft, editingId, dirty]);

    useEffect(() => {
        const controller = new AbortController();
        setLoading(true); setFailed(false);
        apiClient.get<JournalResult>("/journal", {params: {month, mood, q: query, page}, signal: controller.signal})
            .then(({data}) => {if (!controller.signal.aborted) setResult(data);})
            .catch(() => {if (!controller.signal.aborted) setFailed(true);})
            .finally(() => {if (!controller.signal.aborted) setLoading(false);});
        return () => controller.abort();
    }, [month, mood, query, page, revision]);

    const canDiscard = async () => !dirty || await confirm({title: t("journal_discard_title"), message: t("journal_discard"), confirmText: t("journal_discard_yes"), danger: true});
    const openEditor = async (entry?: JournalEntry) => {
        if (saving || !await canDiscard()) return;
        setDraft(entry ? {title: entry.title, artist: entry.artist, listened_on: entry.listened_on, mood: entry.mood, rating: entry.rating, note: entry.note} : emptyDraft());
        setEditingId(entry?.id || null); setDirty(false); setEditorOpen(true);
        requestAnimationFrame(() => editorRef.current?.scrollIntoView({block: "start"}));
    };
    const save = async () => {
        if (saving) return;
        setSaving(true);
        try {
            if (editingId) await apiClient.put(`/journal/${editingId}`, draft);
            else await apiClient.post("/journal", draft);
            setEditorOpen(false); setDirty(false); setEditingId(null); setDraft(emptyDraft());
            setParams({}, {replace: true}); setPage(1); setRevision(r => r + 1);
            toast.success(t("journal_saved"));
        } catch {toast.error(t("journal_save_error"));}
        finally {setSaving(false);}
    };
    const remove = async (entry: JournalEntry) => {
        if (deleting || saving) return;
        if (!await confirm({title: t("journal_delete"), message: t("journal_delete_confirm", {title: entry.title}), confirmText: t("journal_delete"), danger: true})) return;
        setDeleting(entry.id);
        try {
            await apiClient.delete(`/journal/${entry.id}`);
            if (editingId === entry.id) {setEditorOpen(false); setDirty(false); setEditingId(null);}
            if (result?.entries.length === 1 && page > 1) setPage(p => p - 1);
            else setRevision(r => r + 1);
        } catch {toast.error(t("journal_save_error"));}
        finally {setDeleting(null);}
    };
    const dateLabel = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString(i18n.language, {day: "numeric", month: "long", year: "numeric"});
    const reset = () => {setMonth(""); setMood(""); setSearch(""); setQuery(""); setPage(1);};

    return <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 sm:py-12 text-ink space-y-8">
        <header className="relative overflow-hidden rounded-3xl border border-line bg-panel p-6 sm:p-10">
            <div aria-hidden="true" className="absolute -right-12 -top-16 w-64 h-64 rounded-full bg-violet-500/10 blur-3xl"/>
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-accent"><LockKeyhole size={14}/>{t("journal_private")}</span>
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight mt-4">{t("journal_title")}</h1>
            <p className="text-muted mt-4 max-w-xl leading-relaxed">{t("journal_intro")}</p>
            <button className="primary-action mt-6 relative" onClick={() => openEditor()}><Plus size={18}/>{t("journal_new")}</button>
        </header>

        {editorOpen && <div ref={editorRef} className="scroll-mt-4"><JournalForm draft={draft} onChange={value => {setDraft(value); setDirty(true);}} onSave={save} onCancel={async () => {if (await canDiscard()) {setEditorOpen(false); setDirty(false); setParams({}, {replace: true});}}} saving={saving} editing={!!editingId}/></div>}

        <section aria-label={t("journal_filters")} className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
                <form className="flex flex-1 min-w-48 gap-2" onSubmit={e => {e.preventDefault(); setQuery(search.trim()); setPage(1);}}><input aria-label={t("journal_search")} placeholder={t("journal_search")} maxLength={200} value={search} onChange={e => setSearch(e.target.value)} className="w-full min-w-0 rounded-xl border border-line bg-panel p-3"/><button className="icon-button" aria-label={t("journal_search")}><Search size={18}/></button></form>
                <label className="text-xs text-muted">{t("journal_month")}<input aria-label={t("journal_month")} type="month" value={month} onChange={e => {setMonth(e.target.value); setPage(1);}} className="block mt-1 rounded-xl border border-line bg-panel p-3 text-sm text-ink"/></label>
                <label className="text-xs text-muted">{t("journal_mood")}<select value={mood} onChange={e => {setMood(e.target.value); setPage(1);}} className="block mt-1 rounded-xl border border-line bg-panel p-3 text-sm text-ink"><option value="">{t("journal_all_moods")}</option>{moods.map(m => <option key={m} value={m}>{t(`journal_mood_${m}`)}</option>)}</select></label>
                {(month || mood || query) && <button className="secondary-action" onClick={reset}>{t("journal_reset")}</button>}
            </div>
            {!loading && !failed && result && <div className="flex flex-wrap gap-5 text-sm text-muted" aria-live="polite"><span className="flex items-center gap-2"><Headphones size={16}/>{t("journal_count", {count: result.total})}</span>{result.averageRating !== null && <span className="flex items-center gap-2"><Star size={16}/>{t("journal_average")} {result.averageRating.toLocaleString(i18n.language, {maximumFractionDigits: 1})} / 5</span>}</div>}
        </section>

        {loading ? <div role="status" aria-label={t("loading")} className="space-y-4">{[0, 1, 2].map(n => <div key={n} className="skeleton h-36 rounded-2xl"/>)}</div> : failed ? <div role="alert" className="p-8 rounded-2xl bg-panel border border-line"><p>{t("journal_load_error")}</p><button className="secondary-action mt-4" onClick={() => setRevision(r => r + 1)}>{t("journal_retry")}</button></div> : !result?.entries.length ? <div className="text-center py-16 border border-dashed border-line rounded-3xl"><BookHeart size={40} className="mx-auto text-accent mb-4"/><h2 className="text-xl font-bold">{t(month || mood || query ? "journal_no_results" : "journal_empty")}</h2><p className="text-muted mt-2">{t("journal_empty_hint")}</p></div> : <section aria-label={t("journal_timeline")} className="space-y-5">
            {result.entries.map((entry, index) => <div key={entry.id}>
                {(index === 0 || result.entries[index - 1].listened_on !== entry.listened_on) && <h2 className="text-sm font-semibold text-muted mb-3 mt-6"><time dateTime={entry.listened_on}>{dateLabel(entry.listened_on)}</time></h2>}
                <article className="rounded-2xl bg-panel border border-line p-5 sm:p-6">
                    <div className="flex gap-4 items-start"><div className="rounded-2xl bg-violet-500/10 text-accent p-3 shrink-0"><Headphones size={22}/></div><div className="min-w-0 flex-1"><h3 className="text-lg font-bold break-words">{entry.title}</h3>{entry.artist && <p className="text-muted break-words">{entry.artist}</p>}</div><div className="flex shrink-0"><button className="icon-button" disabled={saving || !!deleting} aria-label={t("journal_edit") + ": " + entry.title} onClick={() => openEditor(entry)}><Pencil size={16}/></button><button className="icon-button" disabled={saving || !!deleting} aria-label={t("journal_delete") + ": " + entry.title} onClick={() => remove(entry)}><Trash2 size={16}/></button></div></div>
                    <div className="flex gap-3 mt-4 text-xs"><span className="rounded-full bg-raised px-3 py-1.5">{t(`journal_mood_${entry.mood}`)}</span>{entry.rating !== null && <span className="inline-flex items-center gap-1 text-amber-500"><Star size={14}/>{entry.rating} / 5</span>}</div>
                    {entry.note && <p className="mt-4 whitespace-pre-wrap break-words leading-relaxed text-sm">{entry.note}</p>}
                </article>
            </div>)}
            <nav aria-label={t("journal_pages")} className="flex justify-between items-center pt-4"><button className="secondary-action" disabled={page === 1} onClick={() => setPage(p => p - 1)}>{t("journal_previous")}</button><span className="text-sm text-muted">{page} / {Math.max(1, Math.ceil(result.total / 30))}</span><button className="secondary-action" disabled={!result.hasMore} onClick={() => setPage(p => p + 1)}>{t("journal_next")}</button></nav>
        </section>}
    </div>;
}
