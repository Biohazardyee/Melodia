import React, {useState, useEffect, useMemo} from "react";
import {useTranslation} from "react-i18next";
import {
    Bell,
    Heart,
    MessageCircle,
    Star,
    MessageSquare,
    UserPlus,
    Sparkles,
    Loader2,
    CheckCheck,
    Award,
    ListMusic,
} from "lucide-react";
import {jwtDecode} from "jwt-decode";
import {useNavigate} from "react-router-dom";
import apiClient from "../api/client";
import AvatarBorder from "../components/AvatarBorder";

interface NotificationActor {
    username: string;
    pseudo?: string | null;
    profile_image?: string;
    equipped_avatar_border?: string | null;
}

export interface AppNotification {
    id: string;
    is_read: boolean;
    action: string;
    type?: string;
    content?: string;
    related_user_id?: string;
    created_at: string;
    sender?: NotificationActor;
    related_user?: NotificationActor;
}

type Tab = "all" | "unread" | "mentions";

type ActionConfig = {
    Icon: React.FC<{size?: number; className?: string}>;
    badgeBg: string;
    iconColor: string;
    accent: string;
};

const ACTION_CONFIG: Record<string, ActionConfig> = {
    like_added:     {Icon: Heart,          badgeBg: "bg-rose-500/15 dark:bg-rose-50",     iconColor: "text-rose-400 dark:text-rose-500",       accent: "border-l-rose-500 dark:border-l-rose-400"},
    comment_added:  {Icon: MessageCircle,  badgeBg: "bg-emerald-500/15 dark:bg-emerald-50", iconColor: "text-emerald-400 dark:text-emerald-600", accent: "border-l-emerald-500 dark:border-l-emerald-400"},
    review_added:   {Icon: Star,           badgeBg: "bg-amber-500/15 dark:bg-amber-50",   iconColor: "text-amber-400 dark:text-amber-500",     accent: "border-l-amber-500 dark:border-l-amber-400"},
    new_message:    {Icon: MessageSquare,  badgeBg: "bg-blue-500/15 dark:bg-blue-50",     iconColor: "text-blue-400 dark:text-blue-500",       accent: "border-l-blue-500 dark:border-l-blue-400"},
    new_follow:     {Icon: UserPlus,       badgeBg: "bg-violet-500/15 dark:bg-violet-50", iconColor: "text-violet-400 dark:text-violet-600",   accent: "border-l-violet-500 dark:border-l-violet-400"},
    recommendation: {Icon: Sparkles,       badgeBg: "bg-cyan-500/15 dark:bg-cyan-50",     iconColor: "text-cyan-400 dark:text-cyan-600",       accent: "border-l-cyan-500 dark:border-l-cyan-400"},
    badge_earned:   {Icon: Award,          badgeBg: "bg-amber-500/15 dark:bg-amber-50",   iconColor: "text-amber-400 dark:text-amber-500",     accent: "border-l-amber-500 dark:border-l-amber-400"},
    playlist_collaborator_added: {Icon: ListMusic, badgeBg: "bg-indigo-500/15 dark:bg-indigo-50", iconColor: "text-indigo-400 dark:text-indigo-500", accent: "border-l-indigo-500 dark:border-l-indigo-400"},
};

const DEFAULT_CONFIG: ActionConfig = {
    Icon: Bell,
    badgeBg: "bg-slate-500/15 dark:bg-raised",
    iconColor: "text-muted dark:text-muted",
    accent: "border-l-slate-600 dark:border-l-slate-400",
};

const getConfig = (action: string): ActionConfig => ACTION_CONFIG[action] ?? DEFAULT_CONFIG;

const SectionHeader: React.FC<{label: string; count: number}> = ({label, count}) => (
    <div className="flex items-center gap-3 mb-3 mt-8 first:mt-0">
        <span className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-muted shrink-0">
            {label}
        </span>
        <div className="flex-1 h-px bg-raised dark:bg-slate-200"/>
        <span className="text-xs font-medium text-slate-600 dark:text-muted shrink-0 tabular-nums">{count}</span>
    </div>
);

const NotificationCard: React.FC<{
    notification: AppNotification;
    onClick: () => void;
    onAvatarClick: (e: React.MouseEvent) => void;
    formatTime: (d: string) => string;
}> = ({notification, onClick, onAvatarClick, formatTime}) => {
    const {t} = useTranslation();
    const config = getConfig(notification.action);
    const {Icon} = config;

    const displayUser =
        notification.related_user?.pseudo ||
        notification.related_user?.username ||
        notification.sender?.pseudo ||
        notification.sender?.username ||
        "Système";
    const userInitial = displayUser.charAt(0).toUpperCase();
    const userPic =
        notification.related_user?.profile_image ||
        notification.sender?.profile_image;
    const userBorder =
        notification.related_user?.equipped_avatar_border ||
        notification.sender?.equipped_avatar_border;

    const text = (): string => {
        const key = `notification_action_${notification.action}`;
        const translated = t(key, {username: displayUser});
        return translated === key ? notification.content || notification.action : translated;
    };

    return (
        <div
            onClick={onClick}
            className={`
                relative flex items-center gap-4 p-4 rounded-xl cursor-pointer
                border-l-4 ${config.accent}
                border border-line dark:border-line
                transition-all duration-200 group
                ${notification.is_read
                    ? "bg-canvas dark:bg-panel/60 hover:bg-panel dark:hover:bg-white"
                    : "bg-panel dark:bg-panel hover:bg-panel dark:hover:bg-slate-50 shadow-sm"
                }
            `}
        >
            <div className="relative shrink-0" onClick={onAvatarClick}>
                <AvatarBorder borderId={userBorder} compact>
                    <div className="w-11 h-11 rounded-full overflow-hidden bg-raised dark:bg-raised flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity">
                        {userPic ? (
                            <img src={userPic} alt={displayUser} className="w-full h-full object-cover"/>
                        ) : (
                            <span className="text-blue-400 dark:text-blue-600 font-bold text-base">
                                {userInitial}
                            </span>
                        )}
                    </div>
                </AvatarBorder>
                <div className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full ${config.badgeBg} flex items-center justify-center border-2 border-[#13131A] dark:border-white`}>
                    <Icon size={10} className={config.iconColor}/>
                </div>
            </div>

            <div className="flex-1 min-w-0">
                <p className={`text-sm leading-relaxed truncate ${notification.is_read ? "text-muted dark:text-muted" : "text-slate-100 dark:text-gray-900 font-medium"}`}>
                    {text()}
                </p>
                <p className={`text-xs mt-0.5 ${notification.is_read ? "text-slate-600 dark:text-muted" : "text-blue-400 dark:text-blue-500 font-medium"}`}>
                    {formatTime(notification.created_at)}
                </p>
            </div>

            {!notification.is_read && (
                <div className="shrink-0 w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.7)]"/>
            )}
        </div>
    );
};

const Notifications: React.FC = () => {
    const {t} = useTranslation();
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [activeTab, setActiveTab] = useState<Tab>("all");
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);

    useEffect((): void => {
        const token = localStorage.getItem("token");
        if (token) {
            try {
                const decoded: any = jwtDecode(token);
                setUserId(decoded.id || decoded.userId);
            } catch (e) {
                console.error("Token invalide:", e);
            }
        }
    }, []);

    const fetchNotifications = async (): Promise<void> => {
        if (!userId) return;
        try {
            setLoading(true);
            const res = await apiClient.get(`/notifications/user/${userId}`);
            setNotifications(res.data.notifications || []);
        } catch (e) {
            console.error("Erreur chargement notifications:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect((): void => {
        if (userId) fetchNotifications();
    }, [userId]);

    const unreadCount = useMemo(
        () => notifications.filter((n) => !n.is_read).length,
        [notifications],
    );

    const handleMarkAllAsRead = async (): Promise<void> => {
        const unread = notifications.filter((n) => !n.is_read);
        if (!unread.length) return;
        try {
            setNotifications((prev) => prev.map((n) => ({...n, is_read: true})));
            // Met à jour le badge de la cloche immédiatement
            window.dispatchEvent(new CustomEvent("notificationsRead", {detail: {readAll: true}}));
            await Promise.all(unread.map((n) => apiClient.put(`/notifications/${n.id}`, {is_read: true})));
        } catch (e) {
            console.error("Erreur marquage global:", e);
            await fetchNotifications();
        }
    };

    const handleNotificationClick = async (notif: AppNotification): Promise<void> => {
        if (notif.is_read) return;
        try {
            setNotifications((prev) => prev.map((n) => n.id === notif.id ? {...n, is_read: true} : n));
            // Décrémente le badge de la cloche immédiatement
            window.dispatchEvent(new CustomEvent("notificationsRead", {detail: {readCount: 1}}));
            await apiClient.put(`/notifications/${notif.id}`, {is_read: true});
        } catch (e) {
            console.error("Erreur marquage unitaire:", e);
        }
    };

    const handleAvatarClick = async (e: React.MouseEvent, notif: AppNotification): Promise<void> => {
        e.stopPropagation();
        if (!notif.is_read) await handleNotificationClick(notif);
        if (notif.related_user_id) navigate(`/profil/${notif.related_user_id}`);
    };

    const filteredNotifications = useMemo((): AppNotification[] => {
        const sorted = [...notifications].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
        if (activeTab === "unread") return sorted.filter((n) => !n.is_read);
        if (activeTab === "mentions") return sorted.filter((n) => n.action === "mention" || n.action === "recommendation");
        return sorted;
    }, [notifications, activeTab]);

    const isToday = (dateStr: string): boolean =>
        new Date(dateStr).toDateString() === new Date().toDateString();

    const todayNotifs = filteredNotifications.filter((n) => isToday(n.created_at));
    const earlierNotifs = filteredNotifications.filter((n) => !isToday(n.created_at));

    const formatTime = (dateStr: string): string => {
        const date = new Date(dateStr);
        const now = new Date();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const time = date.toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"});
        if (date.toDateString() === now.toDateString()) return time;
        if (date.toDateString() === yesterday.toDateString()) return `${t("yesterday")}, ${time}`;
        return date.toLocaleDateString([], {day: "numeric", month: "short"});
    };

    const tabs: {key: Tab; label: string; count?: number}[] = [
        {key: "all",      label: t("tab_all")},
        {key: "unread",   label: t("tab_unread"), count: unreadCount},
        {key: "mentions", label: t("tab_mentions")},
    ];

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-canvas dark:bg-canvas transition-colors duration-300">
                <Loader2 className="animate-spin text-slate-500" size={40}/>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-canvas dark:bg-canvas text-ink font-sans transition-colors duration-300">
            <div className="max-w-2xl mx-auto px-4 py-10 md:py-14">

                {/* Header */}
                <header className="flex justify-between items-center mb-10">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-900/30">
                                <Bell size={22} className="text-white"/>
                            </div>
                            {unreadCount > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 bg-blue-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow">
                                    {unreadCount > 99 ? "99+" : unreadCount}
                                </span>
                            )}
                        </div>
                        <div>
                            <h1 className="page-title text-2xl font-extrabold text-ink tracking-tight">
                                {t("notifications_title", "Notifications")}
                            </h1>
                            <p className="text-slate-500 dark:text-muted text-sm mt-0.5">
                                {unreadCount > 0
                                    ? `${unreadCount} ${t("tab_unread").toLowerCase()}`
                                    : t("no_notifications", "Tout lu")}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleMarkAllAsRead}
                        disabled={unreadCount === 0}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                            unreadCount > 0
                                ? "bg-raised dark:bg-panel border border-line dark:border-line text-slate-200 dark:text-gray-700 hover:bg-slate-700 dark:hover:bg-gray-50 hover:border-slate-600"
                                : "bg-panel dark:bg-raised border border-line dark:border-line text-slate-600 dark:text-muted cursor-not-allowed"
                        }`}
                    >
                        <CheckCheck size={15}/>
                        <span className="hidden sm:inline">{t("mark_all_read", "Tout lire")}</span>
                    </button>
                </header>

                {/* Tabs */}
                <nav className="flex gap-0 border-b border-line dark:border-line mb-8">
                    {tabs.map(({key, label, count}) => (
                        <button
                            key={key}
                            onClick={() => setActiveTab(key)}
                            className={`relative px-5 py-3 text-sm font-semibold transition-colors duration-150 ${
                                activeTab === key
                                    ? "text-blue-400 dark:text-blue-600"
                                    : "text-slate-500 dark:text-muted hover:text-slate-200 dark:hover:text-gray-700"
                            }`}
                        >
                            {label}
                            {count !== undefined && count > 0 && (
                                <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                                    {count}
                                </span>
                            )}
                            {activeTab === key && (
                                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 dark:bg-blue-600 rounded-t-full"/>
                            )}
                        </button>
                    ))}
                </nav>

                {/* Content */}
                {filteredNotifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                        <div className="w-16 h-16 rounded-full bg-raised dark:bg-raised border border-line dark:border-line flex items-center justify-center">
                            <Bell size={28} className="text-slate-600 dark:text-muted"/>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-muted max-w-[200px] leading-relaxed">
                            {t("no_notifications")}
                        </p>
                    </div>
                ) : (
                    <main className="space-y-2">
                        {todayNotifs.length > 0 && (
                            <section>
                                <SectionHeader label={t("today")} count={todayNotifs.length}/>
                                <div className="space-y-2">
                                    {todayNotifs.map((n) => (
                                        <NotificationCard
                                            key={n.id}
                                            notification={n}
                                            onClick={() => handleNotificationClick(n)}
                                            onAvatarClick={(e) => handleAvatarClick(e, n)}
                                            formatTime={formatTime}
                                        />
                                    ))}
                                </div>
                            </section>
                        )}

                        {earlierNotifs.length > 0 && (
                            <section>
                                <SectionHeader label={t("notif_earlier")} count={earlierNotifs.length}/>
                                <div className="space-y-2">
                                    {earlierNotifs.map((n) => (
                                        <NotificationCard
                                            key={n.id}
                                            notification={n}
                                            onClick={() => handleNotificationClick(n)}
                                            onAvatarClick={(e) => handleAvatarClick(e, n)}
                                            formatTime={formatTime}
                                        />
                                    ))}
                                </div>
                            </section>
                        )}
                    </main>
                )}
            </div>
        </div>
    );
};

export default Notifications;
