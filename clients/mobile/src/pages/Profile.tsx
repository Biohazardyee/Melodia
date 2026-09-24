import React, {useState, useEffect, useRef} from "react";
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
    StyleSheet,
} from "react-native";
import {
    useRouter,
    useLocalSearchParams,
    Router,
    UnknownOutputParams,
} from "expo-router";
import {Ionicons} from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import {jwtDecode} from "jwt-decode";
import * as ImagePicker from "expo-image-picker";

import AlbumCard from "@/src/components/AlbumCard";
import Header from "@/src/components/Header";
import {AuthGuardWrapper} from "../components/AuthGuardMapper";
import apiClient from "../api/client";
import ReportUserButton from "../components/reports/ReportUserButton";
import {useTranslation} from "react-i18next";
import {AxiosResponse} from "axios";
import {useTheme} from "../context/ThemeContext";

const getRatingStyle = (rating: number) => {
    if (rating >= 4.5) return { bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.25)", color: "#10b981" };
    if (rating >= 3.5) return { bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.25)", color: "#3b82f6" };
    if (rating >= 2.5) return { bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.25)", color: "#f59e0b" };
    if (rating >= 1.5) return { bg: "rgba(249,115,22,0.12)", border: "rgba(249,115,22,0.25)", color: "#f97316" };
    return { bg: "rgba(244,63,94,0.12)", border: "rgba(244,63,94,0.25)", color: "#f43f5e" };
};

const formatReviewItem = (item: any, username: string) => {
    const content = item.media?.content;
    const isLastFm: boolean = !!content?.album;

    return {
        id: item.id,
        review_id: item.id,
        media_id: item.media_id,
        user_name: username,
        album: isLastFm ? content.album.name : content?.name,
        artist: isLastFm ? content.album.artist : content?.artist,
        cover: isLastFm
            ? content.album.image?.find(
            (img: any): boolean => img.size === "extralarge",
        )?.["#text"] || content.album.image?.[0]?.["#text"]
            : content?.cover,
        rating: item.rating,
        content: item.content,
        likes_count: item._count?.likes || 0,
        comments_count: item._count?.comments || 0,
        isLiked: item.likes && (item.likes || []).length > 0,
    };
};

const ProfileScreen = () => {
    const {t} = useTranslation();
    const router: Router = useRouter();
    const {theme} = useTheme();
    const params: UnknownOutputParams = useLocalSearchParams();
    const externalUserIdRaw: string | string[] = params.id;

    const externalUserId: string = Array.isArray(externalUserIdRaw)
        ? externalUserIdRaw[0]
        : externalUserIdRaw;

    const [activeTab, setActiveTab] = useState(t("tab_favorite_albums"));
    const [userProfil, setUserProfil] = useState<any>(null);
    const [userConnected, setUserConnected] = useState<string>("");
    const [playlists, setPlaylists] = useState<any[]>([]);
    const [favoriteReviews, setFavoriteReviews] = useState<any[]>([]);
    const [followCounts, setFollowCounts] = useState({
        followers: 0,
        following: 0,
    });
    const [isFollowing, setIsFollowing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isOwnProfile, setIsOwnProfile] = useState(false);

    const [recentActivity, setRecentActivity] = useState<any[]>([]);
    const [activityOffset, setActivityOffset] = useState(0);
    const [hasMoreActivity, setHasMoreActivity] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const isInteracting = useRef(false);

    const tabs: string[] = [t("tab_favorite_albums"), t("tab_playlists"), t("tab_recent_activity")];

    useEffect((): void => {
        loadData();
    }, [externalUserId]);

    useEffect((): void => {
        if (
            activeTab === t("tab_recent_activity") &&
            (recentActivity || []).length === 0 &&
            userProfil?.id
        ) {
            fetchRecentActivity(0, userProfil.id);
        }
    }, [activeTab, userProfil?.id]);

    const loadData: () => Promise<void> = async (): Promise<void> => {
        setLoading(true);
        try {
            const token: string | null = await SecureStore.getItemAsync("userToken");
            if (!token) return;
            const decoded: any = jwtDecode(token);
            const currentUserId: string = String(decoded.id);
            setUserConnected(currentUserId);

            const targetId: string = externalUserId
                ? String(externalUserId)
                : currentUserId;
            const ownProfile: boolean = targetId === currentUserId;
            setIsOwnProfile(ownProfile);

            await Promise.all([
                fetchProfile(targetId),
                fetchPlaylists(targetId, ownProfile),
                fetchFavoriteAlbums(targetId),
                fetchFollowCounts(targetId),
                !ownProfile && checkFollowStatus(targetId, currentUserId),
            ]);
        } catch (error) {
            console.error("Erreur chargement profil:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchProfile: (userId: string) => Promise<void> = async (
        userId: string,
    ): Promise<void> => {
        try {
            const response = await apiClient.get(`/users/public/${userId}`);
            const userData = response.data.user || response.data;
            setUserProfil(userData);
        } catch (error: any) {
            console.error("Erreur Profil :", error.response?.status);
        }
    };

    const checkFollowStatus = async (
        targetUserId: string,
        currentUserId: string,
    ): Promise<void> => {
        try {
            const response = await apiClient.get(
                `/follows/following/${currentUserId}`,
            );
            const followingList = response.data.data || [];

            const alreadyFollowing = followingList.some(
                (item: any): boolean =>
                    String(item.follow_user_id) === String(targetUserId),
            );

            setIsFollowing(alreadyFollowing);
        } catch (error: any) {
            console.error("Erreur Statut Follow :", error.response?.status);
        }
    };

    const fetchFollowCounts: (userId: string) => Promise<void> = async (
        userId: string,
    ): Promise<void> => {
        try {
            const [resFollowers, resFollowing] = await Promise.all([
                apiClient.get(`/follows/followers/${userId}`),
                apiClient.get(`/follows/following/${userId}`),
            ]);

            const followersCount =
                resFollowers.data.count ?? (resFollowers.data.data?.length || 0);
            const followingCount =
                resFollowing.data.count ?? (resFollowing.data.data?.length || 0);

            setFollowCounts({
                followers: followersCount,
                following: followingCount,
            });
        } catch (error: any) {
            console.error("Erreur Follow Counts :", error.response?.status);
        }
    };

    useEffect((): void => {
    }, [playlists]);

    const handleFollowToggle: () => Promise<void> = async (): Promise<void> => {
        if (!userProfil?.id || !userConnected || isInteracting.current) return;
        isInteracting.current = true;

        const previousStatus: boolean = isFollowing;
        const previousFollowers: number = followCounts.followers;

        setIsFollowing(!previousStatus);
        setFollowCounts(
            (prev: {
                followers: number;
                following: number;
            }): { followers: number; following: number } => ({
                ...prev,
                followers: previousStatus
                    ? Math.max(0, prev.followers - 1)
                    : prev.followers + 1,
            }),
        );

        try {
            if (previousStatus) {
                await apiClient.delete(`/follows/`, {
                    data: {
                        user_id: userConnected,
                        follow_user_id: userProfil.id,
                    },
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
            Alert.alert(t("error"), t("profile_follow_error"));
            setIsFollowing(previousStatus);
            setFollowCounts((prev) => ({...prev, followers: previousFollowers}));
        } finally {
            isInteracting.current = false;
        }
    };

    const fetchPlaylists = async (
        userId: string,
        ownProfile: boolean,
    ): Promise<void> => {
        try {
            const response = await apiClient.get(`/playlists/user/${userId}`);
            const allPlaylists = response.data.playlists || [];

            const filtered = ownProfile
                ? allPlaylists
                : allPlaylists.filter((p: any): boolean => p.is_public === true);

            setPlaylists(filtered);
        } catch (error: any) {
            console.error("❌ Erreur Playlists :", error.response?.status);
        }
    };

    const handleProfilePicturePress: () => Promise<void> = async (): Promise<void> => {
        if (!isOwnProfile) return;

        const permissionResult =
            await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permissionResult.granted) {
            Alert.alert(
                t("permission_denied"),
                t("permission_required"),
            );
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
            base64: true,
        });

        if (!result.canceled && result.assets[0].base64) {
            await uploadProfilePicture(result.assets[0].base64, result.assets[0].uri);
        }
    };

    const uploadProfilePicture = async (
        base64Image: string,
        localUri: string,
    ): Promise<void> => {
        try {
            setUserProfil((prev: any) => ({...prev, profile_picture: localUri}));

            await apiClient.put(`/users/${userConnected}`, {
                profile_picture: base64Image,
            });

            Alert.alert(t("success"), t("profile_photo_update_success"));
        } catch (error) {
            console.error("Erreur upload image:", error);
            Alert.alert(t("error"), t("profile_photo_update_error"));
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
            const response = await apiClient.get(`/reviews/user/${userId}/activity`, {
                params: {limit: 10, offset: offset},
            });

            const newItems = (response.data.data || []).map((review: any) =>
                formatReviewItem(review, userProfil?.username || "User"),
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

    const handleLike: (id: string) => Promise<void> = async (
        id: string,
    ): Promise<void> => {
        if (!userConnected || isInteracting.current) return;
        isInteracting.current = true;
        const itemIndex: number = (recentActivity || []).findIndex(
            (f): boolean => f.id === id,
        );
        if (itemIndex === -1) {
            isInteracting.current = false;
            return;
        }
        const item = recentActivity[itemIndex];
        const currentlyLiked: boolean = !!item.isLiked;
        const updatedActivity: any[] = [...recentActivity];
        updatedActivity[itemIndex] = {
            ...item,
            isLiked: !currentlyLiked,
            likes_count: currentlyLiked
                ? Math.max(0, item.likes_count - 1)
                : item.likes_count + 1,
        };
        setRecentActivity(updatedActivity);
        try {
            const response = await apiClient.post(`/reviews/likes/toggle`, {
                review_id: item.review_id,
                user_id: userConnected,
            });
            const finalActivity: any[] = [...updatedActivity];
            finalActivity[itemIndex].isLiked = response.data.isLiked;
            finalActivity[itemIndex].likes_count = response.data.likes_count;
            setRecentActivity(finalActivity);
        } catch (error) {
            setRecentActivity(recentActivity);
        } finally {
            isInteracting.current = false;
        }
    };

    const handleScroll: (event: any) => void = (event: any): void => {
        const {layoutMeasurement, contentOffset, contentSize} = event.nativeEvent;
        if (
            layoutMeasurement.height + contentOffset.y >= contentSize.height - 100 &&
            activeTab === t("tab_recent_activity") &&
            hasMoreActivity &&
            !loadingMore &&
            userProfil?.id
        ) {
            fetchRecentActivity(activityOffset, userProfil.id);
        }
    };

    if (loading) {
        return (
            <View style={[styles.loaderContainer, {backgroundColor: theme.background}]}>
                <ActivityIndicator size="large" color="#4A90E2"/>
            </View>
        );
    }

    return (
        <AuthGuardWrapper>
            <View style={[styles.container, {backgroundColor: theme.background}]}>
                <Header/>
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContainer}
                    onScroll={handleScroll}
                    scrollEventThrottle={16}
                >
                    <View>
                        <Image
                            source={{
                                uri: "https://img.freepik.com/free-vector/gradient-music-notes-background_23-2151320190.jpg?w=740",
                            }}
                            style={styles.banner}
                        />
                        <TouchableOpacity
                            style={[styles.profilePicOuter, {borderColor: theme.background, backgroundColor: theme.background}]}
                            onPress={handleProfilePicturePress}
                            disabled={!isOwnProfile}
                            activeOpacity={isOwnProfile ? 0.7 : 1}
                        >
                            <View style={styles.profilePicInner}>
                                {userProfil?.profile_picture &&
                                typeof userProfil.profile_picture === "string" ? (
                                    <Image
                                        source={{
                                            uri:
                                                userProfil.profile_picture.startsWith("data") ||
                                                userProfil.profile_picture.startsWith("http") ||
                                                userProfil.profile_picture.startsWith("file")
                                                    ? userProfil.profile_picture
                                                    : `data:image/jpeg;base64,${userProfil.profile_picture}`,
                                        }}
                                        style={styles.fullImage}
                                    />
                                ) : (
                                    <Text style={styles.profileLetter}>
                                        {userProfil?.username?.substring(0, 2).toUpperCase()}
                                    </Text>
                                )}
                            </View>

                            {isOwnProfile && (
                                <View
                                    style={{
                                        position: "absolute",
                                        bottom: 0,
                                        right: 0,
                                        backgroundColor: "#4A90E2",
                                        borderRadius: 15,
                                        padding: 6,
                                        zIndex: 10,
                                        elevation: 10,
                                    }}
                                >
                                    <Ionicons name="camera" size={16} color="white"/>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>

                    <View style={styles.contentPadding}>
                        <Text style={[styles.userName, {color: theme.text}]}>{userProfil?.username}</Text>
                        <Text style={[styles.handle, {color: theme.subText}]}>
                            @{userProfil?.username?.toLowerCase()}
                        </Text>

                        <View style={styles.statsRow}>
                            <TouchableOpacity style={styles.statItem}>
                                <Text style={[styles.statNumber, {color: theme.text}]}>{followCounts.followers}</Text>
                                <Text style={[styles.statLabel, {color: theme.subText}]}> {t("profile_followers")}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.statItem}>
                                <Text style={[styles.statNumber, {color: theme.text}]}>{followCounts.following}</Text>
                                <Text style={[styles.statLabel, {color: theme.subText}]}> {t("profile_following")}</Text>
                            </TouchableOpacity>
                        </View>

                        {isOwnProfile ? (
                            <TouchableOpacity
                                style={[styles.editButton, {borderColor: theme.border}]}
                                onPress={(): void => router.push("/settings")}
                            >
                                <Ionicons name="settings-outline" size={18} color={theme.text}/>
                                <Text style={[styles.editButtonText, {color: theme.text}]}>{t("profile_edit_btn")}</Text>
                            </TouchableOpacity>
                        ) : (
                            <View style={{flexDirection: "row", gap: 10}}>
                                <TouchableOpacity
                                    style={[
                                        styles.editButton,
                                        isFollowing ? [styles.followingButton, {borderColor: theme.border}] : styles.followButton,
                                        {flex: 1},
                                    ]}
                                    onPress={handleFollowToggle}
                                >
                                    <Ionicons
                                        name={
                                            isFollowing
                                                ? "checkmark-circle-outline"
                                                : "person-add-outline"
                                        }
                                        size={18}
                                        color={isFollowing ? theme.text : "#fff"}
                                    />
                                    <Text style={[styles.editButtonText, {color: isFollowing ? theme.text : "#fff"}]}>
                                        {isFollowing ? t("following_button") : t("follow_button")}
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={[styles.editButton, {borderColor: theme.border}]} onPress={async () => {
                                    try {
                                        const res = await apiClient.post("/conversations", {user2_id: userProfil.id});
                                        router.push({pathname: "/detailsConversations", params: {conversationId: res.data.conversation.id, userName: userProfil.username, userProfilePic: userProfil.profile_picture || ""}});
                                    } catch { Alert.alert(t("dm_action_error")); }
                                }}>
                                    <Text style={{color: theme.text}}>{t("dm_message")}</Text>
                                </TouchableOpacity>
                                <View style={{justifyContent: "center"}}>
                                    <ReportUserButton
                                        targetUserId={userProfil?.id}
                                        reporterUserId={userConnected}
                                    />
                                </View>
                            </View>
                        )}
                        <Text style={[styles.bio, {color: theme.subText}]}>
                            {userProfil?.biography || t("profile_no_bio")}
                        </Text>

                        {userProfil?.favorite_band && (
                            <View style={styles.favBandRow}>
                                <Ionicons name="musical-notes" size={15} color="#3b82f6"/>
                                <Text style={[styles.favBandLabel, {color: theme.subText}]}>
                                    {t("label_favorite_band")} :{" "}
                                    <Text style={[styles.favBandValue, {color: theme.text}]}>
                                        {userProfil.favorite_band}
                                    </Text>
                                </Text>
                            </View>
                        )}
                    </View>

                    <View style={[styles.tabContainer, {borderBottomColor: theme.border}]}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {tabs.map((tab: string) => (
                                <TouchableOpacity
                                    key={tab}
                                    onPress={(): void => setActiveTab(tab)}
                                    style={[
                                        styles.tabItem,
                                        activeTab === tab && styles.tabItemActive,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.tabText,
                                            {color: theme.subText},
                                            activeTab === tab && [styles.tabTextActive, {color: theme.text}],
                                        ]}
                                    >
                                        {tab === t("tab_playlists")
                                            ? `${t("tab_playlists")} (${(playlists || []).length})`
                                            : tab}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    <View style={styles.sectionPadding}>
                        {activeTab === t("tab_favorite_albums") && (
                            <View style={styles.albumGrid}>
                                {(favoriteReviews || []).map((item) => (
                                    <View key={item.media_id || item.id} style={styles.cardWrapper}>
                                        <AlbumCard
                                            id={item.media_id}
                                            title={item.media?.content?.name}
                                            artist={item.media?.content?.artist}
                                            rating={item.rating ? item.rating.toString() : "0"}
                                            cover={item.media?.content?.cover}
                                        />
                                    </View>
                                ))}
                            </View>
                        )}

                        {activeTab === t("tab_playlists") && (
                            <View style={styles.playlistList}>
                                {(playlists || []).map((playlist) => {
                                    const tracksCount = playlist.items?.length ?? playlist._count?.items ?? 0;
                                    const isPublic = String(playlist.is_public) !== "false";
                                    const imageUri = playlist.image_url
                                        ? (playlist.image_url.startsWith("data") || playlist.image_url.startsWith("http")
                                            ? playlist.image_url
                                            : `data:image/jpeg;base64,${playlist.image_url}`)
                                        : null;

                                    return (
                                        <TouchableOpacity
                                            key={playlist.id}
                                            style={[styles.playlistItem, {backgroundColor: theme.card, borderColor: theme.border}]}
                                            onPress={(): void =>
                                                router.push({
                                                    pathname: "/playlistdetails",
                                                    params: {id: playlist.id, title: playlist.name},
                                                })
                                            }
                                            activeOpacity={0.75}
                                        >
                                            <View style={[styles.playlistCover, {backgroundColor: theme.surface}]}>
                                                {imageUri ? (
                                                    <Image source={{uri: imageUri}} style={styles.playlistImage}/>
                                                ) : (
                                                    <Ionicons name="musical-notes-outline" size={28} color="#4A90E2"/>
                                                )}
                                            </View>

                                            <View style={styles.playlistInfo}>
                                                <Text style={[styles.playlistName, {color: theme.text}]} numberOfLines={1}>
                                                    {playlist.name}
                                                </Text>
                                                <View style={styles.playlistMeta}>
                                                    <Ionicons name="musical-note-outline" size={13} color={theme.subText}/>
                                                    <Text style={[styles.playlistCount, {color: theme.subText}]}>
                                                        {tracksCount} {t(tracksCount <= 1 ? "track_singular" : "track_plural")}
                                                    </Text>
                                                </View>
                                            </View>

                                            <View style={styles.playlistRight}>
                                                <View style={[
                                                    styles.playlistBadge,
                                                    isPublic ? styles.badgePublic : styles.badgePrivate,
                                                ]}>
                                                    <Text style={[
                                                        styles.playlistBadgeText,
                                                        {color: isPublic ? "#10b981" : "#f59e0b"},
                                                    ]}>
                                                        {t(isPublic ? "playlist_public" : "playlist_private")}
                                                    </Text>
                                                </View>
                                                <Ionicons name="chevron-forward" size={18} color={theme.subText}/>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}

                                {(playlists || []).length === 0 && (
                                    <View style={styles.emptyState}>
                                        <Ionicons name="musical-notes-outline" size={40} color={theme.placeholder}/>
                                        <Text style={[styles.emptyText, {color: theme.subText}]}>{t("empty_playlists_list")}</Text>
                                    </View>
                                )}
                            </View>
                        )}

                        {activeTab === t("tab_recent_activity") && (
                            <View style={styles.postsList}>
                                {(recentActivity || []).map((item) => {
                                    const ratingStyle = getRatingStyle(item.rating);
                                    return (
                                        <View
                                            key={item.id}
                                            style={[styles.activityCard, {backgroundColor: theme.card, borderColor: theme.border}]}
                                        >
                                            {/* Row: cover + content */}
                                            <View style={styles.activityRow}>
                                                {/* Album cover */}
                                                <TouchableOpacity
                                                    onPress={(): void => {
                                                        if (!item.media_id) return;
                                                        router.push({
                                                            pathname: "/albumdetails",
                                                            params: {id: item.media_id, album: item.album, artist: item.artist, cover: item.cover},
                                                        });
                                                    }}
                                                    activeOpacity={0.85}
                                                >
                                                    <Image
                                                        source={{uri: item.cover}}
                                                        style={styles.activityCover}
                                                    />
                                                </TouchableOpacity>

                                                {/* Right content */}
                                                <View style={styles.activityContent}>
                                                    {/* Header: album + rating badge */}
                                                    <View style={styles.activityHeader}>
                                                        <View style={{flex: 1, marginRight: 8}}>
                                                            <Text style={[styles.activityAlbumName, {color: "#4A90E2"}]} numberOfLines={1}>
                                                                {item.album}
                                                            </Text>
                                                            <Text style={[styles.activityArtistName, {color: theme.subText}]} numberOfLines={1}>
                                                                {t("activity_by")} {item.artist}
                                                            </Text>
                                                        </View>
                                                        {item.rating > 0 && (
                                                            <View style={[styles.ratingBadge, {backgroundColor: ratingStyle.bg, borderColor: ratingStyle.border}]}>
                                                                <Ionicons name="star" size={11} color={ratingStyle.color}/>
                                                                <Text style={[styles.ratingBadgeText, {color: ratingStyle.color}]}>{item.rating}</Text>
                                                            </View>
                                                        )}
                                                    </View>

                                                    {/* Action line */}
                                                    <Text style={[styles.activityAction, {color: theme.subText}]}>
                                                        <Text style={[styles.activityUsername, {color: theme.text}]}>{item.user_name}</Text>
                                                        {" "}{t("activity_rated")}
                                                    </Text>
                                                </View>
                                            </View>

                                            {/* Review content blockquote */}
                                            {!!item.content && (
                                                <View style={[styles.reviewBox, {backgroundColor: theme.surface, borderColor: theme.border}]}>
                                                    <Text style={[styles.reviewText, {color: theme.subText}]}>
                                                        "{item.content}"
                                                    </Text>
                                                </View>
                                            )}

                                            {/* Footer: likes + comments */}
                                            <View style={[styles.activityFooter, {borderTopColor: theme.separator}]}>
                                                <TouchableOpacity
                                                    onPress={(): Promise<void> => handleLike(item.id)}
                                                    style={styles.footerBtn}
                                                >
                                                    <Ionicons
                                                        name={item.isLiked ? "heart" : "heart-outline"}
                                                        size={15}
                                                        color={item.isLiked ? "#ec4899" : theme.subText}
                                                    />
                                                    <Text style={[styles.footerBtnText, {color: item.isLiked ? "#ec4899" : theme.subText}]}>
                                                        {item.likes_count}{" "}
                                                        {item.likes_count > 1 ? t("like_plural") : t("like_singular")}
                                                    </Text>
                                                </TouchableOpacity>

                                                <TouchableOpacity
                                                    style={styles.footerBtn}
                                                    onPress={(): void => {
                                                        router.push({
                                                            pathname: "/review/[id]/comments",
                                                            params: {id: item.review_id},
                                                        });
                                                    }}
                                                >
                                                    <Ionicons name="chatbubble-outline" size={15} color={theme.subText}/>
                                                    <Text style={[styles.footerBtnText, {color: theme.subText}]}>
                                                        {item.comments_count}{" "}
                                                        {item.comments_count > 1 ? t("comment_plural") : t("comment_singular")}
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    );
                                })}

                                {recentActivity.length === 0 && !loadingMore && (
                                    <View style={styles.emptyState}>
                                        <Ionicons name="musical-notes-outline" size={40} color={theme.placeholder}/>
                                        <Text style={[styles.emptyText, {color: theme.subText}]}>{t("profile_no_activity")}</Text>
                                    </View>
                                )}

                                {hasMoreActivity && recentActivity.length > 0 && (
                                    <TouchableOpacity
                                        style={styles.loadMoreBtn}
                                        onPress={(): void => {
                                            if (userProfil?.id) fetchRecentActivity(activityOffset, userProfil.id);
                                        }}
                                        disabled={loadingMore}
                                    >
                                        {loadingMore
                                            ? <ActivityIndicator size="small" color="#4A90E2"/>
                                            : <Text style={styles.loadMoreText}>{t("load_more")}</Text>
                                        }
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}
                    </View>
                </ScrollView>
            </View>
        </AuthGuardWrapper>
    );
};

const styles = StyleSheet.create({
    container: {flex: 1},
    loaderContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    scrollContainer: {paddingBottom: 100},
    banner: {width: "100%", height: 160},
    profilePicOuter: {
        marginTop: -55,
        marginLeft: 20,
        borderWidth: 5,
        borderRadius: 60,
        width: 110,
        height: 110,
        shadowColor: "#000",
        shadowOpacity: 0.25,
        shadowRadius: 10,
        shadowOffset: {width: 0, height: 4},
        elevation: 8,
    },
    profilePicInner: {
        flex: 1,
        borderRadius: 55,
        overflow: "hidden",
        backgroundColor: "#4A90E2",
        justifyContent: "center",
        alignItems: "center",
    },
    fullImage: {width: "100%", height: "100%"},
    profileLetter: {color: "white", fontSize: 36, fontWeight: "bold"},
    contentPadding: {paddingHorizontal: 20, paddingTop: 10},
    userName: {fontSize: 26, fontWeight: "800"},
    handle: {fontSize: 16, marginBottom: 10},
    statsRow: {flexDirection: "row", marginBottom: 15, gap: 20},
    statItem: {flexDirection: "row", alignItems: "baseline"},
    statNumber: {fontSize: 16, fontWeight: "bold"},
    statLabel: {fontSize: 14},
    editButton: {
        flexDirection: "row",
        paddingVertical: 12,
        borderRadius: 10,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        marginBottom: 15,
    },
    followButton: {backgroundColor: "#4A90E2", borderColor: "#4A90E2"},
    followingButton: {backgroundColor: "transparent"},
    editButtonText: {
        marginLeft: 8,
        fontWeight: "600",
        fontSize: 15,
    },
    bio: {lineHeight: 22, fontSize: 15, marginBottom: 8},
    favBandRow: {flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2},
    favBandLabel: {fontSize: 13},
    favBandValue: {fontWeight: "700"},
    tabContainer: {
        marginTop: 15,
        borderBottomWidth: 1,
    },
    tabItem: {paddingVertical: 15, paddingHorizontal: 15},
    tabItemActive: {borderBottomWidth: 2, borderBottomColor: "#4A90E2"},
    tabText: {fontSize: 15, fontWeight: "600"},
    tabTextActive: {},
    sectionPadding: {paddingHorizontal: 20, paddingTop: 20},
    albumGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
    },
    cardWrapper: {width: "48%", marginBottom: 15},
    playlistList: {gap: 12},
    playlistItem: {
        flexDirection: "row",
        alignItems: "center",
        padding: 14,
        borderRadius: 16,
        borderWidth: 1,
        gap: 14,
    },
    playlistCover: {
        width: 72,
        height: 72,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
        flexShrink: 0,
    },
    playlistImage: {width: "100%", height: "100%"},
    playlistInfo: {flex: 1, justifyContent: "center", gap: 6},
    playlistName: {fontSize: 16, fontWeight: "700"},
    playlistMeta: {flexDirection: "row", alignItems: "center", gap: 5},
    playlistCount: {fontSize: 13},
    playlistRight: {alignItems: "flex-end", gap: 8, flexShrink: 0},
    playlistBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        borderWidth: 1,
    },
    badgePublic: {
        backgroundColor: "rgba(16,185,129,0.1)",
        borderColor: "rgba(16,185,129,0.2)",
    },
    badgePrivate: {
        backgroundColor: "rgba(245,158,11,0.1)",
        borderColor: "rgba(245,158,11,0.2)",
    },
    playlistBadgeText: {fontSize: 11, fontWeight: "700"},
    postsList: {gap: 14},

    /* ── Activity card ── */
    activityCard: {
        borderRadius: 16,
        borderWidth: 1,
        overflow: "hidden",
    },
    activityRow: {
        flexDirection: "row",
        gap: 14,
        padding: 14,
    },
    activityCover: {
        width: 90,
        height: 90,
        borderRadius: 12,
    },
    activityContent: {
        flex: 1,
        justifyContent: "space-between",
    },
    activityHeader: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: 6,
    },
    activityAlbumName: {
        fontWeight: "700",
        fontSize: 14,
        letterSpacing: 0.1,
    },
    activityArtistName: {
        fontSize: 12,
        marginTop: 2,
    },
    ratingBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 20,
        borderWidth: 1,
        marginTop: 2,
    },
    ratingBadgeText: {
        fontSize: 11,
        fontWeight: "700",
    },
    activityAction: {
        fontSize: 12,
        marginTop: 4,
    },
    activityUsername: {
        fontWeight: "700",
        fontSize: 12,
    },
    reviewBox: {
        marginHorizontal: 14,
        padding: 12,
        borderRadius: 10,
        borderWidth: 1,
    },
    reviewText: {
        fontSize: 13,
        lineHeight: 19,
        fontStyle: "italic",
    },
    activityFooter: {
        flexDirection: "row",
        gap: 20,
        paddingHorizontal: 14,
        paddingVertical: 10,
        marginTop: 10,
        borderTopWidth: 1,
    },
    footerBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
    },
    footerBtnText: {
        fontSize: 12,
        fontWeight: "600",
    },
    emptyState: {
        alignItems: "center",
        paddingVertical: 40,
        gap: 12,
    },
    emptyText: {
        fontSize: 14,
    },
    loadMoreBtn: {
        alignItems: "center",
        paddingVertical: 14,
    },
    loadMoreText: {
        color: "#4A90E2",
        fontWeight: "700",
        fontSize: 13,
    },
});

export default ProfileScreen;
