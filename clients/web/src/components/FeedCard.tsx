import React, {useState, useCallback} from "react";
import {
    Sparkles,
    Star,
    Heart,
    MessageCircle,
    Music,
    PenLine,
    CheckCircle2,
    Loader2,
    Send,
    Trash,
    Share2
} from "lucide-react";
import {useTranslation} from "react-i18next";
import apiClient from "../api/client";
import UserAvatar from "./UserAvatar.tsx";
import AvatarBorder from "./AvatarBorder";
import ShareCardModal from "./ShareCardModal";
import {getPseudoFontFamily} from "../fonts.config";
import {getTextEffectClassName} from "../textEffects.config";
import {AxiosResponse} from "axios";

interface AuthorCosmetics {
    equipped_avatar_border?: string | null;
    equipped_font?: string | null;
    equipped_text_effect?: string | null;
}

export interface ReviewReply extends AuthorCosmetics {
    id: string | number;
    user: string;
    user_id?: string | number;
    user_image?: string;
    text: string;
    parent_id?: string | number | null;
    parent_user?: string;
    created_at?: string;
}

export interface ReviewComment extends AuthorCosmetics {
    id: string | number;
    user: string;
    user_id?: string | number;
    user_image?: string;
    text: string;
    created_at?: string;
    replies: ReviewReply[];
}

export interface FeedItem extends AuthorCosmetics {
    id: string;
    type: "review" | "new_album" | "recommendation";
    user_id?: string;
    user_name?: string;
    user_image?: string;
    album?: string;
    artist?: string;
    cover?: string;
    rating?: number;
    content?: string;
    title?: string;
    likes_count?: number;
    comments_count?: number;
    isLiked?: boolean;
    hasReviewed?: boolean;
    userReviewRating?: number | null;
    globalRating?: number;
    reasonType?: "favorite" | "similar" | "social" | "popular";
    review_id?: string;
    media_id?: string;
    api_id?: string;
    created_at?: string;
}

interface FeedCardProps {
    item: FeedItem;
    onLike: (id: string) => void;
    onNavigateToAlbum: (item: FeedItem) => void;
    onNavigateToProfile: (userId: string) => void;
    likingId: string | null;
    currentUserId: string | null;
    currentUserRole?: "BASIC" | "ADMIN";
}

const MAX_DEPTH = 2;

// --- FONCTIONS UTILITAIRES GLOBALES ---

function timeAgo(dateStr?: string, t?: any): string {
    if (!dateStr) return "";
    const diff: number = Date.now() - new Date(dateStr).getTime();
    const mins: number = Math.floor(diff / 60000);

    if (mins < 1) return t ? t("time_just_now") : "À l'instant";
    if (mins < 60) return t ? t("time_mins_ago", {count: mins}) : `Il y a ${mins} min`;

    const hours: number = Math.floor(mins / 60);
    if (hours < 24) return t ? t("time_hours_ago", {count: hours}) : `Il y a ${hours}h`;

    const days: number = Math.floor(hours / 24);
    if (days < 30) return t ? t("time_days_ago", {count: days}) : `Il y a ${days}j`;

    return t ? t("time_months_ago", {count: Math.floor(days / 30)}) : `Il y a ${Math.floor(days / 30)} mois`;
}

function getInitials(name?: string): string {
    if (!name) return "??";
    return name.substring(0, 2).toUpperCase();
}

function getAvatarColor(name?: string): string {
    const colors: string[] = [
        "bg-indigo-900/60 text-indigo-300",
        "bg-violet-900/60 text-violet-300",
        "bg-cyan-900/60 text-cyan-300",
        "bg-emerald-900/60 text-emerald-300",
        "bg-amber-900/60 text-amber-300",
        "bg-rose-900/60 text-rose-300",
    ];
    if (!name) return colors[0];
    return colors[name.charCodeAt(0) % colors.length];
}

function depthClass(depth: number): string {
    if (depth === 1) return "ml-6";
    if (depth >= 2) return "ml-12";
    return "";
}

function depthBorderClass(depth: number): string {
    if (depth === 1) return "border-l-[3px] border-l-[#3b82f6]";
    if (depth >= 2) return "border-l-[3px] border-l-[#a855f7]";
    return "";
}

const getAllDescendants = (parentId: string | number, allComments: ReviewReply[]): ReviewReply[] => {
    const visited = new Set<string | number>();

    const traverse = (id: string | number): ReviewReply[] => {
        if (visited.has(id)) return [];
        visited.add(id);
        const direct = allComments.filter((c) => c.parent_id === id);
        return direct.flatMap((r) => [r, ...traverse(r.id)]);
    };

    return traverse(parentId);
};

// --- COMPOSANTS INTERNES ---

const StarRating: React.FC<{ rating: number }> = ({rating}) => (
    <div className="flex items-center gap-0.5">
        {[...Array(5)].map((_, i) => (
            <Star
                key={i}
                size={16}
                className={i < rating ? "text-[#FF1E56] fill-[#FF1E56]" : "text-gray-600 dark:text-gray-300"}
            />
        ))}
    </div>
);

interface CommentItemProps {
    comment: ReviewReply;
    depth: number;
    allComments: ReviewReply[];
    currentUserId: string | null;
    isAdmin: boolean;
    activeReplyId: string | number | null;
    setActiveReplyId: (id: string | number | null) => void;
    replyInputs: { [key: string | number]: string };
    setReplyInputs: React.Dispatch<React.SetStateAction<{ [key: string | number]: string }>>;
    submittingReply: string | number | null;
    deletingId: string | number | null;
    expandedParents: (string | number)[];
    setExpandedParents: React.Dispatch<React.SetStateAction<(string | number)[]>>;
    handleSubmitReply: (parentId: string | number) => Promise<void>;
    handleDelete: (commentId: string | number) => Promise<void>;
    canDelete: (commentUserId?: string | number) => boolean;
    t: any;
}

const CommentItem: React.FC<CommentItemProps> = ({
                                                     comment,
                                                     depth,
                                                     allComments,
                                                     currentUserId,
                                                     isAdmin,
                                                     activeReplyId,
                                                     setActiveReplyId,
                                                     replyInputs,
                                                     setReplyInputs,
                                                     submittingReply,
                                                     deletingId,
                                                     expandedParents,
                                                     setExpandedParents,
                                                     handleSubmitReply,
                                                     handleDelete,
                                                     canDelete,
                                                     t,
                                                 }) => {
    // État local pour basculer sur le placeholder si l'image crash à l'affichage
    const [hasImageError, setHasImageError] = useState(false);

    const children = allComments.filter((c) => c.parent_id === comment.id);
    const isExpanded = expandedParents.includes(comment.id);
    const isReplying = activeReplyId === comment.id;
    const totalDescendants = getAllDescendants(comment.id, allComments).length;
    const isDeleting = deletingId === comment.id;

    const parentComment = comment.parent_id
        ? allComments.find((c) => c.id === comment.parent_id)
        : null;

    const replyTargetId = depth >= MAX_DEPTH && parentComment ? parentComment.id : comment.id;

    return (
        <div className={depth > 0 ? depthClass(depth) : undefined}>
            <div className={depth > 0 ? "border-l-2 border-[#2A2A38] dark:border-line pl-4" : undefined}>
                <div
                    className={`flex gap-3 bg-canvas dark:bg-canvas p-4 rounded-xl border border-line/50 dark:border-line transition-colors ${
                        depth > 0 ? depthBorderClass(depth) : ""
                    }`}
                >
                    {/* Si l'image existe et n'a pas crashé, on l'affiche. Sinon, fallback UserAvatar */}
                    <AvatarBorder borderId={comment.equipped_avatar_border} compact className="shrink-0">
                        {comment.user_image && !hasImageError ? (
                            <div
                                className={`rounded-full bg-raised dark:bg-slate-200 flex items-center justify-center font-bold text-blue-400 shrink-0 overflow-hidden ${depth === 0 ? "w-10 h-10 text-sm" : "w-8 h-8 text-xs"}`}>
                                <img
                                    src={comment.user_image}
                                    alt={comment.user}
                                    className="w-full h-full object-cover"
                                    onError={() => setHasImageError(true)} // Déclenche le fallback si l'image est introuvable
                                />
                            </div>
                        ) : (
                            <UserAvatar
                                userId={comment.user_id ? String(comment.user_id) : undefined}
                                username={comment.user}
                                sizeClass={depth === 0 ? "w-10 h-10 text-sm font-bold" : "w-8 h-8 text-xs font-bold"}
                            />
                        )}
                    </AvatarBorder>

                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1 gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span
                                    className={`font-bold text-sm ${getTextEffectClassName(comment.equipped_text_effect) || "text-ink"}`}
                                    style={{fontFamily: getPseudoFontFamily(comment.equipped_font) || undefined}}
                                >
                                    {comment.user}
                                </span>
                                {parentComment && (
                                    <span
                                        className="text-[10px] px-2 py-0.5 rounded bg-panel dark:bg-blue-50 text-[#3b82f6] font-medium border border-[#3b82f6]/20">
                                        @{parentComment.user}
                                    </span>
                                )}
                                <span className="text-gray-500 text-xs">
                                    {comment.created_at ? new Date(comment.created_at).toLocaleDateString() : ""}
                                </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    onClick={() => setActiveReplyId(isReplying ? null : comment.id)}
                                    className="text-xs text-[#3b82f6] hover:text-blue-400 font-medium transition-colors"
                                >
                                    {t("reply")}
                                </button>

                                {canDelete(comment.user_id) && (
                                    <button
                                        onClick={() => handleDelete(comment.id)}
                                        disabled={isDeleting}
                                        className="flex items-center gap-1 text-[11px] text-[#ef4444] border border-[#ef4444]/30 hover:bg-[#ef4444]/10 px-2 py-1 rounded transition-colors disabled:opacity-50"
                                    >
                                        {isDeleting ? <Loader2 size={11} className="animate-spin"/> :
                                            <Trash size={11}/>}
                                        {isAdmin && String(comment.user_id) !== String(currentUserId) ? t("delete_admin") : t("delete")}
                                    </button>
                                )}
                            </div>
                        </div>

                        <p className="text-gray-300 dark:text-muted text-sm mt-1 leading-relaxed">{comment.text}</p>
                    </div>
                </div>

                {isReplying && (
                    <div className="mt-2 mb-2 flex items-center gap-2 animate-in fade-in zoom-in duration-200">
                        <div className="flex-1 relative">
                            <input
                                type="text"
                                autoFocus
                                placeholder={t("reply_to_user", {user: comment.user})}
                                value={replyInputs[comment.id] || ""}
                                onChange={(e) => setReplyInputs((prev) => ({...prev, [comment.id]: e.target.value}))}
                                onKeyDown={(e) => e.key === "Enter" && handleSubmitReply(replyTargetId)}
                                className="w-full bg-canvas dark:bg-canvas border border-line dark:border-line rounded-full py-2 pl-4 pr-10 text-sm text-ink focus:outline-none transition-colors"
                            />
                            <button
                                onClick={() => handleSubmitReply(replyTargetId)}
                                disabled={submittingReply === comment.id}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-[#FF1E56] transition-colors p-1"
                            >
                                {submittingReply === comment.id ? <Loader2 size={16} className="animate-spin"/> :
                                    <Send size={16}/>}
                            </button>
                        </div>
                        <button onClick={() => setActiveReplyId(null)}
                                className="text-xs text-gray-500 hover:text-white dark:hover:text-gray-900 shrink-0">
                            {t("cancel_btn")}
                        </button>
                    </div>
                )}

                {children.length > 0 && (
                    <div className="mt-2 mb-1">
                        <button
                            onClick={() =>
                                setExpandedParents((prev) =>
                                    prev.includes(comment.id) ? prev.filter((id) => id !== comment.id) : [...prev, comment.id]
                                )
                            }
                            className="text-xs text-[#3b82f6] hover:text-blue-400 font-medium transition-colors"
                        >
                            {isExpanded ? t("hide_replies") : t("view_replies_count", {count: totalDescendants})}
                        </button>
                    </div>
                )}

                {isExpanded && children.length > 0 && (
                    <div className="mt-2 space-y-3 animate-in fade-in duration-200">
                        {children.map((child) => (
                            <CommentItem
                                key={String(child.id)}
                                comment={child}
                                depth={depth < MAX_DEPTH ? depth + 1 : MAX_DEPTH}
                                allComments={allComments}
                                currentUserId={currentUserId}
                                isAdmin={isAdmin}
                                activeReplyId={activeReplyId}
                                setActiveReplyId={setActiveReplyId}
                                replyInputs={replyInputs}
                                setReplyInputs={setReplyInputs}
                                submittingReply={submittingReply}
                                deletingId={deletingId}
                                expandedParents={expandedParents}
                                setExpandedParents={setExpandedParents}
                                handleSubmitReply={handleSubmitReply}
                                handleDelete={handleDelete}
                                canDelete={canDelete}
                                t={t}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};


const FeedCard: React.FC<FeedCardProps> = ({
                                               item,
                                               onLike,
                                               onNavigateToAlbum,
                                               onNavigateToProfile,
                                               likingId,
                                               currentUserId,
                                               currentUserRole = "BASIC",
                                           }) => {
    const {t} = useTranslation();
    const displayRating = item.userReviewRating ?? item.globalRating ?? item.rating ?? 0;
    const isReview = item.type === "review";
    const isNew = item.type === "new_album" || item.type === "recommendation";
    const isLiking = likingId === item.id;
    const isAdmin = currentUserRole === "ADMIN";

    const discoveryReasonText = (): string => {
        switch (item.reasonType) {
            case "favorite":
                return t("discovery_reason_favorite", {artist: item.artist});
            case "similar":
                return t("discovery_reason_similar", {artist: item.artist});
            case "social":
                return t("discovery_reason_social");
            case "popular":
                return t("discovery_reason_popular");
            default:
                return t("suggestion");
        }
    };

    const [commentsOpen, setCommentsOpen] = useState(false);
    const [allComments, setAllComments] = useState<ReviewReply[]>([]);
    const [commentsLoading, setCommentsLoading] = useState(false);
    const [commentsFetched, setCommentsFetched] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);

    const [commentInput, setCommentInput] = useState("");
    const [submittingComment, setSubmittingComment] = useState(false);
    const [activeReplyId, setActiveReplyId] = useState<string | number | null>(null);
    const [replyInputs, setReplyInputs] = useState<{ [key: string | number]: string }>({});
    const [expandedParents, setExpandedParents] = useState<(string | number)[]>([]);
    const [submittingReply, setSubmittingReply] = useState<string | number | null>(null);
    const [deletingId, setDeletingId] = useState<string | number | null>(null);

    const [mainImageError, setMainImageError] = useState(false);

    const fetchComments = useCallback(async (): Promise<void> => {
        if (!item.review_id || commentsFetched) return;
        setCommentsLoading(true);
        try {
            const response: AxiosResponse = await apiClient.get(`/review-comments/review/${item.review_id}`);
            const raw: any[] = response.data?.comments || response.data || [];

            const normalized: ReviewReply[] = raw
                .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                .map((c: any) => ({
                    id: c.id,
                    user: c.user?.pseudo || c.user?.username || c.user_name || t("anonymous"),
                    user_id: c.user?.id || c.user_id || c.userId,
                    user_image: c.user?.profile_picture || c.user?.image,
                    equipped_avatar_border: c.user?.equipped_avatar_border ?? null,
                    equipped_font: c.user?.equipped_font ?? null,
                    equipped_text_effect: c.user?.equipped_text_effect ?? null,
                    text: c.content || c.text || "",
                    parent_id: c.parent_id ?? null,
                    created_at: c.created_at,
                }));
            setAllComments(normalized);
            setCommentsFetched(true);
        } catch {
            setCommentsFetched(true);
        } finally {
            setCommentsLoading(false);
        }
    }, [item.review_id, commentsFetched, t]);

    const handleToggleComments = () => {
        const next = !commentsOpen;
        setCommentsOpen(next);
        if (next && !commentsFetched) fetchComments();
    };

    const canDelete = (commentUserId?: string | number): boolean => {
        if (isAdmin) return true;
        if (!currentUserId || !commentUserId) return false;
        return String(commentUserId) === String(currentUserId);
    };

    const handleSubmitComment = async (): Promise<void> => {
        const text = commentInput.trim();
        if (!text || !currentUserId || !item.review_id) return;
        setSubmittingComment(true);

        const tempId = `temp-${Date.now()}`;
        const tempComment: ReviewReply = {
            id: tempId,
            user: t("me"),
            user_id: currentUserId,
            text,
            parent_id: null,
            created_at: new Date().toISOString(),
        };
        setAllComments((prev) => [...prev, tempComment]);
        setCommentInput("");

        try {
            const response: AxiosResponse = await apiClient.post("/review-comments", {
                review_id: item.review_id,
                user_id: currentUserId,
                content: text,
            });
            const saved = response.data?.reviewComment || response.data;

            setAllComments((prev) =>
                prev.map((c) =>
                    c.id === tempId
                        ? {
                            id: saved.id || tempId,
                            user: saved.user?.pseudo || saved.user?.username || t("me"),
                            user_id: saved.user?.id || currentUserId,
                            user_image: saved.user?.profile_picture || saved.user?.image,
                            equipped_avatar_border: saved.user?.equipped_avatar_border ?? null,
                            equipped_font: saved.user?.equipped_font ?? null,
                            equipped_text_effect: saved.user?.equipped_text_effect ?? null,
                            text: saved.content || text,
                            parent_id: null,
                            created_at: saved.created_at || tempComment.created_at,
                        }
                        : c
                )
            );
        } catch {
            setAllComments((prev) => prev.filter((c) => c.id !== tempId));
            setCommentInput(text);
        } finally {
            setSubmittingComment(false);
        }
    };

    const handleSubmitReply = async (parentId: string | number): Promise<void> => {
        const text = (replyInputs[parentId] || "").trim();
        if (!text || !currentUserId || !item.review_id) return;
        setSubmittingReply(parentId);

        const tempId = `temp-reply-${Date.now()}`;
        const tempReply: ReviewReply = {
            id: tempId,
            user: t("me"),
            user_id: currentUserId,
            text,
            parent_id: parentId,
            created_at: new Date().toISOString(),
        };
        setAllComments((prev) => [...prev, tempReply]);
        setReplyInputs((prev) => ({...prev, [parentId]: ""}));
        setActiveReplyId(null);
        if (!expandedParents.includes(parentId)) {
            setExpandedParents((prev) => [...prev, parentId]);
        }

        try {
            const response: AxiosResponse = await apiClient.post("/review-comments", {
                review_id: item.review_id,
                user_id: currentUserId,
                content: text,
                parent_id: parentId,
            });

            const saved = response.data?.reviewComment || response.data;
            setAllComments((prev) =>
                prev.map((c) =>
                    c.id === tempId
                        ? {
                            id: saved.id || tempId,
                            user: saved.user?.pseudo || saved.user?.username || t("me"),
                            user_id: saved.user?.id || currentUserId,
                            user_image: saved.user?.profile_picture || saved.user?.image,
                            equipped_avatar_border: saved.user?.equipped_avatar_border ?? null,
                            equipped_font: saved.user?.equipped_font ?? null,
                            equipped_text_effect: saved.user?.equipped_text_effect ?? null,
                            text: saved.content || text,
                            parent_id: parentId,
                            created_at: saved.created_at || tempReply.created_at,
                        }
                        : c
                )
            );
        } catch {
            setAllComments((prev) => prev.filter((c) => c.id !== tempId));
        } finally {
            setSubmittingReply(null);
        }
    };

    const handleDelete = async (commentId: string | number): Promise<void> => {
        setDeletingId(commentId);
        try {
            await apiClient.delete(`/review-comments/${commentId}`);

            const collectDescendants = (id: string | number, comments: ReviewReply[]): (string | number)[] => {
                const children = comments.filter((c) => c.parent_id === id);
                return [id, ...children.flatMap((child) => collectDescendants(child.id, comments))];
            };

            const toRemove = new Set(collectDescendants(commentId, allComments));
            setAllComments((prev) => prev.filter((c) => !toRemove.has(c.id)));
        } catch {
        } finally {
            setDeletingId(null);
        }
    };

    const rootComments = allComments.filter((c) => !c.parent_id);

    return (
        <>
        <div
            className="bg-panel dark:bg-panel rounded-xl p-6 border border-line dark:border-line shadow-sm transition-colors">
            <div className="flex items-center justify-between mb-5">
                <button
                    onClick={() => item.user_id && onNavigateToProfile(item.user_id)}
                    className="flex items-center gap-4 hover:opacity-80 transition-opacity"
                >
                    <AvatarBorder borderId={item.equipped_avatar_border} compact>
                        {item.user_image && !mainImageError ? (
                            <img
                                src={item.user_image}
                                alt={item.user_name}
                                className="w-12 h-12 rounded-full object-cover"
                                onError={() => setMainImageError(true)}
                            />
                        ) : (
                            <div
                                className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                                    isNew ? "bg-pink-900/50 text-pink-300 dark:bg-pink-100 dark:text-pink-600" : getAvatarColor(item.user_name)
                                }`}
                            >
                                {isNew ? <Sparkles size={18}/> : getInitials(item.user_name)}
                            </div>
                        )}
                    </AvatarBorder>
                    <div className="text-left">
                        <p className="font-bold">
                            <span
                                className={getTextEffectClassName(item.equipped_text_effect) || "text-ink"}
                                style={{fontFamily: getPseudoFontFamily(item.equipped_font) || undefined}}
                            >
                                {item.user_name || t("recommendation")}
                            </span>
                            <span className="text-muted dark:text-muted font-normal text-sm ml-1">
                                {isReview ? t("wrote_review") : t("new_album")}
                            </span>
                        </p>
                        <p className="text-gray-500 dark:text-muted text-sm">{isNew ? discoveryReasonText() : timeAgo(item.created_at, t)}</p>
                    </div>
                </button>

                {isReview && item.rating != null && (
                    <div
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-canvas dark:bg-canvas rounded-lg border border-line dark:border-line">
                        <Star size={13} className="text-[#FF1E56] fill-[#FF1E56]"/>
                        <span className="text-ink text-sm font-bold">{item.rating}/5</span>
                    </div>
                )}
            </div>

            <button
                onClick={() => onNavigateToAlbum(item)}
                className="w-full text-left flex items-center gap-5 bg-canvas dark:bg-canvas p-4 rounded-xl border border-line/50 dark:border-line hover:border-line dark:hover:border-gray-300 transition-all mb-5 pr-8"
            >
                {item.cover ? (
                    <img src={item.cover} alt={item.album}
                         className="w-20 h-20 rounded-md object-cover shadow-md shrink-0"/>
                ) : (
                    <div
                        className="w-20 h-20 rounded-md bg-raised dark:bg-gray-200 flex items-center justify-center shrink-0">
                        <Music size={28} className="text-gray-600"/>
                    </div>
                )}
                <div>
                    <h3 className="font-bold text-lg text-ink mb-1">{item.album}</h3>
                    <p className="text-muted dark:text-muted text-sm mb-2">{item.artist}</p>
                    <div className="flex items-center gap-2">
                        <StarRating rating={displayRating}/>
                        {item.hasReviewed && <span
                            className="text-[9px] font-bold text-[#FF1E56] tracking-wider">{t("your_rating")}</span>}
                    </div>
                </div>
            </button>

            {isReview && item.content &&
                <p className="text-gray-200 dark:text-gray-700 leading-relaxed text-[15px] mb-6">{item.content}</p>}

            <div className="h-px w-full bg-raised dark:bg-gray-200 mb-4"/>

            <div className="flex items-center gap-6">
                {isReview ? (
                    <>
                        <button
                            onClick={() => onLike(item.id)}
                            disabled={isLiking}
                            className={`flex items-center gap-2 text-sm font-semibold transition-colors ${
                                item.isLiked ? "text-[#FF1E56]" : "text-muted dark:text-muted hover:text-[#FF1E56]"
                            }`}
                        >
                            {isLiking ? <Loader2 size={18} className="animate-spin"/> :
                                <Heart size={18} className={item.isLiked ? "fill-[#FF1E56]" : ""}/>}
                            {item.likes_count ?? 0}
                        </button>

                        <button
                            onClick={handleToggleComments}
                            className={`flex items-center gap-2 text-sm font-semibold transition-colors ${
                                commentsOpen ? "text-ink" : "text-muted dark:text-muted hover:text-white dark:hover:text-gray-900"
                            }`}
                        >
                            <MessageCircle size={18}/>
                            {item.comments_count ?? 0}
                        </button>

                        <button
                            onClick={() => setShowShareModal(true)}
                            className="flex items-center gap-2 text-sm font-semibold text-muted dark:text-muted hover:text-white dark:hover:text-gray-900 transition-colors"
                        >
                            <Share2 size={18}/>
                        </button>
                    </>
                ) : (
                    <button
                        onClick={() => onNavigateToAlbum(item)}
                        className={`flex items-center gap-2 text-sm font-semibold transition-colors ${
                            item.hasReviewed ? "text-emerald-400" : "text-[#FF1E56] hover:text-[#ff4d77]"
                        }`}
                    >
                        {item.hasReviewed ? <CheckCircle2 size={18}/> : <PenLine size={18}/>}
                        {item.hasReviewed ? t("already_rated") : t("write_review")}
                    </button>
                )}
            </div>

            {commentsOpen && (
                <div
                    className="mt-6 pt-4 border-t border-line/50 dark:border-line animate-in fade-in duration-200">
                    <div className="space-y-4 mb-4">
                        {commentsLoading ? (
                            <div className="flex items-center gap-2 text-gray-500 text-sm py-2">
                                <Loader2 size={14} className="animate-spin"/> {t("loading")}
                            </div>
                        ) : rootComments.length === 0 ? (
                            <p className="text-gray-600 dark:text-muted text-sm py-2">{t("no_comments")}</p>
                        ) : (
                            rootComments.map((comment) => (
                                <CommentItem
                                    key={String(comment.id)}
                                    comment={comment}
                                    depth={0}
                                    allComments={allComments}
                                    currentUserId={currentUserId}
                                    isAdmin={isAdmin}
                                    activeReplyId={activeReplyId}
                                    setActiveReplyId={setActiveReplyId}
                                    replyInputs={replyInputs}
                                    setReplyInputs={setReplyInputs}
                                    submittingReply={submittingReply}
                                    deletingId={deletingId}
                                    expandedParents={expandedParents}
                                    setExpandedParents={setExpandedParents}
                                    handleSubmitReply={handleSubmitReply}
                                    handleDelete={handleDelete}
                                    canDelete={canDelete}
                                    t={t}
                                />
                            ))
                        )}
                    </div>

                    <div className="flex items-center gap-3 mt-4">
                        <UserAvatar userId={currentUserId || undefined} username={t("me")}
                                    sizeClass="w-10 h-10 text-sm font-bold"/>
                        <div className="flex-1 relative">
                            <input
                                type="text"
                                placeholder={t("comment_placeholder")}
                                value={commentInput}
                                onChange={(e) => setCommentInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSubmitComment()}
                                className="w-full bg-canvas dark:bg-canvas border border-line dark:border-line rounded-full py-3 pl-4 pr-12 text-sm text-ink focus:outline-none transition-colors shadow-inner"
                            />
                            <button
                                onClick={handleSubmitComment}
                                disabled={submittingComment}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-[#FF1E56] transition-colors p-1"
                            >
                                {submittingComment ? <Loader2 size={18} className="animate-spin"/> : <Send size={18}/>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>

        {showShareModal && (
            <ShareCardModal
                data={{
                    artist: item.artist || "",
                    album: item.album || "",
                    cover: item.cover,
                    rating: item.rating ?? 0,
                    title: item.title,
                    content: item.content,
                    userName: item.user_name || "Utilisateur",
                    userImage: item.user_image,
                }}
                onClose={() => setShowShareModal(false)}
            />
        )}
        </>
    );
};

export default FeedCard;
