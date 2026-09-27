import React, {useCallback, useRef, useState} from 'react';
import {View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Image} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useRouter, useFocusEffect} from 'expo-router';
import {useTranslation} from 'react-i18next';
import Header from '../components/Header';
import Skeleton from '../components/Skeleton';
import {AuthGuardWrapper} from '../components/AuthGuardMapper';
import {useTheme} from '../context/ThemeContext';
import apiClient from '../api/client';

export interface AppNotification {
    id: string; is_read: boolean; action: string; created_at: string; related_user_id?: string;
    related_user?: {username: string; pseudo?: string; profile_picture?: string; profile_image?: string};
}
type Filter = 'all' | 'unread' | 'updates';
interface Inbox {notifications: AppNotification[]; page: number; totalPages: number; total: number; unreadCount: number}
const emptyInbox: Inbox = {notifications: [], page: 1, totalPages: 1, total: 0, unreadCount: 0};
const actionKeys: Record<string, string> = {
    new_follow: 'action_started_following', like_added: 'action_like_added', comment_added: 'action_commented_review',
    recommendation: 'action_recommendation', new_message: 'action_new_message',
};
const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
    new_follow: 'person-add-outline', like_added: 'heart-outline', comment_added: 'chatbubble-outline',
    recommendation: 'sparkles-outline', new_message: 'mail-outline', badge_earned: 'ribbon-outline', review_added: 'star-outline',
};
export default function Notifications() {
    return <AuthGuardWrapper><InboxScreen/></AuthGuardWrapper>;
}
function InboxScreen() {
    const {theme} = useTheme();
    const {t, i18n} = useTranslation();
    const router = useRouter();
    const [filter, setFilter] = useState<Filter>('all');
    const [page, setPage] = useState(1);
    const [inbox, setInbox] = useState<Inbox>(emptyInbox);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [busy, setBusy] = useState<string | null>(null);
    const request = useRef<AbortController | null>(null);
    const mutation = useRef(false);
    const list = useRef<FlatList<AppNotification>>(null);
    const load = useCallback(async () => {
        request.current?.abort();
        const controller = new AbortController();
        request.current = controller;
        setLoading(true); setError(false);
        try {
            const response = await apiClient.get('/notifications/inbox', {params: {page, limit: 12, filter}, signal: controller.signal});
            if (!controller.signal.aborted) setInbox(response.data);
        } catch {
            if (!controller.signal.aborted) setError(true);
        } finally {
            if (!controller.signal.aborted) setLoading(false);
        }
    }, [page, filter]);
    useFocusEffect(useCallback(() => {load(); return () => request.current?.abort();}, [load]));
    const markRead = async (item?: AppNotification) => {
        if (mutation.current) return;
        mutation.current = true; setBusy(item?.id || 'all');
        try {
            if (!item) await apiClient.put('/notifications/read-all');
            else if (!item.is_read) await apiClient.put('/notifications/' + item.id, {is_read: true});
            // Refetch counts and let the API clamp the last unread page after removals.
            await load();
            if (item?.action === 'new_message') router.push('/conversations');
            else if (item?.related_user_id) router.push({pathname: '/profile', params: {id: item.related_user_id}});
        } catch {Alert.alert(t('error'), t('mobile_load_error'));}
        finally {mutation.current = false; setBusy(null);}
    };
    const changePage = (value: number) => {setPage(value); list.current?.scrollToOffset({offset: 0, animated: true});};
    return <View style={[styles.screen, {backgroundColor: theme.background}]}>
        <Header/>
        <FlatList ref={list} data={loading || error ? [] : inbox.notifications} keyExtractor={item => item.id}
            contentContainerStyle={styles.content} refreshing={loading} onRefresh={load}
            ListHeaderComponent={<>
                <Text style={[styles.eyebrow, {color: theme.accent}]}>{t('mobile_feed').toUpperCase()}</Text>
                <Text style={[styles.title, {color: theme.text}]}>{t('notifications_title')}</Text>
                <View style={styles.summary}>
                    <Text style={{color: theme.subText, flex: 1}}>{t(inbox.unreadCount === 1 ? 'unread_count_one' : 'unread_count_other', {count: inbox.unreadCount})}</Text>
                    <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('mobile_mark_all')} disabled={!inbox.unreadCount || !!busy || loading}
                        onPress={() => markRead()} style={[styles.iconButton, {backgroundColor: theme.accentSoft, opacity: inbox.unreadCount ? 1 : 0.4}]}>
                        <Ionicons name="checkmark-done-outline" size={22} color={theme.accent}/>
                    </TouchableOpacity>
                </View>
                <View style={[styles.filters, {backgroundColor: theme.surface}]}>
                    {(['all','unread','updates'] as const).map(value => <TouchableOpacity key={value} accessibilityRole="tab" accessibilityState={{selected: filter === value}}
                        disabled={!!busy} onPress={() => {setFilter(value); setPage(1);}} style={[styles.filter, filter === value && {backgroundColor: theme.card}]}>
                        <Text style={{fontSize: 12, fontWeight: '600', color: filter === value ? theme.accent : theme.subText}}>{t(value === 'all' ? 'tab_all' : value === 'unread' ? 'tab_unread' : 'mobile_updates')}</Text>
                    </TouchableOpacity>)}
                </View>
            </>}
            ListEmptyComponent={loading ? <View style={{gap: 12}}>{[0,1,2,3].map(i => <Skeleton key={i} style={{height: 88, borderRadius: 18}}/>)}</View>
                : <View style={[styles.empty, {borderColor: theme.border}]}>
                    <Ionicons name={error ? 'cloud-offline-outline' : 'notifications-off-outline'} size={36} color={theme.accent}/>
                    <Text style={{color: theme.subText, textAlign: 'center', lineHeight: 22}}>{t(error ? 'mobile_load_error' : 'no_notifications')}</Text>
                    {error && <TouchableOpacity accessibilityRole="button" onPress={load} style={styles.iconButton}><Text style={{color: theme.accent}}>{t('mobile_retry')}</Text></TouchableOpacity>}
                </View>}
            renderItem={({item}) => {
                const user = item.related_user;
                const name = user?.pseudo || user?.username || t('user_system');
                const photo = user?.profile_picture || user?.profile_image;
                return <TouchableOpacity accessibilityRole="button" disabled={!!busy} onPress={() => markRead(item)}
                    style={[styles.card, {backgroundColor: theme.card, borderColor: item.is_read ? theme.border : theme.accent}]}>
                    <View style={[styles.avatar, {backgroundColor: theme.accentSoft}]}>
                        {photo ? <Image source={{uri: photo.startsWith('data:') || /^https?:/.test(photo) ? photo : 'data:image/jpeg;base64,' + photo}} style={styles.photo}/> : <Ionicons name={icons[item.action] || 'notifications-outline'} size={22} color={theme.accent}/>}
                    </View>
                    <View style={{flex: 1, gap: 6}}>
                        <Text style={{color: theme.text, lineHeight: 21, fontSize: 14}}><Text style={{fontWeight: '700'}}>{name} </Text>{t(actionKeys[item.action] || 'notifications_title')}</Text>
                        <Text style={{color: theme.subText, fontSize: 11}}>{new Date(item.created_at).toLocaleString(i18n.language, {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'})}</Text>
                    </View>
                    {!item.is_read && <View style={[styles.dot, {backgroundColor: theme.accent}]}/>}
                </TouchableOpacity>;
            }}
            ListFooterComponent={!loading && !error && inbox.totalPages > 1 ? <View style={styles.pagination}>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('mobile_previous')} disabled={inbox.page <= 1 || !!busy} onPress={() => changePage(inbox.page - 1)}
                    style={[styles.iconButton, {backgroundColor: theme.card, opacity: inbox.page <= 1 ? 0.35 : 1}]}><Ionicons name="chevron-back" size={22} color={theme.text}/></TouchableOpacity>
                <Text style={{color: theme.subText, fontSize: 12}}>{t('mobile_page', {page: inbox.page, total: inbox.totalPages})}</Text>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('mobile_next')} disabled={inbox.page >= inbox.totalPages || !!busy} onPress={() => changePage(inbox.page + 1)}
                    style={[styles.iconButton, {backgroundColor: theme.card, opacity: inbox.page >= inbox.totalPages ? 0.35 : 1}]}><Ionicons name="chevron-forward" size={22} color={theme.text}/></TouchableOpacity>
            </View> : null}
        />
    </View>;
}
const styles = StyleSheet.create({
    screen: {flex: 1}, content: {padding: 20, paddingBottom: 32},
    eyebrow: {fontSize: 10, fontWeight: '700', letterSpacing: 1.6, marginBottom: 8},
    title: {fontSize: 30, fontWeight: '700', letterSpacing: -0.8},
    summary: {flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 16},
    iconButton: {minWidth: 44, minHeight: 44, padding: 10, borderRadius: 14, alignItems: 'center', justifyContent: 'center'},
    filters: {flexDirection: 'row', padding: 4, borderRadius: 14, marginBottom: 24},
    filter: {flex: 1, minHeight: 44, padding: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 10},
    card: {flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderWidth: 1, borderRadius: 18, marginBottom: 12},
    avatar: {width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center', overflow: 'hidden'},
    photo: {width: 44, height: 44}, dot: {width: 6, height: 6, borderRadius: 3},
    empty: {padding: 32, alignItems: 'center', gap: 18, borderRadius: 22, borderStyle: 'dashed', borderWidth: 1},
    pagination: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingTop: 12},
});
