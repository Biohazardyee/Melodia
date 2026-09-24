import React, {useEffect, useState, useCallback, useRef} from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    RefreshControl,
    ActivityIndicator,
    TouchableOpacity,
} from "react-native";
import {useNavigation, useFocusEffect} from "@react-navigation/native";
import Header from "@/src/components/Header";
import * as SecureStore from "expo-secure-store";
import {jwtDecode} from "jwt-decode";
import apiClient from "../api/client";
import {io, Socket} from "socket.io-client";
import {useTranslation} from "react-i18next";
import {useTheme} from "../context/ThemeContext";

import ChatItem from "../components/ChatItem";

const SOCKET_URL: string = process.env.EXPO_PUBLIC_API_URL || "";

interface Message {
    id: string;
    content: string;
    sender_id: string;
    conversation_id: string;
    created_at: string;
}

interface Conversation {
    status?: string;
    initiated_by?: string | null;
    id: string;
    user1_id?: string;
    user2_id?: string;
    user1Id?: string;
    user2Id?: string;
    user1: {
        id?: string;
        username: string;
        role: string;
        profile_picture?: string | null;
    };
    user2: {
        id?: string;
        username: string;
        role: string;
        profile_picture?: string | null;
    };
    messages: Message[];
    _count?: {
        messages: number;
    };
}

const Conversations = () => {
    const navigation = useNavigation<any>();
    const {t} = useTranslation();
    const {theme} = useTheme();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [tab, setTab] = useState<"inbox" | "requests">("inbox");
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const socketRef = useRef<Socket | null>(null);

    const activeConversationIdRef = useRef<string | null>(null);

    useEffect((): void => {
        const getUserId: () => Promise<void> = async (): Promise<void> => {
            try {
                const token: string | null =
                    await SecureStore.getItemAsync("userToken");
                if (token) {
                    const decoded: any = jwtDecode(token);
                    setCurrentUserId(decoded.id);
                }
            } catch (err) {
                console.error("Erreur token:", err);
                setLoading(false);
            }
        };
        getUserId();
    }, []);

    const fetchConversations: () => Promise<void> = async (): Promise<void> => {
        if (!currentUserId) return;
        try {
            const response = await apiClient.get(
                `/conversations/user/${currentUserId}`,
            );
            const data: Conversation[] = response.data.conversations || [];
            const sorted = data.sort((a, b) => {
                const tA = a.messages[0] ? new Date(a.messages[0].created_at).getTime() : 0;
                const tB = b.messages[0] ? new Date(b.messages[0].created_at).getTime() : 0;
                return tB - tA;
            });
            setConversations(sorted);
        } catch (error: any) {
            console.error("Erreur Fetch Conversations:", error.message);
        } finally {
            loading && setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback((): void => {
            activeConversationIdRef.current = null;
            if (currentUserId) {
                fetchConversations();
            }
        }, [currentUserId]),
    );

    useEffect((): (() => void) | undefined => {
        if (!currentUserId) return;

        const setupSocket: () => Promise<void> = async (): Promise<void> => {
            const token: string | null = await SecureStore.getItemAsync("userToken");
            if (!token) return;

            socketRef.current = io(SOCKET_URL, {
                auth: {token},
                transports: ["websocket"],
            });

            socketRef.current.on("conversation_updated", fetchConversations);
            socketRef.current.on("connect", fetchConversations);
            socketRef.current.on(
                "update_conversation_list",
                (newMessage: Message): void => {
                    void fetchConversations();
                    setConversations((prev: Conversation[]): Conversation[] => {
                        const convIndex: number = prev.findIndex(
                            (c: Conversation): boolean => c.id === newMessage.conversation_id,
                        );
                        if (convIndex === -1) return prev;

                        const newConvs: Conversation[] = [...prev];

                        const isCurrentlyReading: boolean =
                            activeConversationIdRef.current === newMessage.conversation_id;
                        const currentUnreadCount: number =
                            newConvs[convIndex]._count?.messages || 0;

                        newConvs[convIndex] = {
                            ...newConvs[convIndex],
                            messages: [newMessage],
                            _count: {
                                messages: isCurrentlyReading ? 0 : currentUnreadCount + 1,
                            },
                        };

                        return newConvs.sort((a: Conversation, b: Conversation): number => {
                            const dateA: number = a.messages[0]
                                ? new Date(a.messages[0].created_at).getTime()
                                : 0;
                            const dateB: number = b.messages[0]
                                ? new Date(b.messages[0].created_at).getTime()
                                : 0;
                            return dateB - dateA;
                        });
                    });
                },
            );

            socketRef.current.on("conversation_marked_read", ({conversation_id: conversationId}): void => {
                setConversations((prev: Conversation[]): Conversation[] =>
                    prev.map(
                        (c: Conversation): Conversation =>
                            c.id === conversationId ? {...c, _count: {messages: 0}} : c,
                    ),
                );
            });
        };

        setupSocket();
        return (): void => {
            socketRef.current?.disconnect();
        };
    }, [currentUserId]);

    const onRefresh: () => void = useCallback((): void => {
        setRefreshing(true);
        fetchConversations();
    }, [currentUserId]);

    if (loading) {
        return (
            <View style={[styles.safeArea, {backgroundColor: theme.background, justifyContent: "center"}]}>
                <ActivityIndicator size="large" color="#4cc9f0"/>
            </View>
        );
    }

    return (
        <View style={[styles.safeArea, {backgroundColor: theme.background}]}>
            <Header/>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#4cc9f0"
                    />
                }
            >
                <View style={styles.titleWrapper}>
                    <Text style={[styles.glitchTitleSub, {color: theme.text}]}>{t("messages_title")}</Text>
                </View>

                <View style={{flexDirection: "row", gap: 24, marginBottom: 16}}>
                    {(["inbox", "requests"] as const).map(value => <TouchableOpacity key={value} onPress={() => setTab(value)}>
                        <Text style={{color: theme.text, fontWeight: tab === value ? "bold" : "normal"}}>{t(value === "inbox" ? "dm_inbox" : "dm_requests")}</Text>
                    </TouchableOpacity>)}
                </View>
                <TextInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder={t("search_conv_placeholder")}
                    placeholderTextColor={theme.placeholder}
                    style={[styles.searchInput, {
                        backgroundColor: theme.surface,
                        borderColor: theme.border,
                        color: theme.text,
                    }]}
                />

                <View style={styles.chatList}>
                    {conversations.filter(conv => conv.status !== "DECLINED" && ((!!conv.status && conv.status !== "ACCEPTED" && conv.initiated_by !== currentUserId) === (tab === "requests"))).map((conv: any) => {
                        const isCurrentUser1 =
                            (conv.user1_id &&
                                String(conv.user1_id) === String(currentUserId)) ||
                            (conv.user1Id &&
                                String(conv.user1Id) === String(currentUserId)) ||
                            (conv.user1?.id &&
                                String(conv.user1.id) === String(currentUserId));

                        const otherUser = isCurrentUser1 ? conv.user2 : conv.user1;

                        if (!otherUser || !otherUser.username || !(otherUser.pseudo || otherUser.username).toLowerCase().includes(query.toLowerCase())) return null;

                        const lastMsg =
                            conv.messages && conv.messages.length > 0
                                ? conv.messages[0]
                                : null;
                        const lastMsgDate: Date | null = lastMsg
                            ? new Date(lastMsg.created_at)
                            : null;

                        const formattedTime: string =
                            lastMsgDate && !isNaN(lastMsgDate.getTime())
                                ? lastMsgDate.toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })
                                : "";

                        return (
                            <ChatItem
                                key={conv.id}
                                id={conv.id}
                                name={otherUser.username}
                                msg={lastMsg?.content || t("msg_start_conversation")}
                                time={formattedTime}
                                unread={conv._count?.messages || 0}
                                initials={otherUser.username.substring(0, 2).toUpperCase()}
                                image={otherUser.profile_picture || ""}
                                isSystem={otherUser.role === "ADMIN"}
                                onPress={async (): Promise<void> => {
                                    activeConversationIdRef.current = conv.id;

                                    setConversations((prev: Conversation[]): Conversation[] =>
                                        prev.map(
                                            (c: Conversation): Conversation =>
                                                c.id === conv.id
                                                    ? {...c, _count: {messages: 0}}
                                                    : c,
                                        ),
                                    );

                                    socketRef.current?.emit("mark_as_read", {conversation_id: conv.id});

                                    navigation.navigate("detailsConversations", {
                                        conversationId: conv.id,
                                        userName: otherUser.username,
                                        userProfilePic: otherUser.profile_picture || "",
                                    });
                                }}
                            />
                        );
                    })}
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
    titleWrapper: {
        marginVertical: 30,
        paddingLeft: 10,
        borderLeftWidth: 4,
        borderLeftColor: "#4cc9f0",
    },
    glitchTitleSub: {
        fontSize: 28,
        fontWeight: "900",
        textTransform: "uppercase",
        letterSpacing: 2,
    },
    searchInput: {
        borderRadius: 20,
        padding: 18,
        fontSize: 16,
        marginBottom: 30,
        borderWidth: 1,
        shadowColor: "#000",
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        elevation: 8,
    },
    chatList: {gap: 14},
    avatarCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 15,
        position: "relative",
    },
    avatarUser: {
        backgroundColor: "#2d2e4a",
    },
    avatarSystem: {
        backgroundColor: "#f72585",
    },
    avatarUnreadBorder: {
        borderWidth: 2,
        borderColor: "#4cc9f0",
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
        borderColor: "#16172b",
    },
    chatInfo: {
        flex: 1,
    },
    chatHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 6,
    },
    userName: {
        color: "#ffffff",
        fontWeight: "700",
        fontSize: 17,
        letterSpacing: 0.5,
    },
    timeText: {
        color: "#666abc",
        fontSize: 12,
        fontWeight: "500",
    },
    chatFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    lastMsg: {
        color: "#8a8db0",
        fontSize: 14,
        flex: 1,
        marginRight: 10,
    },
    lastMsgUnread: {
        color: "#fff",
        fontWeight: "600",
    },

    unreadBadge: {
        backgroundColor: "#4cc9f0",
        minWidth: 22,
        height: 22,
        borderRadius: 11,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 6,
        shadowColor: "#4cc9f0",
        shadowOpacity: 0.5,
        shadowRadius: 5,
        elevation: 5,
    },
    unreadText: {
        color: "#000",
        fontSize: 11,
        fontWeight: "900",
    },
});

export default Conversations;
