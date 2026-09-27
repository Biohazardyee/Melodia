import {brand} from '../design/tokens';
import React, {useState, useEffect} from "react";
import {View, Text, Image, TouchableOpacity, StyleSheet} from "react-native";
import {useTheme} from "../context/ThemeContext";

const ChatItem = ({
    id,
    name,
    msg,
    time,
    unread,
    initials,
    isSystem,
    onPress,
    image,
}: any) => {
    const {theme} = useTheme();
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        setHasError(false);
    }, [image]);

    return (
        <TouchableOpacity
            activeOpacity={0.8}
            style={[
                styles.chatItem,
                {backgroundColor: theme.card, borderColor: theme.border},
                unread > 0 && [styles.chatItemUnread, {backgroundColor: theme.surface}],
            ]}
            onPress={onPress}
        >
            <View
                style={[
                    styles.avatarCircle,
                    isSystem ? styles.avatarSystem : [styles.avatarUser, {backgroundColor: theme.surface}],
                    unread > 0 && styles.avatarUnreadBorder,
                ]}
            >
                {image && !hasError ? (
                    <Image
                        source={{uri: image}}
                        style={styles.avatarImage}
                        onError={() => setHasError(true)}
                    />
                ) : (
                    <Text style={[styles.avatarText, {color: theme.accent}]}>{initials}</Text>
                )}
            </View>

            <View style={styles.chatInfo}>
                <View style={styles.chatHeader}>
                    <Text style={[styles.userName, {color: theme.text}]} numberOfLines={1}>
                        {name}
                    </Text>
                    <Text style={[styles.timeText, {color: theme.subText}]}>{time}</Text>
                </View>

                <View style={styles.chatFooter}>
                    <Text
                        style={[
                            styles.lastMsg,
                            {color: theme.subText},
                            unread > 0 && [styles.lastMsgUnread, {color: theme.text}],
                        ]}
                        numberOfLines={1}
                    >
                        {msg}
                    </Text>

                    {unread > 0 && (
                        <View style={styles.unreadBadge}>
                            <Text style={styles.unreadText}>{unread}</Text>
                        </View>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    chatItem: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        borderRadius: 24,
        borderWidth: 1,
    },
    chatItemUnread: {
        borderColor: "rgba(76, 201, 240, 0.3)",
    },
    avatarCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 15,
        position: "relative",
        overflow: "hidden",
    },
    avatarImage: {
        width: 60,
        height: 60,
        borderRadius: 30,
    },
    avatarUser: {},
    avatarSystem: {
        backgroundColor: "#f72585",
    },
    avatarUnreadBorder: {
        borderWidth: 2,
        borderColor: brand.primary,
    },
    avatarText: {
        color: "#fff",
        fontWeight: "800",
        fontSize: 18,
    },
    onlineStatus: {
        position: "absolute",
        bottom: 2,
        right: 2,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: "#4ade80",
        borderWidth: 2,
    },
    chatInfo: {flex: 1},
    chatHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 6,
    },
    userName: {fontWeight: "700", fontSize: 17},
    timeText: {fontSize: 12, fontWeight: "500"},
    chatFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    lastMsg: {fontSize: 14, flex: 1, marginRight: 10},
    lastMsgUnread: {fontWeight: "600"},
    unreadBadge: {
        backgroundColor: brand.primary,
        minWidth: 22,
        height: 22,
        borderRadius: 11,
        justifyContent: "center",
        alignItems: "center",
    },
    unreadText: {color: "#fff", fontSize: 11, fontWeight: "700"},
});

export default ChatItem;
