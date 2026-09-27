import {Award, Bell, Check, Heart, Headphones, ListMusic, MessageCircle, MessageSquare, Sparkles, Star, UserPlus} from "lucide-react";
import {useTranslation} from "react-i18next";
import {Link} from "react-router-dom";
import AvatarBorder from "../AvatarBorder";

export interface AppNotification {
    id: string;
    action: string;
    is_read: boolean;
    created_at: string;
    related_user_id?: string | null;
    related_user?: {username: string; pseudo?: string | null; profile_image?: string | null; equipped_avatar_border?: string | null} | null;
}

const styles = {
    like_added: {Icon: Heart, color: "text-rose-500", bg: "bg-rose-500/10"},
    comment_added: {Icon: MessageCircle, color: "text-emerald-500", bg: "bg-emerald-500/10"},
    review_added: {Icon: Star, color: "text-amber-500", bg: "bg-amber-500/10"},
    new_message: {Icon: MessageSquare, color: "text-blue-500", bg: "bg-blue-500/10"},
    new_follow: {Icon: UserPlus, color: "text-violet-500", bg: "bg-violet-500/10"},
    recommendation: {Icon: Sparkles, color: "text-cyan-500", bg: "bg-cyan-500/10"},
    badge_earned: {Icon: Award, color: "text-amber-500", bg: "bg-amber-500/10"},
    playlist_collaborator_added: {Icon: ListMusic, color: "text-indigo-500", bg: "bg-indigo-500/10"},
    room_invited: {Icon: Headphones, color: "text-violet-500", bg: "bg-violet-500/10"},
};

export default function NotificationItem({notification, busy, onRead}: {
    notification: AppNotification; busy: boolean; onRead: () => void;
}) {
    const {t, i18n} = useTranslation();
    const actor = notification.related_user;
    const name = actor?.pseudo || actor?.username || t("inbox_system");
    const {Icon, color, bg} = styles[notification.action as keyof typeof styles] || {Icon: Bell, color: "text-muted", bg: "bg-raised"};
    const date = new Date(notification.created_at);
    const description = t(`notification_action_${notification.action}`, {username: name, defaultValue: t("inbox_generic")});
    const avatar = <AvatarBorder borderId={actor?.equipped_avatar_border} compact>
        <span className={`flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center overflow-hidden rounded-full font-bold ${bg} ${color}`}>
            {actor?.profile_image ? <img src={actor.profile_image} alt="" className="h-full w-full object-cover" loading="lazy"/> : actor ? name.charAt(0).toUpperCase() : <Icon size={21} aria-hidden="true"/>}
        </span>
    </AvatarBorder>;
    return <li className={`group flex items-start gap-3 sm:gap-4 px-4 sm:px-6 py-5 transition-colors ${notification.is_read ? "bg-panel" : "bg-violet-500/[0.045]"}`}>
        <div className="relative shrink-0 mt-0.5">
            {notification.related_user_id ? <Link to={`/profil/${notification.related_user_id}`} aria-label={t("inbox_profile", {name})} className="block rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-500">{avatar}</Link> : avatar}
            {actor && <span aria-hidden="true" className={`absolute -bottom-1 -right-1 rounded-full border-2 border-panel p-1 ${bg} ${color}`}><Icon size={12}/></span>}
        </div>
        <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-1">
                <span className="text-sm font-semibold text-ink break-words">{name}</span>
                <time dateTime={notification.created_at} title={date.toLocaleString(i18n.language)} className="text-xs text-muted tabular-nums">{date.toLocaleTimeString(i18n.language, {hour: "2-digit", minute: "2-digit"})}</time>
                {!notification.is_read && <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-accent"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-violet-500"/>{t("inbox_new")}</span>}
            </div>
            <p className={`text-sm leading-relaxed break-words ${notification.is_read ? "text-muted" : "text-ink"}`}>{description}</p>
        </div>
        <button type="button" onClick={onRead} disabled={notification.is_read || busy} title={t(notification.is_read ? "inbox_read" : "inbox_mark_read")} aria-label={t(notification.is_read ? "inbox_read" : "inbox_mark_read")}
            className={`mt-1 shrink-0 rounded-full p-2 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500 ${notification.is_read ? "text-muted opacity-35" : "text-accent bg-violet-500/10 hover:bg-violet-500/20 disabled:opacity-40"}`}><Check size={17} aria-hidden="true"/>
        </button>
    </li>;
}
