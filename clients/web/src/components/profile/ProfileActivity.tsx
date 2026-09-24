import {
    Heart,
    MessageSquare,
    Music,
    Star
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
const getRatingColors = (rating: number) => {
    if (rating >= 4.5) return { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-500", border: "border-emerald-500/20", fill: "#10b981" };
    if (rating >= 3.5) return { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-500", border: "border-blue-500/20", fill: "#3b82f6" };
    if (rating >= 2.5) return { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-500", border: "border-amber-500/20", fill: "#f59e0b" };
    if (rating >= 1.5) return { bg: "bg-orange-500/10", text: "text-orange-600 dark:text-orange-500", border: "border-orange-500/20", fill: "#f97316" };
    return { bg: "bg-rose-500/10", text: "text-rose-600 dark:text-rose-500", border: "border-rose-500/20", fill: "#f43f5e" };
};

interface Props {
    recentActivity: any[];
    handleLike: (id: string) => Promise<void>;
    hasMoreActivity: boolean;
    fetchRecentActivity: (offset: number, userId: string) => Promise<void>;
    activityOffset: number;
    userProfil: any;
    loadingMore: boolean;
}

export default function ProfileActivity({ recentActivity, handleLike, hasMoreActivity, fetchRecentActivity, activityOffset, userProfil, loadingMore }: Props) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    return (
        <div className="space-y-4 w-full">
            {recentActivity.map((item) => {
                const ratingColors = getRatingColors(item.rating);

                return (
                    <div
                        key={item.id}
                        className="bg-panel dark:bg-panel border border-line/80 dark:border-line p-6 rounded-2xl shadow-md flex gap-5 md:gap-6 transition-all hover:border-line/50 group"
                    >
                        <div
                            onClick={() => navigate(`/album/${item.media_id}`)}
                            className="w-24 h-24 sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-xl overflow-hidden shrink-0 shadow-lg cursor-pointer relative border border-line/60 dark:border-gray-100"
                        >
                            <img
                                src={item.cover}
                                alt={item.album}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Music size={20} className="text-white opacity-80" />
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col justify-between min-w-0">
                            <div>
                                <div className="flex items-start justify-between gap-2 mb-1">
                                    <div className="text-sm md:text-base min-w-0">
                                        <span className="font-bold text-ink truncate block sm:inline">
                                            {item.user_name}
                                        </span>
                                        <span className="text-muted dark:text-muted sm:ml-1.5 text-xs sm:text-sm">
                                            {t("activity_rated")}
                                        </span>
                                        <span
                                            onClick={() => navigate(`/album/${item.media_id}`)}
                                            className="font-semibold text-indigo-400 dark:text-indigo-600 hover:underline sm:ml-1.5 cursor-pointer truncate block sm:inline"
                                        >
                                            {item.album}
                                        </span>
                                        <span className="text-slate-500 dark:text-muted text-xs md:text-sm block sm:ml-1.5 sm:inline">
                                            {t("activity_by")} {item.artist}
                                        </span>
                                    </div>

                                    {/* Badge de Note dynamique */}
                                    {item.rating > 0 && (
                                        <div className={`flex items-center gap-1 ${ratingColors.bg} ${ratingColors.text} px-3 py-1 rounded-full text-xs md:text-sm font-bold border ${ratingColors.border} shrink-0 shadow-sm`}>
                                            <Star size={14} fill={ratingColors.fill} className={ratingColors.text} />
                                            <span>{item.rating}</span>
                                        </div>
                                    )}
                                </div>

                                {item.content && (
                                    <div className="relative bg-panel/40 dark:bg-canvas p-4 rounded-xl border border-line/40 dark:border-gray-100/80 my-2">
                                        <p className="text-slate-300 dark:text-muted text-sm md:text-base leading-relaxed italic">
                                            "{item.content}"
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-5 mt-2 pt-2 border-t border-line/40 dark:border-gray-100/60">
                                <button
                                    onClick={() => handleLike(item.id)}
                                    className={`flex items-center gap-1.5 text-xs md:text-sm font-semibold transition-colors ${item.isLiked
                                            ? "text-pink-500"
                                            : "text-muted hover:text-pink-500 dark:text-muted dark:hover:text-pink-600"
                                        }`}
                                >
                                    <Heart
                                        size={15}
                                        fill={item.isLiked ? "#ec4899" : "none"}
                                        className={item.isLiked ? "text-pink-500" : ""}
                                    />
                                    <span>{item.likes_count} {item.likes_count > 1 ? t("like_plural") : t("like_singular")}</span>
                                </button>

                                <div className="flex items-center gap-1.5 text-xs md:text-sm text-slate-500 dark:text-muted font-medium">
                                    <MessageSquare size={15} />
                                    <span>{item.comments_count} {item.comments_count > 1 ? t("comment_plural") : t("comment_singular")}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}

            {hasMoreActivity && (
                <div className="text-center pt-4">
                    <button
                        onClick={() =>
                            fetchRecentActivity(activityOffset, userProfil.id)
                        }
                        disabled={loadingMore}
                        className="text-sm font-bold text-blue-500 dark:text-blue-600 hover:underline disabled:opacity-50"
                    >
                        {loadingMore ? t("loading") : t("load_more")}
                    </button>
                </div>
            )}
        </div>
    );
}
