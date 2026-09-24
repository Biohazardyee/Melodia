import { AxiosResponse } from "axios";
import { jwtDecode } from "jwt-decode";
import { Edit3, Loader2 } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    FaCheckCircle,
    FaChevronDown,
    FaChevronLeft,
    FaHeadphones,
    FaPlus,
    FaStar,
    FaTimesCircle
} from "react-icons/fa";
import { NavigateFunction, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import apiClient from "../api/client";
import AlbumPlaylistDialog from "../components/album/AlbumPlaylistDialog";
import AlbumReportDialog from "../components/album/AlbumReportDialog";
import AlbumReviewComposer from "../components/album/AlbumReviewComposer";
import AlbumReviews from "../components/album/AlbumReviews";
import SimilarAlbums from "../components/album/SimilarAlbums";
import AlbumTrackList from "../components/AlbumTrackList";
import CoverImage from "../components/CoverImage";
import { useAlbumReviews } from "../hooks/useAlbumReviews";
import { useGoBack } from "../hooks/useGoBack";

type TabType = "Commentaires" | "Albums";

const normalizeTracks = (raw: any): { name: string; duration?: string | number }[] => {
    if (!raw) return [];
    const list = Array.isArray(raw) ? raw : [raw];
    return list
        .filter((track: any) => track?.name)
        .map((track: any) => ({ name: track.name, duration: track.duration }));
};

const AlbumDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const navigate: NavigateFunction = useNavigate();
    const goBack = useGoBack("/home");
    const { t } = useTranslation();

    const urlArtist: string = searchParams.get("artist") || "";
    const urlAlbum: string = searchParams.get("album") || "";
    const urlCover: string = searchParams.get("cover") || "";
    const urlMbid: string = searchParams.get("mbid") || "";

    const PLACEHOLDER_IMAGE = "/melodia_placeholder.png";

    const STATUT_OPTIONS = [
        {
            id: "listened",
            label: t("status_listened"),
            icon: <FaCheckCircle />,
            color: "text-emerald-400",
        },
        {
            id: "later",
            label: t("status_later"),
            icon: <FaHeadphones />,
            color: "text-blue-500",
        },
        {
            id: "favorite",
            label: t("status_favorite"),
            icon: <FaStar />,
            color: "text-amber-400",
        },
        {
            id: "disliked",
            label: t("status_disliked"),
            icon: <FaTimesCircle />,
            color: "text-rose-500",
        },
    ];

    const [loading, setLoading] = useState(true);
    const [albumData, setAlbumData] = useState<any>(null);

    const [activeTab, setActiveTab] = useState<TabType>("Commentaires");
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);

    const [userStatus, setUserStatus] = useState<string | null>(null);
    const activeOption = STATUT_OPTIONS.find((opt) => opt.id === userStatus);

    const [userPlaylists, setUserPlaylists] = useState<any[]>([]);
    const [loadingPlaylists, setLoadingPlaylists] = useState(false);

    const [similarAlbums, setSimilarAlbums] = useState<any[]>([]);
    const [loadingSimilar, setLoadingSimilar] = useState(false);

    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [reportingReviewId, setReportingReviewId] = useState<string | number | null>(null);
    const [reportReason, setReportReason] = useState("");
    const [isSubmittingReport, setIsSubmittingReport] = useState(false);
    const [reportingCommentId, setReportingCommentId] = useState<string | null>(null);

    const token: string | null = localStorage.getItem("token");
    let currentUserId: string | null = null;
    if (token) {
        try {
            const tokenDecoded: any = jwtDecode(token);
            currentUserId =
                tokenDecoded.id || tokenDecoded.sub || tokenDecoded.userId;
        } catch (e) {
            console.error("Erreur lors du décodage du token", e);
        }
    }

    const mediaIdInDB = albumData?.db_id || (id?.includes("-") ? id : null);

    const requireAuth = (): boolean => {
        if (!currentUserId) {
            navigate("/login");
            return false;
        }
        return true;
    };
    const reviews = useAlbumReviews(mediaIdInDB, currentUserId, requireAuth);
    const {commentsList, loadingReviews, hasAlreadyReviewed} = reviews;

    useEffect((): void => {
        const fetchUserStatus = async (): Promise<void> => {
            if (!currentUserId || !mediaIdInDB) return;

            try {
                const res: AxiosResponse<any, any> = await apiClient.get(`/medias/status/${currentUserId}/${mediaIdInDB}`);
                const status = res.data.mediaStatus?.status;

                if (status && status !== "none") {
                    setUserStatus(status);
                } else {
                    setUserStatus(null);
                }
            } catch (error) {
                console.log("Aucun statut trouvé pour ce média, démarrage à null.");
                setUserStatus(null);
            }
        };

        fetchUserStatus();
    }, [currentUserId, mediaIdInDB]);

    const fetchUserPlaylists = async (): Promise<void> => {
        if (!currentUserId) return;
        setLoadingPlaylists(true);
        try {
            const res: AxiosResponse<any, any> = await apiClient.get(`/playlists/user/${currentUserId}`);
            setUserPlaylists(res.data.playlists || res.data || []);
        } catch (err) {
            console.error("Erreur chargement playlists:", err);
        } finally {
            setLoadingPlaylists(false);
        }
    };

    useEffect((): void => {
        if (isPlaylistModalOpen) {
            fetchUserPlaylists();
        }
    }, [isPlaylistModalOpen]);

    const handleSendReport = async (): Promise<void> => {
        if (!reportReason.trim()) return;
        if (!requireAuth()) return;

        setIsSubmittingReport(true);
        try {
            const payload: any = {
                reporter_id: currentUserId,
                reason: reportReason,
                reason_type: reportingCommentId ? 'comment' : 'review',
            };

            if (reportingCommentId) {
                payload.comment_id = reportingCommentId;
            } else if (reportingReviewId) {
                payload.review_id = reportingReviewId;
            }

            await apiClient.post('/reports', payload);

            toast.success(t("report_success", "Signalement envoyé avec succès."));

            setIsReportModalOpen(false);
            setReportReason("");
            setReportingReviewId(null);
            setReportingCommentId(null);
        } catch (error) {
            console.error("Erreur lors de l'envoi du signalement:", error);
            toast.error(t("report_error", "Impossible d'envoyer le signalement."));
        } finally {
            setIsSubmittingReport(false);
        }
    };

    const handleAddToPlaylist = async (playlistId: string): Promise<void> => {
        if (!requireAuth()) return;
        if (!mediaIdInDB) return;

        try {
            await apiClient.post("/playlist-items", {
                playlist_id: playlistId,
                media_id: mediaIdInDB,
            });

            toast.success(t("playlist_add_success", "Ajouté à la playlist avec succès !"));
            setIsPlaylistModalOpen(false);
        } catch (err: any) {
            console.error("Erreur lors de l'ajout:", err);
            toast.error(t("playlist_add_error", "Impossible d'ajouter à la playlist."));
        }
    };

    useEffect((): void => {
        const fetchAlbumData = async (): Promise<void> => {
            setLoading(true);
            let finalData = null;

            const isLocalId: boolean | "" | undefined = id && id.includes("-") && !id.startsWith("reco-");

            if (isLocalId) {
                try {
                    const res: AxiosResponse = await apiClient.get(`/medias/${id}`);
                    const media = res.data.media || res.data;
                    if (media) {
                        finalData = {
                            name: media.name,
                            artist: media.artist,
                            cover: media.cover || PLACEHOLDER_IMAGE,
                            rating: media.rating ?? 0,
                            mbid: media.mbid,
                            db_id: media.id,
                            wiki: null,
                            tracks: [] as { name: string; duration?: string | number }[],
                        };

                        // La DB locale ne stocke pas la description : on l'enrichit via l'API externe
                        if (media.artist && media.name) {
                            try {
                                const infoRes: AxiosResponse<any, any> = await apiClient.get("/api/albums/info", {
                                    params: { artist: media.artist, album: media.name, mbid: media.mbid || "" },
                                });
                                const info = infoRes.data.albumInfo || {};
                                const albumObj = info.album || info;
                                finalData.wiki = albumObj.wiki || null;
                                finalData.tracks = normalizeTracks(albumObj.tracks?.track);
                            } catch (wikiErr) {
                                console.warn("Description (wiki) non récupérée depuis l'API externe", wikiErr);
                            }
                        }
                    }
                } catch (err) {
                    console.log("Média non trouvé en DB locale, passage à l'API externe...");
                }
            }
            if (!finalData && urlArtist && urlAlbum) {
                try {
                    const res: AxiosResponse<any, any> = await apiClient.get("/api/albums/info", {
                        params: { artist: urlArtist, album: urlAlbum, mbid: urlMbid },
                    });
                    const externalInfo = res.data.albumInfo || {};
                    // Les données Last.fm sont imbriquées sous .album (name, artist, wiki, image...)
                    const albumObj = externalInfo.album || externalInfo;
                    const imageUrl = urlCover
                        || albumObj.image?.[3]?.["#text"]
                        || albumObj.image?.[2]?.["#text"]
                        || "";

                    finalData = {
                        name: albumObj.name || urlAlbum,
                        artist: (typeof albumObj.artist === "string" ? albumObj.artist : albumObj.artist?.name) || urlArtist,
                        cover: imageUrl,
                        mbid: urlMbid || albumObj.mbid || null,
                        wiki: albumObj.wiki || null,
                        tracks: normalizeTracks(albumObj.tracks?.track),
                        rating: 0,
                        db_id: null,
                    };

                    try {
                        const syncRes: AxiosResponse<any, any> = await apiClient.post("/medias/sync-search", {
                            albums: [{
                                api_id: urlMbid || `album:${urlArtist.trim()}:${urlAlbum.trim()}`,
                                name: urlAlbum.trim(),
                                artist: urlArtist.trim(),
                                cover: finalData.cover,
                                mbid: finalData.mbid,
                            }],
                        });

                        const synced = syncRes.data.medias || syncRes.data;
                        const syncedMedia = Array.isArray(synced) ? synced[0] : synced;

                        if (syncedMedia) {
                            finalData.db_id = syncedMedia.id;
                            finalData.rating = syncedMedia.rating ?? 0;
                        }
                    } catch (syncErr) {
                        console.warn("Échec de la synchronisation", syncErr);
                    }
                } catch (err) {
                    console.error("Erreur API externe :", err);
                }
            }

            setAlbumData(finalData);

            if (currentUserId && finalData?.db_id) {
                try {
                    const statusRes: AxiosResponse<any, any> = await apiClient.get(`/medias/status/${currentUserId}/${finalData.db_id}`);
                    const status = statusRes.data.mediaStatus?.status;
                    setUserStatus(status && status !== "none" ? status : null);
                } catch (err) {
                    console.log("Aucun statut trouvé, démarrage à null.");
                    setUserStatus(null);
                }
            }

            setLoading(false);
        };
        if (id || (urlArtist && urlAlbum)) {
            fetchAlbumData();
        }
    }, [id, urlArtist, urlAlbum, urlMbid, urlCover, currentUserId]);
    const fetchSimilar = async (): Promise<void> => {
        if (!urlArtist || !urlAlbum) return;

        setLoadingSimilar(true);
        try {
            const res: AxiosResponse<any, any> = await apiClient.get("/api/albums/similar", {
                params: {
                    artist: urlArtist,
                    album: urlAlbum
                },
            });
            setSimilarAlbums(res.data.similarAlbums || []);
        } catch (err) {
            console.error("Erreur chargement similaires:", err);
        } finally {
            setLoadingSimilar(false);
        }
    };

    useEffect(() => {
        fetchSimilar();
    }, [urlArtist, urlAlbum]);

    const handleStatusChange = async (newStatus: string): Promise<void> => {
        if (!requireAuth()) return;
        if (!mediaIdInDB) return;

        const previousStatus: string | null = userStatus;
        const isDeselecting: boolean = userStatus === newStatus;

        setUserStatus(isDeselecting ? null : newStatus);

        try {
            if (isDeselecting) {
                await apiClient.delete(`/media/status/${currentUserId}/${mediaIdInDB}`);
            } else {
                try {
                    await apiClient.post(`/medias/status`, {
                        user_id: currentUserId,
                        media_id: mediaIdInDB,
                        status: newStatus,
                    });
                } catch (err: any) {
                    if (err.response?.status === 400) {
                        await apiClient.put(`/medias/status/${currentUserId}/${mediaIdInDB}`, {
                            status: newStatus
                        });
                    } else {
                        throw err;
                    }
                }
            }
        } catch (error: any) {
            setUserStatus(previousStatus);
            console.error("Erreur critique lors du changement de statut:", error);
            toast.error(t("status_update_error", "Impossible de mettre à jour le statut."));
        }
    };

    if (loading) {
        return (
            <div
                className="min-h-screen bg-canvas dark:bg-canvas text-ink flex items-center justify-center">
                <Loader2 className="animate-spin text-pink-500" size={48} />
            </div>
        );
    }

    if (!albumData) {
        return (
            <div
                className="min-h-screen bg-canvas dark:bg-canvas flex items-center justify-center text-ink">
                <div className="text-center">
                    <h1 className="page-title text-3xl font-bold mb-4">{t("album_not_found")}</h1>
                    <button
                        onClick={() => navigate("/home")}
                        className="bg-blue-600 px-6 py-2 rounded-lg text-white"
                    >
                        {t("back")}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div
            className="min-h-screen bg-canvas dark:bg-canvas text-ink font-sans pb-20 transition-colors duration-300">
            {isPlaylistModalOpen && (
                <>
                    <div
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                        onClick={() => setIsPlaylistModalOpen(false)}
                    ></div>
                    <AlbumPlaylistDialog
                        loadingPlaylists={loadingPlaylists}
                        userPlaylists={userPlaylists}
                        handleAddToPlaylist={handleAddToPlaylist}
                        id={id}
                        albumData={albumData}
                        setIsPlaylistModalOpen={setIsPlaylistModalOpen}
                    />
                </>
            )}

            <section className="max-w-6xl mx-auto px-6 pt-8">
                <button
                    onClick={goBack}
                    className="flex items-center gap-2 text-muted dark:text-muted hover:text-white dark:hover:text-gray-900 mb-8 group"
                >
                    <FaChevronLeft className="group-hover:-translate-x-1 transition-transform" />{" "}
                    {t("back")}
                </button>

                <div className="flex flex-col md:flex-row gap-12">
                    {/* Cover */}
                    <div className="w-full md:w-80 shrink-0">
                        <div className="sticky top-24">
                            <div className="w-full aspect-square rounded-2xl overflow-hidden shadow-2xl border border-line dark:border-line group">
                                <CoverImage src={albumData?.cover || PLACEHOLDER_IMAGE} alt={albumData?.name || ""} />
                            </div>
                        </div>
                    </div>

                    {/* Infos */}
                    <div className="flex-1 flex flex-col gap-8">
                        <section>
                            <h1 className="page-title text-4xl md:text-5xl font-black tracking-tight mb-2 italic uppercase">
                                {albumData?.name}
                            </h1>
                            <button className="secondary-action mb-3" onClick={() => navigate(`/journal?${new URLSearchParams({ title: albumData?.name || "", artist: albumData?.artist || "" }).toString()}`)}>
                                <Edit3 size={16} />{t("journal_add_album")}
                            </button>
                            <h2 className="text-2xl text-blue-400 dark:text-blue-600 font-medium">
                                {albumData?.artist}
                            </h2>
                        </section>

                        <div className="flex items-center gap-3">
                            <FaStar className="text-[#FF1E56] text-2xl" />
                            <span className="text-3xl font-bold">
                                {albumData?.rating !== undefined
                                    ? Number(albumData.rating).toFixed(1)
                                    : "0.0"}
                            </span>
                            <span className="text-gray-500 font-medium">
                                {t("fan_rating")}
                            </span>
                        </div>

                        <div className="flex flex-wrap gap-3 items-center">
                            <button
                                onClick={() => { if (!requireAuth()) return; setIsPlaylistModalOpen(true); }}
                                aria-label={t("add_to_playlist", "Ajouter à une playlist")}
                                className="bg-panel dark:bg-panel border border-line dark:border-line p-4 rounded-xl text-ink"
                            >
                                <FaPlus />
                            </button>

                            <div className="relative">
                                {/* --- BOUTON DÉCLENCHEUR --- */}
                                <button
                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    className="bg-panel dark:bg-panel border border-line dark:border-line px-5 py-3.5 rounded-xl text-ink flex items-center gap-4 min-w-[220px] justify-between shadow-lg"
                                >
                                    <span className="text-sm font-bold tracking-wide uppercase flex items-center gap-2">
                                        {activeOption ? (
                                            <>
                                                <span className={activeOption.color}>{activeOption.icon}</span>
                                                {activeOption.label}
                                            </>
                                        ) : (
                                            <span>{t("select_status", "Statut")}</span>
                                        )}
                                    </span>
                                    <FaChevronDown
                                        className={`text-gray-500 transition-transform duration-300 ${isDropdownOpen ? "rotate-180" : ""}`}
                                        size={12}
                                    />
                                </button>

                                {/* --- LISTE DES OPTIONS --- */}
                                {isDropdownOpen && (
                                    <>
                                        <div className="fixed inset-0 z-40"
                                            onClick={() => setIsDropdownOpen(false)}></div>
                                        <div
                                            className="absolute top-full left-0 mt-2 w-full bg-panel dark:bg-panel border border-line dark:border-line rounded-xl shadow-2xl overflow-hidden z-50">
                                            {STATUT_OPTIONS.map((option) => (
                                                <button
                                                    key={option.id}
                                                    onClick={() => {
                                                        handleStatusChange(option.id);
                                                        setIsDropdownOpen(false);
                                                    }}
                                                    className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-raised dark:hover:bg-gray-100 text-left border-b border-line dark:border-line last:border-0 ${userStatus === option.id ? 'bg-raised/50 dark:bg-raised' : ''
                                                        }`}
                                                >
                                                    <span className={`${option.color}`}>{option.icon}</span>
                                                    <span
                                                        className="text-sm font-bold text-gray-200 dark:text-gray-700 uppercase">
                                                        {option.label}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        <section>
                            <h3 className="text-xl font-bold mb-4 border-b border-line dark:border-line pb-2 w-fit">
                                {t("description_title")}
                            </h3>
                            <p className="text-muted dark:text-muted leading-relaxed max-w-2xl">
                                {albumData?.wiki?.summary
                                    ? albumData.wiki.summary
                                        .replace(/<[^>]*>?/gm, "")
                                        .split(" <a href")[0]
                                    : "Aucune biographie disponible."}
                            </p>
                        </section>

                        <AlbumTrackList tracks={albumData?.tracks || []} artist={albumData?.artist || urlArtist} />

                        <div className="mt-4">
                            <div
                                className="flex gap-2 mb-8 bg-panel dark:bg-panel p-1.5 rounded-xl w-fit border border-line dark:border-line shadow-sm">
                                {[t("tab_comments"), t("tab_similar")].map((tabLabel, idx) => {
                                    const isCommentsTab = idx === 0;
                                    const isTabActive = isCommentsTab
                                        ? activeTab === "Commentaires"
                                        : activeTab === "Albums";
                                    return (
                                        <button
                                            key={tabLabel}
                                            onClick={() =>
                                                setActiveTab(isCommentsTab ? "Commentaires" : "Albums")
                                            }
                                            className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${isTabActive ? "bg-gray-700 dark:bg-raised text-ink shadow-md" : "text-muted dark:text-muted"}`}
                                        >
                                            {isCommentsTab
                                                ? `${t("tab_comments")} (${commentsList.length})`
                                                : tabLabel}
                                        </button>
                                    );
                                })}
                            </div>

                            {activeTab === "Commentaires" ? (
                                <>
                                    {!hasAlreadyReviewed ? (
                                        <AlbumReviewComposer {...reviews}  />
                                    ) : (
                                        <div
                                            className="mb-10 bg-blue-500/10 border border-blue-500/20 p-5 rounded-2xl text-center text-sm text-blue-400 font-semibold shadow-inner">
                                            {t("review_already_wrote")}
                                        </div>
                                    )}

                                    {/* Liste dynamique des avis */}
                                    {loadingReviews ? (
                                        <div className="flex justify-center py-6">
                                            <Loader2
                                                className="animate-spin text-pink-500"
                                                size={32}
                                            />
                                        </div>
                                    ) : commentsList.length > 0 ? (
                                        <AlbumReviews {...reviews} setReportingReviewId={setReportingReviewId} setIsReportModalOpen={setIsReportModalOpen} setReportingCommentId={setReportingCommentId} />
                                    ) : (
                                        <div className="text-center py-10 text-gray-500">
                                            Soyez le premier à donner votre avis !
                                        </div>
                                    )}
                                </>
                            ) : activeTab === "Albums" && (
                                <SimilarAlbums
                                    loadingSimilar={loadingSimilar}
                                    similarAlbums={similarAlbums}
                                    PLACEHOLDER_IMAGE={PLACEHOLDER_IMAGE}
                                />
                            )}
                        </div>
                    </div>
                </div>
                {/* Modal de Signalement */}
                {isReportModalOpen && (
                    <AlbumReportDialog
                        reportReason={reportReason}
                        setReportReason={setReportReason}
                        setIsReportModalOpen={setIsReportModalOpen}
                        handleSendReport={handleSendReport}
                        isSubmittingReport={isSubmittingReport}
                    />
                )}
            </section>
        </div>
    );
};

export default AlbumDetails;
