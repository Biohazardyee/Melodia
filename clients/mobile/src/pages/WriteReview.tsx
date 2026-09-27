import {brand} from '../design/tokens';
import React, {useEffect, useRef, useState} from "react";
import {
    StyleSheet,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Image,
    Alert,
    ActivityIndicator,
} from "react-native";
import {Ionicons} from "@expo/vector-icons";
import Header from "@/src/components/Header";
import {useLocalSearchParams, useRouter} from "expo-router";
import * as SecureStore from "expo-secure-store";
import apiClient from "../api/client";
import {useTranslation} from "react-i18next";
import {useTheme} from "../context/ThemeContext";

const WriteReview = () => {
    const {t} = useTranslation();
    const router = useRouter();
    const {theme} = useTheme();

    const {id, title, artist, cover, reviewId, editMode} =
        useLocalSearchParams();

    const [rating, setRating] = useState(0);
    const [reviewTitle, setReviewTitle] = useState("");
    const [review, setReview] = useState("");
    const [loading, setLoading] = useState(false);
    const reviewInputRef = useRef<TextInput>(null);

    useEffect((): void => {
        const fetchReviewIfEdit: () => Promise<void> = async (): Promise<void> => {
            if (!reviewId) return;

            try {
                const res = await apiClient.get(`/reviews/${reviewId}`);
                const reviewData = res.data.review;

                setRating(reviewData.rating);
                setReviewTitle(reviewData.title);
                setReview(reviewData.content);
            } catch (err) {
                console.error("Erreur fetch review:", err);
                Alert.alert(t("error"), t("review_load_error"));
            }
        };

        fetchReviewIfEdit();
    }, [reviewId]);

    const handlePublish: () => Promise<void> = async (): Promise<void> => {
        if (rating === 0 || reviewTitle.trim() === "" || review.trim() === "") {
            Alert.alert(t("error_oops"), t("review_fill_fields"));
            return;
        }

        setLoading(true);

        try {
            const userId: string | null = await SecureStore.getItemAsync("userId");

            if (!userId) {
                Alert.alert(t("error"), t("review_session_expired"));
                return;
            }

            const payload = {
                user_id: userId,
                media_id: id as string,
                rating,
                title: reviewTitle.trim(),
                content: review.trim(),
            };

            if (editMode === "true" && reviewId) {
                await apiClient.put(`/reviews/${reviewId}`, payload);

                Alert.alert(t("success"), t("review_update_success"));
                router.back();
                return;
            }

            await apiClient.post("/reviews", payload);

            Alert.alert(t("success"), t("review_publish_success"));
            router.back();
        } catch (error: any) {
            console.error(error);

            const msg = error.response?.data?.message || t("error");
            Alert.alert(t("error"), msg);
        } finally {
            setLoading(false);
        }
    };

    const renderStars = () => {
        return (
            <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((index: number) => (
                    <TouchableOpacity
                        key={index}
                        onPress={(): void => setRating(index)}
                        disabled={loading}
                    >
                        <Ionicons
                            name={index <= rating ? "star" : "star-outline"}
                            size={32}
                            color={index <= rating ? "#e24ada" : theme.separator}
                            style={{marginRight: 8}}
                        />
                    </TouchableOpacity>
                ))}
            </View>
        );
    };

    return (
        <View style={[styles.safeArea, {backgroundColor: theme.background}]}>
            <Header/>

            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.scrollContent}
                automaticallyAdjustKeyboardInsets
                keyboardDismissMode="none"
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator
            >
                <View style={styles.headerRow}>
                    <View>
                        <Text style={[styles.title, {color: theme.text}]}>{t("write_comment")}</Text>
                        <Text style={[styles.subtitle, {color: theme.subText}]}>{t("placeholder_comment")}</Text>
                    </View>
                </View>

                <View style={[styles.albumCard, {backgroundColor: theme.surface, borderColor: theme.border}]}>
                    <Image
                        source={{
                            uri: (cover as string) || "https://via.placeholder.com/80",
                        }}
                        style={styles.albumArt}
                    />
                    <View style={{flex: 1}}>
                        <Text style={[styles.albumName, {color: theme.text}]} numberOfLines={1}>
                            {title || t("text_unknown_album")}
                        </Text>
                        <Text style={styles.artistName} numberOfLines={1}>
                            {artist || t("text_unknown_artist")}
                        </Text>
                    </View>
                </View>

                <View style={styles.formContainer}>
                    <Text style={[styles.label, {color: theme.text}]}>{t("rating")} *</Text>
                    {renderStars()}

                    <Text style={[styles.label, {color: theme.text}]}>{t("review_title_label")}</Text>
                    <TextInput
                        style={[styles.input, {backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border}]}
                        placeholder={t("review_title_placeholder")}
                        placeholderTextColor={theme.placeholder}
                        value={reviewTitle}
                        onChangeText={setReviewTitle}
                        maxLength={100}
                        editable={!loading}
                        returnKeyType="next"
                        submitBehavior="submit"
                        onSubmitEditing={() => reviewInputRef.current?.focus()}
                        accessibilityLabel={t("review_title_label")}
                    />
                    <Text style={[styles.charCount, {color: theme.placeholder}]}>
                        {(reviewTitle || "").length}{t("char_limit_100")}
                    </Text>

                    <Text style={[styles.label, {color: theme.text}]}>{t("review_content_label")}</Text>
                    <TextInput
                        ref={reviewInputRef}
                        style={[styles.input, styles.textArea, {backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border}]}
                        accessibilityLabel={t("review_content_label")}
                        placeholder={t("review_content_placeholder")}
                        placeholderTextColor={theme.placeholder}
                        multiline
                        numberOfLines={6}
                        value={review}
                        onChangeText={setReview}
                        editable={!loading}
                    />
                </View>

                <View style={styles.buttonRow}>
                    <TouchableOpacity
                        style={[styles.cancelButton, {backgroundColor: theme.surface}]}
                        onPress={(): void => router.back()}
                        disabled={loading}
                    >
                        <Text style={[styles.cancelText, {color: theme.text}]}>{t("cancel")}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.publishButton, loading && {opacity: 0.7}]}
                        onPress={handlePublish}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff"/>
                        ) : (
                            <>
                                <Ionicons
                                    name="save-outline"
                                    size={20}
                                    color="#fff"
                                    style={{marginRight: 8}}
                                />
                                <Text style={styles.publishText}>
                                    {editMode === "true" ? t("review_edit_button") : t("review_publish_button")}
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    container: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
    },
    headerRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 25,
    },
    title: {
        fontSize: 28,
        fontWeight: "bold",
        letterSpacing: 0.5,
    },
    subtitle: {
        fontSize: 14,
        marginTop: 4,
    },
    albumCard: {
        flexDirection: "row",
        borderRadius: 12,
        padding: 15,
        alignItems: "center",
        borderWidth: 1,
        marginBottom: 25,
    },
    albumArt: {
        width: 60,
        height: 60,
        borderRadius: 8,
        marginRight: 15,
    },
    albumName: {
        fontSize: 18,
        fontWeight: "600",
    },
    artistName: {
        color: brand.primary,
        fontSize: 14,
    },
    formContainer: {
        marginBottom: 30,
    },
    label: {
        fontSize: 16,
        fontWeight: "600",
        marginBottom: 12,
        marginTop: 20,
    },
    starsContainer: {
        flexDirection: "row",
        marginBottom: 10,
    },
    input: {
        borderRadius: 8,
        padding: 15,
        fontSize: 16,
        borderWidth: 1,
    },
    textArea: {
        height: 120,
        textAlignVertical: "top",
    },
    charCount: {
        fontSize: 12,
        marginTop: 5,
        textAlign: "left",
    },
    buttonRow: {
        flexDirection: "row",
        justifyContent: "flex-end",
        paddingBottom: 40,
    },
    cancelButton: {
        paddingVertical: 12,
        paddingHorizontal: 25,
        marginRight: 15,
        borderRadius: 8,
    },
    cancelText: {
        fontWeight: "bold",
        fontSize: 16,
    },
    publishButton: {
        flexDirection: "row",
        backgroundColor: brand.primary,
        paddingVertical: 12,
        paddingHorizontal: 25,
        borderRadius: 8,
        alignItems: "center",
        minWidth: 150,
        justifyContent: "center",
    },
    publishText: {
        color: "#fff",
        fontWeight: "bold",
        fontSize: 16,
    },
});

export default WriteReview;
