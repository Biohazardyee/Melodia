import {useEffect, useMemo, useRef, useState} from "react";
import {Link, useSearchParams} from "react-router-dom";
import {Search, Loader2, Disc3, ArrowUpRight, Radio, Library, AlertCircle} from "lucide-react";
import {useTranslation} from "react-i18next";
import {AlbumCard} from "../components/AlbumCard";
import apiClient from "../api/client";

type Album = {id: string; title: string; artist: string; cover: string; rating: number; mbid?: string};
type Mode = "artist" | "album";
const PLACEHOLDER = "/melodia_placeholder.png";

export default function Home() {
    const {t} = useTranslation();
    const [params, setParams] = useSearchParams();
    const activeQuery = params.get("q")?.trim() || "";
    const activeMode: Mode = params.get("mode") === "album" ? "album" : "artist";
    const [query, setQuery] = useState(activeQuery);
    const [mode, setMode] = useState<Mode>(activeMode);
    const [albums, setAlbums] = useState<Album[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const [sort, setSort] = useState("relevance");
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [retry, setRetry] = useState(0);
    const request = useRef<AbortController | null>(null);

    async function search(searchText: string, searchMode: Mode, nextPage = 1) {
        request.current?.abort();
        const controller = new AbortController();
        request.current = controller;
        setLoading(true);
        setError(false);
        if (nextPage === 1) {setAlbums([]); setHasMore(false); setPage(1);}
        try {
            const url = searchMode === "artist"
                ? `/api/artists/info/top-albums?artist=${encodeURIComponent(searchText)}&page=${nextPage}`
                : `/api/search?query=${encodeURIComponent(searchText)}&page=${nextPage}`;
            const response = await apiClient.get(url, {signal: controller.signal});
            const raw = searchMode === "artist"
                ? response.data?.topAlbums?.topalbums?.album
                : response.data?.searchResults?.results?.albummatches?.album;
            const fetched: Album[] = (Array.isArray(raw) ? raw : []).map((a: any) => {
                const artist = typeof a.artist === "string" ? a.artist : a.artist?.name || t("unknown_artist");
                return {id: a.mbid || `album:${artist}:${a.name}`, title: a.name, artist,
                    cover: a.image?.find((i: any) => i.size === "extralarge")?.["#text"] || a.image?.[2]?.["#text"] || PLACEHOLDER,
                    rating: 0, mbid: a.mbid || ""};
            });
            let result = fetched;
            if (fetched.length) {
                try {
                    const synced = await apiClient.post("/medias/sync-search", {
                        albums: fetched.map(a => ({api_id: a.id, name: a.title, artist: a.artist, cover: a.cover, mbid: a.mbid}))
                    }, {signal: controller.signal});
                    const data = synced.data.medias || synced.data;
                    if (Array.isArray(data) && data.length) {
                        result = data.map((a: any) => ({id: a.id, title: a.name, artist: a.artist,
                            cover: a.cover || PLACEHOLDER, rating: Number(a.rating) || 0, mbid: a.mbid || ""}));
                    }
                } catch {
                    // Discovery still works when optional database synchronization fails.
                }
            }
            if (controller.signal.aborted) return;
            setAlbums(previous => {
                const all = nextPage === 1 ? result : [...previous, ...result];
                return [...new Map(all.map(a => [a.id, a])).values()];
            });
            setHasMore(fetched.length >= 50);
            setPage(nextPage);
        } catch {
            if (!controller.signal.aborted) setError(true);
        } finally {
            if (!controller.signal.aborted) setLoading(false);
        }
    }

    useEffect(() => {
        setQuery(activeQuery);
        setMode(activeMode);
        if (activeQuery) void search(activeQuery, activeMode);
        else {
            request.current?.abort();
            setAlbums([]); setLoading(false); setError(false); setHasMore(false);
        }
        return () => request.current?.abort();
        // URL state owns submitted searches; edits to the form do not mutate results.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeQuery, activeMode, retry]);

    const sorted = useMemo(() => {
        if (sort === "az") return [...albums].sort((a,b) => a.title.localeCompare(b.title));
        if (sort === "rating") return [...albums].sort((a,b) => b.rating - a.rating);
        return albums;
    }, [albums, sort]);

    function submit(event: React.FormEvent) {
        event.preventDefault();
        if (!query.trim()) return;
        if (query.trim() === activeQuery && mode === activeMode) setRetry(v => v + 1);
        else setParams({q: query.trim(), mode});
    }

    return <div className="p-8 max-w-7xl mx-auto min-h-screen text-ink">
        <section className="page-heading">
            <div><span className="eyebrow">{t("design_discovery_label")}</span>
                <h1 className="my-3">{t("design_discovery_title")}</h1><p>{t("explore_subtitle")}</p>
            </div>
        </section>
        <form className="search-panel" onSubmit={submit} role="search">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                <label htmlFor="album-query" className="font-semibold">{t("search_label")}</label>
                <div className="flex rounded-xl bg-raised p-1 gap-1" role="group" aria-label={t("search_mode")}>
                    {(["artist", "album"] as const).map(value => <button key={value} type="button" aria-pressed={mode === value}
                        onClick={() => setMode(value)} className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${mode === value ? "bg-panel text-accent shadow-sm" : "text-muted"}`}>
                        {t(value === "artist" ? "mode_artist" : "mode_album")}
                    </button>)}
                </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-line bg-canvas focus-within:border-accent flex-1">
                    <Search size={20} className="text-muted shrink-0"/>
                    <input id="album-query" value={query} onChange={e => setQuery(e.target.value)}
                        placeholder={t("design_search_placeholder")} className="bg-transparent outline-none w-full min-w-0 text-sm" autoComplete="off"/>
                </div>
                <button type="submit" disabled={!query.trim()} className="primary-action">
                    {loading ? <Loader2 size={17} className="animate-spin"/> : <Search size={17}/>}
                    {t("search_label")}
                </button>
            </div>
        </form>
        {error && <div role="alert" className="flex flex-wrap gap-3 items-center p-4 mb-6 border border-red-500/30 bg-red-500/5 rounded-xl">
            <AlertCircle size={18}/><span className="flex-1">{t("design_search_error")}</span>
            <button className="secondary-action text-sm" onClick={() => search(activeQuery, activeMode, albums.length ? page + 1 : 1)}>{t("design_retry")}</button>
        </div>}
        {albums.length > 0 && <div className="section-topline">
            <p className="text-sm text-muted" aria-live="polite">{t("results_count_plural", {count: albums.length})}</p>
            <div className="flex items-center gap-3 text-sm">
                <label htmlFor="album-sort" className="text-muted">{t("sort_label")}</label>
                <select id="album-sort" value={sort} onChange={e => setSort(e.target.value)} className="bg-panel border border-line rounded-lg px-3 py-2">
                    <option value="relevance">{t("design_relevance")}</option><option value="az">{t("sort_az")}</option><option value="rating">{t("sort_rating")}</option>
                </select>
            </div>
        </div>}
        <div className="grid grid-cols-2 md:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-5" aria-busy={loading}>
            {sorted.map(album => <AlbumCard key={album.id} {...album} to={`/album/${encodeURIComponent(album.id)}?${new URLSearchParams({
                artist: album.artist, album: album.title, cover: album.cover, mbid: album.mbid || ""})}`}/>)}
            {loading && Array.from({length: 8}, (_,i) => <div key={`loading-${i}`} className="album-card" aria-hidden="true">
                <div className="skeleton aspect-square rounded-xl"/><div className="skeleton h-4 w-3/4 rounded mt-5 mb-3"/><div className="skeleton h-3 w-1/2 rounded mb-4"/>
            </div>)}
        </div>
        {loading && <p role="status" className="sr-only">{t("searching_label")}</p>}
        {!loading && !error && !albums.length && (activeQuery ? <div className="empty-state">
            <Disc3 className="mx-auto text-accent" size={32}/><h2>{t("no_result_found")}</h2><p>{t("try_another_search")}</p>
        </div> : <section>
            <div className="section-topline"><h2>{t("design_start_title")}</h2><span className="text-sm text-muted">{t("design_start_subtitle")}</span></div>
            <div className="grid md:grid-cols-2 gap-4">
                {[{to: "/library", Icon: Library, title: "design_library_title", desc: "design_library_desc"},
                  {to: "/rooms", Icon: Radio, title: "design_listen_together", desc: "design_rooms_desc"}].map(({to, Icon, title, desc}) =>
                    <Link key={to} to={to} className="p-6 bg-panel border border-line rounded-2xl hover:border-accent transition-colors group">
                        <div className="flex justify-between mb-7"><Icon className="text-accent" size={26}/><ArrowUpRight size={19} className="text-muted group-hover:text-accent"/></div>
                        <h3 className="text-lg font-semibold mb-2">{t(title)}</h3><p className="text-muted text-sm leading-relaxed">{t(desc)}</p>
                    </Link>)}
            </div>
        </section>)}
        {!loading && hasMore && <div className="flex justify-center mt-8"><button className="secondary-action" onClick={() => search(activeQuery, activeMode, page + 1)}>{t("show_more")}</button></div>}
    </div>;
}
