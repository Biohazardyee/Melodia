import {brand} from '../design/tokens';
import React, {useState, useEffect} from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Alert,
    StatusBar,
    ActivityIndicator,
    TouchableOpacity,
    Dimensions,
} from "react-native";
import {useLocalSearchParams} from "expo-router";
import {Ionicons} from "@expo/vector-icons";
import BackButton from "../components/BackButton";
import apiClient from "../api/client";
import AlbumCard from "@/src/components/AlbumCard";
import {useTranslation} from "react-i18next";
import {useTheme} from "../context/ThemeContext";


const PADDING_HORIZONTAL = 10;
const GAP = 6;

const PlaylistDetails = () => {
    const {t} = useTranslation();
    const {theme} = useTheme();
    const {id, title} = useLocalSearchParams();
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const loadPlaylistContent: () => Promise<void> = async (): Promise<void> => {
        try {
            setLoading(true);
            const res = await apiClient.get(`/playlist-items/playlist/${id}`);
            setItems(res.data.playlistItems || []);
        } catch (e) {
            Alert.alert(t("error"), t("playlist_save_error"));
        } finally {
            setLoading(false);
        }
    };

    useEffect((): void => {
        if (id) loadPlaylistContent();
    }, [id]);

    const removeItem = (playlistItemId: string, mediaTitle: string): void => {
        Alert.alert(t("delete"), `${t("modify")} "${mediaTitle}" ?`, [
            {text: t("cancel"), style: "cancel"},
            {
                text: t("delete"),
                style: "destructive",
                onPress: async (): Promise<void> => {
                    try {
                        await apiClient.delete(`/playlist-items/${playlistItemId}`);
                        setItems((prev) => prev.filter((i): boolean => i.id !== playlistItemId));
                    } catch {
                        Alert.alert(t("error"), t("playlist_delete_error"));
                    }
                },
            },
        ]);
    };

    const renderAlbumItem = ({item}: { item: any }) => {
        const media = item.media;
        const content = media?.content;

        return (
            <View style={styles.cardWrapper}>
                <TouchableOpacity
                    style={{flex: 1}}
                    onLongPress={(): void => removeItem(item.id, content?.name || t("text_element"))}
                    activeOpacity={0.8}
                >
                    <AlbumCard
                        id={media?.id}
                        title={content?.album?.name || content?.name || media?.name || media?.title}
                        artist={content?.album?.artist || content?.artist || media?.artist}
                        cover={content?.cover || media?.cover}
                        rating={String(media?.rating || 0)}
                    />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.moreButton}
                    onPress={(): void => removeItem(item.id, content?.name || t("text_element"))}
                >
                    <Ionicons name="ellipsis-vertical" size={14} color="white"/>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <View style={[styles.container, {backgroundColor: theme.background}]}>

            <View style={styles.header}>
                <BackButton/>
                <Text style={[styles.headerTitle, {color: theme.text}]} numberOfLines={1}>
                    {title}
                </Text>
                <View style={{width: 45}}/>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={theme.accent}/>
                </View>
            ) : (
                <FlatList
                    data={items}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderAlbumItem}
                    numColumns={2}
                    columnWrapperStyle={styles.columnWrapper}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },

    card: {
        width: "100%",
        flex: 1,
    },

    coverContainer: {
        width: "100%",
    },

    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },

    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingTop: 20,
        paddingHorizontal: 20,
        paddingBottom: 20,
    },

    headerTitle: {
        fontSize: 22,
        fontWeight: "bold",
        flex: 1,
        textAlign: "center",
    },

    listContent: {
        paddingHorizontal: PADDING_HORIZONTAL,
        paddingBottom: 40,
    },


    columnWrapper: {
        gap: GAP,
        marginBottom: 12,
    },

    cardWrapper: {
        width: '48%',
        flex: 1,
        position: "relative",
    },

    moreButton: {
        position: "absolute",
        top: 6,
        right: 6,
        zIndex: 99,
        backgroundColor: "rgba(0,0,0,0.5)",
        borderRadius: 10,
        width: 22,
        height: 22,
        justifyContent: "center",
        alignItems: "center",
    },
});

export default PlaylistDetails;
