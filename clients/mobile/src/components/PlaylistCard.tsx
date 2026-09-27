import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useTheme} from '../context/ThemeContext';
import {useTranslation} from 'react-i18next';
import CoverImage from './CoverImage';


type PlaylistCardProps = {
    title: string;
    count: number;
    image: string;
    onPress: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

const PlaylistCard: React.FC<PlaylistCardProps> = ({
    title,
    count,
    image,
    onPress,
    onEdit,
    onDelete,
}: PlaylistCardProps) => {
    const {theme} = useTheme();
    const {t} = useTranslation();

    return (
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={title} style={[styles.card, {backgroundColor: theme.card, borderColor: theme.border}]} onPress={onPress}>
            <CoverImage uri={image} style={styles.cardImage}/>

            <View style={styles.footerCard}>
                <View style={styles.textContainer}>
                    <Text style={[styles.cardTitle, {color: theme.text}]} numberOfLines={1}>
                        {title}
                    </Text>
                    <Text style={[styles.cardCount, {color: theme.subText}]}>
                        {t('mobile_album_count', {count})}
                    </Text>
                </View>

                <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={t('playlist_options_title')}
                    onPress={event => {event.stopPropagation(); onEdit();}}
                    style={styles.moreButton}
                >
                    <Ionicons name="ellipsis-vertical" size={20} color={theme.subText}/>
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        flex: 1,
        padding: 8,
        borderRadius: 18,
        borderWidth: 1,
    },
    cardImage: {
        width: '100%',
        aspectRatio: 1,
        borderRadius: 12,
    },
    footerCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    textContainer: {
        flex: 1,
    },
    cardTitle: {
        fontWeight: 'bold',
        fontSize: 14,
        marginTop: 10,
    },
    cardCount: {
        fontSize: 12,
        marginTop: 2,
    },
    moreButton: {
        minWidth: 44,
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default PlaylistCard;
