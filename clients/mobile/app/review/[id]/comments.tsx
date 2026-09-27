import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  EmitterSubscription,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import apiClient from "../../../src/api/client";
import { AuthGuardWrapper } from "@/src/components/AuthGuardMapper";
import { jwtDecode } from "jwt-decode";
import * as SecureStore from "expo-secure-store";
import { Keyboard } from "react-native";
import ReportButton from "@/src/components/reports/ReportButton";
import { useTheme } from "../../../src/context/ThemeContext";
import { useTranslation } from "react-i18next";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  parent_id?: string | null;
  user: { username: string; id: string };
  likes_count: number;
  isLiked: boolean;
}

interface Review {
  id: string;
  content: string;
  created_at: string;
  user: { username: string; id: string };
  rating?: number;
  likes_count: number;
  isLiked: boolean;
}

export default function CommentsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const inputRef = useRef<TextInput>(null);

  const formatReviewDate = (dateStr: string | undefined): string => {
    const date = new Date(dateStr || Date.now());
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const time = date.toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"});
    if (date.toDateString() === now.toDateString()) return `${t("today")} · ${time}`;
    if (date.toDateString() === yesterday.toDateString()) return `${t("yesterday")} · ${time}`;
    return date.toLocaleDateString();
  };

  const [comments, setComments] = useState<Comment[]>([]);
  const [review, setReview] = useState<Review | null>(null);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [isInputVisible, setIsInputVisible] = useState(false);
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const fetchData: () => Promise<void> = async (): Promise<void> => {
    try {
      const [reviewRes, commentsRes] = await Promise.all([
        apiClient.get(`/reviews/${id}`),
        apiClient.get(`/review-comments/review/${id}`),
      ]);

      const reviewData = reviewRes.data.review || reviewRes.data;
      setReview(reviewData);

      setComments(commentsRes.data.comments || []);
    } catch (err) {
      console.error("Erreur fetch thread:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const getUserIdFromToken: () => Promise<void> = async (): Promise<void> => {
      try {
        const token: string | null =
          await SecureStore.getItemAsync("userToken");
        if (token) {
          const decoded: any = jwtDecode(token);
          const userId = decoded.id || decoded.sub;
          setCurrentUserId(userId);
        }
      } catch (err) {
        console.error("Erreur décodage token:", err);
      }
    };

    getUserIdFromToken();
    if (id) fetchData();
  }, [id]);

  useEffect((): (() => void) => {
    const showSub: EmitterSubscription = Keyboard.addListener(
      "keyboardWillShow",
      (e): void => {
        setKeyboardHeight(e.endCoordinates.height);
      },
    );

    const hideSub: EmitterSubscription = Keyboard.addListener(
      "keyboardWillHide",
      (): void => {
        setKeyboardHeight(0);
      },
    );

    return (): void => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const orderedComments: Comment[] = useMemo((): Comment[] => {
    const parents: Comment[] = comments.filter(
      (c: Comment): boolean => !c.parent_id,
    );
    const result: Comment[] = [];
    parents.forEach((parent: Comment): void => {
      result.push(parent);
      const replies: Comment[] = comments.filter(
        (c: Comment): boolean => c.parent_id === parent.id,
      );
      result.push(...replies);
    });
    return result;
  }, [comments]);

  const handleReplyToReview: () => void = (): void => {
    setReplyTo(null);
    setEditingComment(null);
    setNewComment("");
    setIsInputVisible(true);
    setTimeout((): void | undefined => inputRef.current?.focus(), 100);
  };

  const startEditing: (comment: Comment) => void = (comment: Comment): void => {
    setEditingComment(comment);
    setReplyTo(null);
    setNewComment(comment.content);
    setIsInputVisible(true);
    setTimeout((): void | undefined => inputRef.current?.focus(), 100);
  };

  const handlePostComment: () => Promise<void> = async (): Promise<void> => {
    if (!currentUserId) { router.push("/restriction"); return; }
    if (!newComment.trim()) return;
    setSending(true);
    try {
      if (editingComment) {
        await apiClient.put(`/review-comments/${editingComment.id}`, {
          content: newComment,
        });
      } else {
        await apiClient.post(`/review-comments`, {
          review_id: id,
          content: newComment,
          parent_id: replyTo ? replyTo.id : null,
        });
      }

      setNewComment("");
      setReplyTo(null);
      setEditingComment(null);
      setIsInputVisible(false);

      const commentsRes = await apiClient.get(`/review-comments/review/${id}`);
      setComments(commentsRes.data.comments || []);
    } catch (err) {
      Alert.alert(t("error"), t("error_save_comment"));
    } finally {
      setSending(false);
    }
  };

  const handleToggleLikeReview: () => Promise<void> =
    async (): Promise<void> => {
      if (!currentUserId) { router.push("/restriction"); return; }
      if (!review) return;

      const previousState = { ...review };

      setReview({
        ...review,
        isLiked: !review.isLiked,
        likes_count: review.isLiked
          ? review.likes_count - 1
          : review.likes_count + 1,
      });

      try {
        const response = await apiClient.post(`/reviews/likes/toggle`, {
          review_id: review.id,
        });

        const { isLiked, likes_count } = response.data;
        setReview((prev: Review | null) =>
          prev ? { ...prev, isLiked, likes_count } : null,
        );
      } catch (error) {
        console.error("Erreur lors du like de la review", error);
        setReview(previousState);
        Alert.alert(t("error"), t("error_like_update"));
      }
    };

  const handleToggleLike: (commentId: string) => Promise<void> = async (
    commentId: string,
  ): Promise<void> => {
    if (!currentUserId) { router.push("/restriction"); return; }
    try {
      const response = await apiClient.post(
        `/review-comments/${commentId}/toggle-like`,
      );
      const { isLiked, likes_count } = response.data;
      setComments((prev: Comment[]) =>
        prev.map((c: Comment) =>
          c.id === commentId ? { ...c, isLiked, likes_count } : c,
        ),
      );
    } catch (error) {
      console.error("Erreur lors du like", error);
    }
  };

  const handleDeleteComment: (commentId: string) => void = (
    commentId: string,
  ): void => {
    Alert.alert(t("delete"), t("confirm_delete_comment"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("delete"),
        style: "destructive",
        onPress: async (): Promise<void> => {
          try {
            await apiClient.delete(`/review-comments/${commentId}`);
            setComments((prev: Comment[]): Comment[] =>
              prev.filter((c: Comment): boolean => c.id !== commentId),
            );
          } catch (err) {
            console.error(err);
          }
        },
      },
    ]);
  };

  const renderHeader = () => {
    if (!review) return null;
    return (
      <View style={[styles.originalReviewContainer, {backgroundColor: theme.surface}]}>
        <View style={styles.commentHeader}>
          <Text style={[styles.originalUsername, {color: theme.text}]}>@{review.user?.username}</Text>
          <Text style={[styles.date, {color: theme.placeholder}]}>
            {formatReviewDate(review.created_at)}
          </Text>
        </View>
        <Text style={[styles.originalContent, {color: theme.subText}]}>{review.content}</Text>

        <View style={styles.commentActions}>
          <TouchableOpacity
            onPress={handleToggleLikeReview}
            style={styles.actionBtn}
          >
            <Ionicons
              name={review.isLiked ? "heart" : "heart-outline"}
              size={20}
              color={review.isLiked ? "#ec4899" : theme.placeholder}
            />
            <Text
              style={[
                styles.actionLabel,
                {color: theme.placeholder},
                review.isLiked && { color: "#ec4899" },
              ]}
            >
              {review.likes_count}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleReplyToReview}
            style={styles.actionBtn}
          >
            <Ionicons name="chatbubble-outline" size={18} color={theme.placeholder} />
            <Text style={[styles.actionLabel, {color: theme.placeholder}]}>{t("reply")}</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.separator, {backgroundColor: theme.border}]} />
        <Text style={[styles.repliesCount, {color: theme.placeholder}]}>
          {comments.length} {t(comments.length <= 1 ? "comment_singular" : "comment_plural")}
        </Text>
      </View>
    );
  };

  const renderComment = ({ item }: { item: Comment }) => {
    const isReply: boolean = item.parent_id !== null;
    const isMyComment: boolean = currentUserId === item.user?.id;

    return (
      <View style={[
        styles.commentCard,
        {backgroundColor: theme.surface, borderColor: theme.border},
        isReply && [styles.replyCard, {backgroundColor: theme.inputBg, borderColor: theme.border}],
      ]}>
        {isReply && <View style={[styles.threadLine, {backgroundColor: theme.border, borderColor: theme.border}]} />}
        <View style={{ flex: 1 }}>
          <View style={styles.commentHeader}>
            <Text style={styles.username}>@{item.user?.username}</Text>
            <Text style={[styles.date, {color: theme.placeholder}]}>
              {formatReviewDate(item.created_at)}
            </Text>
          </View>
          <Text style={[styles.commentText, {color: theme.subText}]}>{item.content}</Text>
          <View style={styles.commentActions}>
            <TouchableOpacity
              onPress={(): Promise<void> => handleToggleLike(item.id)}
              style={styles.actionBtn}
            >
              <Ionicons
                name={item.isLiked ? "heart" : "heart-outline"}
                size={16}
                color={item.isLiked ? "#ec4899" : theme.placeholder}
              />
              <Text
                style={[
                  styles.actionLabel,
                  {color: theme.placeholder},
                  item.isLiked && { color: "#ec4899" },
                ]}
              >
                {item.likes_count}
              </Text>
            </TouchableOpacity>

            {!isReply && (
              <TouchableOpacity
                onPress={(): void => {
                  setReplyTo(item);
                  setEditingComment(null);
                  setNewComment("");
                  setIsInputVisible(true);
                  setTimeout(
                    (): void | undefined => inputRef.current?.focus(),
                    100,
                  );
                }}
                style={styles.actionBtn}
              >
                <Text style={[styles.actionLabel, {color: theme.placeholder}]}>{t("reply")}</Text>
              </TouchableOpacity>
            )}

            <ReportButton
              userId={currentUserId}
              targetId={item.id}
              type="comment"
            />

            {isMyComment && (
              <>
                <TouchableOpacity
                  onPress={(): void => startEditing(item)}
                  style={styles.actionBtn}
                >
                  <Text style={[styles.actionLabel, {color: theme.placeholder}]}>{t("modify")}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={(): void => handleDeleteComment(item.id)}
                  style={styles.actionBtn}
                >
                  <Ionicons name="trash-outline" size={14} color="#ef4444" />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.center, {backgroundColor: theme.background}]}>
        <ActivityIndicator color="#ec4899" size="large" />
      </View>
    );
  }

  return (
    <AuthGuardWrapper>
      <View style={[styles.container, {backgroundColor: theme.background}]}>
        <View style={[styles.header, {borderBottomColor: theme.border}]}>
          <TouchableOpacity onPress={(): void => router.back()}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, {color: theme.text}]}>{t("page_discussion")}</Text>
          <View style={{ width: 24 }} />
        </View>

        <FlatList
          data={orderedComments}
          keyExtractor={(item: Comment): string => item.id}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContent}
          renderItem={renderComment}
          ListEmptyComponent={
            <Text style={[styles.emptyText, {color: theme.placeholder}]}>{t("msg_be_first_to_reply")}</Text>
          }
        />

        {isInputVisible && (
          <View
            style={[
              styles.absoluteInputWrapper,
              {backgroundColor: theme.surface, bottom: keyboardHeight - 10},
            ]}
          >
            <View style={[styles.replyHint, {backgroundColor: theme.card}]}>
              <Text style={{ color: theme.subText, fontSize: 12 }}>
                {editingComment
                  ? t("msg_editing_message")
                  : replyTo
                    ? `${t("reply")} @${replyTo.user.username}`
                    : t("msg_reply_to_review")}
              </Text>
              <TouchableOpacity
                onPress={(): void => {
                  setIsInputVisible(false);
                  setReplyTo(null);
                  setEditingComment(null);
                  setNewComment("");
                }}
              >
                <Ionicons name="close-circle" size={22} color="#ec4899" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                ref={inputRef}
                style={[styles.input, {color: theme.text, backgroundColor: theme.inputBg}]}
                placeholder={t("placeholder_write_message")}
                placeholderTextColor={theme.placeholder}
                value={newComment}
                onChangeText={setNewComment}
                multiline
              />
              <TouchableOpacity
                style={[styles.sendBtn, !newComment.trim() && { opacity: 0.5 }]}
                onPress={handlePostComment}
                disabled={sending || !newComment.trim()}
              >
                {sending ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Ionicons
                    name={editingComment ? "checkmark" : "send"}
                    size={20}
                    color="white"
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </AuthGuardWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 18, fontWeight: "bold" },
  listContent: { padding: 20, paddingBottom: 100 },
  originalReviewContainer: {
    padding: 15,
    borderRadius: 12,
    marginBottom: 25,
    borderLeftWidth: 4,
    borderLeftColor: "#ec4899",
  },
  originalUsername: { fontWeight: "bold", fontSize: 16 },
  originalContent: {
    fontSize: 16,
    marginTop: 8,
    lineHeight: 22,
  },
  separator: { height: 1, marginVertical: 15 },
  repliesCount: {
    fontSize: 11,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  commentCard: {
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    flexDirection: "row",
  },
  replyCard: {
    marginLeft: 40,
  },
  threadLine: {
    position: "absolute",
    left: -20,
    top: -15,
    bottom: "50%",
    width: 2,
    borderBottomLeftRadius: 10,
    borderLeftWidth: 2,
  },
  commentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  username: { color: "#ec4899", fontWeight: "bold", fontSize: 13 },
  date: { fontSize: 11 },
  commentText: { lineHeight: 20, fontSize: 14 },
  commentActions: {
    flexDirection: "row",
    marginTop: 12,
    gap: 15,
    alignItems: "center",
  },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 5 },
  actionLabel: { fontSize: 12, fontWeight: "600" },
  absoluteInputWrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: "#ec4899",
  },
  inputContainer: {
    flexDirection: "row",
    padding: 15,
    paddingBottom: Platform.OS === "ios" ? 35 : 15,
    alignItems: "center",
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: "#ec4899",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  replyHint: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  emptyText: { textAlign: "center", marginTop: 20 },
});
