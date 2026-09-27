import React, {useState} from 'react';
import {Image, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useRouter} from 'expo-router';
import {useTranslation} from 'react-i18next';
import {useTheme} from '../context/ThemeContext';
import CoverImage from './CoverImage';

export interface CommunityItem {
    id: string; type: string; user_id?: string; user_name?: string; user_image?: string;
    album?: string; artist?: string; cover?: string; api_id?: string; media_id?: string;
    review_id?: string; title?: string; content?: string; rating?: number;
    userReviewRating?: number; globalRating?: number; hasReviewed?: boolean;
    isLiked?: boolean; likes_count?: number; comments_count?: number;
}

export default function CommunityCard({item, dateLabel, onLike}: {
    item: CommunityItem; dateLabel: string; onLike: (id: string) => void;
}) {
    const {theme} = useTheme();
    const {t} = useTranslation();
    const router = useRouter();
    const [expanded, setExpanded] = useState(false);
    const [avatarFailed, setAvatarFailed] = useState(false);
    const recommendation = item.type === 'recommendation';
    const reviewId = item.review_id;
    const ratingValue = Number(recommendation ? (item.userReviewRating ?? item.globalRating) : item.rating);
    const rating = Number.isFinite(ratingValue) ? Math.max(0, Math.min(5, ratingValue)) : 0;
    const openAlbum = () => router.push({pathname: '/albumdetails', params: {
        id: item.api_id || item.media_id || '', artist: item.artist || '',
        album: item.album || '', cover: typeof item.cover === 'string' ? item.cover : '',
    }});

    return <View style={[styles.card, {backgroundColor: theme.card, borderColor: theme.border}]}>
        <TouchableOpacity style={styles.author} disabled={!item.user_id || recommendation}
            accessibilityRole="button" accessibilityLabel={item.user_name}
            onPress={() => router.push({pathname: '/profile', params: {id: item.user_id!}})}>
            {item.user_image && !avatarFailed ? <Image source={{uri: item.user_image}} style={styles.avatar} onError={() => setAvatarFailed(true)}/> :
                <View style={[styles.avatar, {backgroundColor: theme.accentSoft}]}>
                    {recommendation ? <Ionicons name="sparkles-outline" color={theme.accent} size={21}/> :
                        <Text style={{color: theme.accent, fontWeight: '700'}}>{(item.user_name || '?').slice(0, 2).toUpperCase()}</Text>}
                </View>}
            <View style={styles.grow}>
                <Text numberOfLines={1} style={[styles.authorName, {color: theme.text}]}>{item.user_name || t('recommendation_label')}</Text>
                <Text style={[styles.caption, {color: theme.subText}]}>
                    {recommendation ? t('feed_ai_suggestion') : item.type === 'like' ? t('mobile_liked_review') : t('action_wrote_review')}
                </Text>
            </View>
            {!recommendation && <Text style={[styles.date, {color: theme.subText}]}>{dateLabel}</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={[styles.album, {backgroundColor: theme.surface}]} onPress={openAlbum}
            accessibilityRole="button" accessibilityLabel={[item.album, item.artist].filter(Boolean).join(' — ')}>
            <CoverImage uri={typeof item.cover === 'string' ? item.cover : undefined} style={styles.cover}/>
            <View style={styles.grow}>
                <Text numberOfLines={2} style={[styles.albumTitle, {color: theme.text}]}>{item.album || t('text_unknown_album')}</Text>
                <Text numberOfLines={1} style={[styles.artist, {color: theme.subText}]}>{item.artist || t('text_unknown_artist')}</Text>
                <View style={styles.rating} accessibilityLabel={`${t('rating')} ${rating}/5`}>
                    <Ionicons name="star" size={15} color={theme.accent}/>
                    <Text style={[styles.score, {color: theme.accent}]}>{rating.toLocaleString(undefined, {maximumFractionDigits: 1})}<Text style={{color: theme.subText, fontWeight: '400'}}> / 5</Text></Text>
                    {recommendation && item.hasReviewed && <Text style={[styles.caption, {color: theme.subText}]}>{t('badge_your_rating')}</Text>}
                </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.subText}/>
        </TouchableOpacity>

        {!recommendation && (item.title || item.content) ? <View style={styles.body}>
            {!!item.title && <Text style={[styles.reviewTitle, {color: theme.text}]}>{item.title}</Text>}
            {!!item.content && <>
                <Text numberOfLines={expanded ? undefined : 4} style={[styles.content, {color: theme.text}]}>{item.content}</Text>
                <TouchableOpacity onPress={() => setExpanded(value => !value)} style={styles.readMore}
                    accessibilityRole="button" accessibilityState={{expanded}}>
                    <Text style={{color: theme.accent, fontWeight: '600'}}>{t(expanded ? 'mobile_read_less' : 'mobile_read_more')}</Text>
                    <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={15} color={theme.accent}/>
                </TouchableOpacity>
            </>}
        </View> : null}

        <View style={[styles.footer, {borderTopColor: theme.border}]}>
            {!recommendation ? <>
                {item.type === 'review' && <TouchableOpacity style={[styles.action, {backgroundColor: item.isLiked ? theme.accentSoft : theme.surface}]}
                    accessibilityRole="button" accessibilityLabel={t('like_singular')} accessibilityState={{selected: !!item.isLiked}}
                    onPress={() => onLike(item.id)}>
                    <Ionicons name={item.isLiked ? 'heart' : 'heart-outline'} size={20} color={item.isLiked ? theme.accent : theme.subText}/>
                    <Text style={[styles.count, {color: item.isLiked ? theme.accent : theme.subText}]}>{item.likes_count || 0}</Text>
                </TouchableOpacity>}
                {!!reviewId && <TouchableOpacity style={styles.action} accessibilityRole="button" accessibilityLabel={t('tab_comments')}
                    onPress={() => router.push({pathname: '/review/[id]/comments', params: {id: reviewId}})}>
                    <Ionicons name="chatbubble-outline" size={19} color={theme.subText}/>
                    <Text style={[styles.count, {color: theme.subText}]}>{item.comments_count || 0}</Text>
                    <Text style={[styles.caption, {color: theme.subText}]}>{t('tab_comments')}</Text>
                </TouchableOpacity>}
            </> : <TouchableOpacity style={styles.action} onPress={openAlbum} accessibilityRole="button">
                <Ionicons name={item.hasReviewed ? 'checkmark-circle-outline' : 'create-outline'} color={theme.accent} size={19}/>
                <Text style={{color: theme.accent, fontWeight: '600'}}>{t(item.hasReviewed ? 'already_reviewed' : 'write_review')}</Text>
            </TouchableOpacity>}
        </View>
    </View>;
}

const styles = StyleSheet.create({
    card: {marginHorizontal: 16, marginBottom: 18, padding: 16, borderRadius: 24, borderWidth: 1},
    author: {flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16, minHeight: 44},
    avatar: {width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center'},
    grow: {flex: 1, minWidth: 0}, authorName: {fontSize: 14, fontWeight: '700'},
    caption: {fontSize: 12, lineHeight: 18}, date: {fontSize: 11, maxWidth: 72, textAlign: 'right'},
    album: {flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 18, gap: 12},
    cover: {width: 72, height: 72, borderRadius: 12}, albumTitle: {fontSize: 16, fontWeight: '700', lineHeight: 21},
    artist: {fontSize: 13, marginTop: 3}, rating: {flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5, marginTop: 8},
    score: {fontSize: 13, fontWeight: '700'}, body: {paddingTop: 18},
    reviewTitle: {fontSize: 19, lineHeight: 26, fontWeight: '700', marginBottom: 8},
    content: {fontSize: 15, lineHeight: 24}, readMore: {flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 44, alignSelf: 'flex-start'},
    footer: {flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, paddingTop: 12, marginTop: 12, borderTopWidth: StyleSheet.hairlineWidth},
    action: {flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, minHeight: 44, borderRadius: 14},
    count: {fontSize: 13, fontWeight: '600'},
});
