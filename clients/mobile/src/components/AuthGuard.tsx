import {brand} from '../design/tokens';
import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {Ionicons} from "@expo/vector-icons";
import {useRouter} from 'expo-router';
import {ButtonMobile} from '@/src/components/ButtonMobile';
import Header from "@/src/components/Header";
import {useTranslation} from "react-i18next";
import {useTheme} from "@/src/context/ThemeContext";

export default function AutGuard() {
    const router = useRouter();
    const {t} = useTranslation();
    const {theme} = useTheme();

    return (
        <View style={[styles.container, {backgroundColor: theme.background}]}>
            <Header/>
            <View style={styles.content}>
                <LinearGradient
                    colors={[brand.primary, '#ec4899']}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 1}}
                    style={styles.icon}
                >
                    <Ionicons name="lock-closed" size={40} color="white"/>
                </LinearGradient>

                <Text style={[styles.title, {color: theme.text}]}>{t("exclusive_content")}</Text>
                <Text style={[styles.text, {color: theme.subText}]}>
                    {t("join_melodia")}
                </Text>

                <View style={styles.buttons}>
                    <ButtonMobile
                        title={t("login")}
                        onPress={(): void => router.push('/login')}
                    />

                    <View style={styles.spacer}/>

                    <TouchableOpacity
                        style={styles.registerButton}
                        onPress={(): void => router.push('/register')}
                    >
                        <LinearGradient
                            colors={[brand.primary, '#ec4899']}
                            start={{x: 0, y: 0}}
                            end={{x: 1, y: 1}}
                            style={styles.outlineGradient}
                        >
                            <View style={[styles.innerButton, {backgroundColor: theme.background}]}>
                                <Text style={[styles.registerText, {color: theme.text}]}>{t("create_account")}</Text>
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity onPress={(): void => router.back()} style={styles.backButton}>
                    <Text style={[styles.backText, {color: theme.subText}]}>{t("later")}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 30,
    },
    icon: {
        width: 80,
        height: 80,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 25,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    text: {
        fontSize: 16,
        textAlign: 'center',
        marginTop: 15,
        marginBottom: 40,
        lineHeight: 24,
    },
    buttons: {
        width: '100%',
    },
    spacer: {
        height: 15,
    },
    registerButton: {
        height: 55,
        borderRadius: 12,
        overflow: 'hidden',
    },
    outlineGradient: {
        flex: 1,
        padding: 2,
        borderRadius: 12,
    },
    innerButton: {
        flex: 1,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    registerText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    backButton: {
        marginTop: 30,
    },
    backText: {
        fontSize: 14,
        textDecorationLine: 'underline',
    },
});
