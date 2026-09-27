import React from "react";
import {View, Text, StyleSheet, TouchableOpacity} from "react-native";
import {Ionicons} from "@expo/vector-icons";
import {useRouter} from "expo-router";
import {useTheme} from '../context/ThemeContext';
import CoverImage from './CoverImage';

type AlbumCardProps = {
    id: string | number;
    title: string;
    artist: string;
    rating: string;
    genre?: string;
    cover: string;
};

const AlbumCard: React.FC<AlbumCardProps> = ({
                                                 id,
                                                 title,
                                                 artist,
                                                 rating,
                                                 cover,
                                             }: AlbumCardProps) => {
    const router = useRouter();
    const {theme} = useTheme();

    const numericRating: number =
        typeof rating === "string" ? parseFloat(rating) : rating;

    return (
        <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`${title}, ${artist}`}
            style={[styles.albumCard, {backgroundColor: theme.card, borderColor: theme.border}]}
            onPress={(): void =>
                router.push({
                    pathname: "/albumdetails",
                    params: {id, artist, album: title, cover},
                })
            }
        >
            <View>
                <CoverImage uri={cover} style={styles.albumCover}/>
            </View>

            <View style={styles.albumInfo}>
                <Text style={[styles.albumTitle, {color: theme.text}]} numberOfLines={1}>
                    {title}
                </Text>
                <Text style={[styles.artistName, {color: theme.subText}]} numberOfLines={1}>
                    {artist}
                </Text>

                <View style={styles.albumFooter}>
                    <View style={styles.starsRow}>
                        {[...Array(5)].map((_, i: number) => (
                            <Ionicons
                                key={i}
                                name="star"
                                size={12}
                                color={
                                    i < Math.floor(numericRating || 0) ? theme.accent : theme.separator
                                }
                            />
                        ))}
                        {numericRating > 0 && (
                            <Text style={[styles.ratingText, {color: theme.accent}]}>{numericRating.toFixed(1)}</Text>
                        )}
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    albumCard: {
        width: "100%",
        borderRadius: 18,
        padding: 8,
        marginBottom: 20,
        overflow: "hidden",
        borderWidth: 1,
    },
    albumCover: {
        width: "100%",
        aspectRatio: 1,
        borderRadius: 12,
    },
    genreBadge: {
        position: "absolute",
        top: 10,
        right: 10,
        backgroundColor: "#ec4899",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    genreText: {
        color: "white",
        fontSize: 10,
        fontWeight: "bold",
    },
    albumInfo: {
        paddingHorizontal: 4,
        paddingVertical: 12,
    },
    albumTitle: {
        fontWeight: "bold",
        fontSize: 15,
    },
    artistName: {
        fontSize: 14,
    },
    albumFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 8,
    },
    starsRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 2,
        marginTop: 5,
    },
    ratingText: {
        color: "#ec4899",
        fontSize: 11,
        fontWeight: "bold",
        marginLeft: 4,
    },
    ratingRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
    },
});

export default AlbumCard;
