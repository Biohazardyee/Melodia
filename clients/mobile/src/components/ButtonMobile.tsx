import {brand} from '../design/tokens';
import React from 'react';
import {StyleSheet, Text, TouchableOpacity, ViewStyle, StyleProp, ActivityIndicator} from 'react-native';
import {useTheme} from '../context/ThemeContext';

interface ButtonProps {
    title?: string;
    children?: React.ReactNode;
    variant?: 'primary' | 'social';
    onPress?: () => void;
    style?: StyleProp<ViewStyle>;
    disabled?: boolean;
    loading?: boolean;
}

export const ButtonMobile: React.FC<ButtonProps> = ({
    title,
    children,
    variant = 'primary',
    onPress,
    style,
    disabled,
    loading,
}: ButtonProps) => {
    const {theme} = useTheme();
    return (
        <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={{disabled: !!disabled || !!loading, busy: !!loading}}
            activeOpacity={0.8}
            style={[
                styles.base,
                variant === 'primary'
                    ? [styles.primary, {backgroundColor: theme.action}]
                    : [styles.social, {backgroundColor: theme.surface, borderColor: theme.border}],
                style,
                (disabled || loading) && {opacity: 0.5},
            ]}
            onPress={onPress}
            disabled={disabled || loading}
        >
            {loading ? <ActivityIndicator color={variant === 'primary' ? '#fff' : theme.accent}/> : title ? <Text style={[styles.text, {color: variant === 'primary' ? '#fff' : theme.text}]}>{title}</Text> : children}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    base: {borderRadius: 14, justifyContent: 'center', alignItems: 'center', minHeight: 52, paddingVertical: 14, paddingHorizontal: 16},
    primary: {backgroundColor: brand.primary, width: '100%'},
    social: {flex: 1, borderWidth: 1},
    text: {color: '#FFF', fontSize: 16, fontWeight: '600', textAlign: 'center'},
});
