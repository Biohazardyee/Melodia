import { AxiosResponse } from "axios";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import apiClient from "../api/client";
import { useConfirm } from "../context/ConfirmContext";

export function useAlbumReviews(mediaIdInDB: string | null, currentUserId: string | null, requireAuth: () => boolean) {
    const { t } = useTranslation();
    const confirm = useConfirm();
    const navigate = useNavigate();

    const formatReviewDate = (dateStr: string | undefined): string => {
        const date = new Date(dateStr || Date.now());
        const now = new Date();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        if (date.toDateString() === now.toDateString()) return `${t("today")} · ${time}`;
        if (date.toDateString() === yesterday.toDateString()) return `${t("yesterday")} · ${time}`;
        return date.toLocaleDateString();
    };

    const [likedCommentIds, setLikedCommentIds] = useState<Set<string | number>>(new Set());

    const [activeNestedReplyId, setActiveNestedReplyId] = useState<number | string | null>(null);

    const [commentsList, setCommentsList] = useState<any[]>([]);

    const [loadingReviews, setLoadingReviews] = useState(false);

    const [userRating, setUserRating] = useState(0);

    const [hoverRating, setHoverRating] = useState(0);

    const [commentTitle, setCommentTitle] = useState("");

    const [commentText, setCommentText] = useState("");

    const [editingCommentId, setEditingCommentId] = useState<
        number | string | null
    >(null);

    const [editTitle, setEditTitle] = useState("");

    const [editText, setEditText] = useState("");

    const [editRating, setEditRating] = useState(0);

    const [editHoverRating, setEditHoverRating] = useState(0);

    const [activeReplyId, setActiveReplyId] = useState<number | string | null>(
        null,
    );

    const [replyInputs, setReplyInputs] = useState<{ [key: string]: string }>({});

    const [expandedReplies, setExpandedReplies] = useState<any[]>([]);

    useEffect((): void => {
        if (mediaIdInDB) {
            fetchReviews();
        }
    }, [mediaIdInDB]);

    const isMyComment = (comment: any): boolean => {
        if (!currentUserId || !comment) return false;

        const cUserId =
            comment.user_id ||
            comment.userId ||
            comment.user?.id ||
            comment.user?._id;

        if (!cUserId) return false;

        return String(cUserId).toLowerCase() === String(currentUserId).toLowerCase();
    };

    const hasAlreadyReviewed: boolean = commentsList.some((comment) =>
        isMyComment(comment),
    );

    const fetchReviews: () => Promise<void> = async (): Promise<void> => {
        if (!mediaIdInDB) return;
        try {
            setLoadingReviews(true);
            const res: AxiosResponse<any, any> = await apiClient.get(`/reviews/media/${mediaIdInDB}`);
            const mediaReviews = res.data.reviews || [];
            const reviewsWithComments: any[] = await Promise.all(
                mediaReviews.map(async (rev: any): Promise<any> => {
                    try {
                        const commentsRes: AxiosResponse<any, any> = await apiClient.get(`/review-comments/review/${rev.id}`);

                        const allComments = commentsRes.data.comments || commentsRes.data || [];

                        const sorted: any[] = [...allComments].sort(
                            (a: any, b: any): number =>
                                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                        );

                        return { ...rev, reviewComments: sorted };
                    } catch {
                        return { ...rev, reviewComments: [] };
                    }
                })
            );
            setCommentsList(reviewsWithComments);

            if (currentUserId) {
                const liked: Set<string | number> = new Set<string | number>();
                reviewsWithComments.forEach((rev: any) => {
                    const userHasLiked = rev.isLiked || (Array.isArray(rev.likes) && rev.likes.some((like: any) => {
                        const uid = like?.user_id || like?.userId || like?.id || like;
                        return String(uid).toLowerCase() === String(currentUserId).toLowerCase();
                    }));

                    if (userHasLiked) {
                        liked.add(rev.id);
                    }
                });
                setLikedCommentIds(liked);
            }
        } catch (err) {
            console.error("Erreur récupération des avis par média:", err);
        } finally {
            setLoadingReviews(false);
        }
    };

    const isFormInvalid: boolean =
        userRating === 0 || commentTitle.trim() === "" || commentText.trim() === "";

    const isEditInvalid: boolean =
        editRating === 0 || editTitle.trim() === "" || editText.trim() === "";

    const submitMainComment = async (): Promise<void> => {
        if (isFormInvalid || hasAlreadyReviewed) return;
        if (!mediaIdInDB) return;

        if (!currentUserId) {
            toast.error(t("review_auth_required", "Vous devez être connecté pour publier un avis."));
            navigate("/login");
            return;
        }

        try {
            const res = await apiClient.post("/reviews", {
                user_id: currentUserId,
                media_id: mediaIdInDB,
                title: commentTitle.trim(),
                content: commentText.trim(),
                rating: userRating,
            });

            const newReview = res.data.review || res.data;

            const formattedReview = {
                ...newReview,
                reviewComments: [],
                likes: [],
                user: newReview.user || { id: currentUserId, username: "Moi" }
            };

            setCommentsList((prev) => [formattedReview, ...prev]);

            setCommentTitle("");
            setCommentText("");
            setUserRating(0);

            const pointsEarned: number = res.data.points_earned ?? 0;
            if (pointsEarned > 0) {
                toast.success(
                    t("review_published_points", {
                        defaultValue: "Critique publiée ! +{{points}} points boutique 🎉",
                        points: pointsEarned,
                    })
                );
            } else {
                toast.success(t("review_published", "Critique publiée !"));
            }

        } catch (err) {
            console.error("Erreur lors de la publication de l'avis:", err);
            toast.error(t("review_publish_error", "Impossible de publier l'avis. Veuillez réessayer."));
        }
    };

    const startEditing = (comment: any) => {
        setEditingCommentId(comment.id);
        setEditTitle(comment.title || "");
        setEditText(comment.content || comment.text);
        setEditRating(comment.rating);
    };

    const cancelEditing = () => {
        setEditingCommentId(null);
        setEditTitle("");
        setEditText("");
        setEditRating(0);
    };

    const saveEdit = async (commentId: number | string): Promise<void> => {
        if (isEditInvalid) return;

        setCommentsList((prev) => prev.map(comment =>
            comment.id === commentId
                ? { ...comment, title: editTitle.trim(), content: editText.trim(), rating: editRating }
                : comment
        ));

        const currentEditTitle = editTitle;
        const currentEditText = editText;
        const currentEditRating = editRating;

        cancelEditing();

        try {
            await apiClient.put(`/reviews/${commentId}`, {
                title: currentEditTitle.trim(),
                content: currentEditText.trim(),
                rating: currentEditRating,
            });
        } catch (err) {
            console.error("Erreur lors de la modification de l'avis:", err);
            toast.error(t("review_edit_error", "Impossible de modifier l'avis."));
            fetchReviews();
        }
    };

    const deleteComment = async (commentId: number | string): Promise<void> => {
        const ok = await confirm({
            title: t("delete_review_title", "Supprimer la critique"),
            message: t("delete_confirm", "Voulez-vous vraiment supprimer cet avis ?"),
            confirmText: t("delete", "Supprimer"),
            danger: true,
        });
        if (!ok) return;
        setCommentsList((prev) => prev.filter((comment) => comment.id !== commentId));
        try {
            await apiClient.delete(`/reviews/${commentId}`);
            toast.success(t("review_deleted_success", "Critique supprimée."));
        } catch (err) {
            console.error("Erreur lors de la suppression de l'avis:", err);
            toast.error(t("review_delete_error", "Impossible de supprimer cet avis."));
            fetchReviews();
        }
    };

    const deleteReply = async (replyId: number | string): Promise<void> => {
        const okReply = await confirm({
            title: t("delete_comment_title", "Supprimer le commentaire"),
            message: t("delete_comment_confirm", "Voulez-vous vraiment supprimer ce commentaire ?"),
            confirmText: t("delete", "Supprimer"),
            danger: true,
        });
        if (!okReply) return;

        setCommentsList((prev) =>
            prev.map((review) => {
                if (!review.reviewComments) return review;

                const idsToDelete = new Set<string | number>([replyId]);
                let hasNewIds = true;

                while (hasNewIds) {
                    hasNewIds = false;
                    review.reviewComments.forEach((c: any) => {
                        if (c.parent_id && idsToDelete.has(c.parent_id) && !idsToDelete.has(c.id)) {
                            idsToDelete.add(c.id);
                            hasNewIds = true;
                        }
                    });
                }

                return {
                    ...review,
                    reviewComments: review.reviewComments.filter(
                        (c: any) => !idsToDelete.has(c.id)
                    ),
                };
            })
        );

        try {
            await apiClient.delete(`/review-comments/${replyId}`);
        } catch (err) {
            console.error("Erreur lors de la suppression du commentaire:", err);
            toast.error(t("comment_delete_error", "Impossible de supprimer ce commentaire."));
            fetchReviews();
        }
    };

    const handleToggleLike = async (commentId: number | string): Promise<void> => {
        if (!requireAuth()) return;

        const isCurrentlyLiked = likedCommentIds.has(commentId);

        setLikedCommentIds((prev: Set<string | number>) => {
            const next: Set<string | number> = new Set(prev);
            if (next.has(commentId)) {
                next.delete(commentId);
            } else {
                next.add(commentId);
            }
            return next;
        });

        setCommentsList((prevList) =>
            prevList.map((comment) => {
                if (comment.id === commentId) {
                    const currentLikes = comment.likes || [];
                    let newLikes;

                    if (isCurrentlyLiked) {
                        newLikes = currentLikes.filter((like: any) => {
                            const uid = like.user_id || like.userId || like.id || like;
                            return String(uid) !== String(currentUserId);
                        });
                        if (newLikes.length === currentLikes.length && currentLikes.length > 0) {
                            newLikes = currentLikes.slice(0, -1);
                        }
                    } else {
                        newLikes = [...currentLikes, { user_id: currentUserId }];
                    }
                    return { ...comment, likes: newLikes };
                }
                return comment;
            })
        );

        try {
            await apiClient.post(`/reviews/likes/toggle`, { review_id: commentId });
        } catch (err) {
            console.error("Erreur lors de l'action sur le like:", err);

            setLikedCommentIds((prev: Set<string | number>) => {
                const next: Set<string | number> = new Set(prev);
                if (next.has(commentId)) {
                    next.delete(commentId);
                } else {
                    next.add(commentId);
                }
                return next;
            });

            setCommentsList((prevList) =>
                prevList.map((comment) => {
                    if (comment.id === commentId) {
                        const currentLikes = comment.likes || [];
                        let newLikes;
                        if (!isCurrentlyLiked) {
                            newLikes = currentLikes.filter((like: any) => {
                                const uid = like.user_id || like.userId || like.id || like;
                                return String(uid) !== String(currentUserId);
                            });
                            if (newLikes.length === currentLikes.length && currentLikes.length > 0) {
                                newLikes = currentLikes.slice(0, -1);
                            }
                        } else {
                            newLikes = [...currentLikes, { user_id: currentUserId }];
                        }
                        return { ...comment, likes: newLikes };
                    }
                    return comment;
                })
            );
        }
    };

    const toggleReplies = (commentId: number | string): void => {
        setExpandedReplies((prev: any[]): any[] =>
            prev.includes(commentId)
                ? prev.filter((uid): boolean => uid !== commentId)
                : [...prev, commentId],
        );
    };

    const submitReply = async (reviewId: number | string, parentCommentId?: number | string): Promise<void> => {
        if (!requireAuth()) return;
        const key: string | number = parentCommentId ?? reviewId;
        const text: string = replyInputs[String(key)];
        if (!text || !text.trim()) return;

        const tempId: string = `temp-${Date.now()}`;
        const tempReply = {
            id: tempId,
            content: text.trim(),
            user_id: currentUserId,
            parent_id: parentCommentId && parentCommentId !== reviewId ? parentCommentId : null,
            created_at: new Date().toISOString(),
            user: { username: "Moi", id: currentUserId }
        };

        setCommentsList((prev: any[]) =>
            prev.map((review): any => {
                if (review.id === reviewId) {
                    return {
                        ...review,
                        reviewComments: [...(review.reviewComments || []), tempReply]
                    };
                }
                return review;
            })
        );

        setReplyInputs((prev) => ({ ...prev, [String(key)]: "" }));
        setActiveReplyId(null);
        setActiveNestedReplyId(null);
        setExpandedReplies((prev: any[]): any[] => (prev.includes(reviewId) ? prev : [...prev, reviewId]));

        try {
            const response: AxiosResponse<any, any> = await apiClient.post(`/review-comments`, {
                review_id: reviewId,
                ...(parentCommentId && parentCommentId !== reviewId ? { parent_id: parentCommentId } : {}),
                content: text.trim(),
            });

            const saved = response.data?.reviewComment || response.data;

            setCommentsList((prev: any[]) =>
                prev.map((review): any => {
                    if (review.id === reviewId) {
                        return {
                            ...review,
                            reviewComments: review.reviewComments.map((c: any) =>
                                c.id === tempId
                                    ? { ...c, id: saved.id || tempId, created_at: saved.created_at || c.created_at }
                                    : c
                            )
                        };
                    }
                    return review;
                })
            );
        } catch (err) {
            console.error("Erreur lors de l'envoi de la réponse:", err);
            toast.error(t("reply_send_error", "Impossible d'envoyer la réponse."));
            fetchReviews();
        }
    };

    const organizeComments = (comments: any[]): any[] => {
        if (!comments) return [];

        const roots: any[] = comments
            .filter((c) => !c.parent_id)
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        const replies: any[] = comments.filter((c) => c.parent_id);
        const result: any[] = [];

        const traverse = (parent: any): void => {
            result.push(parent);
            const children: any[] = replies
                .filter((c): boolean => String(c.parent_id) === String(parent.id))
                .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

            children.forEach((child) => traverse(child));
        };

        roots.forEach((root) => traverse(root));

        const processedIds: Set<string> = new Set(result.map((c) => String(c.id)));
        comments.forEach((c) => {
            if (!processedIds.has(String(c.id))) {
                result.push(c);
            }
        });

        return result;
    };

    const getReplyDepth = (reply: any, allComments: any[]): number => {
        if (!reply.parent_id) return 0;
        const parent = allComments.find((c: any) => c.id === reply.parent_id);
        if (!parent) return 1;
        return Math.min(getReplyDepth(parent, allComments) + 1, 2);
    };
    return {
        formatReviewDate,
        likedCommentIds,
        activeNestedReplyId,
        setActiveNestedReplyId,
        commentsList,
        loadingReviews,
        userRating,
        setUserRating,
        hoverRating,
        setHoverRating,
        commentTitle,
        setCommentTitle,
        commentText,
        setCommentText,
        editingCommentId,
        editTitle,
        setEditTitle,
        editText,
        setEditText,
        editRating,
        setEditRating,
        editHoverRating,
        setEditHoverRating,
        activeReplyId,
        setActiveReplyId,
        replyInputs,
        setReplyInputs,
        expandedReplies,
        isMyComment,
        hasAlreadyReviewed,
        isFormInvalid,
        isEditInvalid,
        submitMainComment,
        startEditing,
        cancelEditing,
        saveEdit,
        deleteComment,
        deleteReply,
        handleToggleLike,
        toggleReplies,
        submitReply,
        organizeComments,
        getReplyDepth,
    };
}
