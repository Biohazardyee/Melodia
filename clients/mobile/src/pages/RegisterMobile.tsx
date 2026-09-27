import {brand} from '../design/tokens';
import {useRouter} from "expo-router";
import React from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Image,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import {ButtonMobile} from "../components/ButtonMobile";
import {InputMobile} from "../components/InputMobile";
import {Ionicons} from "@expo/vector-icons";
import apiClient from "../api/client";
import * as SecureStore from "expo-secure-store";
import * as Linking from "expo-linking";
import {ParsedURL} from "expo-linking";
import {WebBrowserAuthSessionResult} from "expo-web-browser";
import {useTranslation} from "react-i18next";
import {useTheme} from "../context/ThemeContext";

WebBrowser.maybeCompleteAuthSession();

const RegisterMobile: React.FC = () => {
    const router = useRouter();
    const {t} = useTranslation();
    const {theme} = useTheme();

    const [email, setEmail] = React.useState("");
    const [username, setUsername] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [favorite_band, setfavorite_band] = React.useState("");
    const [isLoading, setIsLoading] = React.useState(false);
    const [suggestions, setSuggestions] = React.useState<any[]>([]);
    const [showSuggestions, setShowSuggestions] = React.useState(false);

    const handleOAuth: (provider: "google" | "discord") => Promise<void> = async (provider: "google" | "discord"): Promise<void> => {
        try {
            const redirectUri: string = AuthSession.makeRedirectUri({
                scheme: "projetsupcontentmobile",
            });

            const authUrl = `${process.env.EXPO_PUBLIC_API_URL}/api/oauth/auth/${provider}?platform=mobile&redirect_uri=${encodeURIComponent(redirectUri)}`;

            const result: WebBrowserAuthSessionResult = await WebBrowser.openAuthSessionAsync(
                authUrl,
                redirectUri,
            );

            if (result.type === "success" && result.url) {
                const parsedUrl: ParsedURL = Linking.parse(result.url);

                const token: string = parsedUrl.queryParams?.token as string;
                const error: string = parsedUrl.queryParams?.error as string;

                if (error) {
                    Alert.alert(
                        t("oauth_existing_account"),
                        t("oauth_existing_account"),
                    );
                    return;
                }

                if (token) {
                    await SecureStore.setItemAsync("userToken", token);
                    router.replace("/onboarding");
                } else {
                    Alert.alert(t("error"), t("oauth_token_missing"));
                }
            }
        } catch (error) {
            console.error("Erreur OAuth:", error);
            Alert.alert(t("error"), t("login_error_connection"));
        }
    };

    const handleRegister: () => Promise<void> = async (): Promise<void> => {
        if (!email || !username || !password) {
            Alert.alert(t("error"), t("login_fill_fields"));
            return;
        }
        setIsLoading(true);

        try {
            const response = await apiClient.post("/users/signin", {
                email,
                username,
                password,
                favorite_band,
            });

            const {token} = response.data;

            if (token) {
                await SecureStore.setItemAsync("userToken", token);
                router.push("/onboarding");
            } else {
                Alert.alert(t("success"), t("register_success_message"));
                router.push("/login");
            }
        } catch (error: any) {
            const message =
                error.response?.data?.message ||
                t("register_error_create");
            Alert.alert(t("error"), message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.container, {backgroundColor: theme.background}]}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
                <View style={styles.header}>
                    <Image
                        source={require("@/assets/images/logo.png")}
                        style={styles.logoImage}
                    />
                    <Text style={[styles.title, {color: theme.text}]}>{t("register_title")}</Text>
                    <Text style={[styles.subtitle, {color: theme.subText}]}>{t("register_subtitle")}</Text>
                </View>

                <InputMobile
                    label={t("register_email_label")}
                    placeholder={t("placeholder_email")}
                    icon="mail-outline"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                />
                <InputMobile
                    label={t("register_username_label")}
                    placeholder={t("register_username_placeholder")}
                    icon="person-circle-outline"
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                />
                <InputMobile
                    label={t("register_password_label")}
                    placeholder={t("placeholder_password")}
                    icon="lock-closed-outline"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                />

                <View style={{zIndex: 1000}}>
                    {showSuggestions && suggestions.length > 0 && (
                        <View style={[styles.suggestionsContainer, {backgroundColor: theme.card}]}>
                            <ScrollView
                                style={{maxHeight: 200}}
                                keyboardShouldPersistTaps="handled"
                            >
                                {suggestions.map((item, index: number) => (
                                    <TouchableOpacity
                                        key={index}
                                        style={[styles.suggestionItem, {borderBottomColor: theme.separator}]}
                                        onPress={(): void => {
                                            setfavorite_band(item.name);
                                            setShowSuggestions(false);
                                        }}
                                    >
                                        <Text style={[styles.suggestionText, {color: theme.text}]}>{item.name}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    )}
                </View>

                <ButtonMobile
                    title={t("register_submit_btn")}
                    style={{marginTop: 10}}
                    onPress={handleRegister}
                    disabled={isLoading}
                    loading={isLoading}
                />

                <View style={styles.separator}>
                    <View style={[styles.line, {backgroundColor: theme.separator}]}/>
                    <Text style={[styles.sepText, {color: theme.subText}]}>{t("register_separator")}</Text>
                    <View style={[styles.line, {backgroundColor: theme.separator}]}/>
                </View>

                <View style={styles.socialRow}>
                    <ButtonMobile variant="social" onPress={(): Promise<void> => handleOAuth("google")}>
                        <Ionicons name="logo-google" size={24} color={theme.text}/>
                    </ButtonMobile>

                    <ButtonMobile
                        variant="social"
                        onPress={(): Promise<void> => handleOAuth("discord")}
                        style={{marginLeft: 12}}
                    >
                        <Ionicons name="logo-discord" size={24} color={theme.text}/>
                    </ButtonMobile>
                </View>

                <TouchableOpacity
                    onPress={(): void => router.push("/login")}
                    style={styles.footer}
                >
                    <Text style={[styles.footerText, {color: theme.subText}]}>
                        {t("register_already_account")} <Text style={styles.link}>{t("register_login_link")}</Text>
                    </Text>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scroll: {
        padding: 24,
        paddingTop: 32,
        paddingBottom: 48,
        width: '100%',
        maxWidth: 520,
        alignSelf: 'center',
    },
    logoImage: {
        width: 56,
        height: 56,
    },
    header: {
        alignItems: "center",
        marginBottom: 30,
    },
    logo: {
        width: 60,
        height: 60,
        borderRadius: 18,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 15,
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
    },
    subtitle: {
        fontSize: 14,
        marginTop: 5,
    },
    suggestionsContainer: {
        borderRadius: 8,
        marginTop: -10,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: brand.primary,
        overflow: "hidden",
    },
    suggestionItem: {
        padding: 15,
        borderBottomWidth: 1,
    },
    suggestionText: {
        fontSize: 14,
    },
    separator: {
        flexDirection: "row",
        alignItems: "center",
        marginVertical: 25,
    },
    line: {
        flex: 1,
        height: 1,
    },
    sepText: {
        marginHorizontal: 10,
        fontSize: 12,
    },
    socialRow: {
        flexDirection: "row",
    },
    footer: {
        marginTop: 30,
        alignItems: "center",
    },
    footerText: {},
    link: {
        color: brand.primary,
        fontWeight: "bold",
    },
});

export default RegisterMobile;
