import {brand} from '../design/tokens';
import React, {useEffect, useState} from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
} from "react-native";
import {useLocalSearchParams} from "expo-router";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import Header from "@/src/components/Header";
import BackButton from "@/src/components/BackButton";
import AlbumCard from "@/src/components/AlbumCard";
import apiClient from "../api/client";
import * as SecureStore from "expo-secure-store";
import {jwtDecode} from "jwt-decode";
import {useTranslation} from "react-i18next";
import {useTheme} from "../context/ThemeContext";

const StatDetails: React.FC = () => {
    const { t } = useTranslation();
    const {theme} = useTheme();
    const {type} = useLocalSearchParams();
    const [albums, setAlbums] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const TYPE_CONFIG: any = {
        listened: {
            title: t("status_completed"),
            subtitle: t("stats_detail_title"),
            icon: "check-circle-outline",
            color: "#00ffa3",
        },
        later: {
            title: t("status_listening"),
            subtitle: t("stats_detail_title"),
            icon: "playlist-music",
            color: brand.primary,
        },
        favorite: {
            title: t("status_wishlist"),
            subtitle: t("stats_detail_title"),
            icon: "star",
            color: "#fbbf24",
        },
        disliked: {
            title: t("status_dropped"),
            subtitle: t("stats_detail_title"),
            icon: "close-circle-outline",
            color: "#f43f5e",
        },
    };

    const config = TYPE_CONFIG[type as string] || TYPE_CONFIG.listened;

    useEffect((): void => {
        fetchAlbumsByStatus();
    }, [type]);

    const fetchAlbumsByStatus: () => Promise<void> = async (): Promise<void> => {
        try {
            setLoading(true);
            const token: string | null = await SecureStore.getItemAsync("userToken");
            if (!token) return;

            const decoded: any = jwtDecode(token);
            const response = await apiClient.get(`/medias/status/user/${decoded.id}`);
            const rawData = response.data.mediasStatus || [];

            const mappedAlbums = rawData
                .filter((item: any) => item.status === type && item.media)
                .map((item: any) => {
                    const m = item.media;
                    return {
                        displayId: m.api_id || m.id,
                        dbId: m.id,
                        album: m.name || m.title || t("album_not_found"),
                        artist: m.artist || t("text_unknown_artist"),
                        rating: m.rating || 0,
                        cover: m.cover || m.cover_url || "https://via.placeholder.com/150",
                    };
                });

            const uniqueMap: Map<any, any> = new Map();
            mappedAlbums.forEach((a: any): void => {
                if (!uniqueMap.has(a.displayId)) uniqueMap.set(a.displayId, a);
            });

            setAlbums(Array.from(uniqueMap.values()));
        } catch (error) {
            console.error("❌ Erreur StatDetails:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={[styles.container, {backgroundColor: theme.background}]}>
            <Header/>
            <View style={styles.backRow}><BackButton fallback="/stats"/></View>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scroll}
            >
                <View style={styles.headerTextContainer}>
                    <View style={styles.headerTitle}>
                        <Icon name={config.icon} size={40} color={config.color}/>
                        <Text style={[styles.title, {color: config.color}]}>
                            {config.title}
                        </Text>
                    </View>
                    <Text style={[styles.subtitle, {color: theme.subText}]}>{config.subtitle}</Text>
                </View>

                {loading ? (
                    <ActivityIndicator
                        size="large"
                        color={config.color}
                        style={{marginTop: 50}}
                    />
                ) : (
                    <View style={styles.grid}>
                        {albums.map((item) => (
                            <View key={item.displayId} style={styles.gridCell}><AlbumCard
                                key={item.displayId}
                                id={item.dbId}
                                title={item.album}
                                artist={item.artist}
                                rating={String(item.rating)}
                                cover={item.cover}
                                genre="Musique"
                            /></View>
                        ))}
                    </View>
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {flex: 1},
    backRow: {paddingHorizontal: 20, paddingBottom: 12},
    gridCell: {width: '48%'},
    scroll: {padding: 20, paddingTop: 10},
    headerTextContainer: {marginBottom: 25},
    headerTitle: {flexDirection: "row", alignItems: "center", gap: 10},
    title: {fontSize: 28, fontWeight: "bold", flex: 1},
    subtitle: {fontSize: 16, marginTop: 5},
    grid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
    },
    emptyText: {
        textAlign: "center",
        marginTop: 50,
        width: "100%",
    },
});

export default StatDetails;
