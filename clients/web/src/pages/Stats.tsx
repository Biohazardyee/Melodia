import React, {ReactNode, useState, useEffect} from "react";
import {useTranslation} from "react-i18next";
import {jwtDecode} from "jwt-decode";
import apiClient from "../api/client";
import {AlbumCard} from "../components/AlbumCard";
import {AxiosResponse} from "axios";

type StatCardData = {
    id: string;
    label: string;
    value: number;
    progress: number;
    colorClass: string;
    bgClass: string;
    icon: ReactNode;
};

type UserMediaStatusResponse = {
    user_id: string;
    media_id: string;
    status: string;
    created_at: string;
    media: {
        id: string;
        api_id: string;
        name: string;
        artist: string;
        cover: string | null;
        rating?: number;
        created_at: string;
    } | null;
};

const Stats: React.FC = () => {
    const {t} = useTranslation();

    const [activeFilter, setActiveFilter] = useState<string>("listened");
    const [mediaStatuses, setMediaStatuses] = useState<UserMediaStatusResponse[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchUserStats = async (): Promise<void> => {
            try {
                setLoading(true);
                setError(null);

                const token: string | null = localStorage.getItem("token");
                if (!token) {
                    setError(t("stats_error_auth", "Vous devez être connecté pour voir vos statistiques."));
                    setLoading(false);
                    return;
                }

                const decoded: any = jwtDecode(token);
                const userId = decoded.id || decoded.userId;

                const response: AxiosResponse = await apiClient.get(`/medias/status/user/${userId}`);
                const data = response.data.mediasStatus || [];

                setMediaStatuses(data);
            } catch (err: any) {
                console.error("Erreur lors du chargement des statistiques:", err);
                setError(err.response?.data?.message || t("error_generic", "Une erreur est survenue"));
            } finally {
                setLoading(false);
            }
        };

        fetchUserStats();
    }, [t]);

    const counts = {
        listened: 0,
        later: 0,
        favorite: 0,
        disliked: 0,
    };

    mediaStatuses.forEach((item: UserMediaStatusResponse): void => {
        const statusKey = item.status?.toLowerCase() as keyof typeof counts;
        if (statusKey in counts) {
            counts[statusKey]++;
        }
    });

    const totalAlbums: number = counts.listened + counts.later + counts.favorite + counts.disliked;

    const getPercentage = (count: number) => {
        if (totalAlbums === 0) return 0;
        return Math.round((count / totalAlbums) * 100);
    };

    const STATS_CARDS: StatCardData[] = [
        {
            id: "listened",
            label: t("status_listened", "Écoutés"),
            value: counts.listened,
            progress: getPercentage(counts.listened),
            colorClass: "text-emerald-400",
            bgClass: "bg-emerald-400",
            icon: (
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                </svg>
            ),
        },
        {
            id: "later",
            label: t("status_later", "À écouter"),
            value: counts.later,
            progress: getPercentage(counts.later),
            colorClass: "text-blue-500",
            bgClass: "bg-blue-500",
            icon: (
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4 6h16M4 10h16M4 14h16M4 18h16"
                    />
                </svg>
            ),
        },
        {
            id: "favorite",
            label: t("status_favorite", "Favoris"),
            value: counts.favorite,
            progress: getPercentage(counts.favorite),
            colorClass: "text-amber-400",
            bgClass: "bg-amber-400",
            icon: (
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                    />
                </svg>
            ),
        },
        {
            id: "disliked",
            label: t("status_disliked", "Détestés"),
            value: counts.disliked,
            progress: getPercentage(counts.disliked),
            colorClass: "text-rose-500",
            bgClass: "bg-rose-500",
            icon: (
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                </svg>
            ),
        },
    ];

    const FILTERS = [
        {id: "listened", label: t("status_listened", "Écoutés"), count: counts.listened, icon: "✅"},
        {id: "later", label: t("status_later", "À écouter"), count: counts.later, icon: "🎧"},
        {id: "favorite", label: t("status_favorite", "Favoris"), count: counts.favorite, icon: "⭐"},
        {id: "disliked", label: t("status_disliked", "Détestés"), count: counts.disliked, icon: "❌"},
    ];

    const pieOrder: string[] = ["listened", "favorite", "later", "disliked"];
    let accumulatedPercentage: number = 0;

    const pieSlices = pieOrder.map((id: string) => {
        const count: number = counts[id as keyof typeof counts];
        const percentage: number = getPercentage(count);
        const offset: number = accumulatedPercentage;
        accumulatedPercentage += percentage;

        let colorClass: string = "text-emerald-400";
        if (id === "favorite") colorClass = "text-amber-400";
        if (id === "later") colorClass = "text-blue-500";
        if (id === "disliked") colorClass = "text-rose-500";

        return {id, percentage, offset: -offset, colorClass};
    });

    const displayedAlbums = mediaStatuses
        .filter(
            (item: UserMediaStatusResponse) =>
                item.status?.toLowerCase() === activeFilter.toLowerCase() && item.media,
        )
        .map((item: UserMediaStatusResponse) => {
            const album = item.media!;

            return {
                id: album.id,
                title: album.name,
                artist: album.artist,
                image: album.cover || "",
                rating: album.rating ?? 0,
            };
        });

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen text-ink">
                <p className="text-xl animate-pulse">
                    {t("loading_stats", "Chargement de vos statistiques...")}
                </p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex justify-center items-center min-h-screen text-rose-500">
                <p className="text-xl">{t("error_label", "Erreur :")} {error}</p>
            </div>
        );
    }

    return (
        <div
            className="p-8 max-w-7xl mx-auto w-full space-y-6 min-h-screen bg-transparent dark:bg-canvas text-ink transition-colors duration-300">
            <div className="mb-8">
                <h1 className="page-title text-4xl font-bold mb-2 text-ink">
                    {t("stats_title", "Statistiques")}
                </h1>
                <p className="text-muted dark:text-muted text-lg">
                    {t("stats_subtitle", "Découvrez vos habitudes d'écoute")}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {STATS_CARDS.map((stat: StatCardData) => (
                    <div
                        key={stat.id}
                        className="bg-panel dark:bg-panel border border-line dark:border-line rounded-xl p-5 shadow-sm transition-colors"
                    >
                        <div className="flex justify-between items-start mb-6">
                            <div className={stat.colorClass}>{stat.icon}</div>
                            <div className="text-3xl font-bold text-ink">
                                {stat.value}
                            </div>
                        </div>
                        <div className="text-sm text-muted dark:text-muted mb-3">
                            {stat.label}
                        </div>
                        <div className="w-full bg-raised dark:bg-raised rounded-full h-1.5 overflow-hidden">
                            <div
                                className={`${stat.bgClass} h-full rounded-full`}
                                style={{width: `${stat.progress}%`}}
                            ></div>
                        </div>
                    </div>
                ))}
            </div>

            <div
                className="bg-panel dark:bg-panel border border-line dark:border-line rounded-xl p-6 shadow-sm transition-colors">
                <h2
                    className="text-lg font-bold flex items-center gap-2 mb-8 text-ink"

                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 text-blue-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                        />
                    </svg>
                    {t("stats_detail_title", "Répartition")}
                </h2>

                <div className="flex flex-col items-center justify-center">
                    <div className="relative w-64 h-64">
                        <svg
                            viewBox="0 0 36 36"
                            className="w-full h-full transform -rotate-90"
                        >
                            <path
                                className="text-slate-800 dark:text-gray-100"
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="4"
                            />
                            {totalAlbums > 0 &&
                                pieSlices.map((slice) => (
                                    <path
                                        key={`slice-${slice.id}`}
                                        className={slice.colorClass}
                                        strokeDasharray={`${slice.percentage}, 100`}
                                        strokeDashoffset={slice.offset}
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                        style={{transition: "stroke-dasharray 0.3s ease"}}
                                    />
                                ))}
                        </svg>

                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div
                                className="bg-raised dark:bg-raised p-4 rounded-full shadow-lg border border-line dark:border-line text-blue-500 dark:text-blue-600 transition-colors">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-8 w-8"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                                    />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap justify-center gap-6 mt-8 text-sm font-medium">
                        {STATS_CARDS.map((stat: StatCardData) => (
                            <div
                                key={`legend-${stat.id}`}
                                className={`flex items-center gap-2 ${stat.colorClass}`}
                            >
                                <div className={`w-3 h-3 rounded-sm ${stat.bgClass}`}></div>
                                {stat.label} ({stat.value})
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div
                className="flex flex-col sm:flex-row flex-wrap bg-panel dark:bg-panel rounded-xl p-1 border border-line dark:border-line shadow-sm transition-colors mb-6">
                {FILTERS.map((filter) => (
                    <button
                        key={filter.id}
                        onClick={() => setActiveFilter(filter.id)}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-lg font-semibold text-sm transition-all ${
                            activeFilter === filter.id
                                ? "bg-raised dark:bg-raised text-ink shadow-md"
                                : "text-muted dark:text-muted hover:text-white dark:hover:text-gray-900 hover:bg-raised/50 dark:hover:bg-gray-50"
                        }`}
                    >
                        <span>{filter.icon}</span>
                        <span>{filter.label}</span>
                        <span className="opacity-75">({filter.count})</span>
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {displayedAlbums.map((album) => (
                    <AlbumCard
                        key={album.id}
                        id={album.id}
                        title={album.title}
                        artist={album.artist}
                        cover={album.image}
                        rating={album.rating ?? 0}
                    />
                ))}
            </div>

            {displayedAlbums.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                    {t("no_album_category", "Aucun album dans cette catégorie")}
                </div>
            )}
        </div>
    );
};

export default Stats;
