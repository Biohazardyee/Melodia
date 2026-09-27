import {brand} from '../design/tokens';
import {useRouter} from "expo-router";
import * as WebBrowser from "expo-web-browser";
import * as SecureStore from "expo-secure-store";
import React, {useState} from "react";
import {jwtDecode} from "jwt-decode";
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
import {ButtonMobile} from "../components/ButtonMobile";
import {InputMobile} from "../components/InputMobile";
import * as AuthSession from "expo-auth-session";
import Ionicons from "react-native-vector-icons/Ionicons";
import apiClient from "../api/client";
import {WebBrowserAuthSessionResult} from "expo-web-browser";
import {useTranslation} from "react-i18next";
import {useTheme} from "../context/ThemeContext";

const LoginMobile: React.FC = () => {
    const router = useRouter();
    const {t} = useTranslation();
    const {theme} = useTheme();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleOAuthLogin: (provider: "discord" | "google") => Promise<void> = async (provider: "google" | "discord"): Promise<void> => {
        try {
            const redirectUri: string = AuthSession.makeRedirectUri({
                scheme: "projetsupcontentmobile",
                preferLocalhost: false,
            });

            const authUrl = `${process.env.EXPO_PUBLIC_API_URL}/api/oauth/auth/${provider}?platform=mobile&redirect_uri=${encodeURIComponent(redirectUri)}`;

            const result: WebBrowserAuthSessionResult = await WebBrowser.openAuthSessionAsync(
                authUrl,
                redirectUri,
            );

            if (result.type === "success" && result.url) {
                const urlParts: string[] = result.url.split("token=");
                if (urlParts.length > 1) {
                    const token: string = urlParts[1].split("&")[0];

                    await SecureStore.setItemAsync("userToken", token);
                    const decoded: any = jwtDecode(token);
                    const userId = decoded.id;

                    if (userId) {
                        await SecureStore.setItemAsync("userId", String(userId));
                    }

                    router.replace("/");
                }
            }
        } catch (error) {
            console.error("Erreur OAuth Login:", error);
            Alert.alert(t("error"), t("login_error_connection"));
        }
    };

    const handleLogin: () => Promise<void> = async (): Promise<void> => {
        if (!email || !password) {
            Alert.alert(t("error"), t("login_fill_fields"));
            return;
        }

        setIsLoading(true);

        try {
            const response = await apiClient.post("/users/login", {
                email,
                password,
            });

            const token = response.data.token;
            await SecureStore.setItemAsync("userToken", token);

            try {
                const decoded: any = jwtDecode(token);
                const userId = decoded.id;

                if (userId) {
                    await SecureStore.setItemAsync("userId", String(userId));
                }
            } catch (decodeError) {
                console.error("Erreur décodage token:", decodeError);
            }
            Alert.alert(t("success"), t("login_success_message"));
            router.replace("/");
        } catch (error: any) {
            const message =
                error.response?.data?.message || t("login_error_connection");
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
                    <Text style={[styles.title, {color: theme.text}]}>{t("login_welcome")}</Text>
                </View>

                <InputMobile
                    label={t("login_email_label")}
                    placeholder={t("placeholder_email")}
                    icon="mail-outline"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                />
                <InputMobile
                    label={t("login_password_label")}
                    placeholder={t("placeholder_password")}
                    icon="lock-closed-outline"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                />

                <Text style={styles.forgot}>{t("login_forgot_password")}</Text>
                <ButtonMobile
                    title={isLoading ? t("login_loading") : t("login_submit_btn")}
                    onPress={handleLogin}
                    disabled={isLoading}
                    loading={isLoading}
                />

                <View style={styles.separator}>
                    <View style={[styles.line, {backgroundColor: theme.separator}]}/>
                    <Text style={[styles.sepText, {color: theme.subText}]}>{t("login_separator")}</Text>
                    <View style={[styles.line, {backgroundColor: theme.separator}]}/>
                </View>

                <View style={styles.socialMedia}>
                    <ButtonMobile
                        variant="social"
                        onPress={(): Promise<void> => handleOAuthLogin("google")}
                    >
                        <Ionicons name="logo-google" size={24} color={theme.text}/>
                    </ButtonMobile>

                    <ButtonMobile
                        variant="social"
                        onPress={(): Promise<void> => handleOAuthLogin("discord")}
                        style={{marginLeft: 12}}
                    >
                        <Ionicons name="logo-discord" size={24} color={theme.text}/>
                    </ButtonMobile>
                </View>

                <TouchableOpacity
                    onPress={(): void => router.push("/register")}
                    style={styles.footer}
                >
                    <Text style={[styles.footerText, {color: theme.subText}]}>
                        {t("login_no_account")} <Text style={styles.link}>{t("login_register_link")}</Text>
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
        paddingTop: 36,
        paddingBottom: 48,
        width: '100%',
        maxWidth: 520,
        alignSelf: 'center',
    },
    header: {
        alignItems: "center",
    },
    logoImage: {
        width: 56,
        height: 56,
        marginBottom: 24,
    },
    title: {
        fontSize: 28,
        marginBottom: 20,
        fontWeight: "bold",
        textAlign: "center",
    },
    forgot: {
        color: brand.primary,
        textAlign: "right",
        marginBottom: 25,
    },
    footer: {
        alignItems: "center",
        marginTop: 20,
    },
    footerText: {
        marginBottom: 20,
    },
    link: {
        color: brand.primary,
        fontWeight: "bold",
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
    socialMedia: {
        flexDirection: "row",
    },
});

export default LoginMobile;
