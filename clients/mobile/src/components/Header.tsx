import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet, Image} from 'react-native';
import {Ionicons} from "@expo/vector-icons";
import {useRouter} from "expo-router";
import {useTheme} from '../context/ThemeContext';
import {useTranslation} from 'react-i18next';


const Header: React.FC = () => {

    const router = useRouter();
    const {theme} = useTheme();
    const {t} = useTranslation();
    return (
        <View style={[styles.header, {backgroundColor: theme.background}]}>
            <View style={styles.content}>
                <Image
                    source={require('@/assets/images/logo.png')}
                    style={styles.logoImage}
                />

                <Text style={[styles.name, {color: theme.text}]}>melodia.</Text>
            </View>

            <View style={styles.buttons}>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('notifications_title')} style={[styles.action, {backgroundColor: theme.card, borderColor: theme.border}]} onPress={(): void => router.push('/notifications')}>
                    <Ionicons
                        name="notifications-outline"
                        size={21}
                        color={theme.text}
                    />
                </TouchableOpacity>

                <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('mobile_messages')} style={[styles.action, {backgroundColor: theme.card, borderColor: theme.border}]} onPress={(): void => router.push('/conversations')}>
                    <Ionicons
                        name="paper-plane-outline"
                        size={21}
                        color={theme.text}
                    />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 15,
    },
    logoImage: {
        width: 32,
        height: 32,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    name: {
        fontSize: 21,
        fontWeight: 'bold',
        letterSpacing: -0.8,
    },
    buttons: {
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center',
    },
    action: {width: 44, height: 44, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center'},
});

export default Header;
