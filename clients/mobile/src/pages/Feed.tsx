import React, {useState, useEffect, useCallback, useRef} from "react";
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    StatusBar,
    ActivityIndicator,
    Alert,
    FlatList,
} from "react-native";
import {Ionicons} from "@expo/vector-icons";
import {useTranslation} from "react-i18next";
import {useFocusEffect} from "expo-router";
import Header from "@/src/components/Header";
import apiClient from "../api/client";
import * as SecureStore from "expo-secure-store";
import {jwtDecode} from "jwt-decode";
import {AuthGuardWrapper} from "../components/AuthGuardMapper";
import CommunityCard from "../components/CommunityCard";
import {useTheme} from "../context/ThemeContext";

type Filter = "Review" | "Abonnement" | "Tendances";

interface FeedCache {
    Review: any[];
    Abonnement: any[];
    Tendances: any[];
}

interface PageCache {
    Review: number;
    Abonnement: number;
    Tendances: number;
}

interface HasMoreCache {
    Review: boolean;
    Abonnement: boolean;
    Tendances: boolean;
}

const ITEMS_PER_PAGE: number = 10;

function timeAgo(dateStr: string | undefined, t: (key: string, opts?: any) => string): string {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t("time_just_now");
    if (mins < 60) return t("time_mins_ago", {count: mins});
    const hours = Math.floor(mins / 60);
    if (hours < 24) return t("time_hours_ago", {count: hours});
    const days = Math.floor(hours / 24);
    if (days < 30) return t("time_days_ago", {count: days});
    return t("time_months_ago", {count: Math.floor(days / 30)});
}

const Feed = () => {
    const {t} = useTranslation();
    const {theme, isDarkMode} = useTheme();
    const [activeFilter, setActiveFilter] = useState<Filter>("Review");
    const [searchQuery, setSearchQuery] = useState("");

    const [feedsCache, setFeedsCache] = useState<FeedCache>({
        Review: [],
        Abonnement: [],
        Tendances: [],
    });

    const [pagesCache, setPagesCache] = useState<PageCache>({
        Review: 0,
        Abonnement: 0,
        Tendances: 0,
    });

    const [hasMoreCache, setHasMoreCache] = useState<HasMoreCache>({
        Review: true,
        Abonnement: true,
        Tendances: true,
    });

    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    const isFirstRender = useRef(true);
    const isInteracting = useRef(false);
    const activeFilterRef = useRef<Filter>(activeFilter);

    useEffect((): void => {
        const getUserId: () => Promise<void> = async (): Promise<void> => {
            try {
                const token: string | null =
                    await SecureStore.getItemAsync("userToken");
                if (token) {
                    const decoded: any = jwtDecode(token);
                    setCurrentUserId(decoded.id);
                }
            } catch (err) {
                console.error("Erreur token:", err);
            }
        };
        getUserId();
    }, []);

    useEffect((): void => {
        activeFilterRef.current = activeFilter;
        if (feedsCache[activeFilter].length === 0) {
            fetchFeed(activeFilter, 0, false);
        } else {
            setIsLoading(false);
        }
    }, [activeFilter]);

    useFocusEffect(
        useCallback((): void => {
            if (isFirstRender.current) {
                isFirstRender.current = false;
                return;
            }
            onRefresh();
        }, [activeFilter]),
    );

    const fetchFeed = async (
        targetFilter: Filter,
        currentOffset: number,
        isLoadMoreAction: boolean = false,
    ): Promise<void> => {
        if (isInteracting.current) return;

        try {
            if (!isLoadMoreAction && !isRefreshing) {
                setIsLoading(true);
            } else if (isLoadMoreAction) {
                setIsLoadingMore(true);
            }

            const token: string | null = await SecureStore.getItemAsync("userToken");
            if (!token) return;

            const decoded: any = jwtDecode(token);
            const userId: any = decoded.id;

            let endpoint: string = "";
            const queryParams: string = `limit=${ITEMS_PER_PAGE}&offset=${currentOffset}`;

            switch (targetFilter) {
                case "Review":
                    endpoint = `/activities/feed/global?current_user_id=${userId}&${queryParams}`;
                    break;
                case "Abonnement":
                    endpoint = `/activities/feed/friends/${userId}?current_user_id=${userId}&${queryParams}`;
                    break;
                case "Tendances":
                    endpoint = `/activities/feed/discovery/${userId}?current_user_id=${userId}&${queryParams}`;
                    break;
            }

            const response = await apiClient.get(endpoint);
            const items: any[] = response.data?.feed || response.data || [];

            setFeedsCache((prev: FeedCache) => ({
                ...prev,
                [targetFilter]: isLoadMoreAction
                    ? [...prev[targetFilter], ...items]
                    : items,
            }));

            setHasMoreCache((prev: HasMoreCache) => ({
                ...prev,
                [targetFilter]: items.length === ITEMS_PER_PAGE,
            }));

            if (isLoadMoreAction) {
                setPagesCache((prev: PageCache) => ({
                    ...prev,
                    [targetFilter]: currentOffset + ITEMS_PER_PAGE,
                }));
            } else {
                setPagesCache((prev: PageCache) => ({
                    ...prev,
                    [targetFilter]: ITEMS_PER_PAGE,
                }));
            }
        } catch (error) {
            console.error(`Erreur récupération feed (${targetFilter}):`, error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
            setIsLoadingMore(false);
        }
    };

    const handleLike: (id: string) => Promise<void> = async (id: string): Promise<void> => {
        if (!currentUserId) {
            Alert.alert(t("auth_required"), t("feed_like_login_required"));
            return;
        }

        if (isInteracting.current) return;
        isInteracting.current = true;

        const currentFeedItems: any[] = feedsCache[activeFilter];
        const itemIndex: number = currentFeedItems.findIndex((f): boolean => f.id === id);
        if (itemIndex === -1) {
            isInteracting.current = false;
            return;
        }

        const item = currentFeedItems[itemIndex];
        if (item.type !== "review") {
            isInteracting.current = false;
            return;
        }

        const currentlyLiked: boolean = !!item.isLiked;
        const updatedItems: any[] = [...currentFeedItems];
        const targetItem = {...updatedItems[itemIndex]};

        targetItem.isLiked = !currentlyLiked;
        targetItem.likes_count = currentlyLiked
            ? Math.max(0, (targetItem.likes_count || 1) - 1)
            : (targetItem.likes_count || 0) + 1;

        updatedItems[itemIndex] = targetItem;

        setFeedsCache((prev: FeedCache) => ({...prev, [activeFilter]: updatedItems}));

        try {
            const response = await apiClient.post(`/reviews/likes/toggle`, {
                review_id: item.review_id || item.id,
                user_id: currentUserId,
            });

            const {isLiked, likes_count} = response.data;
            const finalItems: any[] = [...updatedItems];
            finalItems[itemIndex] = {
                ...finalItems[itemIndex],
                isLiked,
                likes_count,
            };

            setFeedsCache((prev: FeedCache) => ({...prev, [activeFilter]: finalItems}));
        } catch (error) {
            console.error("Erreur toggle like:", error);
            setFeedsCache(prev => ({...prev, [activeFilter]: prev[activeFilter].map(entry => entry.id === id ? item : entry)}));
            Alert.alert(t("error"), t("feed_like_update_error"));
        } finally {
            isInteracting.current = false;
        }
    };

    const onRefresh: () => void = (): void => {
        setIsRefreshing(true);
        fetchFeed(activeFilter, 0, false);
    };

    const loadMoreData: () => void = (): void => {
        if (isLoadingMore || !hasMoreCache[activeFilter]) return;
        const nextOffset: number = pagesCache[activeFilter];
        fetchFeed(activeFilter, nextOffset, true);
    };

    const filteredItems: any[] = (feedsCache[activeFilter] || []).filter((item): boolean | undefined => {
        if (!item) return false;
        const searchLower: string = (searchQuery || "").toLowerCase().trim();
        if (searchLower === "") return true;
        return (
            item.album?.toLowerCase().includes(searchLower) ||
            item.artist?.toLowerCase().includes(searchLower) ||
            item.user_name?.toLowerCase().includes(searchLower)
        );
    });

    const renderItem = ({item}: {item: any}) => (
        <CommunityCard item={item} dateLabel={timeAgo(item.created_at, t)} onLike={handleLike}/>
    );

    const renderFooter = () => {
        if (!isLoadingMore) return <View style={{height: 20}}/>;
        return (
            <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={theme.accent}/>
            </View>
        );
    };

    if (isLoading && feedsCache[activeFilter].length === 0) {
        return (
            <View style={[styles.container, styles.center, {backgroundColor: theme.background}]}>
                <ActivityIndicator size="large" color={theme.accent}/>
            </View>
        );
    }

    return (
        <AuthGuardWrapper>
            <View style={[styles.container, {backgroundColor: theme.background}]}>
                <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"}/>
                <Header/>

                <FlatList
                    data={filteredItems}
                    keyExtractor={(item, index: number): string =>
                        item.id ? `${item.id}-${index}` : `feed-${index}`
                    }
                    renderItem={renderItem}
                    onEndReached={loadMoreData}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={renderFooter}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    refreshing={isRefreshing}
                    onRefresh={onRefresh}
                    ListHeaderComponent={
                        <>
                            <View style={styles.headerSection}>
                                <Text style={[styles.title, {color: theme.text}]}>{t("feed_title")}</Text>
                                <Text style={[styles.subtitle, {color: theme.subText}]}>
                                    {t("feed_subtitle")}
                                </Text>
                            </View>

                            <View style={[styles.searchContainer, {backgroundColor: theme.surface, borderColor: theme.border}]}>
                                <Ionicons
                                    name="search"
                                    size={20}
                                    color={theme.placeholder}
                                    style={styles.searchIcon}
                                />
                                <TextInput
                                    style={[styles.searchInput, {color: theme.text}]}
                                    placeholder={t("search_feed_placeholder")}
                                    placeholderTextColor={theme.placeholder}
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                />
                            </View>

                            <View style={[styles.filterTabs, {backgroundColor: theme.surface, borderColor: theme.border}]}>
                                <FilterButton
                                    label={t("tab_activities")}
                                    active={activeFilter === "Review"}
                                    icon="grid-outline"
                                    onPress={(): void => setActiveFilter("Review")}
                                />
                                <FilterButton
                                    label={t("tab_following")}
                                    active={activeFilter === "Abonnement"}
                                    icon="people-outline"
                                    onPress={(): void => setActiveFilter("Abonnement")}
                                />
                                <FilterButton
                                    label={t("tab_discovery")}
                                    active={activeFilter === "Tendances"}
                                    icon="sparkles-outline"
                                    onPress={(): void => setActiveFilter("Tendances")}
                                />
                            </View>
                        </>
                    }
                />
            </View>
        </AuthGuardWrapper>
    );
};

const FilterButton = ({label, active, onPress, icon}: any) => {
    const {theme} = useTheme();
    return (
        <TouchableOpacity
            style={[styles.filterBtn, active && [styles.filterBtnActive, {backgroundColor: theme.card}]]}
            onPress={onPress}
        >
            <Ionicons name={icon} size={16} color={active ? theme.text : theme.placeholder}/>
            <Text style={[styles.filterBtnText, {color: theme.placeholder}, active && {color: theme.text}]}>
                {label}
            </Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {flex: 1},
    center: {justifyContent: "center", alignItems: "center"},
    scrollContent: {paddingBottom: 40, width: "100%", maxWidth: 680, alignSelf: "center"},
    headerSection: {paddingHorizontal: 20, paddingTop: 10, marginBottom: 5},
    title: {fontSize: 30, fontWeight: "700", letterSpacing: -0.8},
    subtitle: {fontSize: 14, marginTop: 6, lineHeight: 22},
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginHorizontal: 20,
        marginVertical: 15,
        borderRadius: 12,
        paddingHorizontal: 12,
        borderWidth: 1,
    },
    searchIcon: {marginRight: 10},
    searchInput: {flex: 1, height: 45, fontSize: 15},
    filterTabs: {
        flexDirection: "row",
        marginHorizontal: 20,
        padding: 5,
        borderRadius: 15,
        marginBottom: 20,
        borderWidth: 1,
    },
    filterBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 10,
        borderRadius: 12,
        gap: 6,
    },
    filterBtnActive: {},
    filterBtnText: {fontSize: 12, fontWeight: "600"},
    filterBtnTextActive: {},
    footerLoader: {
        verticalAlign: "middle",
        paddingVertical: 15,
        alignItems: "center",
    },
});

export default Feed;
