import {brand} from '../design/tokens';
import React, {useState, useEffect, useRef} from "react";
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Image,
    Alert,
    ActivityIndicator,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import {Ionicons} from "@expo/vector-icons";
import {
    useRouter,
    useLocalSearchParams,
    UnknownOutputParams,
} from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as SecureStore from "expo-secure-store";
import {jwtDecode} from "jwt-decode";
import {useTranslation} from "react-i18next";
import apiClient from "../api/client";
import {useTheme} from "../context/ThemeContext";
import {playlistDraft, validPlaylistName, PLAYLIST_NAME_LIMIT} from '../design/playlistDraft';

const CreatePlaylist = () => {
    const {t} = useTranslation();
    const {theme} = useTheme();
    const router = useRouter();
    const params: UnknownOutputParams = useLocalSearchParams();

    const [name, setName] = useState((params.title as string) || "");
    const [image, setImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingPlaylist, setLoadingPlaylist] = useState(params.isEditing === 'true');
    const [loadError, setLoadError] = useState(false);
    const [imageChanged, setImageChanged] = useState(false);
    const saving = useRef(false);

    const isEditing: boolean = params.isEditing === "true";
    const isPublicParam: boolean = params.is_public === "true";
    const [isPublic, setIsPublic] = useState<boolean>(isPublicParam);

    const pickImage = async (): Promise<void> => {
        try {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
            base64: true,
        });
        if (!result.canceled) {
            const asset = result.assets[0];
            if ((asset.fileSize || 0) > 5 * 1024 * 1024 || !asset.base64 || asset.base64.length > 7 * 1024 * 1024) {
                Alert.alert(t('error'), t('mobile_image_error')); return;
            }
            setImage(`data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`);
            setImageChanged(true);
        }
        } catch { Alert.alert(t('error'), t('mobile_image_error')); }
    };

    useEffect((): void => {
        const loadPlaylist = async (): Promise<void> => {
            if (!isEditing || !params.id) return;
            try {
                const res = await apiClient.get(`/playlists/${params.id}`);
                const playlist = res.data.playlist;
                setName(playlist.name);
                setIsPublic(playlist.is_public);
                setImage(playlist.image_url || null);
            } catch (e) {
                setLoadError(true);
                Alert.alert(t('error'), t('mobile_load_error'));
            } finally {
                setLoadingPlaylist(false);
            }
        };
        loadPlaylist();
    }, []);

    useEffect((): void => {
        if (params.is_public !== undefined) setIsPublic(params.is_public === "true");
    }, []);

    const handleSave = async (): Promise<void> => {
        if (!validPlaylistName(name) || saving.current || loadingPlaylist || loadError) return;
        saving.current = true;
        try {
            setLoading(true);
            const token = await SecureStore.getItemAsync("userToken");
            if (!token) { Alert.alert(t("error"), t("session_expired")); return; }
            const decoded: any = jwtDecode(token);
            const userId = decoded.id;

            const data = playlistDraft(name, isPublic, image, imageChanged);

            if (isEditing) {
                await apiClient.put(`/playlists/${params.id}`, data);
                Alert.alert(t("success"), t("playlist_update_success"));
            } else {
                await apiClient.post("/playlists", {...data, user_id: userId});
                Alert.alert(t("success"), t("playlist_create_success"));
            }
            router.replace("/library");
        } catch (e: any) {
            console.error("Erreur sauvegarde playlist:", e);
            Alert.alert(t("error"), e.response?.data?.message || t("playlist_save_error"));
        } finally {
            saving.current = false;
            setLoading(false);
        }
    };

    const canSave = validPlaylistName(name) && !loading && !loadingPlaylist && !loadError;

    return (
        <View style={[styles.safe, {backgroundColor: theme.background}]}>
            <KeyboardAvoidingView style={{flex: 1}} behavior={Platform.OS === "ios" ? "padding" : "height"}>
                <ScrollView
                    contentContainerStyle={styles.scroll}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Top bar */}
                    <View style={styles.topBar}>
                        <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('back')} disabled={loading} onPress={() => router.canGoBack() ? router.back() : router.replace('/library')} style={[styles.closeBtn, {backgroundColor: theme.surface}]} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                            <Ionicons name="close" size={20} color={theme.text}/>
                        </TouchableOpacity>
                    </View>

                    {/* Title */}
                    <Text style={[styles.pageTitle, {color: theme.text}]}>
                        {isEditing ? t("edit_playlist") : t("new_playlist")}
                    </Text>
                    <Text style={{color: theme.subText, lineHeight: 22, marginBottom: 24}}>{t('mobile_playlist_intro')}</Text>
                    {loadingPlaylist && <ActivityIndicator color={theme.accent} style={{marginBottom: 16}}/>}
                    {loadError && <Text style={{color: theme.danger, marginBottom: 16}}>{t('mobile_load_error')}</Text>}

                    {/* Image picker */}
                    <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('add_cover')} disabled={loading || loadingPlaylist || loadError} onPress={pickImage} activeOpacity={0.85} style={styles.imageWrapper}>
                        <View style={[styles.imagePicker, {backgroundColor: theme.surface}]}>
                            {image ? (
                                <Image source={{uri: image}} style={styles.pickerImage}/>
                            ) : (
                                <View style={styles.pickerPlaceholder}>
                                    <View style={styles.musicIconBg}>
                                        <Ionicons name="musical-notes" size={40} color={theme.accent}/>
                                    </View>
                                    <Text style={[styles.pickerHint, {color: theme.subText}]}>{t("add_cover")}</Text>
                                </View>
                            )}
                        </View>
                        <View style={[styles.cameraBadge, {backgroundColor: brand.primary, borderColor: theme.background}]}>
                            <Ionicons name="camera" size={14} color="#fff"/>
                        </View>
                    </TouchableOpacity>

                    {image && <TouchableOpacity accessibilityRole="button" disabled={loading || loadingPlaylist || loadError} onPress={() => {setImage(null); setImageChanged(true);}} style={{minHeight: 44, alignItems: 'center', marginBottom: 16}}><Text style={{color: theme.accent}}>{t('mobile_remove_cover')}</Text></TouchableOpacity>}

                    {/* Name input */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionLabel, {color: theme.subText}]}>
                            {t("playlist_name_placeholder", "Nom de la playlist").toUpperCase()}
                        </Text>
                        <View style={[styles.inputCard, {backgroundColor: theme.surface, borderColor: name ? theme.accent : theme.border}]}>
                            <Ionicons name="pencil-outline" size={18} color={name ? theme.accent : theme.placeholder} style={{marginRight: 10}}/>
                            <TextInput
                                style={[styles.input, {color: theme.text}]}
                                placeholder={t("playlist_name_placeholder")}
                                placeholderTextColor={theme.placeholder}
                                value={name}
                                onChangeText={value => setName(value.slice(0, PLAYLIST_NAME_LIMIT))}
                                accessibilityLabel={t('playlist_name_placeholder')}
                                editable={!loading && !loadingPlaylist && !loadError}
                                maxLength={PLAYLIST_NAME_LIMIT}
                                returnKeyType="done"
                            />
                        </View>
                        <Text style={{color: theme.subText, textAlign: 'right', marginTop: 8}}>{name.length}/30</Text>
                    </View>

                    {/* Visibility */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionLabel, {color: theme.subText}]}>
                            {t("mobile_visibility").toUpperCase()}
                        </Text>
                        <View style={styles.visRow}>
                            <TouchableOpacity
                                accessibilityRole="radio"
                                accessibilityState={{checked: isPublic}}
                                disabled={loading || loadingPlaylist || loadError}
                                style={[
                                    styles.visCard,
                                    {backgroundColor: theme.surface, borderColor: isPublic ? theme.accent : theme.border},
                                    isPublic && styles.visCardActive,
                                ]}
                                onPress={() => setIsPublic(true)}
                                activeOpacity={0.75}
                            >
                                <View style={[styles.visIconBg, {backgroundColor: isPublic ? "rgba(108,92,231,0.15)" : theme.background}]}>
                                    <Ionicons name="globe-outline" size={22} color={isPublic ? theme.accent : theme.subText}/>
                                </View>
                                <Text style={[styles.visTitle, {color: isPublic ? theme.accent : theme.text}]}>
                                    {t("playlist_public")}
                                </Text>
                                {isPublic && (
                                    <View style={styles.visCheck}>
                                        <Ionicons name="checkmark-circle" size={16} color={theme.accent}/>
                                    </View>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity
                                accessibilityRole="radio"
                                accessibilityState={{checked: !isPublic}}
                                disabled={loading || loadingPlaylist || loadError}
                                style={[
                                    styles.visCard,
                                    {backgroundColor: theme.surface, borderColor: !isPublic ? theme.accent : theme.border},
                                    !isPublic && styles.visCardActive,
                                ]}
                                onPress={() => setIsPublic(false)}
                                activeOpacity={0.75}
                            >
                                <View style={[styles.visIconBg, {backgroundColor: !isPublic ? "rgba(108,92,231,0.15)" : theme.background}]}>
                                    <Ionicons name="lock-closed-outline" size={22} color={!isPublic ? theme.accent : theme.subText}/>
                                </View>
                                <Text style={[styles.visTitle, {color: !isPublic ? theme.accent : theme.text}]}>
                                    {t("playlist_private")}
                                </Text>
                                {!isPublic && (
                                    <View style={styles.visCheck}>
                                        <Ionicons name="checkmark-circle" size={16} color={theme.accent}/>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Create button */}
                    <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityState={{disabled: !canSave, busy: loading}}
                        style={[styles.createBtn, {opacity: canSave ? 1 : 0.4}]}
                        onPress={handleSave}
                        disabled={!canSave}
                        activeOpacity={0.8}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff"/>
                        ) : (
                            <>
                                <Ionicons name={isEditing ? "save-outline" : "add-circle-outline"} size={20} color="#fff" style={{marginRight: 8}}/>
                                <Text style={styles.createBtnText}>
                                    {isEditing ? t("save_changes_btn") : t("create_playlist_btn")}
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    safe: {flex: 1},

    scroll: {paddingHorizontal: 24, paddingTop: 16, paddingBottom: 48},

    topBar: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 20,
    },
    closeBtn: {
        width: 44,
        height: 44,
        borderRadius: 18,
        justifyContent: "center",
        alignItems: "center",
    },
    pageTitle: {
        fontSize: 28,
        fontWeight: "800",
        marginBottom: 12,
        letterSpacing: -0.5,
    },

    // Image picker
    imageWrapper: {
        alignSelf: "center",
        marginBottom: 36,
        position: "relative",
    },
    imagePicker: {
        width: 190,
        height: 190,
        borderRadius: 20,
        overflow: "hidden",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: brand.primary,
        shadowOpacity: 0,
        shadowRadius: 16,
        shadowOffset: {width: 0, height: 6},
        elevation: 0,
    },
    pickerImage: {width: "100%", height: "100%"},
    pickerPlaceholder: {alignItems: "center", gap: 12},
    musicIconBg: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: "rgba(108,92,231,0.12)",
        justifyContent: "center",
        alignItems: "center",
    },
    pickerHint: {fontSize: 13, fontWeight: "500"},
    cameraBadge: {
        position: "absolute",
        bottom: -6,
        right: -6,
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 2,
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowRadius: 4,
        shadowOffset: {width: 0, height: 2},
        elevation: 4,
    },

    // Section
    section: {marginBottom: 28},
    sectionLabel: {fontSize: 11, fontWeight: "700", letterSpacing: 1.2, marginBottom: 10},

    // Input
    inputCard: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 14,
        borderWidth: 1.5,
    },
    input: {flex: 1, fontSize: 16, fontWeight: "500"},

    // Visibility
    visRow: {flexDirection: "row", gap: 12},
    visCard: {
        flex: 1,
        paddingVertical: 16,
        paddingHorizontal: 14,
        borderRadius: 14,
        borderWidth: 1.5,
        alignItems: "center",
        gap: 10,
        position: "relative",
    },
    visCardActive: {
        shadowColor: brand.primary,
        shadowOpacity: 0.15,
        shadowRadius: 8,
        shadowOffset: {width: 0, height: 3},
        elevation: 3,
    },
    visIconBg: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: "center",
        alignItems: "center",
    },
    visTitle: {fontSize: 14, fontWeight: "700"},
    visCheck: {position: "absolute", top: 8, right: 8},

    // Create button
    createBtn: {
        backgroundColor: brand.primary,
        borderRadius: 16,
        paddingVertical: 16,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        marginTop: 8,
        shadowColor: brand.primary,
        shadowOpacity: 0,
        shadowRadius: 12,
        shadowOffset: {width: 0, height: 4},
        elevation: 0,
    },
    createBtnText: {color: "#fff", fontWeight: "800", fontSize: 16},
});

export default CreatePlaylist;
