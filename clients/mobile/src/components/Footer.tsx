import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Keyboard, Platform} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useRouter, usePathname} from 'expo-router';
import {useTranslation} from 'react-i18next';
import {useTheme} from '../context/ThemeContext';
import {mobileTabs, hideMobileTabs, activeMobileTab} from '../design/navigation';


export default function Footer() {
    const router = useRouter();
    const pathname = usePathname();
    const {theme} = useTheme();
    const {t} = useTranslation();
    const [keyboardOpen, setKeyboardOpen] = useState(false);
    useEffect(() => {
        const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboardOpen(true));
        const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardOpen(false));
        return () => { show.remove(); hide.remove(); };
    }, []);
    if (hideMobileTabs(pathname, keyboardOpen)) return null;
    const active = activeMobileTab(pathname);
    return (
        <View style={[styles.bar, {backgroundColor: theme.card, borderTopColor: theme.border}]}>
            {mobileTabs.map(tab => {
                const selected = active === tab.href;
                return <TouchableOpacity key={tab.href} accessibilityRole="tab" accessibilityLabel={t(tab.label)} accessibilityState={{selected}}
                    onPress={() => { if (!selected) router.navigate(tab.href); }} style={styles.tab} activeOpacity={0.7}>
                    <View style={[styles.icon, selected && {backgroundColor: theme.accentSoft}]}>
                        <Ionicons name={tab.icon} size={22} color={selected ? theme.accent : theme.subText}/>
                    </View>
                    <Text numberOfLines={1} style={[styles.label, {color: selected ? theme.accent : theme.subText}]}>{t(tab.label)}</Text>
                </TouchableOpacity>;
            })}
        </View>
    );
}
const styles = StyleSheet.create({
    bar: {flexDirection: 'row', borderTopWidth: 1, paddingHorizontal: 6, paddingVertical: 8},
    tab: {flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 52, gap: 4},
    icon: {width: 48, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center'},
    label: {fontSize: 10, fontWeight: '600'},
});
