import React, {
    useState,
    useRef,
    useEffect,
    useCallback,
    useMemo,
    lazy,
    Suspense,
} from "react";
import {Search, MoreVertical, Send, MessageSquare, Smile, Plus, X, PenSquare} from "lucide-react";
const MessageEmojiPicker = lazy(() => import("../components/MessageEmojiPicker"));
import {useTranslation} from "react-i18next";
import {jwtDecode} from "jwt-decode";
import {io, Socket} from "socket.io-client";
import {useNavigate, useSearchParams} from "react-router-dom";
import {toast} from "react-toastify";
import apiClient from "../api/client";
import UserAvatar from "../components/UserAvatar";
import AvatarBorder from "../components/AvatarBorder";
import {getPseudoFontFamily} from "../fonts.config";
import {getTextEffectClassName} from "../textEffects.config";

interface BackendUser {
    id: string;
    username: string;
    pseudo?: string;
    profile_picture?: string;
    equipped_avatar_border?: string | null;
    equipped_font?: string | null;
    equipped_text_effect?: string | null;
}

interface BackendMessage {
    id: string;
    conversation_id: string;
    sender_id: string;
    content: string;
    created_at: string;
    is_read: boolean;
}

interface BackendConversation {
    id: string;
    status?: "ACCEPTED" | "PENDING" | "DECLINED";
    initiated_by?: string | null;
    invitation_sent?: boolean;
    user1_id: string;
    user2_id: string;
    user1?: BackendUser;
    user2?: BackendUser;
    messages?: BackendMessage[];
    _count?: { messages: number };
    lastMessage?: string | null;
    time?: string;
    unreadCount?: number;
}

const BACKEND_URL = import.meta.env.VITE_API_URL;

const Conversations: React.FC = () => {
    const {t, i18n} = useTranslation();
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const openedTarget = useRef<string | null>(null);

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

    const shouldShowSeparator = (prevDateStr: string, currDateStr: string): boolean => {
        const gap = new Date(currDateStr).getTime() - new Date(prevDateStr).getTime();
        return gap >= GAP_MINUTES * 60 * 1000;
    };

    const [userId, setUserId] = useState<string | null>(null);
    const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
    const [conversations, setConversations] = useState<BackendConversation[]>([]);
    const [messages, setMessages] = useState<BackendMessage[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [loadingConv, setLoadingConv] = useState(true);

    const [socket, setSocket] = useState<Socket | null>(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    const [hiddenConvIds, setHiddenConvIds] = useState<Set<string>>(new Set());
    const [showNewConvModal, setShowNewConvModal] = useState(false);
    const [contactUsers, setContactUsers] = useState<BackendUser[]>([]);
    const [loadingContacts, setLoadingContacts] = useState(false);
    const [contactQuery, setContactQuery] = useState("");
    const [inboxTab, setInboxTab] = useState<"inbox" | "requests">("inbox");
    const [sending, setSending] = useState(false);
    const [responding, setResponding] = useState(false);
    const isIncomingRequest = (conv: BackendConversation) => !!conv.status && conv.status !== "ACCEPTED" && conv.initiated_by !== userId;

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const selectedConvIdRef = useRef<string | null>(null);
    const emojiButtonRef = useRef<HTMLButtonElement>(null);
    const emojiPickerRef = useRef<HTMLDivElement>(null);
    const messageInputRef = useRef<HTMLTextAreaElement>(null);

    useEffect((): void => {
        selectedConvIdRef.current = selectedConvId;
    }, [selectedConvId]);

    const getOtherUser = useCallback(
        (conv: BackendConversation): BackendUser | undefined => {
            if (conv.user1 && String(conv.user1.id) === String(userId))
                return conv.user2;
            if (conv.user2 && String(conv.user2.id) === String(userId))
                return conv.user1;
            return String(conv.user1_id) === String(userId) ? conv.user2 : conv.user1;
        },
        [userId],
    );

    const fetchConversations = useCallback(async (): Promise<void> => {
        if (!userId) return;
        try {
            const res = await apiClient.get(`/conversations/user/${userId}`, {params: {include: selectedConvIdRef.current || undefined}});
            const data: BackendConversation[] =
                res.data.conversations || res.data || [];

            const processed = data.map((conv: BackendConversation) => {
                const lastMsg: BackendMessage | null =
                    conv.messages && conv.messages.length > 0 ? conv.messages[0] : null;
                const unreadCount: number = conv._count?.messages || 0;

                return {
                    ...conv,
                    unreadCount,
                    lastMessage: lastMsg ? lastMsg.content : null,
                    time:
                        lastMsg && lastMsg.created_at
                            ? new Date(lastMsg.created_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                            })
                            : "",
                };
            });

            const sorted = processed.sort((a, b) => {
                const tA = a.messages?.[0]?.created_at ? new Date(a.messages[0].created_at).getTime() : 0;
                const tB = b.messages?.[0]?.created_at ? new Date(b.messages[0].created_at).getTime() : 0;
                return tB - tA;
            });

            setConversations(sorted);
        } catch (e) {
            console.error("Erreur chargement des conversations:", e);
        } finally {
            setLoadingConv(false);
        }
    }, [userId]);

    useEffect((): void => {
        const token: string | null = localStorage.getItem("token");
        if (token) {
            try {
                const decoded: any = jwtDecode(token);
                setUserId(decoded.id || decoded.userId);
            } catch (e) {
                console.error("Token invalide:", e);
            }
        }
    }, []);

    useEffect((): void => {
        if (userId) {
            setLoadingConv(true);
            fetchConversations();
        }
    }, [userId, fetchConversations]);

    // Charge la liste des conversations masquées (stockée localement, pas en DB)
    useEffect((): void => {
        if (!userId) return;
        try {
            const stored: string | null = localStorage.getItem(`hiddenConversations_${userId}`);
            if (stored) setHiddenConvIds(new Set(JSON.parse(stored)));
        } catch (e) {
            console.error("Erreur lecture conversations masquées:", e);
        }
    }, [userId]);

    const updateHiddenConvIds = useCallback(
        (updater: (prev: Set<string>) => Set<string>): void => {
            setHiddenConvIds((prev: Set<string>): Set<string> => {
                const next: Set<string> = updater(prev);
                if (userId) {
                    localStorage.setItem(
                        `hiddenConversations_${userId}`,
                        JSON.stringify([...next]),
                    );
                }
                return next;
            });
        },
        [userId],
    );

    const hideConversation = (convId: string, e?: React.MouseEvent): void => {
        e?.stopPropagation();
        updateHiddenConvIds((prev: Set<string>): Set<string> => new Set(prev).add(convId));
        if (String(selectedConvId) === String(convId)) setSelectedConvId(null);
    };

    const unhideConversation = (convId: string): void => {
        updateHiddenConvIds((prev: Set<string>): Set<string> => {
            if (!prev.has(convId)) return prev;
            const next: Set<string> = new Set(prev);
            next.delete(convId);
            return next;
        });
    };

    const openNewConvModal = (): void => {
        setContactQuery("");
        setShowNewConvModal(true);
    };

    useEffect(() => {
        if (!showNewConvModal || !userId) return;
        const controller = new AbortController();
        setLoadingContacts(true);
        const timer = setTimeout(async () => {
            try {
                const query = contactQuery.trim();
                const res = await apiClient.get(query
                    ? `/users/search?q=${encodeURIComponent(query)}`
                    : `/follows/following/${userId}/users`, {signal: controller.signal});
                if (!controller.signal.aborted) setContactUsers((res.data.users || res.data.data || []).filter((u: BackendUser) => u.id !== userId));
            } catch {
                if (!controller.signal.aborted) setContactUsers([]);
            } finally {
                if (!controller.signal.aborted) setLoadingContacts(false);
            }
        }, 250);
        return () => { clearTimeout(timer); controller.abort(); };
    }, [showNewConvModal, contactQuery, userId]);

    const openConversationWith = async (targetUserId: string): Promise<void> => {
        if (!userId) return;
        try {
            const res = await apiClient.post("/conversations", {
                user1_id: userId,
                user2_id: targetUserId,
            });
            const conv = res.data.conversation || res.data.data || res.data;
            const convId: string = conv.id;
            unhideConversation(convId);
            selectedConvIdRef.current = convId;
            await fetchConversations();
            setSelectedConvId(convId);
            setShowNewConvModal(false);
            setNewMessage("");
        } catch (e: any) {
            console.error("Erreur ouverture conversation:", e);
            toast.error(
                e.response?.data?.message ||
                t("conv_create_error", "Impossible d'ouvrir la conversation."),
            );
        }
    };

    useEffect(() => {
        const target = params.get("to");
        if (!target || !userId || openedTarget.current === target) return;
        openedTarget.current = target;
        void openConversationWith(target).finally(() => setParams({}, {replace: true}));
    }, [params, userId]);

    useEffect(() => {
        const token: string | null = localStorage.getItem("token");
        if (!token || !userId) return;

        const newSocket = io(BACKEND_URL, {
            auth: {token},
            transports: ["websocket"],
        });

        setSocket(newSocket);

        return (): void => {
            newSocket.disconnect();
        };
    }, [userId]);

    useEffect(() => {
        if (!socket || !userId) return;

        socket.on("receive_message", (message: BackendMessage): void => {
            if (
                String(message.conversation_id) === String(selectedConvIdRef.current)
            ) {
                const safeMessage = {
                    ...message,
                    id:
                        message.id ||
                        `msg-live-${Date.now()}-${Math.random()}`,
                };

                setMessages((prev: BackendMessage[]) => {
                    if (prev.some((m: BackendMessage): boolean => String(m.id) === String(safeMessage.id)))
                        return prev;
                    return [...prev, safeMessage].sort(
                        (a: BackendMessage, b: BackendMessage) =>
                            new Date(a.created_at).getTime() -
                            new Date(b.created_at).getTime(),
                    );
                });

                if (String(safeMessage.sender_id) !== String(userId)) {
                    socket.emit("mark_as_read", {
                        conversation_id: safeMessage.conversation_id,
                    });
                }
            }
        });

        socket.on("conversation_updated", fetchConversations);
        socket.on("connect", fetchConversations);
        socket.on("update_conversation_list", (message: BackendMessage): void => {
            unhideConversation(message.conversation_id);
            void fetchConversations();
            setConversations((prevConvs: BackendConversation[]): BackendConversation[] => {
                const index = prevConvs.findIndex(
                    (conv: BackendConversation): boolean => String(conv.id) === String(message.conversation_id),
                );

                if (index === -1) {
                    setTimeout(() => fetchConversations(), 50);
                    return prevConvs;
                }

                const updated: BackendConversation[] = [...prevConvs];
                const isCurrentActive: boolean =
                    String(message.conversation_id) === String(selectedConvIdRef.current);
                const isFromMe: boolean = String(message.sender_id) === String(userId);

                const currentUnread: number = updated[index].unreadCount || 0;
                const newUnread: number = !isCurrentActive && !isFromMe ? currentUnread + 1 : 0;

                updated[index] = {
                    ...updated[index],
                    lastMessage: message.content,
                    time: new Date(message.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                    }),
                    unreadCount: newUnread,
                };

                const [movedConv] = updated.splice(index, 1);
                return [movedConv, ...updated];
            });
        });

        socket.on(
            "conversation_marked_read",
            (data: { conversation_id: string }): void => {
                setConversations((prev: BackendConversation[]) =>
                    prev.map((conv: BackendConversation): BackendConversation =>
                        String(conv.id) === String(data.conversation_id)
                            ? {...conv, unreadCount: 0}
                            : conv,
                    ),
                );
            },
        );

        return () => {
            socket.off("conversation_updated", fetchConversations);
            socket.off("connect", fetchConversations);
            socket.off("receive_message");
            socket.off("update_conversation_list");
            socket.off("conversation_marked_read");
        };
    }, [socket, userId, fetchConversations]);

    useEffect(() => {
        if (!socket || !selectedConvId) return;

        setConversations((prev: BackendConversation[]) =>
            prev.map((conv: BackendConversation): BackendConversation =>
                String(conv.id) === String(selectedConvId)
                    ? {...conv, unreadCount: 0}
                    : conv,
            ),
        );

        socket.emit("mark_as_read", {conversation_id: selectedConvId});
        socket.emit("join_conversation", {conversation_id: selectedConvId});

        return () => {
            socket.emit("leave_conversation", {conversation_id: selectedConvId});
        };
    }, [socket, selectedConvId]);

    useEffect(() => {
        if (!selectedConvId) return;

        let cancelled = false;
        setMessages([]);
        setNewMessage("");
        const fetchMessages = async (): Promise<void> => {
            try {
                const res = await apiClient.get(
                    `/messages/conversation/${selectedConvId}`,
                );
                const rawMessages = res.data.messages || [];

                const formattedMessages = rawMessages.map((m: any) => ({
                    ...m,
                    id: m.id || `msg-api-${Math.random()}-${Date.now()}`,
                }));

                const sortedMessages = formattedMessages.sort(
                    (a: BackendMessage, b: BackendMessage) =>
                        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
                );
                if (!cancelled) setMessages(prev => [...new Map([...sortedMessages, ...prev].map((m: BackendMessage) => [m.id, m])).values()].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
            } catch (e) {
                console.error("Erreur de récupération des messages:", e);
            }
        };

        fetchMessages();
        return () => { cancelled = true; };
    }, [selectedConvId]);

    useEffect((): void => {
        messagesEndRef.current?.scrollIntoView({behavior: "smooth", block: "nearest"});
    }, [messages]);

    const selectedConversation: BackendConversation | undefined = useMemo(() => {
        return conversations.find((c: BackendConversation): boolean => String(c.id) === String(selectedConvId));
    }, [conversations, selectedConvId]);

    const activeChatUser: BackendUser | null | undefined = useMemo(() => {
        return selectedConversation ? getOtherUser(selectedConversation) : null;
    }, [selectedConversation, getOtherUser]);

    const filteredConversations: BackendConversation[] = useMemo(() => {
        return conversations.filter((conv: BackendConversation) => {
            if (hiddenConvIds.has(conv.id)) return false;
            if (conv.status === "DECLINED" && conv.initiated_by !== userId) return false;
            if (isIncomingRequest(conv) !== (inboxTab === "requests")) return false;
            const otherUser: BackendUser | undefined = getOtherUser(conv);
            const lowerQuery: string = searchQuery.toLowerCase();
            const displayLastMessage: string =
                conv.lastMessage || t("dm_no_messages");
            const name: string = (otherUser?.pseudo || otherUser?.username || "").toLowerCase();
            return (
                name.includes(lowerQuery) ||
                displayLastMessage.toLowerCase().includes(lowerQuery)
            );
        });
    }, [conversations, searchQuery, getOtherUser, t, hiddenConvIds, inboxTab, userId]);

    useEffect(() => {
        if (!showEmojiPicker) return;
        const handleClickOutside = (e: MouseEvent): void => {
            const target = e.target as Node;
            if (
                !emojiButtonRef.current?.contains(target) &&
                !emojiPickerRef.current?.contains(target)
            ) {
                setShowEmojiPicker(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [showEmojiPicker]);

    const handleEmojiSelect = (emoji: any): void => {
        setNewMessage((prev) => prev + emoji.native);
        setShowEmojiPicker(false);
    };

    const incomingRequest = selectedConversation ? isIncomingRequest(selectedConversation) : false;
    const sendBlocked = !!selectedConversation && selectedConversation.status !== undefined && selectedConversation.status !== "ACCEPTED" &&
        (incomingRequest || selectedConversation.status === "DECLINED" || selectedConversation.invitation_sent);
    const respondToRequest = async (action: "accept" | "decline") => {
        if (!selectedConvId || responding) return;
        setResponding(true);
        try {
            await apiClient.patch(`/conversations/${selectedConvId}/request`, {action});
            if (action === "decline") hideConversation(selectedConvId);
            else {setInboxTab("inbox"); socket?.emit("mark_as_read", {conversation_id: selectedConvId});}
            await fetchConversations();
        } catch { toast.error(t("dm_action_error")); }
        finally { setResponding(false); }
    };

    const handleSendMessage = (): void => {
        if (!newMessage.trim() || !selectedConvId || sending || sendBlocked) return;
        if (!socket?.connected) { toast.error(t("dm_send_error")); return; }

        setSending(true);
        const sentText = newMessage.trim();
        const sentConversation = selectedConvId;
        socket.timeout(10000).emit("send_message", {
            conversation_id: selectedConvId,
            content: sentText,
        }, (err: Error | null, result?: {ok: boolean}) => {
            setSending(false);
            if (err || !result?.ok) {toast.error(t("dm_send_error")); void fetchConversations(); return;}
            if (selectedConvIdRef.current === sentConversation) setNewMessage(prev => prev.trim() === sentText ? "" : prev);
            void fetchConversations();
        });
        // Réinitialise la hauteur du textarea auto-grandissant
        if (messageInputRef.current) {
            messageInputRef.current.style.height = "auto";
        }
    };

    const getAvatarText = (username?: string): string =>
        username ? username.substring(0, 2).toUpperCase() : "??";

    return (
        <div
            className="flex h-full bg-canvas text-ink overflow-hidden font-sans transition-colors duration-300">
            <aside
                className={`w-full md:w-80 lg:w-96 border-r border-line dark:border-line flex flex-col ${selectedConvId ? "hidden md:flex" : "flex"}`}
            >
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h1
                            className="text-3xl font-bold text-ink"

                        >
                            {t("messages_title")}
                        </h1>
                        <button
                            onClick={openNewConvModal}
                            title={t("new_conversation", "Nouvelle conversation")}
                            className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-md hover:shadow-lg transition-all hover:scale-105"
                        >
                            <PenSquare size={18}/>
                        </button>
                    </div>
                    <div className="flex gap-2 mb-4">
                        {(["inbox", "requests"] as const).map(tab => (
                            <button key={tab} onClick={() => {setInboxTab(tab); setSelectedConvId(null);}}
                                aria-pressed={inboxTab === tab}
                                className={inboxTab === tab ? "primary-action flex-1" : "secondary-action flex-1"}>
                                {t(tab === "inbox" ? "dm_inbox" : "dm_requests")}
                                {tab === "requests" && ` (${conversations.filter(c => isIncomingRequest(c) && c.status === "PENDING").length})`}
                            </button>
                        ))}
                    </div>
                    <div className="relative group">
                        <Search
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors"
                            size={18}
                        />
                        <input
                            type="text"
                            placeholder={t("search_conv_placeholder")}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-panel dark:bg-panel border border-line dark:border-line rounded-lg py-2.5 pl-10 pr-4 text-sm dark:text-gray-900 focus:outline-none focus:border-blue-500/50 transition-all shadow-sm"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {!loadingConv && filteredConversations.length === 0 && <p className="p-6 text-sm text-muted">{t("dm_empty")}</p>}
                    {loadingConv ? (
                        <div className="p-6 text-center text-sm text-slate-500">
                            {t("loading", "Chargement...")}
                        </div>
                    ) : (
                        filteredConversations.map((conv: BackendConversation) => {
                            const otherUser: BackendUser | undefined = getOtherUser(conv);
                            const usernameDisplay: string = otherUser
                                ? (otherUser.pseudo || otherUser.username)
                                : t("unknown_user", "Utilisateur anonyme");
                            const hasUnread: boolean = (conv.unreadCount ?? 0) > 0;

                            return (
                                <div key={conv.id} className="relative group">
                                <button
                                    onClick={() => setSelectedConvId(conv.id)}
                                    className={`w-full flex items-center gap-4 p-4 transition-all hover:bg-panel dark:hover:bg-slate-100 ${String(selectedConvId) === String(conv.id) ? "bg-panel dark:bg-raised border-l-4 border-blue-500" : "border-l-4 border-transparent"}`}
                                >
                                    <div className="relative shrink-0">
                                        <AvatarBorder borderId={otherUser?.equipped_avatar_border} compact>
                                            {otherUser?.profile_picture ? (
                                                <img
                                                    src={otherUser.profile_picture}
                                                    alt={usernameDisplay}
                                                    className="w-12 h-12 rounded-full object-cover border border-line dark:border-indigo-200"
                                                />
                                            ) : (
                                                <div
                                                    className="w-12 h-12 rounded-full bg-raised dark:bg-indigo-100 flex items-center justify-center text-blue-400 dark:text-blue-600 font-bold border border-line dark:border-indigo-200">
                                                    {getAvatarText(otherUser?.pseudo || otherUser?.username)}
                                                </div>
                                            )}
                                        </AvatarBorder>
                                    </div>

                                    <div className="flex-1 text-left overflow-hidden">
                                        <div className="flex justify-between items-center mb-1">
                      <span
                          className={`text-sm truncate ${hasUnread ? "font-black" : "font-bold"} ${getTextEffectClassName(otherUser?.equipped_text_effect) || (hasUnread ? "text-white dark:text-blue-600" : "text-slate-300 dark:text-gray-900")}`}
                          style={{fontFamily: getPseudoFontFamily(otherUser?.equipped_font) || undefined}}
                      >
                        {usernameDisplay}
                      </span>
                                            <span
                                                className={`text-[10px] ${hasUnread ? "font-bold text-blue-400" : "text-slate-500 dark:text-muted"}`}
                                            >
                        {conv.time}
                      </span>
                                        </div>

                                        <div className="flex justify-between items-center gap-2">
                                            <p
                                                className={`text-xs truncate flex-1 ${hasUnread ? "font-semibold text-slate-200 dark:text-slate-900" : "text-muted dark:text-muted"}`}
                                            >
                                                {conv.lastMessage ||
                                                    t("dm_no_messages")}
                                            </p>
                                            {hasUnread && (
                                                <span
                                                    className="bg-blue-600 text-white text-[10px] font-bold rounded-full min-w-4.5 h-4 px-1 flex items-center justify-center shadow-sm animate-pulse">
                          {conv.unreadCount}
                        </span>
                                            )}
                                        </div>
                                    </div>
                                </button>
                                    <button
                                        onClick={(e) => hideConversation(conv.id, e)}
                                        title={t("delete_conversation", "Retirer de la liste")}
                                        className="absolute top-1/2 -translate-y-1/2 right-2 p-1.5 rounded-full bg-panel dark:bg-raised text-slate-500 hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all z-10 shadow-sm"
                                    >
                                        <X size={16}/>
                                    </button>
                                </div>
                            );
                        })
                    )}
                    {!loadingConv && filteredConversations.length === 0 && (
                        <div className="p-6 text-center text-sm text-slate-500 dark:text-muted">
                            {t("no_conv_found")}
                        </div>
                    )}
                </div>
            </aside>

            <section
                className={`flex-1 flex flex-col bg-canvas dark:bg-panel ${!selectedConvId ? "hidden md:flex" : "flex"}`}
            >
                {selectedConversation ? (
                    <>
                        <header
                            className="p-4 border-b border-line dark:border-line flex justify-between items-center bg-canvas/50 dark:bg-panel/50 backdrop-blur-md">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setSelectedConvId(null)}
                                    className="md:hidden p-2 -ml-2 text-slate-500 hover:text-white dark:hover:text-gray-900"
                                >
                                    <svg
                                        width="24"
                                        height="24"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d="m15 18-6-6 6-6"/>
                                    </svg>
                                </button>
                                <div
                                    onClick={() =>
                                        activeChatUser?.id &&
                                        navigate(`/profil/${activeChatUser.id}`)
                                    }
                                    className="flex items-center gap-3 cursor-pointer group hover:opacity-80 transition-opacity"
                                >
                                    <div className="relative">
                                        <AvatarBorder borderId={activeChatUser?.equipped_avatar_border} compact>
                                            {activeChatUser?.profile_picture ? (
                                                <img
                                                    src={activeChatUser.profile_picture}
                                                    alt={activeChatUser.pseudo || activeChatUser.username}
                                                    className="w-10 h-10 rounded-full object-cover border border-line dark:border-indigo-200 transition-transform group-hover:scale-105"
                                                />
                                            ) : (
                                                <div
                                                    className="w-10 h-10 rounded-full bg-raised dark:bg-indigo-100 flex items-center justify-center text-blue-400 dark:text-blue-600 text-sm font-bold border border-line dark:border-indigo-200 transition-transform group-hover:scale-105">
                                                    {getAvatarText(activeChatUser?.pseudo || activeChatUser?.username)}
                                                </div>
                                            )}
                                        </AvatarBorder>
                                    </div>
                                    <div>
                                        <h2
                                            className={`text-sm font-bold group-hover:underline ${getTextEffectClassName(activeChatUser?.equipped_text_effect) || "text-ink"}`}
                                            style={{fontFamily: getPseudoFontFamily(activeChatUser?.equipped_font) || undefined}}
                                        >
                                            {activeChatUser
                                                ? (activeChatUser.pseudo || activeChatUser.username)
                                                : t("unknown_user", "Utilisateur anonyme")}
                                        </h2>
                                        {activeChatUser && (
                                            <p className="text-[11px] text-slate-500 dark:text-muted">
                                                @{activeChatUser.username}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <button
                                className="p-2 text-slate-500 hover:text-white dark:hover:text-gray-900 transition-colors">
                                <MoreVertical size={20}/>
                            </button>
                        </header>

                        <div className="flex-1 overflow-y-auto p-6 space-y-4 flex flex-col">
                            {messages.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center select-none">
                                    <div className="w-16 h-16 rounded-full bg-panel dark:bg-raised border border-line dark:border-line flex items-center justify-center">
                                        <MessageSquare size={28} className="text-slate-500 dark:text-muted"/>
                                    </div>
                                    <p className="text-sm text-muted dark:text-muted max-w-[220px] leading-relaxed">
                                        {t("conv_no_messages")}
                                    </p>
                                </div>
                            ) : messages.map((msg: BackendMessage, index: number) => {
                                const isMe: boolean = String(msg.sender_id) === String(userId);
                                const messageTime: string = new Date(msg.created_at).toLocaleTimeString(
                                    [],
                                    {hour: "2-digit", minute: "2-digit"},
                                );
                                const showSeparator: boolean =
                                    index === 0 ||
                                    shouldShowSeparator(messages[index - 1].created_at, msg.created_at);

                                return (
                                    <React.Fragment key={msg.id}>
                                        {showSeparator && (
                                            <div className="flex items-center justify-center my-2">
                                                <span className="text-[11px] text-muted dark:text-muted bg-panel dark:bg-raised border border-line dark:border-line px-3 py-1 rounded-full select-none">
                                                    {formatSeparatorDate(msg.created_at)}
                                                </span>
                                            </div>
                                        )}
                                        <div
                                            className={`max-w-[80%] flex items-start gap-2 ${isMe ? "self-end" : "self-start"}`}
                                        >
                                            {!isMe && (
                                                <UserAvatar
                                                    userId={activeChatUser?.id}
                                                    username={activeChatUser?.pseudo || activeChatUser?.username}
                                                    sizeClass="w-7 h-7 text-[10px] mt-0.5"
                                                />
                                            )}
                                            <div className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                                                <div
                                                    className={`px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap break-words ${isMe ? "bg-blue-600 text-white rounded-tr-none shadow-md" : "bg-panel dark:bg-raised text-slate-200 dark:text-gray-800 border border-line dark:border-line rounded-tl-none"}`}
                                                >
                                                    {msg.content}
                                                </div>
                                                <span className="text-[10px] text-slate-500 dark:text-muted mt-1 px-1">
                                                    {messageTime}
                                                </span>
                                            </div>
                                        </div>
                                    </React.Fragment>
                                );
                            })}
                            <div ref={messagesEndRef}/>
                        </div>

                        <footer className="p-4 bg-canvas dark:bg-panel relative">
                            {selectedConversation?.status && selectedConversation.status !== "ACCEPTED" && (
                                <div className="mb-3 p-4 rounded-xl border border-line bg-panel text-sm">
                                    <p className="text-muted">{t(incomingRequest ? "dm_incoming" : sendBlocked ? "dm_waiting" : "dm_invite_hint")}</p>
                                    {incomingRequest && <div className="flex gap-2 mt-3">
                                        <button disabled={responding} onClick={() => respondToRequest("accept")} className="primary-action">{t("dm_accept")}</button>
                                        <button disabled={responding} onClick={() => respondToRequest("decline")} className="secondary-action">{t("dm_decline")}</button>
                                    </div>}
                                </div>
                            )}
                            {showEmojiPicker && (
                                <div ref={emojiPickerRef} className="absolute bottom-full mb-2 left-4 z-50">
                                    <Suspense fallback={<div role="status" className="bg-panel rounded-xl p-6">{t("loading")}</div>}>
                                    <MessageEmojiPicker
                                        onSelect={handleEmojiSelect}
                                        theme={document.documentElement.classList.contains("dark") ? "light" : "dark"}
                                        locale={["fr", "de", "it"].includes(i18n.language.substring(0, 2)) ? i18n.language.substring(0, 2) : "en"}
                                    />
                                    </Suspense>
                                </div>
                            )}
                            <div
                                className="flex items-end gap-2 bg-panel dark:bg-raised border border-line dark:border-line rounded-xl px-4 py-2 focus-within:border-blue-500/50 transition-all">
                                <button
                                    ref={emojiButtonRef}
                                    onClick={() => setShowEmojiPicker((v) => !v)}
                                    className={`p-1 mb-1 transition-colors ${showEmojiPicker ? "text-yellow-400 dark:text-yellow-500" : "text-slate-500 hover:text-yellow-400 dark:hover:text-yellow-500"}`}
                                    title="Emoji"
                                >
                                    <Smile size={18}/>
                                </button>
                                <textarea
                                    ref={messageInputRef}
                                    disabled={sendBlocked || sending}
                                    maxLength={1000}
                                    rows={1}
                                    placeholder={t("type_message_placeholder")}
                                    value={newMessage}
                                    onChange={(e) => {
                                        setNewMessage(e.target.value);
                                        const el = e.currentTarget;
                                        el.style.height = "auto";
                                        el.style.height = Math.min(el.scrollHeight, 128) + "px";
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage();
                                        }
                                    }}
                                    className="flex-1 bg-transparent border-none focus:outline-none text-sm py-1 dark:text-gray-900 resize-none max-h-32 overflow-y-auto leading-relaxed"
                                />
                                <button
                                    onClick={handleSendMessage}
                                    disabled={sendBlocked || sending || !newMessage.trim()}
                                    aria-label={t("dm_send")}
                                    className="text-blue-500 hover:text-blue-400 p-1 mb-1 transition-transform hover:scale-110"
                                >
                                    <Send size={18}/>
                                </button>
                            </div>
                        </footer>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
                        <div
                            className="w-20 h-20 bg-panel dark:bg-raised rounded-full flex items-center justify-center mb-6 border border-line dark:border-line shadow-xl">
                            <Search size={32} className="text-slate-600"/>
                        </div>
                        <h2
                            className="text-2xl font-bold text-ink mb-2"

                        >
                            {t("select_conv_title")}
                        </h2>
                    </div>
                )}
            </section>

            {/* Modal "Nouvelle conversation" — recherche et abonnements */}
            {showNewConvModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                    onClick={() => setShowNewConvModal(false)}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-label={t("new_conversation")}
                        className="w-full max-w-md bg-panel dark:bg-panel border border-line dark:border-line rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-5 border-b border-line dark:border-line">
                            <h2 className="text-lg font-bold text-ink">
                                {t("new_conversation", "Nouvelle conversation")}
                            </h2>
                            <button
                                onClick={() => setShowNewConvModal(false)}
                                className="p-1.5 rounded-full text-slate-500 hover:text-white dark:hover:text-gray-900 hover:bg-raised dark:hover:bg-slate-100 transition-colors"
                            >
                                <X size={20}/>
                            </button>
                        </div>

                        <input value={contactQuery} onChange={e => setContactQuery(e.target.value)} placeholder={t("dm_find_people")} aria-label={t("dm_find_people")} className="m-4 p-3 bg-raised rounded-xl text-ink" autoFocus />
                        <div className="overflow-y-auto p-2">
                            {loadingContacts ? (
                                <div className="p-8 text-center text-sm text-slate-500">
                                    {t("loading", "Chargement...")}
                                </div>
                            ) : contactUsers.length === 0 ? (
                                <div className="p-8 text-center">
                                    <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-raised dark:bg-raised flex items-center justify-center">
                                        <MessageSquare size={24} className="text-slate-600"/>
                                    </div>
                                    <p className="text-sm text-muted dark:text-muted">
                                        {t("dm_find_hint")}
                                    </p>
                                </div>
                            ) : (
                                contactUsers.map((u: BackendUser) => (
                                    <button
                                        key={u.id}
                                        onClick={() => openConversationWith(u.id)}
                                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-canvas dark:hover:bg-slate-100 transition-colors text-left"
                                    >
                                        {u.profile_picture ? (
                                            <img
                                                src={u.profile_picture}
                                                alt={u.pseudo || u.username}
                                                className="w-11 h-11 rounded-full object-cover border border-line dark:border-indigo-200 shrink-0"
                                            />
                                        ) : (
                                            <div className="w-11 h-11 rounded-full bg-raised dark:bg-indigo-100 flex items-center justify-center text-blue-400 dark:text-blue-600 font-bold border border-line dark:border-indigo-200 shrink-0">
                                                {getAvatarText(u.pseudo || u.username)}
                                            </div>
                                        )}
                                        <div className="flex-1 overflow-hidden">
                                            <p className="text-sm font-bold text-ink truncate">
                                                {u.pseudo || u.username}
                                            </p>
                                            <p className="text-xs text-slate-500 dark:text-muted truncate">
                                                @{u.username}
                                            </p>
                                        </div>
                                        <Plus size={18} className="text-slate-500 shrink-0"/>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Conversations;
