import { AxiosResponse } from "axios";
import { jwtDecode } from "jwt-decode";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import apiClient from "../api/client";
import { getPremiumBanner } from "../banners.config";
import { AlbumCard } from "../components/AlbumCard";
import ProfileActivity from "../components/profile/ProfileActivity";
import ProfileBadges from "../components/profile/ProfileBadges";
import ProfileCosmeticsDialog from "../components/profile/ProfileCosmeticsDialog";
import ProfileFollowDialog from "../components/profile/ProfileFollowDialog";
import ProfileHeader from "../components/profile/ProfileHeader";
import ProfilePlaylistDetail from "../components/profile/ProfilePlaylistDetail";
import ProfilePlaylists from "../components/profile/ProfilePlaylists";
import { useConfirm } from "../context/ConfirmContext";
import { useProfileCosmetics } from "../hooks/useProfileCosmetics";
import { getPattern } from "../patterns.config";
import { getProfileTitle } from "../titles.config";
import { toImageDataUri } from "../utils/imageDataUri";

const formatReviewItem = (
    item: any,
    username: string,
    currentUserId?: string,
) => {
    const content = item.media?.content;
    const isLastFm: boolean = !!content?.album;

    let userHasLiked: boolean = !!item.isLiked || !!item.review?.isLiked;

    if (!userHasLiked && currentUserId) {
        const likesArray = item.likes || item.review?.likes;

        if (Array.isArray(likesArray)) {
            userHasLiked = likesArray.some((like: any): boolean => {
                if (typeof like === "string" || typeof like === "number") {
                    return String(like) === String(currentUserId);
                }
                return String(like?.user_id || "") === String(currentUserId);
            });
        }
    }

    return {
        id: item.id,
        review_id: item.review_id || item.id,
        media_id: item.media_id,
        user_name: item.user?.pseudo || item.user?.username || username,
        album: isLastFm ? content.album.name : content?.name,
        artist: isLastFm ? content.album.artist : content?.artist,
        cover: isLastFm
            ? content.album.image?.find((img: any): boolean => img.size === "extralarge")?.[
            "#text"
            ] || content.album.image?.[0]?.["#text"]
            : content?.cover,
        rating: item.rating,
        content: item.content,
        likes_count: item.likes_count ?? item._count?.likes ?? 0,
        comments_count: item.comments_count ?? item._count?.comments ?? 0,
        isLiked: userHasLiked,
    };
};

const Profil: React.FC = () => {
    const { id: externalUserId } = useParams<{ id: string }>();
    const { t } = useTranslation(); // <-- Utilisation de t()
    const confirm = useConfirm();

    const fileInputRef = useRef<HTMLInputElement>(null);
    const bannerInputRef = useRef<HTMLInputElement>(null);
    const isInteracting = useRef(false);

    const [activeTab, setActiveTab] = useState("favorites");
    const [userProfil, setUserProfil] = useState<any>(null);
    const cosmetics = useProfileCosmetics(setUserProfil);
    const {showCosmetics, cosmeticLabel, openCosmetics} = cosmetics;

    const [userConnected, setUserConnected] = useState<string>("");
    const [playlists, setPlaylists] = useState<any[]>([]);
    const [badges, setBadges] = useState<any[]>([]);
    const [mediaStatuses, setMediaStatuses] = useState<any[]>([]);
    const [mediaStatusFilter, setMediaStatusFilter] = useState<string>("later");
    const [favoriteReviews, setFavoriteReviews] = useState<any[]>([]);
    const [followCounts, setFollowCounts] = useState({
        followers: 0,
        following: 0,
    });
    const [followModalType, setFollowModalType] = useState<"followers" | "following" | null>(null);
    const [followModalUsers, setFollowModalUsers] = useState<any[]>([]);
    const [followModalLoading, setFollowModalLoading] = useState(false);
    const [isFollowing, setIsFollowing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isOwnProfile, setIsOwnProfile] = useState(false);

    const [recentActivity, setRecentActivity] = useState<any[]>([]);
    const [activityOffset, setActivityOffset] = useState(0);
    const [hasMoreActivity, setHasMoreActivity] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [reportReason, setReportReason] = useState("");
    const [isSubmittingReport, setIsSubmittingReport] = useState(false);

    const [selectedPlaylist, setSelectedPlaylist] = useState<any | null>(null);

    useEffect((): void => {
        loadData();
    }, [externalUserId]);

    useEffect((): () => void => {
        const handleProfileUpdate: () => void = (): void => {
            loadData();
        };

        window.addEventListener("profileUpdated", handleProfileUpdate);
        return () =>
            window.removeEventListener("profileUpdated", handleProfileUpdate);
    }, [userConnected]);

    useEffect((): void => {
        if (
            activeTab === "activity" &&
            recentActivity.length === 0 &&
            userProfil?.id
        ) {
            const token: string | null = localStorage.getItem("token");
            if (token && !userConnected) return;

            fetchRecentActivity(0, userProfil.id);
        }
    }, [activeTab, userProfil?.id, userConnected]);

    const loadData: () => Promise<void> = async (): Promise<void> => {
        setLoading(true);

        setRecentActivity([]);
        setActivityOffset(0);
        setHasMoreActivity(true);

        try {
            const token: string | null = localStorage.getItem("token");
            if (!token) return;
            const decoded: any = jwtDecode(token);
            const currentUserId: string = String(decoded.id);
            setUserConnected(currentUserId);

            const targetId: string = externalUserId ? String(externalUserId) : currentUserId;
            const ownProfile: boolean = targetId === currentUserId;
            setIsOwnProfile(ownProfile);

            const promises: Promise<any>[] = [
                fetchProfile(targetId),
                fetchPlaylists(targetId, ownProfile),
                fetchFavoriteAlbums(targetId),
                fetchFollowCounts(targetId),
                fetchBadges(targetId),
                fetchMediaStatuses(targetId),
            ];

            if (!ownProfile) {
                promises.push(checkFollowStatus(targetId, currentUserId));
            }

            await Promise.all(promises);
        } catch (error) {
            console.error("Erreur chargement profil web:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchProfile = async (userId: string): Promise<void> => {
        try {
            const response: AxiosResponse<any, any> = await apiClient.get(`/users/public/${userId}`);
            const userData = response.data.user || response.data;
            setUserProfil(userData);
        } catch (error: any) {
            console.error("❌ Erreur Profil :", error.response?.status);
        }
    };

    const checkFollowStatus = async (
        targetUserId: string,
        currentUserId: string,
    ): Promise<void> => {
        try {
            const response: AxiosResponse<any, any> = await apiClient.get(
                `/follows/following/${currentUserId}`,
            );
            const followingList = response.data.data || [];
            const alreadyFollowing = followingList.some(
                (item: any): boolean => String(item.follow_user_id) === String(targetUserId),
            );
            setIsFollowing(alreadyFollowing);
        } catch (error: any) {
            console.error("❌ Erreur Statut Follow :", error.response?.status);
        }
    };

    const fetchFollowCounts = async (userId: string): Promise<void> => {
        try {
            const [resFollowers, resFollowing] = await Promise.all([
                apiClient.get(`/follows/followers/${userId}`),
                apiClient.get(`/follows/following/${userId}`),
            ]);
            const followersCount = resFollowers.data.count ?? (resFollowers.data.data?.length || 0);
            const fontlowingCount = resFollowing.data.count ?? (resFollowing.data.data?.length || 0);

            setFollowCounts({
                followers: followersCount,
                following: fontlowingCount,
            });
        } catch (error: any) {
            console.error("❌ Erreur Follow Counts :", error.response?.status);
        }
    };

    const openFollowModal = async (type: "followers" | "following"): Promise<void> => {
        if (!userProfil?.id) return;
        setFollowModalType(type);
        setFollowModalLoading(true);
        try {
            const response: AxiosResponse<any, any> = await apiClient.get(
                `/follows/${type}/${userProfil.id}/users`,
            );
            setFollowModalUsers(response.data.data || []);
        } catch (error: any) {
            console.error("❌ Erreur liste follow :", error.response?.status);
            setFollowModalUsers([]);
        } finally {
            setFollowModalLoading(false);
        }
    };

    const handleFollowToggle = async (): Promise<void> => {
        if (!userProfil?.id || !userConnected || isInteracting.current) return;
        isInteracting.current = true;

        const previousStatus: boolean = isFollowing;
        const previousFollowers: number = followCounts.followers;

        setIsFollowing(!previousStatus);
        setFollowCounts((prev) => ({
            ...prev,
            followers: previousStatus
                ? Math.max(0, prev.followers - 1)
                : prev.followers + 1,
        }));

        try {
            if (previousStatus) {
                await apiClient.delete(`/follows/`, {
                    data: { user_id: userConnected, follow_user_id: userProfil.id },
                });
            } else {
                await apiClient.post(`/follows/`, {
                    user_id: userConnected,
                    follow_user_id: userProfil.id,
                });
            }
            await fetchFollowCounts(userProfil.id);
        } catch (error) {
            console.error("Erreur Follow/Unfollow:", error);
            toast.error(t("alert_follow_error")); // <-- Traduit
            setIsFollowing(previousStatus);
            setFollowCounts((prev) => ({ ...prev, followers: previousFollowers }));
        } finally {
            isInteracting.current = false;
        }
    };

    const fetchPlaylists = async (
        userId: string,
        ownProfile: boolean,
    ): Promise<void> => {
        try {
            const response: AxiosResponse<any, any> = await apiClient.get(`/playlists/user/${userId}`);
            const allPlaylists = response.data.playlists || [];
            const filtered = ownProfile
                ? allPlaylists
                : allPlaylists.filter((p: any): boolean => p.is_public === true);
            setPlaylists(filtered);
        } catch (error: any) {
            console.error("❌ Erreur Playlists :", error.response?.status);
        }
    };

    const fetchBadges = async (userId: string): Promise<void> => {
        try {
            const response: AxiosResponse<any, any> = await apiClient.get(`/badges/user/${userId}`);
            setBadges(response.data.badges || []);
        } catch (error: any) {
            console.error("❌ Erreur Badges :", error.response?.status);
        }
    };

    const fetchMediaStatuses = async (userId: string): Promise<void> => {
        try {
            const response: AxiosResponse<any, any> = await apiClient.get(`/medias/status/user/${userId}`);
            setMediaStatuses(response.data.mediasStatus || []);
        } catch (error: any) {
            console.error("❌ Erreur Statuts média :", error.response?.status);
        }
    };

    const fetchPlaylistDetails: (id: string) => Promise<void> = async (id: string): Promise<void> => {
        try {
            const res: AxiosResponse<any, any> = await apiClient.get(`/playlists/${id}`);
            setSelectedPlaylist(res.data.playlist);
        } catch (error) {
            console.error("Erreur chargement détails playlist:", error);
            toast.error(t("alert_playlist_load_error")); // <-- Traduit
        }
    };

    const handleDeletePlaylist = async (
        e: React.MouseEvent,
        playlistId: string,
    ): Promise<void> => {
        e.stopPropagation();
        const ok = await confirm({
            title: t("delete_playlist_title", "Supprimer la playlist"),
            message: t("delete_playlist_confirm"),
            confirmText: t("delete", "Supprimer"),
            danger: true,
        });
        if (!ok) return;

        try {
            await apiClient.delete(`/playlists/${playlistId}`);
            setPlaylists((prev: any[]) => prev.filter((p: any) => p.id !== playlistId));
            toast.success(t("playlist_delete_success", "Playlist supprimée."));
        } catch (error) {
            console.error("Erreur suppression playlist:", error);
            toast.error(t("playlist_delete_error", "Impossible de supprimer la playlist."));
        }
    };

    const removeItem = async (
        e: React.MouseEvent,
        playlistItemId: string,
        mediaTitle: string,
    ): Promise<void> => {
        e.stopPropagation();
        const ok = await confirm({
            title: t("remove_item_title", "Retirer de la playlist"),
            message: t("confirm_remove_item", { title: mediaTitle }),
            confirmText: t("remove", "Retirer"),
            danger: true,
        });
        if (!ok) return;
        try {
            await apiClient.delete(`/playlist-items/${playlistItemId}`);
            setSelectedPlaylist((prev: any) => ({
                ...prev,
                items: prev.items.filter((i: any): boolean => i.id !== playlistItemId),
            }));
            toast.success(t("item_removed_success", "Élément retiré."));
        } catch (error) {
            console.error("Erreur suppression:", error);
            toast.error(t("alert_item_remove_error")); // <-- Traduit
        }
    };

    const handleProfilePictureClick = (): void => {
        if (isOwnProfile && fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        const file: File | undefined = e.target.files?.[0];
        if (!file) return;

        const reader: FileReader = new FileReader();
        reader.onloadend = (): void => {
            const base64Result: string = reader.result as string;
            const base64Image: string = base64Result.split(",")[1];
            uploadProfilePicture(base64Image, base64Result);
        };
        reader.readAsDataURL(file);
    };

    const uploadProfilePicture = async (
        base64Image: string,
        localUri: string,
    ): Promise<void> => {
        try {
            setUserProfil((prev: any) => ({ ...prev, profile_picture: localUri }));

            await apiClient.put(`/users/${userConnected}`, {
                profile_picture: base64Image,
            });

            const user = JSON.parse(localStorage.getItem("user") || "{}");
            user.profile_picture = localUri;
            localStorage.setItem("user", JSON.stringify(user));

            window.dispatchEvent(new Event("profileUpdated"));
            toast.success(t("alert_pfp_success")); // <-- Traduit
        } catch (error) {
            console.error("Erreur upload image:", error);
            toast.error(t("alert_pfp_error")); // <-- Traduit
            await fetchProfile(userConnected);
        }
    };

    const handleBannerClick = (): void => {
        if (isOwnProfile && bannerInputRef.current) {
            bannerInputRef.current.click();
        }
    };

    const handleBannerFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        const file: File | undefined = e.target.files?.[0];
        if (!file) return;

        const reader: FileReader = new FileReader();
        reader.onloadend = (): void => {
            const base64Result: string = reader.result as string;
            const base64Image: string = base64Result.split(",")[1];
            uploadBanner(base64Image, base64Result);
        };
        reader.readAsDataURL(file);
    };

    const uploadBanner = async (
        base64Image: string,
        localUri: string,
    ): Promise<void> => {
        try {
            setUserProfil((prev: any) => ({ ...prev, banner: localUri }));

            await apiClient.put(`/users/${userConnected}`, {
                banner: base64Image,
            });

            toast.success(t("alert_banner_success"));
        } catch (error) {
            console.error("Erreur upload bannière:", error);
            toast.error(t("alert_banner_error"));
            await fetchProfile(userConnected);
        }
    };

    const fetchFavoriteAlbums = async (userId: string): Promise<void> => {
        try {
            const response: AxiosResponse<any, any> = await apiClient.get(`/reviews/user/${userId}/top`);
            const rawData = response.data.data || [];

            const normalizedData = rawData.map((item: any): any => {
                const content = item.media?.content;
                if (content?.album) {
                    return {
                        ...item,
                        media: {
                            ...item.media,
                            content: {
                                name: content.album.name,
                                artist: content.album.artist,
                                cover:
                                    content.album.image?.find(
                                        (img: any): boolean => img.size === "extralarge",
                                    )?.["#text"] || content.album.image?.[0]?.["#text"],
                            },
                        },
                    };
                }
                return item;
            });
            setFavoriteReviews(normalizedData);
        } catch (error: any) {
            console.error("❌ Erreur Favorite Albums :", error.response?.status);
        }
    };

    const fetchRecentActivity = async (offset: number, userId: string): Promise<void> => {
        if (loadingMore || (!hasMoreActivity && offset !== 0)) return;
        setLoadingMore(true);

        try {
            const response: AxiosResponse<any, any> = await apiClient.get(`/reviews/user/${userId}/activity`, {
                params: {
                    limit: 10,
                    offset: offset,
                    currentUserId: userConnected,
                },
            });

            const newItems = (response.data.data || []).map((review: any) =>
                formatReviewItem(review, userProfil?.pseudo || userProfil?.username || "User", userConnected),
            );

            if (offset === 0) setRecentActivity(newItems);
            else setRecentActivity((prev: any[]) => [...prev, ...newItems]);

            setHasMoreActivity(newItems.length === 10);
            setActivityOffset(offset + newItems.length);
        } catch (error: any) {
            console.error("❌ Erreur Activité :", error.response?.status);
        } finally {
            setLoadingMore(false);
        }
    };

    const handleLike = async (id: string): Promise<void> => {
        if (!userConnected || isInteracting.current) return;
        isInteracting.current = true;

        setRecentActivity((prevActivity: any[]) => {
            return prevActivity.map((item): any => {
                if (item.id === id) {
                    const currentlyLiked: boolean = !!item.isLiked;
                    return {
                        ...item,
                        isLiked: !currentlyLiked,
                        likes_count: currentlyLiked
                            ? Math.max(0, item.likes_count - 1)
                            : item.likes_count + 1,
                    };
                }
                return item;
            });
        });

        const targetItem = recentActivity.find((f): boolean => f.id === id);
        if (!targetItem) {
            isInteracting.current = false;
            return;
        }

        try {
            const response: AxiosResponse<any, any> = await apiClient.post(`/reviews/likes/toggle`, {
                review_id: targetItem.review_id,
                user_id: userConnected,
            });

            setRecentActivity((prevActivity: any[]) =>
                prevActivity.map((item: any) =>
                    item.id === id
                        ? {
                            ...item,
                            isLiked: response.data.isLiked,
                            likes_count: response.data.likes_count,
                        }
                        : item,
                ),
            );
        } catch (error) {
            setRecentActivity(recentActivity);
        } finally {
            isInteracting.current = false;
        }
    };

    const submitReport = async (): Promise<void> => {
        if (!reportReason.trim()) {
            toast.error(t("report_alert_empty")); // <-- Traduit
            return;
        }

        setIsSubmittingReport(true);

        try {
            await apiClient.post(`/reports/profile`, {
                reporter_id: userConnected,
                profile_id: userProfil?.id,
                reason: reportReason,
                reason_type: "profile",
            });
            toast.success(t("report_alert_success")); // <-- Traduit
            setIsReportModalOpen(false);
            setReportReason("");
        } catch (error) {
            console.error("Erreur lors du signalement:", error);
            toast.error(t("report_alert_error")); // <-- Traduit
        } finally {
            setIsSubmittingReport(false);
        }
    };

    const formatPlaylistImage = (imgUrl: string): string => toImageDataUri(imgUrl) || "";

    if (loading) {
        return (
            <div className="min-h-screen bg-canvas dark:bg-canvas flex items-center justify-center transition-colors duration-300">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    const unlockedBadgesCount: number = badges.filter((b) => b.unlocked).length;

    const tabs = [
        { id: "favorites", label: t("tab_favorite_albums") },
        { id: "playlists", label: `${t("tab_playlists")} (${playlists.length})` },
        { id: "mediaStatus", label: t("tab_media_status", "Écoute") },
        { id: "badges", label: `${t("tab_badges", "Badges")} (${unlockedBadgesCount})` },
        { id: "activity", label: t("tab_recent_activity") },
    ];

    const equippedBannerDef = getPremiumBanner(userProfil?.equipped_banner);
    const equippedTitleDef = getProfileTitle(userProfil?.equipped_title);
    const equippedPatternDef = getPattern(userProfil?.equipped_pattern);

    return (
        <div
            className={`min-h-screen bg-canvas text-slate-200 dark:bg-canvas dark:text-gray-900 font-sans transition-colors duration-300 ${equippedPatternDef?.className || ""}`}>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
            />
            <input
                type="file"
                ref={bannerInputRef}
                onChange={handleBannerFileChange}
                accept="image/*"
                className="hidden"
            />

            {/* Header */}
            <ProfileHeader
                handleBannerClick={handleBannerClick}
                isOwnProfile={isOwnProfile}
                equippedBannerDef={equippedBannerDef}
                userProfil={userProfil}
                handleProfilePictureClick={handleProfilePictureClick}
                equippedTitleDef={equippedTitleDef}
                cosmeticLabel={cosmeticLabel}
                openCosmetics={openCosmetics}
                handleFollowToggle={handleFollowToggle}
                isFollowing={isFollowing}
                setIsReportModalOpen={setIsReportModalOpen}
                openFollowModal={openFollowModal}
                followCounts={followCounts}
                favoriteReviews={favoriteReviews}
            />

            {/* Navigation des Onglets cachée si on regarde le détail d'une playlist */}
            {!selectedPlaylist && (
                <div className="max-w-6xl mx-auto px-6 mt-12">
                    <div
                        className="bg-panel/50 dark:bg-panel border border-line dark:border-line p-1 rounded-xl flex items-center justify-between shadow-inner transition-colors">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${activeTab === tab.id
                                        ? "bg-raised dark:bg-raised text-ink shadow-md"
                                        : "text-muted dark:text-muted hover:text-white dark:hover:text-gray-900 hover:bg-raised/40 dark:hover:bg-gray-50"
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <section className="max-w-6xl mx-auto px-6 py-10">
                {selectedPlaylist ? (
                    <ProfilePlaylistDetail
                        setSelectedPlaylist={setSelectedPlaylist}
                        selectedPlaylist={selectedPlaylist}
                        formatPlaylistImage={formatPlaylistImage}
                        isOwnProfile={isOwnProfile}
                        removeItem={removeItem}
                    />
                ) : (
                    <>
                        {activeTab === "favorites" && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                                {favoriteReviews.map((item) => (
                                    <AlbumCard
                                        key={item.id}
                                        id={item.media_id}
                                        title={item.media?.content?.name}
                                        artist={item.media?.content?.artist}
                                        rating={item.rating}
                                        genre={item.media?.content?.genre || ""}
                                        cover={item.media?.content?.cover}
                                    />
                                ))}
                            </div>
                        )}

                        {activeTab === "playlists" && (
                            <ProfilePlaylists
                                isOwnProfile={isOwnProfile}
                                fetchPlaylists={fetchPlaylists}
                                userConnected={userConnected}
                                playlists={playlists}
                                fetchPlaylistDetails={fetchPlaylistDetails}
                                formatPlaylistImage={formatPlaylistImage}
                                handleDeletePlaylist={handleDeletePlaylist}
                            />
                        )}

                        {activeTab === "mediaStatus" && (() => {
                            const statusCounts = { listened: 0, later: 0, favorite: 0, disliked: 0 };
                            mediaStatuses.forEach((item: any): void => {
                                const key = item.status?.toLowerCase();
                                if (key in statusCounts) statusCounts[key as keyof typeof statusCounts]++;
                            });

                            const statusFilters = [
                                { id: "listened", label: t("status_listened", "Écoutés"), icon: "✅" },
                                { id: "later", label: t("status_later", "À écouter"), icon: "🎧" },
                                { id: "favorite", label: t("status_favorite", "Favoris"), icon: "⭐" },
                                { id: "disliked", label: t("status_disliked", "Détestés"), icon: "❌" },
                            ];

                            const filteredAlbums = mediaStatuses
                                .filter((item: any): boolean => item.status?.toLowerCase() === mediaStatusFilter && item.media)
                                .map((item: any) => ({
                                    id: item.media.id,
                                    title: item.media.name,
                                    artist: item.media.artist,
                                    image: item.media.cover || "",
                                    rating: item.media.rating ?? 0,
                                }));

                            return (
                                <div className="space-y-6">
                                    <div className="flex flex-wrap bg-panel/50 dark:bg-panel border border-line dark:border-line rounded-xl p-1 shadow-inner">
                                        {statusFilters.map((filter) => (
                                            <button
                                                key={filter.id}
                                                onClick={() => setMediaStatusFilter(filter.id)}
                                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg font-semibold text-sm transition-all ${mediaStatusFilter === filter.id
                                                        ? "bg-raised dark:bg-raised text-ink shadow-md"
                                                        : "text-muted dark:text-muted hover:text-white dark:hover:text-gray-900"
                                                    }`}
                                            >
                                                <span>{filter.icon}</span>
                                                <span>{filter.label}</span>
                                                <span className="opacity-75">({statusCounts[filter.id as keyof typeof statusCounts]})</span>
                                            </button>
                                        ))}
                                    </div>

                                    {filteredAlbums.length > 0 ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {filteredAlbums.map((album) => (
                                                <AlbumCard
                                                    key={album.id}
                                                    id={album.id}
                                                    title={album.title}
                                                    artist={album.artist}
                                                    cover={album.image}
                                                    rating={album.rating}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-slate-500 font-medium py-12 text-center">
                                            {t("no_album_category", "Aucun album dans cette catégorie")}
                                        </p>
                                    )}
                                </div>
                            );
                        })()}

                        {activeTab === "badges" && (
                            <ProfileBadges
                                badges={badges}
                            />
                        )}

                        {activeTab === "activity" && (
                            <ProfileActivity
                                recentActivity={recentActivity}
                                handleLike={handleLike}
                                hasMoreActivity={hasMoreActivity}
                                fetchRecentActivity={fetchRecentActivity}
                                activityOffset={activityOffset}
                                userProfil={userProfil}
                                loadingMore={loadingMore}
                            />
                        )}
                    </>
                )}

                {isReportModalOpen && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
                        <div
                            className="bg-panel dark:bg-panel border border-line dark:border-line p-6 rounded-xl shadow-2xl w-full max-w-md">
                            <h3 className="text-xl font-bold text-ink mb-4">
                                {t("report_title")} {userProfil?.username}
                            </h3>

                            <p className="text-sm text-muted dark:text-muted mb-4">
                                {t("report_desc")}
                            </p>

                            <textarea
                                value={reportReason}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReportReason(e.target.value)}
                                placeholder={t("report_placeholder")}
                                className="w-full h-32 p-3 bg-panel/50 dark:bg-canvas border border-line dark:border-line rounded-lg text-ink placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors resize-none mb-6"
                            />

                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={(): void => {
                                        setIsReportModalOpen(false);
                                        setReportReason("");
                                    }}
                                    className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-300 dark:text-muted hover:bg-raised dark:hover:bg-gray-100 transition-colors"
                                    disabled={isSubmittingReport}
                                >
                                    {t("report_btn_cancel")}
                                </button>
                                <button
                                    onClick={submitReport}
                                    disabled={isSubmittingReport || !reportReason.trim()}
                                    className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 hover:bg-red-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {isSubmittingReport ? t("report_btn_sending") : t("report_btn_submit")}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modale : gérer les cosmétiques (profil perso) */}
                {showCosmetics && (
                    <ProfileCosmeticsDialog {...cosmetics} userProfil={userProfil} />
                )}

                {followModalType && (
                    <ProfileFollowDialog
                        setFollowModalType={setFollowModalType}
                        followModalType={followModalType}
                        followModalLoading={followModalLoading}
                        followModalUsers={followModalUsers}
                    />
                )}
            </section>
        </div>
    );
};

export default Profil;
