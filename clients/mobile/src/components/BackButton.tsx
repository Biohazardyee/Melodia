import React from 'react';
import {TouchableOpacity, StyleSheet, ViewStyle} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useRouter, type Href} from 'expo-router';
import {useTheme} from '../context/ThemeContext';
import {useTranslation} from 'react-i18next';

type BackButtonProps = {
    style?: ViewStyle;
    fallback?: Href;
}

const BackButton = ({style, fallback = '/'}: BackButtonProps) => {
    const router = useRouter();
    const {theme} = useTheme();
    const {t} = useTranslation();

    return (
        <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t('back')}
            style={[styles.button, {backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1}, style]}
            onPress={(): void => router.canGoBack() ? router.back() : router.replace(fallback)}
            activeOpacity={0.7}
        >
            <Ionicons name="chevron-back" size={22} color={theme.text}/>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        width: 45,
        height: 45,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 14,
    },
});

export default BackButton;
