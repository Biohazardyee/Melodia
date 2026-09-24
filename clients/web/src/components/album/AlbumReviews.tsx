import { Edit3, Flag, Heart, MessageCircle, Trash2 } from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";
import {
    FaPaperPlane,
    FaStar
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import AvatarBorder from "../../components/AvatarBorder";
import UserAvatar from "../../components/UserAvatar";
import { getPseudoFontFamily } from "../../fonts.config";
import { getTextEffectClassName } from "../../textEffects.config";

interface Props {
    commentsList: any[];
    editingCommentId: string | number | null;
    editHoverRating: number;
    editRating: number;
    setEditHoverRating: React.Dispatch<React.SetStateAction<number>>;
    setEditRating: React.Dispatch<React.SetStateAction<number>>;
    editTitle: string;
    setEditTitle: React.Dispatch<React.SetStateAction<string>>;
    editText: string;
    setEditText: React.Dispatch<React.SetStateAction<string>>;
    cancelEditing: () => void;
    saveEdit: (commentId: number | string) => Promise<void>;
    isEditInvalid: boolean;
    isMyComment: (comment: any) => boolean;
    startEditing: (comment: any) => void;
    deleteComment: (commentId: number | string) => Promise<void>;
    setReportingReviewId: React.Dispatch<React.SetStateAction<string | number | null>>;
    setIsReportModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
    formatReviewDate: (dateStr: string | undefined) => string;
    handleToggleLike: (commentId: number | string) => Promise<void>;
    likedCommentIds: Set<string | number>;
    setActiveReplyId: React.Dispatch<React.SetStateAction<string | number | null>>;
    activeReplyId: string | number | null;
    toggleReplies: (commentId: number | string) => void;
    expandedReplies: any[];
    replyInputs: { [key: string]: string; };
    setReplyInputs: React.Dispatch<React.SetStateAction<{ [key: string]: string; }>>;
    submitReply: (reviewId: number | string, parentCommentId?: number | string) => Promise<void>;
    organizeComments: (comments: any[]) => any[];
    getReplyDepth: (reply: any, allComments: any[]) => number;
    setActiveNestedReplyId: React.Dispatch<React.SetStateAction<string | number | null>>;
    activeNestedReplyId: string | number | null;
    deleteReply: (replyId: number | string) => Promise<void>;
    setReportingCommentId: React.Dispatch<React.SetStateAction<string | null>>;
}

export default function AlbumReviews({
        commentsList,
        editingCommentId,
        editHoverRating,
        editRating,
        setEditHoverRating,
        setEditRating,
        editTitle,
        setEditTitle,
        editText,
        setEditText,
        cancelEditing,
        saveEdit,
        isEditInvalid,
        isMyComment,
        startEditing,
        deleteComment,
        setReportingReviewId,
        setIsReportModalOpen,
        formatReviewDate,
        handleToggleLike,
        likedCommentIds,
        setActiveReplyId,
        activeReplyId,
        toggleReplies,
        expandedReplies,
        replyInputs,
        setReplyInputs,
        submitReply,
        organizeComments,
        getReplyDepth,
        setActiveNestedReplyId,
        activeNestedReplyId,
        deleteReply,
        setReportingCommentId,
    }: Props) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    return (
        <div className="space-y-6">
            {commentsList.map((comment) => (
                <div
                    key={comment.id}
                    className="bg-panel dark:bg-panel p-8 rounded-2xl border border-line/50 dark:border-line relative"
                >
                    {editingCommentId === comment.id ? (
                        <div className="flex flex-col gap-5">
                            <h4 className="text-lg font-bold italic">
                                {t("edit_comment")}
                            </h4>
                            <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <FaStar
                                        key={star}
                                        size={20}
                                        className={`cursor-pointer ${(editHoverRating || editRating) >= star ? "text-[#FF1E56]" : "text-gray-700"}`}
                                        onMouseEnter={() =>
                                            setEditHoverRating(star)
                                        }
                                        onMouseLeave={() => setEditHoverRating(0)}
                                        onClick={() => setEditRating(star)}
                                    />
                                ))}
                            </div>
                            <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                className="w-full bg-panel dark:bg-canvas border p-4 text-sm rounded-xl focus:outline-none"
                            />
                            <textarea
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                className="w-full bg-panel dark:bg-canvas border p-4 text-sm rounded-xl min-h-[100px] resize-none focus:outline-none"
                            />
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={cancelEditing}
                                    className="px-4 py-2 text-sm font-bold text-muted"
                                >
                                    {t("cancel")}
                                </button>
                                <button
                                    onClick={() => saveEdit(comment.id)}
                                    disabled={isEditInvalid}
                                    className="px-6 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg"
                                >
                                    {t("save")}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Actions directes */}
                            <div className="absolute top-6 right-6 flex items-center gap-2">
                                {isMyComment(comment) ? (
                                    <>
                                        {/* Bouton Modifier */}
                                        <button
                                            onClick={() => startEditing(comment)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-muted dark:text-muted hover:text-blue-400 dark:hover:text-blue-600 bg-raised/40 dark:bg-raised hover:bg-blue-500/10 dark:hover:bg-blue-50 rounded-lg transition-all border border-line/50 dark:border-line hover:border-blue-500/20 dark:hover:border-blue-300"
                                        >
                                            <Edit3 size={13} />
                                            <span>{t("modify")}</span>
                                        </button>

                                        {/* Bouton Supprimer */}
                                        <button
                                            onClick={() => deleteComment(comment.id)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-muted dark:text-rose-600 hover:text-rose-500 dark:hover:text-rose-700 bg-raised/40 dark:bg-rose-50 hover:bg-rose-500/10 dark:hover:bg-rose-100 rounded-lg transition-all border border-line/50 dark:border-rose-200 hover:border-rose-500/20 dark:hover:border-rose-300"
                                        >
                                            <Trash2 size={13} />
                                            <span>{t("delete")}</span>
                                        </button>
                                    </>
                                ) : (
                                    /* Bouton de signalement pour les avis des autres */
                                    <button
                                        onClick={() => {
                                            setReportingReviewId(comment.id);
                                            setIsReportModalOpen(true);
                                        }}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-muted dark:text-muted hover:text-rose-500 dark:hover:text-rose-600 bg-raised/40 dark:bg-raised hover:bg-rose-500/10 dark:hover:bg-rose-50 rounded-lg transition-all border border-line/50 dark:border-line hover:border-rose-500/20 dark:hover:border-rose-300"
                                        title={t("report_review", "Signaler cet avis")}
                                    >
                                        <Flag size={13} />
                                        <span>{t("report", "Signaler")}</span>
                                    </button>
                                )}
                            </div>

                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-4">
                                    <div
                                        onClick={() => comment.user?.id && navigate(`/profil/${comment.user.id}`)}
                                        className="cursor-pointer transition-transform hover:scale-105"
                                    >
                                        <AvatarBorder borderId={comment.user?.equipped_avatar_border} compact>
                                            <UserAvatar
                                                userId={comment.user?.id || comment.user_id}
                                                username={comment.user?.pseudo || comment.user?.username}
                                                sizeClass="w-10 h-10 text-sm"
                                            />
                                        </AvatarBorder>
                                    </div>

                                    <div>
                                        {/* On aligne le nom et les étoiles sur la même ligne */}
                                        <div className="flex items-center gap-3">
                                            <h4
                                                onClick={() => comment.user?.id && navigate(`/profil/${comment.user.id}`)}
                                                className={`font-bold hover:underline cursor-pointer ${getTextEffectClassName(comment.user?.equipped_text_effect) || "text-gray-100 dark:text-gray-900"}`}
                                                style={{ fontFamily: getPseudoFontFamily(comment.user?.equipped_font) || undefined }}
                                            >
                                                {comment.user?.pseudo || comment.user?.username || "Anonyme"}
                                            </h4>

                                            {/* Les étoiles migrent ici, plus aucun risque de collision ! */}
                                            <div
                                                className="flex text-[#FF1E56] gap-0.5">
                                                {[...Array(5)].map((_, i) => (
                                                    <FaStar
                                                        key={i}
                                                        size={14}
                                                        className={i < comment.rating ? "text-[#FF1E56]" : "text-gray-700"}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-500 font-medium">
                                            {formatReviewDate(comment.created_at)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {comment.title && (
                                <h5 className="text-lg font-bold mb-3 italic tracking-wide uppercase">
                                    {comment.title}
                                </h5>
                            )}
                            <p className="text-muted dark:text-muted text-sm leading-relaxed mb-6 italic">
                                {comment.content || comment.text}
                            </p>

                            <div
                                className="flex gap-6 text-gray-500 text-sm items-center">
                                <button
                                    onClick={() => handleToggleLike(comment.id)}
                                    className="flex items-center gap-2 transition-colors"
                                >
                                    <Heart
                                        size={14}
                                        className={
                                            likedCommentIds.has(comment.id)
                                                ? "text-[#FF1E56] fill-[#FF1E56]"
                                                : "text-gray-500"
                                        }
                                    />
                                    {comment.likes?.length || 0}
                                </button>
                                <button
                                    onClick={() =>
                                        setActiveReplyId(activeReplyId === comment.id ? null : comment.id)
                                    }
                                    className="flex items-center gap-2"
                                >
                                    <MessageCircle size={14} />
                                    {comment.reviewComments?.length || 0} {t("reply")}
                                </button>

                                {comment.reviewComments?.length > 0 && (
                                    <button
                                        onClick={() => toggleReplies(comment.id)}
                                        className="text-xs text-blue-500 ml-auto"
                                    >
                                        {expandedReplies.includes(comment.id)
                                            ? t("hide_replies")
                                            : t("show_replies", { count: comment.reviewComments.length })}
                                    </button>
                                )}
                            </div>

                            {/* Champ de saisie interactif pour les réponses */}
                            {activeReplyId === comment.id && (
                                <div
                                    className="mt-4 pt-4 border-t border-line/50 dark:border-line">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            autoFocus
                                            placeholder={t("reply_to", { user: comment.user?.pseudo || comment.user?.username || "Anonyme" })}
                                            value={replyInputs[String(comment.id)] || ""}
                                            onChange={(e) =>
                                                setReplyInputs({
                                                    ...replyInputs,
                                                    [String(comment.id)]: e.target.value
                                                })
                                            }
                                            onKeyDown={(e) => e.key === "Enter" && submitReply(comment.id)}
                                            className="flex-1 bg-panel dark:bg-canvas border border-line dark:border-line p-2.5 text-sm rounded-xl focus:outline-none focus:border-blue-500"
                                        />
                                        <button
                                            onClick={() => submitReply(comment.id)}
                                            className="flex items-center justify-center w-10 h-10 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors shrink-0"
                                        >
                                            <FaPaperPlane size={13} />
                                        </button>
                                        <button
                                            onClick={() => setActiveReplyId(null)}
                                            className="text-sm font-semibold text-gray-500 hover:text-gray-300 px-2 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Réponses */}
                            {expandedReplies.includes(comment.id) && comment.reviewComments && (
                                <div
                                    className="mt-4 border-l-2 border-line dark:border-line ml-2 pl-4 flex flex-col gap-2">
                                    {/* MODIFICATION ICI : On englobe avec organizeComments */}
                                    {organizeComments(comment.reviewComments).map((reply: any) => {
                                        const depth = getReplyDepth(reply, comment.reviewComments);
                                        const isNested = depth > 0;
                                        const parentComment = isNested
                                            ? comment.reviewComments.find((c: any) => c.id === reply.parent_id)
                                            : null;

                                        return (
                                            <div key={reply.id}>
                                                {/* ✅ Indentation si réponse imbriquée */}
                                                <div
                                                    className={depth === 1 ? "ml-6" : depth === 2 ? "ml-12" : ""}>
                                                    <div
                                                        className={`
                                        bg-panel dark:bg-panel rounded-xl p-3 text-sm
                                        flex justify-between items-start gap-3
                                        border border-line/60 dark:border-line
                                        ${depth === 1 ? "border-l-2 border-l-blue-500" : ""}
                                        ${depth === 2 ? "border-l-2 border-l-purple-500" : ""}
                                      `}
                                                    >
                                                        <div
                                                            className="flex items-start gap-2 min-w-0">
                                                            {/* Mini avatar */}
                                                            <AvatarBorder borderId={reply.user?.equipped_avatar_border} compact>
                                                                <UserAvatar
                                                                    userId={reply.user?.id || reply.user_id}
                                                                    username={reply.user?.pseudo || reply.user?.username}
                                                                    sizeClass="w-7 h-7 text-[10px]"
                                                                />
                                                            </AvatarBorder>
                                                            <div className="min-w-0">
                                                                <div
                                                                    className="flex items-center gap-2 flex-wrap mb-1">
                                                                    <span
                                                                        className={`font-bold text-xs ${getTextEffectClassName(reply.user?.equipped_text_effect) || "text-blue-400"}`}
                                                                        style={{ fontFamily: getPseudoFontFamily(reply.user?.equipped_font) || undefined }}
                                                                    >
                                                                        {reply.user?.pseudo || reply.user?.username || "Anonyme"}
                                                                    </span>
                                                                    {/* ✅ Mention @parent si réponse imbriquée */}
                                                                    {parentComment && (
                                                                        <span
                                                                            className="text-xs bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded">
                                                                            @{parentComment.user?.username || "Anonyme"}
                                                                        </span>
                                                                    )}
                                                                    <span
                                                                        className="text-gray-600 dark:text-muted text-[11px]">
                                                                        {formatReviewDate(reply.created_at)}
                                                                    </span>
                                                                </div>
                                                                <p className="text-gray-300 dark:text-muted leading-snug">
                                                                    {reply.content}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-2 shrink-0 mt-0.5">
                                                            <button
                                                                onClick={() =>
                                                                    setActiveNestedReplyId(
                                                                        activeNestedReplyId === reply.id ? null : reply.id
                                                                    )
                                                                }
                                                                className="text-xs text-blue-500 dark:text-blue-600 hover:text-blue-400 dark:hover:text-blue-700"
                                                            >
                                                                {t("reply")}
                                                            </button>

                                                            {/* Si c'est mon commentaire : Supprimer, sinon : Signaler */}
                                                            {isMyComment(reply) ? (
                                                                <button
                                                                    onClick={() => deleteReply(reply.id)}
                                                                    className="flex items-center gap-1 text-xs text-rose-400 dark:text-rose-600 hover:text-white dark:hover:text-white bg-rose-500/10 dark:bg-rose-100 hover:bg-rose-600 dark:hover:bg-rose-500 px-2 py-1 rounded-lg transition-colors border border-rose-500/20 dark:border-rose-300"
                                                                >
                                                                    <Trash2 size={11} />
                                                                    {t("delete") || "Supprimer"}
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={() => {
                                                                        setReportingCommentId(reply.id);
                                                                        setReportingReviewId(null);
                                                                        setIsReportModalOpen(true);
                                                                    }}
                                                                    className="flex items-center gap-1 text-xs text-slate-500 dark:text-muted hover:text-rose-500 dark:hover:text-rose-600 transition-colors"
                                                                    title={t("report_comment", "Signaler ce commentaire")}
                                                                >
                                                                    <Flag size={11} />
                                                                    <span>{t("report", "Signaler")}</span>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Input réponse imbriquée */}
                                                    {activeNestedReplyId === reply.id && (
                                                        <div
                                                            className={`mt-2 ${depth === 1 ? "ml-[3.75rem]" : depth === 2 ? "ml-[5.25rem]" : "ml-9"}`}>
                                                            <div
                                                                className="flex items-center gap-2">
                                                                <input
                                                                    type="text"
                                                                    autoFocus
                                                                    placeholder={`Répondre à ${reply.user?.pseudo || reply.user?.username || "Anonyme"}...`}
                                                                    value={replyInputs[String(reply.id)] || ""}
                                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                                        setReplyInputs({
                                                                            ...replyInputs,
                                                                            [String(reply.id)]: e.target.value
                                                                        })
                                                                    }
                                                                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>): void => {
                                                                        if (e.key === "Enter") {
                                                                            submitReply(comment.id, reply.id);
                                                                        }
                                                                    }}
                                                                    className="flex-1 bg-panel dark:bg-canvas border border-line dark:border-line p-2 text-sm rounded-xl focus:outline-none focus:border-blue-500"
                                                                />
                                                                <button
                                                                    onClick={() => submitReply(comment.id, reply.id)}
                                                                    className="flex items-center justify-center w-9 h-9 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors shrink-0"
                                                                >
                                                                    <FaPaperPlane
                                                                        size={11} />
                                                                </button>
                                                                <button
                                                                    onClick={() => setActiveNestedReplyId(null)}
                                                                    className="text-xs font-semibold text-gray-500 hover:text-gray-300 px-2 transition-colors"
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}
                </div>
            ))}
        </div>
    );
}
