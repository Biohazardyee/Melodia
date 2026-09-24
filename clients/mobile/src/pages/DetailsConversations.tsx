import React, {useState, useEffect, useRef} from "react";
import {
    View,
    Text,
    Image,
    StyleSheet,
    FlatList,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
    Alert,
} from "react-native";
import {Router, useLocalSearchParams, useRouter} from "expo-router";
import {Ionicons} from "@expo/vector-icons";
import apiClient from "../api/client";
import * as SecureStore from "expo-secure-store";
import {jwtDecode} from "jwt-decode";
import {useTranslation} from "react-i18next";
import {io, Socket} from "socket.io-client";
import {useTheme} from "../context/ThemeContext";

const SOCKET_URL: string | undefined = process.env.EXPO_PUBLIC_API_URL;

const DetailsConversations = () => {
    const {conversationId, userName, userProfilePic} = useLocalSearchParams();
    const router: Router = useRouter();
    const {t} = useTranslation();
    const {theme, isDarkMode} = useTheme();
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [avatarError, setAvatarError] = useState(false);
    const [conversation, setConversation] = useState<any>(null);
    const [sending, setSending] = useState(false);
    const [responding, setResponding] = useState(false);
    const incoming = conversation && conversation.status !== "ACCEPTED" && conversation.initiated_by !== currentUserId;
    const blocked = !conversation || (conversation.status !== "ACCEPTED" && (incoming || conversation.invitation_sent || conversation.status === "DECLINED"));
    const fetchConversation = async () => {
        const res = await apiClient.get(`/conversations/${conversationId}`);
        setConversation(res.data.conversation);
    };
    const respond = async (action: "accept" | "decline") => {
        if (responding) return;
        setResponding(true);
        try {
            await apiClient.patch(`/conversations/${conversationId}/request`, {action});
            await fetchConversation();
            if (action === "decline") router.back();
            else socketRef.current?.emit("mark_as_read", {conversation_id: conversationId});
        } catch { Alert.alert(t("dm_action_error")); }
        finally { setResponding(false); }
    };

    const flatListRef = useRef<FlatList>(null);
    const socketRef = useRef<Socket | null>(null);

    const profilePicUri = typeof userProfilePic === "string" && userProfilePic ? userProfilePic : null;
    const senderInitial = (userName as string)?.substring(0, 1).toUpperCase() || "?";

    const GAP_MINUTES = 30;

    const formatSeparatorDate = (dateStr: string): string => {
        const date = new Date(dateStr);
        const now = new Date();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const time = date.toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"});
        if (date.toDateString() === now.toDateString()) return `${t("today")}, ${time}`;
        if (date.toDateString() === yesterday.toDateString()) return `${t("yesterday")}, ${time}`;
        return `${date.toLocaleDateString()}, ${time}`;
    };

    const shouldShowSeparator = (olderDateStr: string, newerDateStr: string): boolean => {
        const gap = new Date(newerDateStr).getTime() - new Date(olderDateStr).getTime();
        return gap >= GAP_MINUTES * 60 * 1000;
    };

    useEffect((): void => {
        const getUserId: () => Promise<void> = async (): Promise<void> => {
            try {
                const token: string | null = await SecureStore.getItemAsync("userToken");
                if (token) {
                    const decoded: any = jwtDecode(token);
                    setCurrentUserId(decoded.id);
                }
            } catch (e) {
                console.error("Erreur token:", e);
            }
        };
        getUserId();
    }, []);

    const fetchMessages: () => Promise<void> = async (): Promise<void> => {
        if (!conversationId) return;
        try {
            const response = await apiClient.get(
                `/messages/conversation/${conversationId}`,
            );

            const formattedMessages = (response.data.messages || []).map(
                (m: any) => ({
                    ...m,
                    id: m.id || `msg-api-${Math.random()}-${Date.now()}`,
                }),
            );

            setMessages(formattedMessages);
        } catch (error) {
            console.error("Erreur fetch:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect((): void => {
        if (conversationId && currentUserId) {fetchMessages(); void fetchConversation().catch(() => Alert.alert(t("dm_action_error")));}
    }, [conversationId, currentUserId]);

    useEffect((): (() => void) | undefined => {
        if (!conversationId || !currentUserId) return;

        const setupSocket: () => Promise<void> = async (): Promise<void> => {
            const token: string | null = await SecureStore.getItemAsync("userToken");

            socketRef.current = io(SOCKET_URL!, {
                auth: {token},
                transports: ["websocket"],
                reconnectionAttempts: 5,
                timeout: 10000,
            });

            socketRef.current.on("connect", (): void => {
                socketRef.current?.emit("join_conversation", {conversation_id: conversationId});
            });

            if (socketRef.current.connected) {
                socketRef.current.emit("join_conversation", {conversation_id: conversationId});
            }

            socketRef.current.on("conversation_updated", () => {void fetchConversation().catch(() => {});});
            socketRef.current.on("receive_message", (message: any): void => {
                if (message.conversation_id === conversationId) {
                    void fetchConversation().catch(() => {});
                    socketRef.current?.emit("mark_as_read", {conversation_id: conversationId});
                    const safeMessage = {
                        ...message,
                        id: message.id || `msg-live-${Date.now()}-${Math.random()}`,
                    };

                    setMessages((prev: any[]): any[] => {
                        const exists = prev.find((m): boolean => m.id === safeMessage.id);
                        if (exists) return prev;
                        return [safeMessage, ...prev];
                    });
                }
            });
        };

        setupSocket();

        return (): void => {
            socketRef.current?.disconnect();
        };
    }, [conversationId, currentUserId]);

    const sendMessage: () => Promise<void> = async (): Promise<void> => {
        if (!newMessage.trim() || blocked || sending) return;

        if (!socketRef.current || !socketRef.current.connected) {
            console.warn("Socket non connecté, impossible d'envoyer le message");
            return;
        }

        setSending(true);
        socketRef.current.timeout(10000).emit("send_message", {
            conversation_id: conversationId,
            content: newMessage.trim(),
        }, (error: Error | null, result?: {ok: boolean}) => {
            setSending(false);
            if (error || !result?.ok) {Alert.alert(t("dm_send_error")); return;}
            setNewMessage("");
            void fetchConversation().catch(() => {});
        });
    };

    const renderMessage = ({item, index}: { item: any, index: number }) => {
        const isMine: boolean = item.sender_id === currentUserId;
        const olderMsg = messages[index + 1];
        const showSeparator: boolean =
            index === messages.length - 1 ||
            (!!olderMsg && shouldShowSeparator(olderMsg.created_at, item.created_at));
        return (
            <View>
                {showSeparator && (
                    <View style={styles.timeSeparator}>
                        <Text style={[styles.timeSeparatorText, {color: theme.subText, backgroundColor: theme.surface}]}>
                            {formatSeparatorDate(item.created_at)}
                        </Text>
                    </View>
                )}
            <View style={[styles.messageRow, isMine ? styles.myMessageRow : styles.theirMessageRow]}>
                {!isMine && (
                    <View style={[styles.senderAvatar, {backgroundColor: theme.surface}]}>
                        {profilePicUri && !avatarError ? (
                            <Image
                                source={{uri: profilePicUri}}
                                style={styles.senderAvatarImg}
                                onError={() => setAvatarError(true)}
                            />
                        ) : (
                            <Text style={styles.senderAvatarText}>{senderInitial}</Text>
                        )}
                    </View>
                )}
                <View
                    style={[
                        styles.bubble,
                        isMine ? styles.myBubble : [styles.theirBubble, {backgroundColor: theme.card, borderColor: theme.border}],
                    ]}
                >
                    <Text
                        style={[
                            styles.messageText,
                            isMine ? styles.myText : [styles.theirText, {color: theme.text}],
                        ]}
                    >
                        {item.content}
                    </Text>
                    <Text
                        style={[
                            styles.timeText,
                            isMine ? styles.myTime : [styles.theirTime, {color: theme.subText}],
                        ]}
                    >
                        {new Date(item.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                        })}
                    </Text>
                </View>
            </View>
            </View>
        );
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, {backgroundColor: theme.background}]}
            behavior="padding"
        >
            <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"}/>
            <View style={[styles.header, {backgroundColor: theme.background, borderColor: theme.border}]}>
                <TouchableOpacity
                    onPress={(): void => router.back()}
                    style={styles.iconButton}
                >
                    <Ionicons name="chevron-back" size={28} color="#4cc9f0"/>
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <View style={[styles.headerAvatar, {backgroundColor: theme.surface}]}>
                        {profilePicUri && !avatarError ? (
                            <Image
                                source={{uri: profilePicUri}}
                                style={styles.headerAvatarImg}
                                onError={() => setAvatarError(true)}
                            />
                        ) : (
                            <Text style={styles.avatarText}>{senderInitial}</Text>
                        )}
                    </View>
                    <Text style={[styles.headerTitle, {color: theme.text}]}>{userName}</Text>
                </View>
                <View style={{width: 40}}/>
            </View>

            {messages.length === 0 ? (
                <View style={styles.emptyState}>
                    <View style={[styles.emptyIconWrapper, {backgroundColor: theme.surface}]}>
                        <Ionicons name="chatbubble-ellipses-outline" size={32} color={theme.subText}/>
                    </View>
                    <Text style={[styles.emptyStateText, {color: theme.subText}]}>
                        {t("conv_no_messages")}
                    </Text>
                </View>
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={(item, index: number) => item.id || index.toString()}
                    renderItem={renderMessage}
                    inverted
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    style={{flex: 1}}
                />
            )}

            {conversation && conversation.status !== "ACCEPTED" && (
                <View style={{padding: 16, backgroundColor: theme.surface}}>
                    <Text style={{color: theme.text}}>{t(incoming ? "dm_incoming" : blocked ? "dm_waiting" : "dm_invite_hint")}</Text>
                    {incoming && <View style={{flexDirection: "row", gap: 24, marginTop: 12}}>
                        <TouchableOpacity disabled={responding} onPress={() => respond("accept")}><Text style={{color: theme.text}}>{t("dm_accept")}</Text></TouchableOpacity>
                        <TouchableOpacity disabled={responding} onPress={() => respond("decline")}><Text style={{color: theme.text}}>{t("dm_decline")}</Text></TouchableOpacity>
                    </View>}
                </View>
            )}
            <View style={[styles.inputWrapper, {backgroundColor: theme.background}]}>
                <View style={[styles.inputContainer, {backgroundColor: theme.surface, borderColor: theme.border}]}>
                    <TextInput
                        style={[styles.input, {color: theme.text}]}
                        placeholder={t("type_message_placeholder")}
                        placeholderTextColor={theme.placeholder}
                        value={newMessage}
                        editable={!blocked && !sending}
                        maxLength={1000}
                        onChangeText={setNewMessage}
                        multiline
                    />
                    <TouchableOpacity
                        style={[
                            styles.sendButton,
                            !newMessage.trim() && [styles.sendDisabled, {backgroundColor: theme.surface}],
                        ]}
                        onPress={sendMessage}
                        disabled={!newMessage.trim() || blocked || sending}
                    >
                        <Ionicons name="send" size={18} color="#000"/>
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {flex: 1},

    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 20,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        shadowColor: "#000",
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 10,
    },
    headerCenter: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },
    headerAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 10,
        overflow: "hidden",
    },
    headerAvatarImg: {
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    avatarText: {color: "#fff", fontWeight: "bold"},
    headerTitle: {
        fontSize: 18,
        fontWeight: "800",
        letterSpacing: 0.5,
    },
    iconButton: {padding: 5},

    listContent: {paddingHorizontal: 16, paddingVertical: 20},
    messageRow: {flexDirection: "row", width: "100%", marginVertical: 6, alignItems: "flex-end"},
    myMessageRow: {justifyContent: "flex-end"},
    theirMessageRow: {justifyContent: "flex-start"},

    senderAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 8,
        overflow: "hidden",
        flexShrink: 0,
    },
    senderAvatarImg: {
        width: 32,
        height: 32,
        borderRadius: 16,
    },
    senderAvatarText: {
        color: "#fff",
        fontWeight: "bold",
        fontSize: 13,
    },

    bubble: {
        maxWidth: "75%",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 20,
    },
    myBubble: {
        backgroundColor: "#4cc9f0",
        borderBottomRightRadius: 4,
        shadowColor: "#4cc9f0",
        shadowOpacity: 0.2,
        shadowRadius: 10,
    },
    theirBubble: {
        borderBottomLeftRadius: 4,
        borderWidth: 1,
    },
    messageText: {fontSize: 16, lineHeight: 22},
    myText: {color: "#000", fontWeight: "500"},
    theirText: {},

    timeText: {fontSize: 10, marginTop: 4, opacity: 0.7},
    myTime: {color: "rgba(0,0,0,0.6)", alignSelf: "flex-end"},
    theirTime: {alignSelf: "flex-start"},

    inputWrapper: {padding: 15},
    inputContainer: {
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 25,
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderWidth: 1,
    },
    input: {flex: 1, fontSize: 16, paddingHorizontal: 10},
    sendButton: {
        backgroundColor: "#4cc9f0",
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
    },
    sendDisabled: {opacity: 0.5},

    emptyState: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        paddingHorizontal: 40,
    },
    emptyIconWrapper: {
        width: 72,
        height: 72,
        borderRadius: 36,
        justifyContent: "center",
        alignItems: "center",
    },
    emptyStateText: {
        fontSize: 14,
        textAlign: "center",
        lineHeight: 20,
    },
    timeSeparator: {
        alignItems: "center",
        marginVertical: 12,
    },
    timeSeparatorText: {
        fontSize: 11,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        overflow: "hidden",
        textAlign: "center",
    },
});

export default DetailsConversations;
