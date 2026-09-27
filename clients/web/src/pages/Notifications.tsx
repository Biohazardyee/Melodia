import {useEffect, useRef, useState} from "react";
import {useTranslation} from "react-i18next";
import {useSearchParams} from "react-router-dom";
import {Bell, CheckCheck, ChevronLeft, ChevronRight, Inbox, RefreshCw} from "lucide-react";
import {toast} from "react-toastify";
import apiClient from "../api/client";
import {useSocket} from "../context/SocketContext";
import NotificationItem, {type AppNotification} from "../components/notifications/NotificationItem";

type Filter = "all" | "unread" | "updates";
type InboxResult = {notifications: AppNotification[]; page: number; limit: number; total: number; totalPages: number; allCount: number; unreadCount: number; updatesCount: number};

export default function Notifications() {
    const {t, i18n} = useTranslation();
    const socket = useSocket();
    const [params, setParams] = useSearchParams();
    const filter: Filter = params.get("filter") === "unread" ? "unread" : params.get("filter") === "updates" ? "updates" : "all";
    const requestedPage = Number(params.get("page") || 1);
    const page = Number.isInteger(requestedPage) && requestedPage > 0 && requestedPage <= 100000 ? requestedPage : 1;
    const [result, setResult] = useState<InboxResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [revision, setRevision] = useState(0);
    const [busy, setBusy] = useState(false);
    const actionLock = useRef(false);
    const listTop = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const controller = new AbortController();
        setLoading(true); setError(false);
        apiClient.get<InboxResult>("/notifications/inbox", {params: {page, limit: 12, filter}, signal: controller.signal})
            .then(({data}) => {if (!controller.signal.aborted) setResult(data);})
            .catch(() => {if (!controller.signal.aborted) setError(true);})
            .finally(() => {if (!controller.signal.aborted) setLoading(false);});
        return () => controller.abort();
    }, [page, filter, revision]);

    useEffect(() => {
        if (!socket) return;
        const refresh = () => setRevision(value => value + 1);
        socket.on("notification_received", refresh);
        socket.on("connect", refresh);
        return () => {socket.off("notification_received", refresh); socket.off("connect", refresh);};
    }, [socket]);

    const changePage = (nextPage: number, nextFilter = filter) => {
        setParams({filter: nextFilter, page: String(nextPage)});
        listTop.current?.scrollIntoView({block: "start"});
        listTop.current?.focus({preventScroll: true});
    };
    const markRead = async (notification?: AppNotification) => {
        if (actionLock.current || notification?.is_read) return;
        actionLock.current = true; setBusy(true);
        try {
            if (notification) await apiClient.put(`/notifications/${notification.id}`, {is_read: true});
            else await apiClient.put("/notifications/read-all");
            window.dispatchEvent(new CustomEvent("notificationsRead"));
            setRevision(value => value + 1);
        } catch {toast.error(t("inbox_write_error"));}
        finally {actionLock.current = false; setBusy(false);}
    };

    const groups = new Map<string, AppNotification[]>();
    for (const item of result?.notifications || []) {
        const date = new Date(item.created_at);
        const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        groups.set(key, [...(groups.get(key) || []), item]);
    }
    const groupLabel = (dateString: string) => {
        const date = new Date(dateString), yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (date.toDateString() === new Date().toDateString()) return t("today");
        if (date.toDateString() === yesterday.toDateString()) return t("yesterday");
        return date.toLocaleDateString(i18n.language, {day: "numeric", month: "long", year: "numeric"});
    };
    const currentPage = result?.page || page;
    const totalPages = result?.totalPages || 1;
    const firstPage = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
    const pageNumbers = Array.from({length: Math.min(5, totalPages)}, (_, index) => firstPage + index);
    const filters: {id: Filter; label: string; count?: number}[] = [
        {id: "all", label: t("tab_all"), count: result?.allCount},
        {id: "unread", label: t("tab_unread"), count: result?.unreadCount},
        {id: "updates", label: t("inbox_for_you"), count: result?.updatesCount},
    ];

    return <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 sm:py-12 text-ink">
        <header className="relative overflow-hidden rounded-3xl border border-line bg-panel p-6 sm:p-9 mb-8">
            <div aria-hidden="true" className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl"/>
            <div className="relative flex flex-col sm:flex-row sm:items-start justify-between gap-6">
                <div>
                    <p className="text-accent text-[11px] font-semibold tracking-[0.18em] uppercase flex items-center gap-2"><Bell size={14}/>{t("inbox_eyebrow")}</p>
                    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mt-3">{t("notifications_title")}</h1>
                    <p className="text-muted text-sm leading-relaxed mt-3 max-w-md">{t("inbox_intro")}</p>
                </div>
                <button type="button" disabled={busy || loading || error || !result?.unreadCount} onClick={() => markRead()} className="secondary-action self-start text-sm disabled:opacity-40"><CheckCheck size={17}/>{t("mark_all_read")}</button>
            </div>
            <div className="relative mt-7 flex items-center gap-2 text-xs text-muted" aria-live="polite"><span aria-hidden="true" className={`h-2 w-2 rounded-full ${result?.unreadCount ? "bg-violet-500" : "bg-emerald-500"}`}/>{loading ? t("loading") : error ? t("inbox_unavailable") : result?.unreadCount ? t("inbox_unread_count", {count: result.unreadCount}) : t("inbox_caught_up")}</div>
        </header>

        <div ref={listTop} tabIndex={-1} className="scroll-mt-6 outline-none">
            <nav aria-label={t("inbox_filters")} className="flex flex-wrap gap-2 mb-6">
                {filters.map(item => <button key={item.id} type="button" onClick={() => changePage(1, item.id)} aria-pressed={filter === item.id}
                    className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500 ${filter === item.id ? "bg-violet-500/10 border-violet-500/30 text-accent" : "bg-panel border-line text-muted hover:text-ink"}`}>
                    {item.label}<span className="rounded-full bg-raised px-2 py-0.5 text-[11px] tabular-nums">{item.count ?? "—"}</span>
                </button>)}
            </nav>

            {loading ? <div role="status" aria-label={t("loading")} className="rounded-2xl border border-line bg-panel overflow-hidden divide-y divide-line">{Array.from({length: 6}, (_, index) => <div key={index} className="flex gap-4 p-6"><div className="skeleton h-12 w-12 shrink-0 rounded-full"/><div className="flex-1 space-y-3 pt-1"><div className="skeleton h-3 w-1/3 rounded"/><div className="skeleton h-3 w-3/4 rounded"/></div></div>)}</div>
                : error ? <div role="alert" className="rounded-2xl border border-line bg-panel p-10 text-center"><Bell size={30} className="mx-auto text-muted mb-4"/><p>{t("inbox_load_error")}</p><button className="secondary-action mt-5 mx-auto" onClick={() => setRevision(value => value + 1)}><RefreshCw size={16}/>{t("inbox_retry")}</button></div>
                : !result?.total ? <div className="rounded-3xl border border-dashed border-line bg-panel p-10 sm:p-16 text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/10 text-accent mb-5"><Inbox size={29}/></div><h2 className="font-semibold text-xl">{t(filter === "unread" ? "inbox_caught_up" : "no_notifications")}</h2><p className="text-muted text-sm mt-3 max-w-sm mx-auto leading-relaxed">{t(filter === "unread" ? "inbox_empty_unread" : "inbox_empty")}</p></div>
                : <>
                    <p className="text-xs text-muted mb-4" role="status">{t("inbox_range", {start: (currentPage - 1) * result.limit + 1, end: Math.min(currentPage * result.limit, result.total), total: result.total})}</p>
                    <div className="space-y-6">{Array.from(groups, ([key, items]) => <section key={key} aria-label={groupLabel(items[0].created_at)}>
                        <h2 className="text-xs uppercase tracking-widest text-muted font-semibold mb-3 px-1">{groupLabel(items[0].created_at)}</h2>
                        <ul className="overflow-hidden rounded-2xl border border-line bg-panel divide-y divide-line">{items.map(notification => <NotificationItem key={notification.id} notification={notification} busy={busy} onRead={() => markRead(notification)}/>)}</ul>
                    </section>)}</div>
                    <nav aria-label={t("inbox_pagination")} className="mt-7 border-t border-line pt-5 flex flex-wrap justify-between items-center gap-3">
                        <button aria-label={t("inbox_previous")} className="secondary-action text-sm disabled:opacity-40" disabled={currentPage === 1} onClick={() => changePage(currentPage - 1)}><ChevronLeft size={16}/><span className="hidden sm:inline">{t("inbox_previous")}</span></button>
                        <div className="flex items-center gap-1">{pageNumbers.map(number => <button key={number} onClick={() => changePage(number)} aria-label={t("inbox_page", {page: number, total: totalPages})} aria-current={number === currentPage ? "page" : undefined} className={`h-9 min-w-9 px-2 rounded-xl text-sm font-semibold ${number === currentPage ? "bg-violet-600 text-white" : "text-muted hover:bg-raised"}`}>{number}</button>)}</div>
                        <button aria-label={t("inbox_next")} className="secondary-action text-sm disabled:opacity-40" disabled={currentPage === totalPages} onClick={() => changePage(currentPage + 1)}><span className="hidden sm:inline">{t("inbox_next")}</span><ChevronRight size={16}/></button>
                        <p className="basis-full text-center text-xs text-muted">{t("inbox_page", {page: currentPage, total: totalPages})}</p>
                    </nav>
                </>}
        </div>
    </div>;
}
