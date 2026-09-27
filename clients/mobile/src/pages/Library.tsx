import React, {useState, useCallback} from "react";
import {useTranslation} from "react-i18next";
import {useFocusEffect} from "expo-router";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Alert,
    useWindowDimensions,
} from "react-native";
import {Ionicons} from "@expo/vector-icons";
import Header from "@/src/components/Header";
import PlaylistCard from "@/src/components/PlaylistCard";
import {useRouter} from "expo-router";
import {AuthGuardWrapper} from "../components/AuthGuardMapper";
import apiClient from "../api/client";
import * as SecureStore from "expo-secure-store";
import {jwtDecode} from "jwt-decode";
import {useTheme} from "../context/ThemeContext";
import Skeleton from '../components/Skeleton';

type Playlist = {
    id: string;
    title: string;
    count: number;
    image: string;
    isCreate?: boolean;
    is_public: boolean;
};


const Library: React.FC = () => {
    const {t} = useTranslation();
    const router = useRouter();
    const {theme} = useTheme();
    const {width} = useWindowDimensions();
    const columns = width >= 700 ? 3 : 2;
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const fetchUserPlaylists: () => Promise<void> = async (): Promise<void> => {
        setError(false);
        try {
            const token: string | null = await SecureStore.getItemAsync("userToken");
            if (!token) {
                setLoading(false);
                return;
            }
            const decoded: any = jwtDecode(token);
            const userId = decoded.id;
            const response = await apiClient.get(`/playlists/user/${userId}`);

            if (response.data && response.data.playlists) {
                const formattedPlaylists: Playlist[] = response.data.playlists.map(
                    (p: any) => ({
                        id: p.id,
                        title: p.name,
                        count: p.items?.length ?? 0,
                        image: p.image_url || '',
                        is_public: p.is_public,
                    }),
                );
                setPlaylists(formattedPlaylists);
            }
        } catch (error) {
            setError(true);
            console.error("Library Error:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback((): void => {
            fetchUserPlaylists();
        }, []),
    );

    const deletePlaylist: (id: string) => Promise<void> = async (
        id: string,
    ): Promise<void> => {
        try {
            await apiClient.delete(`/playlists/${id}`);
            setPlaylists((current: Playlist[]): Playlist[] =>
                current.filter((p: Playlist): boolean => p.id !== id),
            );
            Alert.alert(t("success"), t("playlist_deleted_success"));
        } catch (error) {
            Alert.alert(t("error"), t("playlist_delete_error"));
        }
    };

    const showOptions: (item: Playlist) => void = (item: Playlist): void => {
        Alert.alert(item.title, t("playlist_options_title"), [
            {
                text: t("modify"),
                onPress: (): void =>
                    router.push({
                        pathname: "/createplaylist",
                        params: {
                            id: item.id,
                            title: item.title,
                            isEditing: "true",
                            is_public: String(item.is_public),
                        },
                    }),
            },
            {
                text: t("delete"),
                style: "destructive",
                onPress: (): void =>
                    Alert.alert(t("delete"), t("delete_playlist_confirm"), [
                        {text: t("cancel"), style: "cancel"},
                        {text: t("delete"), onPress: () => deletePlaylist(item.id)},
                    ]),
            },
            {text: t("cancel"), style: "cancel"},
        ]);
    };

    const dataWithCreate: Playlist[] = [
        {id: "create-button-id", isCreate: true} as Playlist,
        ...playlists,
    ];

    const renderItem = ({item}: { item: Playlist }) => {
        if (item.isCreate) {
            return (
                <View style={[styles.card, {maxWidth: `${100 / columns}%`}]}>
                    <TouchableOpacity
                        style={[styles.createCard, {backgroundColor: theme.card, borderColor: theme.border}]}
                        onPress={(): void => router.push("/createplaylist")}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.iconCircle, {backgroundColor: theme.accentSoft}]}>
                            <Ionicons name="add" size={32} color={theme.accent}/>
                        </View>
                        <Text style={[styles.createLabelInner, {color: theme.text}]}>{t("new_playlist")}</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        return (
            <View style={[styles.card, {maxWidth: `${100 / columns}%`}]}>
                <PlaylistCard
                    title={item.title}
                    count={item.count}
                    image={item.image}
                    onPress={(): void =>
                        router.push({
                            pathname: "/playlistdetails",
                            params: {id: item.id, title: item.title},
                        })
                    }
                    onEdit={(): void => showOptions(item)}
                    onDelete={(): Promise<void> => deletePlaylist(item.id)}
                />
            </View>
        );
    };

    return (
        <AuthGuardWrapper>
            <View style={[styles.container, {backgroundColor: theme.background}]}>
                <Header/>

                {loading ? (
                    <View style={styles.loaderContainer}>
                        <View style={{width: '100%', flexDirection: 'row', gap: 16, padding: 20}}>{[0,1].map(i => <Skeleton key={i} style={{flex: 1, aspectRatio: 0.8}}/>)}</View>
                        <Text style={[styles.loaderText, {color: theme.subText}]}>
                            {t("msg_loading_music")}
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        key={columns}
                        data={dataWithCreate}
                        keyExtractor={(item: Playlist): string => item.id}
                        numColumns={columns}
                        refreshing={refreshing}
                        onRefresh={() => {setRefreshing(true); fetchUserPlaylists();}}
                        contentContainerStyle={styles.listContainer}
                        showsVerticalScrollIndicator={false}
                        renderItem={renderItem}
                        ListHeaderComponent={
                            <View style={styles.headerTextContainer}>
                                <Text style={[styles.title, {color: theme.text}]}>{t("my_playlists_title")}</Text>
                                <View style={[styles.badge, {backgroundColor: theme.accentSoft}]}>
                                    <Text style={[styles.subtitle, {color: theme.accent}]}>
                                        {playlists.length} {t("library_playlists_created")}
                                    </Text>
                                </View>
                                {error && <TouchableOpacity accessibilityRole="button" onPress={fetchUserPlaylists} style={{paddingVertical: 16}}>
                                    <Text style={{color: theme.danger}}>{t('mobile_load_error')}</Text>
                                    <Text style={{color: theme.accent, marginTop: 8}}>{t('mobile_retry')}</Text>
                                </TouchableOpacity>}
                            </View>
                        }
                    />
                )}
            </View>
        </AuthGuardWrapper>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loaderContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    loaderText: {
        marginTop: 15,
        fontSize: 14,
    },
    headerTextContainer: {
        paddingHorizontal: 8,
        marginTop: 25,
        marginBottom: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: "800",
        letterSpacing: -0.8,
    },
    badge: {
        backgroundColor: "rgba(236, 72, 153, 0.1)",
        alignSelf: "flex-start",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        marginTop: 8,
    },
    subtitle: {
        color: "#ec4899",
        fontSize: 13,
        fontWeight: "600",
    },
    listContainer: {
        paddingHorizontal: 12,
        paddingBottom: 40,
    },
    card: {
        flex: 1,
        padding: 6,
    },
    createCard: {
        width: "100%",
        aspectRatio: 1,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        shadowColor: "#000",
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0,
        shadowRadius: 5,
        elevation: 0,
    },
    iconCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: "rgba(236, 72, 153, 0.15)",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 10,
    },
    createLabelInner: {
        fontSize: 14,
        fontWeight: "700",
        textAlign: "center",
    },
});

export default Library;
