import React, {useState, useEffect, useCallback} from "react";
import {brand} from '../design/tokens';
import CoverImage from '../components/CoverImage';
import {
    StyleSheet,
    Text,
    View,
    Image,
    ScrollView,
    TouchableOpacity,
    Dimensions,
    Alert,
    ActivityIndicator,
    Modal,
    Pressable,
} from "react-native";
import {Ionicons} from "@expo/vector-icons";
import {useLocalSearchParams, useRouter, useFocusEffect} from "expo-router";
import * as SecureStore from "expo-secure-store";
import {jwtDecode} from "jwt-decode";

import Header from "@/src/components/Header";
import ReportButton from "../components/reports/ReportButton";
import StatCard from "@/src/components/StatCard";
import {AuthReviewButton} from "../components/AuthReviewButton";
import apiClient from "../api/client";
import {getValidSource} from "@/helpers/helpers";
import {AxiosResponse} from "axios";
import {useTheme} from "../context/ThemeContext";
import {useTranslation} from "react-i18next";


type TabType = "Reviews" | "Similar";

const AlbumDetails = () => {
    const {id, mbid, artist, album, cover} = useLocalSearchParams();
    const router = useRouter();
    const {theme} = useTheme();
    const {t} = useTranslation();

    const formatReviewDate = (dateStr: string | undefined): string => {
        const date = new Date(dateStr || Date.now());
        const now = new Date();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const time = date.toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"});
        if (date.toDateString() === now.toDateString()) return `${t("today")} · ${time}`;
        if (date.toDateString() === yesterday.toDateString()) return `${t("yesterday")} · ${time}`;
        return date.toLocaleDateString();
    };

    const [loading, setLoading] = useState(true);
    const [albumData, setAlbumData] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<TabType>("Reviews");
    const [showPlaylistSelector, setShowPlaylistSelector] = useState(false);
    const [similarAlbums, setSimilarAlbums] = useState([]);
    const [loadingSimilar, setLoadingSimilar] = useState(false);
    const [reviews, setReviews] = useState<any[]>([]);
    const [loadingReviews, setLoadingReviews] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [userStatus, setUserStatus] = useState<string | null>(null);
    const [userPlaylists, setUserPlaylists] = useState<any[]>([]);
    const [loadingPlaylists, setLoadingPlaylists] = useState(false);
    const [selectedPlaylists, setSelectedPlaylists] = useState<string[]>([]);
    const [userReview, setUserReview] = useState<any | null>(null);
    const [deletingReview, setDeletingReview] = useState(false);

    const mediaId = id || albumData?.id || albumData?.mediaId;
    const mediaIdInDB = albumData?.db_id || (id?.includes("-") ? id : null);

    useEffect((): void => {
        const initUser: () => Promise<void> = async (): Promise<void> => {
            try {
                const token: string | null =
                    await SecureStore.getItemAsync("userToken");
                if (token) {
                    const decoded: any = jwtDecode(token);
                    setCurrentUserId(decoded.id || decoded.sub || decoded.userId);
                }
            } catch (err) {
                console.error("Erreur décodage token:", err);
            }
        };
        initUser();
        fetchAlbumDetails();
    }, [id, mbid]);

    useEffect((): void => {
        const fetchCurrentStatus: () => Promise<void> = async (): Promise<void> => {
            if (currentUserId && albumData?.db_id) {
                try {
                    const res = await apiClient.get(
                        `/medias/status/${currentUserId}/${albumData.db_id}`,
                    );
                    if (res.data.mediaStatus) {
                        setUserStatus(res.data.mediaStatus.status);
                    }
                } catch (err) {
                    setUserStatus(null);
                }
            }
        };
        fetchCurrentStatus();
    }, [currentUserId, albumData?.db_id]);

    useFocusEffect(
        useCallback((): void => {
            if (mediaIdInDB) {
                fetchReviews();
            }

            if (activeTab === "Similar" && similarAlbums.length === 0) {
                fetchSimilar();
            }
        }, [activeTab, artist, album, mediaIdInDB, currentUserId]),
    );

    const fetchUserPlaylists: () => Promise<void> = async (): Promise<void> => {
        if (!currentUserId || !mediaId) {
            return;
        }

        try {
            setLoadingPlaylists(true);
            const res: AxiosResponse = await apiClient.get(`/playlists/user/${currentUserId}`);
            const playlists = res.data.playlists || [];
            setUserPlaylists(playlists);

            const alreadyIn = playlists
                .filter((pl: any) => {
                    return pl.items?.some((item: any): true | undefined => {
                        const match: boolean = String(item.media_id) === String(mediaId);
                        if (match) return match;
                    });
                })
                .map((pl: any) => pl.id);

            setSelectedPlaylists(alreadyIn);
        } catch (err) {
            console.error("Erreur chargement playlists:", err);
        } finally {
            setLoadingPlaylists(false);
        }
    };

    useEffect((): void => {
        if (currentUserId && mediaId) {
            fetchUserPlaylists();
        }
    }, [currentUserId, mediaId]);

    useEffect((): void => {
        if (showPlaylistSelector) fetchUserPlaylists();
    }, [showPlaylistSelector]);

    const handleAddToPlaylists: () => Promise<void> = async (): Promise<void> => {
        if (!currentUserId) { router.push("/restriction"); return; }
        if (!mediaId) return;

        try {
            const res = await apiClient.get(`/playlists/user/${currentUserId}`);
            const initialPlaylists = res.data.playlists || [];
            const initiallySelected = initialPlaylists
                .filter((pl: any) =>
                    pl.items?.some(
                        (item: any): boolean => String(item.media_id) === String(mediaId),
                    ),
                )
                .map((pl: any) => pl.id);

            const toAdd: string[] = selectedPlaylists.filter(
                (id: any): boolean => !initiallySelected.includes(id),
            );
            const toRemove = initiallySelected.filter(
                (id: any): boolean => !selectedPlaylists.includes(id),
            );

            const promises: any[] = [
                ...toAdd.map((id: any) =>
                    apiClient.post("/playlist-items", {
                        playlist_id: id,
                        media_id: mediaId,
                    }),
                ),
                ...toRemove.map((id: any) =>
                    apiClient.delete(`/playlist-items/remove`, {
                        data: {playlist_id: id, media_id: mediaId},
                    }),
                ),
            ];

            await Promise.all(promises);

            Alert.alert(t("success"), t("msg_playlists_updated"));
            setShowPlaylistSelector(false);
            await fetchUserPlaylists();
        } catch (err: any) {
            Alert.alert(t("error"), t("error_update_playlists"));
        }
    };

    const fetchAlbumDetails: () => Promise<void> = async (): Promise<void> => {
        try {
            setLoading(true);
            let finalData = null;

            if (id && id.includes("-")) {
                try {
                    const res = await apiClient.get(`/medias/${id}`);
                    const media = res.data.media || res.data;
                    if (media) {
                        finalData = {
                            ...(media.content || media),
                            db_id: media.id,
                        };
                    }
                } catch (err) {
                }
            }

            if (!finalData && artist && album) {
                const res = await apiClient.get("/api/albums/info", {
                    params: {artist, album, mbid},
                });
                finalData = res.data.albumInfo;

                const cleanArtist: string = String(artist).trim();
                const cleanAlbum: string = String(album).trim();
                const fallbackId: string = `album:${cleanArtist}:${cleanAlbum}`;

                try {
                    const syncRes = await apiClient.post("/medias/sync-search", {
                        albums: [
                            {
                                api_id: mbid || fallbackId,
                                name: cleanAlbum,
                                artist: cleanArtist,
                                cover: cover,
                                mbid: mbid || null,
                            },
                        ],
                    });

                    if (syncRes.data.medias?.length > 0) {
                        finalData.db_id = syncRes.data.medias[0].id;
                    }
                } catch (syncErr) {
                    console.warn("Échec sync en détails", syncErr);
                }
            }
            setAlbumData(finalData);
        } catch (error) {
            Alert.alert(t("error"), t("error_load_details"));
        } finally {
            setLoading(false);
        }
    };


    const fetchReviews: () => Promise<void> = async (): Promise<void> => {

        if (!mediaIdInDB) return;

        try {
            setLoadingReviews(true);

            const res = await apiClient.get(`/reviews/media/${mediaIdInDB}`);
            const mediaReviews = res.data.reviews || res.data || [];

            setReviews(mediaReviews);

            const ownReview = mediaReviews.find(
                (rev: any): boolean => rev.user_id === currentUserId,
            );

            setUserReview(ownReview || null);
        } catch (err) {
            console.error("Erreur récupération des avis par média (mobile):", err);
        } finally {
            setLoadingReviews(false);
        }
    };

    const fetchSimilar: () => Promise<void> = async (): Promise<void> => {
        try {
            setLoadingSimilar(true);
            const res = await apiClient.get("/api/albums/similar", {
                params: {
                    artist: artist || albumData?.artist,
                    album: album || albumData?.name,
                },
            });
            setSimilarAlbums(res.data.similarAlbums || []);
        } catch (err) {
            console.error("Erreur similaires:", err);
        } finally {
            setLoadingSimilar(false);
        }
    };

    const handleDeleteReview: (reviewId: string) => Promise<void> = async (reviewId: string): Promise<void> => {
        Alert.alert(
            t("delete"),
            t("delete_confirm"),
            [
                {
                    text: t("cancel"),
                    style: "cancel",
                },
                {
                    text: t("delete"),
                    style: "destructive",
                    onPress: async (): Promise<void> => {
                        try {
                            setDeletingReview(true);

                            await apiClient.delete(`/reviews/${reviewId}`);

                            setReviews((prev: any[]) => prev.filter((rev): boolean => rev.id !== reviewId));

                            setUserReview(null);

                            Alert.alert(t("success"), t("msg_review_deleted"));
                        } catch (error) {
                            console.error("Erreur suppression review:", error);

                            Alert.alert(t("error"), t("error_delete_review"));
                        } finally {
                            setDeletingReview(false);
                        }
                    },
                },
            ],
        );
    };

    const handleStatusChange: (newStatus: string) => Promise<void> = async (newStatus: string): Promise<void> => {
        if (!currentUserId) { router.push("/restriction"); return; }
        if (!mediaIdInDB) return;

        const previousStatus: string | null = userStatus;
        const isDeselecting: boolean = userStatus === newStatus;

        try {
            setUserStatus(isDeselecting ? null : newStatus);
            if (isDeselecting) {
                await apiClient.delete(`/medias/status/${currentUserId}/${mediaIdInDB}`);
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
                            status: newStatus,
                        });
                    } else {
                        throw err;
                    }
                }
            }
        } catch (error: any) {
            setUserStatus(previousStatus);
            console.error("Erreur status:", error.response?.data);
            Alert.alert(t("error"), t("status_update_error"));
        }
    };

    const handleToggleLike: (reviewId: string) => Promise<void> = async (reviewId: string): Promise<void> => {
        if (!currentUserId) { router.push("/restriction"); return; }

        const updatedReviews: any[] = reviews.map((rev) => {
            if (rev.id === reviewId) {
                const isLiked = rev.likes?.some(
                    (l: any): boolean => l.user_id === currentUserId,
                );

                return {
                    ...rev,
                    likes: isLiked
                        ? rev.likes.filter((l: any): boolean => l.user_id !== currentUserId)
                        : [...(rev.likes || []), {user_id: currentUserId}],
                };
            }
            return rev;
        });
        setReviews(updatedReviews);

        try {
            await apiClient.post(`/reviews/likes/toggle`, {
                review_id: reviewId,
                user_id: currentUserId,
            });
        } catch (error) {
            await fetchReviews();
        }
    };

    const averageRating: number =
        reviews.length > 0
            ? reviews.reduce((acc, rev) => acc + rev.rating, 0) / reviews.length
            : 0;

    if (loading || !albumData)
        return (
            <View style={[styles.container, styles.center, {backgroundColor: theme.background}]}>
                <ActivityIndicator size="large" color="#ec4899"/>
            </View>
        );

    return (
        <View style={[styles.container, {backgroundColor: theme.background}]}>
            <Header/>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                <View style={styles.imageContainer}>
                    <CoverImage uri={Array.isArray(cover) ? cover[0] : cover} style={styles.coverImage}/>
                </View>

                <View style={styles.paddingContent}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.badgeRow}
                    >
                        {albumData.album?.tags?.tag?.map((t: any, i: number) => (
                            <View
                                key={i}
                                style={[
                                    styles.badge,
                                    {
                                        backgroundColor: i === 0 ? "#ec4899" : theme.surface,
                                        borderColor: theme.border,
                                    },
                                ]}
                            >
                                <Text style={styles.badgeText}>{t.name.toUpperCase()}</Text>
                            </View>
                        ))}
                    </ScrollView>

                    <Text style={[styles.albumTitle, {color: theme.text}]}>
                        {albumData.album?.name || albumData.name}
                    </Text>
                    <Text style={[styles.artistName, {color: theme.subText}]}>
                        {albumData.album?.artist || albumData.artist}
                    </Text>

                    <View style={styles.ratingRow}>
                        <View style={styles.starsRow}>
                            {[1, 2, 3, 4, 5].map((s: number) => (
                                <Ionicons
                                    key={s}
                                    name={
                                        s <= Math.round(averageRating) ? "star" : "star-outline"
                                    }
                                    size={20}
                                    color="#fbbf24"
                                />
                            ))}
                        </View>
                        <Text style={[styles.ratingValue, {color: theme.text}]}>{averageRating.toFixed(1)}</Text>
                        <Text style={[styles.ratingCount, {color: theme.placeholder}]}>({reviews.length} avis)</Text>
                    </View>

                    <View style={styles.actionButtons}>
                        <View style={styles.grid}>
                            <StatCard
                                title={t("status_completed")}
                                icon="check-circle-outline"
                                color="#00ffa3"
                                checked={userStatus === "listened"}
                                onPress={(): Promise<void> => handleStatusChange("listened")}
                            />
                            <StatCard
                                title={t("status_listening")}
                                icon="playlist-music"
                                color="#4747ff"
                                checked={userStatus === "later"}
                                onPress={(): Promise<void> => handleStatusChange("later")}
                            />
                            <StatCard
                                title={t("status_wishlist")}
                                icon="star"
                                color="#fbbf24"
                                checked={userStatus === "favorite"}
                                onPress={(): Promise<void> => handleStatusChange("favorite")}
                            />
                            <StatCard
                                title={t("status_dropped")}
                                icon="close-circle-outline"
                                color="#f43f5e"
                                checked={userStatus === "disliked"}
                                onPress={(): Promise<void> => handleStatusChange("disliked")}
                            />
                        </View>

                        <TouchableOpacity
                            style={styles.primaryButton}
                            onPress={(): void => {
                                if (!currentUserId) { router.push("/restriction"); return; }
                                setShowPlaylistSelector(true);
                            }}
                        >
                            <Text style={styles.primaryButtonText}>
                                {t("add_to_playlist")}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.aboutSection}>
                        <Text style={[styles.sectionTitle, {color: theme.text}]}>{t("section_about")}</Text>
                        <Text style={[styles.aboutText, {color: theme.subText}]}>
                            {albumData.album?.wiki?.summary
                                ? albumData.album.wiki.summary
                                    .replace(/<[^>]*>?/gm, "")
                                    .split(" <a href")[0]
                                : t("text_no_biography")}
                        </Text>
                    </View>
                </View>

                <View style={[styles.tabsContainer, {backgroundColor: theme.surface}]}>
                    {(["Reviews", "Similar"] as TabType[]).map((tab) => (
                        <TouchableOpacity
                            key={tab}
                            style={[styles.tab, activeTab === tab && [styles.activeTab, {backgroundColor: theme.card}]]}
                            onPress={(): void => setActiveTab(tab)}
                        >
                            <Text
                                style={[
                                    styles.tabText,
                                    {color: theme.placeholder},
                                    activeTab === tab && [styles.activeTabText, {color: theme.text}],
                                ]}
                            >
                                {tab === "Reviews" ? t("tab_reviews") : t("tab_similar")}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={styles.tabContent}>
                    {activeTab === "Reviews" ? (
                        <View style={{paddingBottom: 20}}>
                            <View style={{alignItems: "center", marginVertical: 15}}>
                                <AuthReviewButton
                                    isLoggedIn={!!currentUserId}
                                    onPress={(): void => {
                                        if (userReview) {
                                            return Alert.alert(
                                                t("already_reviewed"),
                                                t("error_review_already_published_msg"),
                                            );
                                        }

                                        if (!mediaId)
                                            return Alert.alert(
                                                t("msg_please_wait"),
                                                t("msg_album_syncing"),
                                            );

                                        router.push({
                                            pathname: "/writereview",
                                            params: {
                                                id: mediaId,
                                                title: albumData.album?.name || albumData.name,
                                                artist: albumData.album?.artist || albumData.artist,
                                                cover: cover,
                                            },
                                        });
                                    }}
                                />
                            </View>

                            {loadingReviews ? (
                                <ActivityIndicator color="#ec4899"/>
                            ) : reviews.length > 0 ? (
                                reviews.map((rev) => {
                                    return (
                                        <View key={rev.id} style={[styles.reviewCard, {backgroundColor: theme.surface, borderColor: theme.border}]}>
                                            <View style={styles.reviewHeader}>
                                                <View style={styles.userInfo}>
                                                    {rev.user?.avatar ||
                                                    rev.user?.image ||
                                                    rev.user?.profilePicture ? (
                                                        <Image
                                                            source={getValidSource(
                                                                rev.user.avatar ||
                                                                rev.user.image ||
                                                                rev.user.profilePicture,
                                                            )}
                                                            style={styles.userAvatarImage}
                                                        />
                                                    ) : (
                                                        <Ionicons
                                                            name="person-circle"
                                                            size={24}
                                                            color={theme.subText}
                                                            style={{marginRight: 8}}
                                                        />
                                                    )}

                                                    <TouchableOpacity
                                                        disabled={!rev.user?.id}
                                                        onPress={(): void => {
                                                            const userId = rev.user_id;

                                                            if (!userId) return;

                                                            router.push({
                                                                pathname: "/profile",
                                                                params: {id: userId},
                                                            });
                                                        }}
                                                    >
                                                        <Text style={styles.reviewerName}>
                                                            {rev.user?.username || "Anonyme"}
                                                        </Text>
                                                    </TouchableOpacity>
                                                </View>

                                                <View style={styles.starsRow}>
                                                    {[1, 2, 3, 4, 5].map((s: number) => (
                                                        <Ionicons
                                                            key={s}
                                                            name={s <= rev.rating ? "star" : "star-outline"}
                                                            size={14}
                                                            color="#fbbf24"
                                                        />
                                                    ))}
                                                </View>
                                            </View>

                                            <Text style={[styles.reviewTitleText, {color: theme.text}]}>{rev.title}</Text>
                                            <Text style={[styles.reviewContentText, {color: theme.subText}]}>
                                                {rev.content}
                                            </Text>

                                            <View style={styles.reviewFooter}>
                                                <View style={styles.reviewActionsLeft}>
                                                    <TouchableOpacity
                                                        style={styles.actionIconBtn}
                                                        onPress={(): Promise<void> => handleToggleLike(rev.id)}
                                                    >
                                                        <Ionicons
                                                            name={
                                                                rev.likes?.some(
                                                                    (l: any): boolean => l.user_id === currentUserId,
                                                                )
                                                                    ? "heart"
                                                                    : "heart-outline"
                                                            }
                                                            size={18}
                                                            color={
                                                                rev.likes?.some(
                                                                    (l: any): boolean => l.user_id === currentUserId,
                                                                )
                                                                    ? "#ec4899"
                                                                    : theme.subText
                                                            }
                                                        />
                                                        <Text style={[styles.actionCountText, {color: theme.subText}]}>
                                                            {rev.likes?.length || 0}
                                                        </Text>
                                                    </TouchableOpacity>

                                                    <TouchableOpacity
                                                        style={styles.actionIconBtn}
                                                        onPress={(): void =>
                                                            router.push(`/review/${rev.id}/comments`)
                                                        }
                                                    >
                                                        <Ionicons
                                                            name="chatbubble-outline"
                                                            size={18}
                                                            color={theme.subText}
                                                        />
                                                        <Text style={[styles.actionCountText, {color: theme.subText}]}>
                                                            {rev._count?.comments ?? 0}
                                                        </Text>
                                                    </TouchableOpacity>
                                                </View>

                                                {rev.user_id === currentUserId && (
                                                    <View style={styles.ownerActions}>
                                                        <TouchableOpacity
                                                            style={styles.ownerActionBtn}
                                                            onPress={(): void =>
                                                                router.push({
                                                                    pathname: "/writereview",
                                                                    params: {
                                                                        reviewId: rev.id,
                                                                        editMode: "true",
                                                                        id: mediaId,
                                                                        title:
                                                                            albumData.album?.name || albumData.name,
                                                                        artist:
                                                                            albumData.album?.artist ||
                                                                            albumData.artist,
                                                                        cover: cover,
                                                                    },
                                                                })
                                                            }
                                                        >
                                                            <Ionicons
                                                                name="create-outline"
                                                                size={18}
                                                                color={theme.subText}
                                                            />
                                                        </TouchableOpacity>

                                                        <TouchableOpacity
                                                            style={styles.ownerActionBtn}
                                                            disabled={deletingReview}
                                                            onPress={(): Promise<void> => handleDeleteReview(rev.id)}
                                                        >
                                                            <Ionicons
                                                                name="trash-outline"
                                                                size={18}
                                                                color="#f43f5e"
                                                            />
                                                        </TouchableOpacity>
                                                    </View>
                                                )}

                                                {rev.user_id !== currentUserId && (
                                                    <ReportButton
                                                        userId={currentUserId}
                                                        targetId={rev.id}
                                                        type="review"
                                                    />
                                                )}

                                                <Text style={[styles.reviewDate, {color: theme.placeholder}]}>
                                                    {formatReviewDate(rev.created_at)}
                                                </Text>
                                            </View>
                                        </View>
                                    );
                                })
                            ) : (
                                <Text style={[styles.emptyText, {color: theme.placeholder}]}>
                                    {t("msg_be_first_reviewer")}
                                </Text>
                            )}
                        </View>
                    ) : (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.similarGrid}
                        >
                            {loadingSimilar ? (
                                <ActivityIndicator color="#ec4899"/>
                            ) : (
                                similarAlbums.map((item: any, idx: number) => (
                                    <TouchableOpacity
                                        key={idx}
                                        style={styles.similarCard}
                                        onPress={(): void =>
                                            router.push({
                                                pathname: "/albumdetails",
                                                params: {
                                                    artist: item.artist.name || item.artist,
                                                    album: item.name,
                                                    cover: item.image?.[3]?.["#text"] || item.cover,
                                                },
                                            })
                                        }
                                    >
                                        <Image
                                            source={getValidSource(
                                                item.image?.[2]?.["#text"] || item.cover,
                                            )}
                                            style={styles.similarCover}
                                        />
                                        <Text numberOfLines={1} style={[styles.similarTitle, {color: theme.text}]}>
                                            {item.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))
                            )}
                        </ScrollView>
                    )}
                </View>
            </ScrollView>

            <Modal
                visible={showPlaylistSelector}
                transparent={true}
                animationType="fade"
                onRequestClose={(): void => setShowPlaylistSelector(false)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={(): void => setShowPlaylistSelector(false)}
                >
                    <View style={[styles.modalContent, {backgroundColor: theme.card}]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, {color: theme.text}]}>{t("add_to_playlist")}</Text>
                            <TouchableOpacity onPress={(): void => setShowPlaylistSelector(false)}>
                                <Ionicons name="close" size={24} color={theme.subText}/>
                            </TouchableOpacity>
                        </View>

                        {loadingPlaylists ? (
                            <ActivityIndicator color="#ec4899" style={{margin: 20}}/>
                        ) : (
                            <ScrollView style={styles.modalScroll}>
                                {userPlaylists.map((pl) => {
                                    const isSelected: boolean = selectedPlaylists.includes(pl.id);
                                    return (
                                        <TouchableOpacity
                                            key={pl.id}
                                            style={[
                                                styles.playlistItem,
                                                {backgroundColor: theme.surface},
                                                isSelected && [styles.playlistItemActive, {backgroundColor: theme.card}],
                                            ]}
                                            onPress={(): void =>
                                                setSelectedPlaylists((prev: string[]): string[] =>
                                                    isSelected
                                                        ? prev.filter((id: string): boolean => id !== pl.id)
                                                        : [...prev, pl.id],
                                                )
                                            }
                                        >
                                            <View
                                                style={[
                                                    styles.checkbox,
                                                    {borderColor: theme.subText},
                                                    isSelected && styles.checkboxActive,
                                                ]}
                                            >
                                                {isSelected && (
                                                    <Ionicons name="checkmark" size={16} color="white"/>
                                                )}
                                            </View>
                                            <Text
                                                style={[
                                                    styles.playlistItemText,
                                                    {color: theme.subText},
                                                    isSelected && [styles.whiteText, {color: theme.text}],
                                                ]}
                                            >
                                                {pl.name}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                                <TouchableOpacity
                                    style={styles.createPlaylistBtn}
                                    onPress={(): void => {
                                        setShowPlaylistSelector(false);
                                        router.push("/createplaylist");
                                    }}
                                >
                                    <Ionicons
                                        name="add-circle-outline"
                                        size={22}
                                        color="#00ffa3"
                                    />
                                    <Text style={styles.createPlaylistText}>
                                        {t("create_playlist")}
                                    </Text>
                                </TouchableOpacity>
                            </ScrollView>
                        )}

                        {selectedPlaylists.length > 0 && (
                            <TouchableOpacity
                                style={styles.confirmBtn}
                                onPress={handleAddToPlaylists}
                            >
                                <Text style={styles.confirmBtnText}>
                                    {t("btn_confirm")} ({selectedPlaylists.length})
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </Pressable>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {flex: 1},
    center: {justifyContent: "center", alignItems: "center"},
    scrollContent: {paddingBottom: 60},
    imageContainer: {padding: 20, alignItems: "center"},
    coverImage: {width: '100%', maxWidth: 440, aspectRatio: 1, alignSelf: 'center', borderRadius: 24},
    paddingContent: {paddingHorizontal: 20},
    badgeRow: {marginTop: 15, flexDirection: "row"},
    badge: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        marginRight: 8,
    },
    badgeText: {color: "white", fontWeight: "bold", fontSize: 11},
    albumTitle: {
        fontSize: 26,
        fontWeight: "bold",
        marginTop: 15,
    },
    artistName: {fontSize: 18, marginTop: 4},
    ratingRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 15,
        gap: 8,
    },
    starsRow: {flexDirection: "row", gap: 2},
    ratingValue: {fontSize: 22, fontWeight: "bold"},
    ratingCount: {fontSize: 14},
    actionButtons: {marginTop: 25, gap: 12},
    grid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        gap: 10,
    },
    primaryButton: {
        backgroundColor: brand.primary,
        padding: 16,
        borderRadius: 14,
        alignItems: "center",
        marginTop: 10,
    },
    primaryButtonText: {color: "white", fontWeight: "bold", fontSize: 16},
    aboutSection: {marginTop: 30},
    sectionTitle: {
        fontSize: 20,
        fontWeight: "bold",
        marginBottom: 10,
    },
    aboutText: {fontSize: 15, lineHeight: 22},
    tabsContainer: {
        flexDirection: "row",
        margin: 20,
        padding: 5,
        borderRadius: 12,
    },
    tab: {flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 8},
    activeTab: {},
    tabText: {fontWeight: "bold"},
    activeTabText: {},
    tabContent: {paddingHorizontal: 20},
    emptyText: {textAlign: "center", marginTop: 20},
    reviewCard: {
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
    },
    reviewHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 10,
    },
    userInfo: {flexDirection: "row", alignItems: "center", gap: 8},
    reviewerName: {color: "#ec4899", fontWeight: "bold"},
    reviewTitleText: {
        fontWeight: "bold",
        fontSize: 16,
        marginBottom: 4,
    },
    reviewContentText: {fontSize: 14, lineHeight: 20},
    reviewFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 12,
    },
    reviewActionsLeft: {flexDirection: "row", gap: 16},
    actionIconBtn: {flexDirection: "row", alignItems: "center", gap: 4},
    actionCountText: {fontSize: 12},
    ownerActions: {flexDirection: "row", gap: 12},
    ownerActionBtn: {padding: 4},
    reviewDate: {fontSize: 12},
    similarGrid: {marginTop: 10},
    similarCard: {marginRight: 14, width: 120},
    similarCover: {width: 120, height: 120, borderRadius: 12},
    similarTitle: {fontSize: 14, marginTop: 6},
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.7)",
        justifyContent: "flex-end",
    },
    modalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        maxHeight: "80%",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    modalTitle: {fontSize: 18, fontWeight: "bold"},
    modalScroll: {marginBottom: 20},
    playlistItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        marginBottom: 8,
    },
    playlistItemActive: {},
    playlistItemText: {fontSize: 16, marginLeft: 12},
    whiteText: {},
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 2,
        justifyContent: "center",
        alignItems: "center",
    },
    checkboxActive: {backgroundColor: brand.primary, borderColor: brand.primary},
    createPlaylistBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingVertical: 12,
        marginTop: 8,
    },
    createPlaylistText: {color: brand.primary, fontSize: 16, fontWeight: "600"},
    confirmBtn: {
        backgroundColor: brand.primary,
        padding: 16,
        borderRadius: 14,
        alignItems: "center",
    },
    confirmBtnText: {color: "white", fontWeight: "bold", fontSize: 16},
    userAvatarImage: {
        width: 24,
        height: 24,
        borderRadius: 12,
        marginRight: 8,
    },
});

export default AlbumDetails;
