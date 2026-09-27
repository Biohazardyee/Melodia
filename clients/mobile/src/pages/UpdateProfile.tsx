import {brand} from '../design/tokens';
import React, {useEffect, useState, useRef} from "react";
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ScrollView,
    Image,
    ActivityIndicator,
} from "react-native";
import {updateProfile} from "../api/user";
import BackButton from "../components/BackButton";
import * as ImagePicker from "expo-image-picker";
import {Ionicons} from "@expo/vector-icons";
import apiClient from "../api/client";
import * as SecureStore from "expo-secure-store";
import {jwtDecode} from "jwt-decode";
import {useTranslation} from "react-i18next";
import {useTheme} from "../context/ThemeContext";

const USERNAME_MAX = 20;
const BIO_MAX = 150;

const UpdateProfile = () => {
    const {t} = useTranslation();
    const {theme} = useTheme();

    const [username, setUsername] = useState("");
    const [favoriteBand, setFavoriteBand] = useState("");
    const [biography, setBiography] = useState("");
    const [profilePicture, setProfilePicture] = useState("");
    const [pictureChanged, setPictureChanged] = useState(false);
    const [loading, setLoading] = useState(false);

    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const searchTimeout = useRef<any>(null);

    const searchArtists = (text: string): void => {
        setFavoriteBand(text);
        if (searchTimeout.current) clearTimeout(searchTimeout.current);

        if (text.length > 2) {
            setIsSearching(true);
            searchTimeout.current = setTimeout(async (): Promise<void> => {
                try {
                    const response = await apiClient.get(`/api/search?query=${text}`);
                    const albums =
                        response.data.searchResults?.results?.albummatches?.album || [];
                    const uniqueArtists = [...new Set(albums.map((a: any) => a.artist))];
                    setSuggestions(uniqueArtists.map((name) => ({name})).slice(0, 5));
                    setShowSuggestions(true);
                } catch (e) {
                    console.error(e);
                } finally {
                    setIsSearching(false);
                }
            }, 300);
        } else {
            setSuggestions([]);
            setShowSuggestions(false);
        }
    };

    useEffect((): void => {
        const loadUser = async (): Promise<void> => {
            try {
                const token = await SecureStore.getItemAsync("userToken");
                if (!token) return;
                const decoded: any = jwtDecode(token);
                const res = await apiClient.get(`/users/public/${decoded.id}`);
                const user = res.data.user || res.data;
                setUsername(user.username || "");
                setFavoriteBand(user.favorite_band || "");
                setBiography(user.biography || "");
                setProfilePicture(user.profile_picture || "");
            } catch (e) {
                console.error("Erreur load profile:", e);
            }
        };
        loadUser();
    }, []);

    const pickImage = async (): Promise<void> => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            Alert.alert(t("permission_denied"), t("permission_required"));
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
            base64: true,
        });
        if (!result.canceled) {
            const img = result.assets[0];
            if (img.base64) {
                setProfilePicture(`data:image/jpeg;base64,${img.base64}`);
            } else {
                setProfilePicture(img.uri);
            }
            setPictureChanged(true);
        }
    };

    const handleSave = async (): Promise<void> => {
        try {
            setLoading(true);
            await updateProfile({
                username,
                favorite_band: favoriteBand,
                biography,
                ...(pictureChanged && {profile_picture: profilePicture}),
            });
            Alert.alert(t("success"), t("profile_update_success"));
        } catch (err) {
            console.error(err);
            Alert.alert(t("error"), t("profile_update_error"));
        } finally {
            setLoading(false);
        }
    };

    const avatarUri = profilePicture
        ? profilePicture.startsWith("data") || profilePicture.startsWith("http") || profilePicture.startsWith("file")
            ? profilePicture
            : `data:image/jpeg;base64,${profilePicture}`
        : null;

    return (
        <ScrollView
            style={[styles.container, {backgroundColor: theme.background}]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
        >
            {/* Header */}
            <View style={styles.headerRow}>
                <BackButton/>
            </View>

            <Text style={[styles.pageTitle, {color: theme.text}]}>{t("settings_edit_profile")}</Text>
            <Text style={[styles.pageSubtitle, {color: theme.subText}]}>{t("settings_subtitle")}</Text>

            {/* Avatar */}
            <TouchableOpacity style={styles.avatarWrapper} onPress={pickImage} activeOpacity={0.85}>
                <View style={[styles.avatarRing, {borderColor: brand.primary}]}>
                    {avatarUri ? (
                        <Image source={{uri: avatarUri}} style={styles.avatar}/>
                    ) : (
                        <View style={[styles.avatarFallback, {backgroundColor: brand.primary}]}>
                            <Text style={styles.avatarInitials}>
                                {username?.substring(0, 2).toUpperCase() || "U"}
                            </Text>
                        </View>
                    )}
                </View>
                <View style={styles.cameraChip}>
                    <Ionicons name="camera" size={14} color="#fff"/>
                    <Text style={styles.cameraChipText}>{t("add_cover")}</Text>
                </View>
            </TouchableOpacity>

            {/* Form */}
            <View style={[styles.formCard, {backgroundColor: theme.card, borderColor: theme.border}]}>

                {/* Username */}
                <View style={styles.fieldGroup}>
                    <View style={styles.labelRow}>
                        <Ionicons name="person-outline" size={15} color={theme.placeholder}/>
                        <Text style={[styles.label, {color: theme.subText}]}>{t("label_username")}</Text>
                        <Text style={[styles.counter, {color: theme.placeholder}]}>
                            {(username || "").length}/{USERNAME_MAX}
                        </Text>
                    </View>
                    <TextInput
                        style={[styles.input, {
                            backgroundColor: theme.inputBg,
                            color: theme.text,
                            borderColor: theme.border,
                        }]}
                        value={username}
                        onChangeText={(text) => text.length <= USERNAME_MAX && setUsername(text)}
                        placeholderTextColor={theme.placeholder}
                    />
                </View>

                <View style={[styles.divider, {backgroundColor: theme.border}]}/>

                {/* Favorite artist */}
                <View style={styles.fieldGroup}>
                    <View style={styles.labelRow}>
                        <Ionicons name="musical-notes-outline" size={15} color={theme.placeholder}/>
                        <Text style={[styles.label, {color: theme.subText}]}>{t("label_favorite_band")}</Text>
                    </View>
                    <TextInput
                        style={[styles.input, {
                            backgroundColor: theme.inputBg,
                            color: theme.text,
                            borderColor: theme.border,
                        }]}
                        value={favoriteBand}
                        onChangeText={searchArtists}
                        placeholder={t("placeholder_favorite_band")}
                        placeholderTextColor={theme.placeholder}
                    />
                    {showSuggestions && (
                        <View style={[styles.suggestions, {backgroundColor: theme.card, borderColor: theme.border}]}>
                            {isSearching ? (
                                <ActivityIndicator color={theme.accent} style={{padding: 14}}/>
                            ) : (
                                suggestions.map((item, i) => (
                                    <TouchableOpacity
                                        key={i}
                                        style={[
                                            styles.suggestionItem,
                                            {borderBottomColor: theme.border},
                                            i === suggestions.length - 1 && {borderBottomWidth: 0},
                                        ]}
                                        onPress={(): void => {
                                            setFavoriteBand(item.name);
                                            setShowSuggestions(false);
                                        }}
                                    >
                                        <View style={[styles.suggestionIcon, {backgroundColor: theme.surface}]}>
                                            <Ionicons name="musical-notes" color={theme.accent} size={14}/>
                                        </View>
                                        <Text style={[styles.suggestionText, {color: theme.text}]}>
                                            {item.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))
                            )}
                        </View>
                    )}
                </View>

                <View style={[styles.divider, {backgroundColor: theme.border}]}/>

                {/* Bio */}
                <View style={styles.fieldGroup}>
                    <View style={styles.labelRow}>
                        <Ionicons name="document-text-outline" size={15} color={theme.placeholder}/>
                        <Text style={[styles.label, {color: theme.subText}]}>{t("label_bio")}</Text>
                        <Text style={[styles.counter, {color: theme.placeholder}]}>
                            {(biography || "").length}/{BIO_MAX}
                        </Text>
                    </View>
                    <TextInput
                        style={[styles.input, styles.textArea, {
                            backgroundColor: theme.inputBg,
                            color: theme.text,
                            borderColor: theme.border,
                        }]}
                        value={biography}
                        onChangeText={(text) => text.length <= BIO_MAX && setBiography(text)}
                        placeholder={t("placeholder_biography")}
                        placeholderTextColor={theme.placeholder}
                        multiline
                        textAlignVertical="top"
                    />
                </View>
            </View>

            {/* Save button */}
            <TouchableOpacity
                style={[styles.saveButton, loading && {opacity: 0.6}]}
                onPress={handleSave}
                disabled={loading}
                activeOpacity={0.85}
            >
                {loading ? (
                    <ActivityIndicator color="#fff"/>
                ) : (
                    <View style={styles.saveButtonInner}>
                        <Ionicons name="checkmark-circle-outline" size={20} color="#fff"/>
                        <Text style={styles.saveButtonText}>{t("btn_save")}</Text>
                    </View>
                )}
            </TouchableOpacity>

            <View style={{height: 40}}/>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerRow: {
        paddingTop: 10,
        paddingHorizontal: 20,
    },
    pageTitle: {
        fontSize: 26,
        fontWeight: "800",
        marginTop: 6,
        marginHorizontal: 20,
        letterSpacing: 0.3,
    },
    pageSubtitle: {
        fontSize: 14,
        marginTop: 4,
        marginHorizontal: 20,
        marginBottom: 28,
    },

    /* Avatar */
    avatarWrapper: {
        alignItems: "center",
        marginBottom: 32,
    },
    avatarRing: {
        width: 116,
        height: 116,
        borderRadius: 58,
        borderWidth: 3,
        padding: 3,
        justifyContent: "center",
        alignItems: "center",
    },
    avatar: {
        width: 106,
        height: 106,
        borderRadius: 53,
    },
    avatarFallback: {
        width: 106,
        height: 106,
        borderRadius: 53,
        justifyContent: "center",
        alignItems: "center",
    },
    avatarInitials: {
        color: "#fff",
        fontSize: 30,
        fontWeight: "800",
    },
    cameraChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        backgroundColor: brand.primary,
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 20,
        marginTop: 10,
    },
    cameraChipText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "600",
    },

    /* Form card */
    formCard: {
        marginHorizontal: 20,
        borderRadius: 18,
        borderWidth: 1,
        overflow: "hidden",
    },
    fieldGroup: {
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    labelRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginBottom: 8,
    },
    label: {
        flex: 1,
        fontSize: 13,
        fontWeight: "600",
    },
    counter: {
        fontSize: 12,
    },
    input: {
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 11,
        fontSize: 15,
        borderWidth: 1,
    },
    textArea: {
        height: 100,
    },
    divider: {
        height: 1,
        marginHorizontal: 16,
    },

    /* Suggestions */
    suggestions: {
        borderRadius: 12,
        marginTop: 6,
        borderWidth: 1,
        overflow: "hidden",
    },
    suggestionItem: {
        flexDirection: "row",
        alignItems: "center",
        padding: 11,
        borderBottomWidth: 1,
        gap: 10,
    },
    suggestionIcon: {
        width: 28,
        height: 28,
        borderRadius: 8,
        justifyContent: "center",
        alignItems: "center",
    },
    suggestionText: {
        fontSize: 14,
        fontWeight: "500",
    },

    /* Save button */
    saveButton: {
        backgroundColor: brand.primary,
        marginHorizontal: 20,
        marginTop: 24,
        borderRadius: 14,
        paddingVertical: 15,
        alignItems: "center",
        shadowColor: brand.primary,
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    saveButtonInner: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    saveButtonText: {
        color: "#fff",
        fontWeight: "700",
        fontSize: 16,
    },
});

export default UpdateProfile;
