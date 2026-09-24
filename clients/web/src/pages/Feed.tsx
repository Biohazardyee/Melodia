import React, {useState, useEffect, useRef, useCallback} from "react";
import {
    Sparkles,
    Users,
    TrendingUp,
    Search,
    Music,
    RefreshCw,
    ChevronDown,
    Loader2,
} from "lucide-react";
import {useTranslation} from "react-i18next";
import {useNavigate} from "react-router-dom";
import apiClient from "../api/client";
import {jwtDecode} from "jwt-decode";
import FeedCard, {FeedItem} from "../components/FeedCard";

type TabType = "all" | "following" | "trending";

const ITEMS_PER_PAGE = 10;


function getCurrentUserId(): string | null {
    try {
        const token = localStorage.getItem("token") || localStorage.getItem("userToken");
        if (!token) return null;
        const decoded: any = jwtDecode(token);
        return decoded.id ?? null;
    } catch {
        return null;
    }
}


const SkeletonCard: React.FC = () => (
    <div
        className="bg-panel dark:bg-panel rounded-xl p-6 border border-line dark:border-line animate-pulse">
        <div className="flex items-center gap-4 mb-5">
            <div className="w-12 h-12 rounded-full bg-raised dark:bg-gray-200"/>
            <div className="flex-1 space-y-2">
                <div className="h-3 bg-raised dark:bg-gray-200 rounded w-1/3"/>
                <div className="h-2 bg-raised dark:bg-gray-200 rounded w-1/4"/>
            </div>
        </div>
        <div className="flex gap-4 bg-canvas dark:bg-canvas p-4 rounded-xl mb-5">
            <div className="w-20 h-20 rounded-md bg-raised dark:bg-gray-200"/>
            <div className="flex-1 space-y-2 py-1">
                <div className="h-4 bg-raised dark:bg-gray-200 rounded w-2/3"/>
                <div className="h-3 bg-raised dark:bg-gray-200 rounded w-1/2"/>
            </div>
        </div>
        <div className="space-y-2">
            <div className="h-3 bg-raised dark:bg-gray-200 rounded"/>
            <div className="h-3 bg-raised dark:bg-gray-200 rounded w-5/6"/>
        </div>
    </div>
);

const EmptyState: React.FC<{ tab: TabType }> = ({tab}) => (
    <div className="flex flex-col items-center justify-center py-20 text-center">
        <div
            className="w-16 h-16 rounded-2xl bg-panel dark:bg-panel border border-line dark:border-line flex items-center justify-center mb-4">
            {tab === "following" ? (
                <Users size={28} className="text-gray-600"/>
            ) : tab === "trending" ? (
                <TrendingUp size={28} className="text-gray-600"/>
            ) : (
                <Music size={28} className="text-gray-600"/>
            )}
        </div>
        <p className="text-muted dark:text-muted font-semibold mb-1">
            {tab === "following"
                ? "Aucune activité de tes abonnements"
                : tab === "trending"
                    ? "Aucune découverte disponible"
                    : "Aucune review pour le moment"}
        </p>
        <p className="text-gray-600 dark:text-muted text-sm">
            {tab === "following"
                ? "Abonne-toi à des utilisateurs pour voir leur activité"
                : "Reviens plus tard !"}
        </p>
    </div>
);

/**
 * Encapsule ENTIÈREMENT l'état d'un seul onglet (items, pagination, статus de
 * chargement) dans sa propre closure — aucune structure partagée indexée par
 * onglet (plus de `{[tab]: ...}`). Une contamination croisée entre onglets
 * est donc structurellement impossible : chaque instance a son propre state,
 * son propre setter, il n'existe aucun point du code qui puisse écrire dans
 * le mauvais onglet par erreur.
 */
function useFeedTab(buildEndpoint: (offset: number) => string | null) {
    const [items, setItems] = useState<FeedItem[]>([]);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [loaded, setLoaded] = useState(false);

    const buildEndpointRef = useRef(buildEndpoint);
    buildEndpointRef.current = buildEndpoint;

    const fetchPage = useCallback(async (offset: number, append: boolean): Promise<void> => {
        const endpoint = buildEndpointRef.current(offset);
        if (!endpoint) return;

        if (append) setLoadingMore(true); else setLoading(true);

        try {
            const response = await apiClient.get(endpoint);
            const newItems: FeedItem[] = response.data?.feed || [];
            setItems((prev) => append ? [...prev, ...newItems] : newItems);
            setHasMore(newItems.length === ITEMS_PER_PAGE);
            setPage(offset + ITEMS_PER_PAGE);
            setLoaded(true);
        } catch (error) {
            console.error("Erreur feed:", error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, []);

    const loadingRef = useRef(loading);
    loadingRef.current = loading;
    const loadingMoreRef = useRef(loadingMore);
    loadingMoreRef.current = loadingMore;
    const hasMoreRef = useRef(hasMore);
    hasMoreRef.current = hasMore;
    const pageRef = useRef(page);
    pageRef.current = page;
    const loadedRef = useRef(loaded);
    loadedRef.current = loaded;

    const ensureLoaded = useCallback((): void => {
        if (!loadedRef.current && !loadingRef.current) fetchPage(0, false);
    }, [fetchPage]);

    const loadMore = useCallback((): void => {
        if (!loadingMoreRef.current && hasMoreRef.current) fetchPage(pageRef.current, true);
    }, [fetchPage]);

    const refresh = useCallback((): void => { void fetchPage(0, false); }, [fetchPage]);

    return {items, setItems, loading, loadingMore, hasMore, loaded, ensureLoaded, loadMore, refresh};
}

type FeedTabState = ReturnType<typeof useFeedTab>;

const FeedTabPanel: React.FC<{
    tab: FeedTabState;
    tabType: TabType;
    searchQuery: string;
    likingId: string | null;
    currentUserId: string | null;
    infiniteScroll?: boolean;
    onLike: (item: FeedItem) => void;
    onNavigateToAlbum: (item: FeedItem) => void;
    onNavigateToProfile: (userId: string) => void;
}> = ({tab, tabType, searchQuery, likingId, currentUserId, infiniteScroll = true, onLike, onNavigateToAlbum, onNavigateToProfile}) => {
    const {t} = useTranslation();

    useEffect(() => {
        tab.ensureLoaded();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Observer local à CE panneau : monté/démonté avec lui, donc toujours
    // rattaché à SA sentinelle. Comme le panneau entier est démonté au
    // changement d'onglet (un seul panneau rendu à la fois), il n'y a aucune
    // ambiguïté possible sur l'onglet concerné par un "load more".
    const observerRef = useRef<IntersectionObserver | null>(null);

    useEffect(() => {
        if (!infiniteScroll) return;

        observerRef.current = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) tab.loadMore();
            },
            {threshold: 0.5},
        );
        return () => observerRef.current?.disconnect();
    }, [tab.loadMore, infiniteScroll]);

    const setSentinelRef = useCallback((node: HTMLDivElement | null): void => {
        const observer = observerRef.current;
        if (!observer) return;
        observer.disconnect();
        if (node) observer.observe(node);
    }, []);

    const displayedItems = tab.items.filter((item) => {
        if (!item) return false;
        const q = searchQuery.toLowerCase().trim();
        if (!q) return true;
        return (
            item.album?.toLowerCase().includes(q) ||
            item.artist?.toLowerCase().includes(q) ||
            item.user_name?.toLowerCase().includes(q) ||
            item.content?.toLowerCase().includes(q)
        );
    });

    if (!tab.loaded && tab.items.length === 0) {
        return <>{[...Array(3)].map((_, i) => <SkeletonCard key={i}/>)}</>;
    }

    if (displayedItems.length === 0) {
        if (searchQuery) {
            return (
                <div className="text-center py-12">
                    <Search size={48} className="mx-auto text-gray-500 dark:text-muted mb-4 opacity-50"/>
                    <p className="text-muted dark:text-muted text-lg">
                        {t("no_post_found", "Aucun résultat pour")} &quot;{searchQuery}&quot;
                    </p>
                </div>
            );
        }
        return <EmptyState tab={tabType}/>;
    }

    return (
        <>
            {displayedItems.map((item) => (
                <FeedCard
                    key={item.id}
                    item={item}
                    onLike={() => onLike(item)}
                    onNavigateToAlbum={onNavigateToAlbum}
                    onNavigateToProfile={onNavigateToProfile}
                    likingId={likingId}
                    currentUserId={currentUserId}
                />
            ))}

            {infiniteScroll && (
                <>
                    <div ref={setSentinelRef} className="h-4"/>

                    {tab.loadingMore && (
                        <div className="flex items-center justify-center py-6">
                            <Loader2 size={24} className="text-[#FF1E56] animate-spin"/>
                        </div>
                    )}

                    {!tab.hasMore && displayedItems.length > 0 && (
                        <div className="text-center py-8">
                            <div
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-panel dark:bg-panel border border-line dark:border-line">
                                <ChevronDown size={14} className="text-gray-600"/>
                                <span
                                    className="text-gray-600 dark:text-muted text-xs font-semibold tracking-wide">FIN DU FIL</span>
                            </div>
                        </div>
                    )}
                </>
            )}
        </>
    );
};


const Feed: React.FC = () => {
    const {t} = useTranslation();
    const navigate = useNavigate();

    const currentUserId = getCurrentUserId();

    const [activeTab, setActiveTab] = useState<TabType>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [likingId, setLikingId] = useState<string | null>(null);

    const buildAllEndpoint = useCallback(
        (offset: number): string =>
            `/activities/feed/global?${currentUserId ? `current_user_id=${currentUserId}&` : ""}limit=${ITEMS_PER_PAGE}&offset=${offset}`,
        [currentUserId],
    );
    const buildFollowingEndpoint = useCallback(
        (offset: number): string | null =>
            currentUserId ? `/activities/feed/friends/${currentUserId}?limit=${ITEMS_PER_PAGE}&offset=${offset}` : null,
        [currentUserId],
    );
    const buildTrendingEndpoint = useCallback(
        (offset: number): string | null =>
            currentUserId ? `/activities/feed/discovery/${currentUserId}?limit=${ITEMS_PER_PAGE}&offset=${offset}` : null,
        [currentUserId],
    );

    const allTab = useFeedTab(buildAllEndpoint);
    const followingTab = useFeedTab(buildFollowingEndpoint);
    const trendingTab = useFeedTab(buildTrendingEndpoint);

    const tabsByType: Record<TabType, FeedTabState> = {
        all: allTab,
        following: followingTab,
        trending: trendingTab,
    };
    const currentTab = tabsByType[activeTab];

    const handleLike = useCallback(
        async (item: FeedItem) => {
            if (!currentUserId || likingId || item.type !== "review") return;

            const {setItems} = tabsByType[activeTab];
            const wasLiked = !!item.isLiked;
            setLikingId(item.id);

            setItems((prev) => prev.map((i) => i.id === item.id ? {
                ...i,
                isLiked: !wasLiked,
                likes_count: wasLiked ? Math.max(0, (i.likes_count ?? 1) - 1) : (i.likes_count ?? 0) + 1,
            } : i));

            try {
                const response = await apiClient.post("/reviews/likes/toggle", {
                    review_id: item.review_id || item.id,
                    user_id: currentUserId,
                });
                const {isLiked, likes_count} = response.data;
                setItems((prev) => prev.map((i) => i.id === item.id ? {...i, isLiked, likes_count} : i));
            } catch {
                setItems((prev) => prev.map((i) => i.id === item.id ? {
                    ...i,
                    isLiked: wasLiked,
                    likes_count: item.likes_count,
                } : i));
            } finally {
                setLikingId(null);
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [currentUserId, likingId, activeTab],
    );

    const handleNavigateToAlbum = (item: FeedItem) => {
        const albumId = item.media_id || item.api_id || item.id;

        if (!albumId) {
            console.error("Impossible de naviguer : aucun ID trouvé dans l'item", item);
            return;
        }

        const params = new URLSearchParams({
            artist: item.artist || "",
            album: item.album || "",
            cover: item.cover || "",
            mbid: item.api_id || "",
        }).toString();

        navigate(`/album/${albumId}?${params}`);
    };

    const handleNavigateToProfile = (userId: string) => {
        navigate(`/profil/${userId}`);
    };

    const handleRefresh = (): void => {
        setIsRefreshing(true);
        currentTab.refresh();
    };

    useEffect(() => {
        if (!isRefreshing) return;
        if (!currentTab.loading) setIsRefreshing(false);
    }, [isRefreshing, currentTab.loading]);

    return (
        <div
            className="p-8 max-w-7xl mx-auto w-full font-sans min-h-screen bg-transparent dark:bg-canvas text-ink transition-colors duration-300">
            {/* Header */}
            <div className="page-heading mb-8 flex flex-wrap gap-4 items-start justify-between">
                <div>
                    <h1 className="page-title text-4xl font-bold mb-2 text-ink">
                        {t("feed_title", "Votre fil")}
                    </h1>
                    <p className="text-muted dark:text-muted text-lg">
                        {t("feed_subtitle", "Restez informé(e) des tendances musicales de la communauté.")}
                    </p>
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-panel dark:bg-panel border border-line dark:border-line text-muted dark:text-muted hover:text-white dark:hover:text-gray-900 hover:border-line transition-all text-sm disabled:opacity-50"
                >
                    <RefreshCw size={15} className={isRefreshing ? "animate-spin" : ""}/>
                    {t("refresh")}
                </button>
            </div>

            {/* Search */}
            <div className="relative mb-8 max-w-2xl">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search size={18} className="text-gray-500"/>
                </div>
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t("search_feed_placeholder", "Rechercher un utilisateur, un album...")}
                    className="w-full bg-panel dark:bg-panel text-ink text-sm rounded-xl py-3.5 pl-11 pr-4 border border-line dark:border-line outline-none transition-all shadow-lg"
                />
                {searchQuery && (
                    <button
                        onClick={() => setSearchQuery("")}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-[#FF1E56] transition-colors text-sm"
                    >
                        ✕
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div
                className="flex bg-panel dark:bg-panel rounded-xl p-1 mb-8 border border-line dark:border-line shadow-sm max-w-lg">
                {([
                    {key: "all", label: t("tab_activities", "Activités"), icon: Sparkles},
                    {key: "following", label: t("tab_following", "Suivis"), icon: Users},
                    {key: "trending", label: t("tab_discovery", "Découverte"), icon: TrendingUp},
                ] as const).map(({key, label, icon: Icon}) => (
                    <button
                        key={key}
                        onClick={() => setActiveTab(key)}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-semibold text-sm transition-all ${
                            activeTab === key
                                ? "bg-raised dark:bg-raised text-ink shadow"
                                : "text-muted dark:text-muted hover:text-white dark:hover:text-gray-900"
                        }`}
                    >
                        <Icon size={18}/>
                        {label}
                    </button>
                ))}
            </div>

            {/* Feed List — un seul panneau monté à la fois, un par onglet */}
            <div className="space-y-6 pb-10">
                {activeTab === "all" && (
                    <FeedTabPanel
                        tab={allTab}
                        tabType="all"
                        searchQuery={searchQuery}
                        likingId={likingId}
                        currentUserId={currentUserId}
                        onLike={handleLike}
                        onNavigateToAlbum={handleNavigateToAlbum}
                        onNavigateToProfile={handleNavigateToProfile}
                    />
                )}
                {activeTab === "following" && (
                    <FeedTabPanel
                        tab={followingTab}
                        tabType="following"
                        searchQuery={searchQuery}
                        likingId={likingId}
                        currentUserId={currentUserId}
                        onLike={handleLike}
                        onNavigateToAlbum={handleNavigateToAlbum}
                        onNavigateToProfile={handleNavigateToProfile}
                    />
                )}
                {activeTab === "trending" && (
                    <FeedTabPanel
                        tab={trendingTab}
                        tabType="trending"
                        searchQuery={searchQuery}
                        likingId={likingId}
                        currentUserId={currentUserId}
                        infiniteScroll={false}
                        onLike={handleLike}
                        onNavigateToAlbum={handleNavigateToAlbum}
                        onNavigateToProfile={handleNavigateToProfile}
                    />
                )}
            </div>
        </div>
    );
};

export default Feed;
