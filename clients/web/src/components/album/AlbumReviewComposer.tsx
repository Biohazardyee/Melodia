import React from "react";
import { useTranslation } from "react-i18next";
import {
    FaPaperPlane,
    FaStar
} from "react-icons/fa";

interface Props {
    hoverRating: number;
    userRating: number;
    setHoverRating: React.Dispatch<React.SetStateAction<number>>;
    setUserRating: React.Dispatch<React.SetStateAction<number>>;
    commentTitle: string;
    setCommentTitle: React.Dispatch<React.SetStateAction<string>>;
    commentText: string;
    setCommentText: React.Dispatch<React.SetStateAction<string>>;
    submitMainComment: () => Promise<void>;
    isFormInvalid: boolean;
}

export default function AlbumReviewComposer({ hoverRating, userRating, setHoverRating, setUserRating, commentTitle, setCommentTitle, commentText, setCommentText, submitMainComment, isFormInvalid }: Props) {
    const { t } = useTranslation();
    return (
        <div
            className="mb-10 bg-panel dark:bg-panel p-6 rounded-2xl border border-line dark:border-line shadow-sm">
            <h4 className="text-lg font-bold mb-6 italic">
                {t("write_comment")}
            </h4>
            <div className="flex flex-col gap-5">
                <div className="flex items-center gap-2">
                    <p className="text-sm text-muted dark:text-muted mr-2 font-medium">
                        {t("rating")} * :
                    </p>
                    <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <FaStar
                                key={star}
                                className={`cursor-pointer transition-colors ${(hoverRating || userRating) >= star ? "text-[#FF1E56]" : "text-gray-700 dark:text-gray-300"}`}
                                size={20}
                                onMouseEnter={() => setHoverRating(star)}
                                onMouseLeave={() => setHoverRating(0)}
                                onClick={() => setUserRating(star)}
                            />
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold mb-2">
                        {t("title_label")} *
                    </label>
                    <input
                        type="text"
                        value={commentTitle}
                        onChange={(e) => setCommentTitle(e.target.value)}
                        placeholder={t("placeholder_title")}
                        className="w-full bg-panel dark:bg-canvas border border-line dark:border-line rounded-xl p-4 text-sm focus:outline-none"
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold mb-2">
                        {t("comment_label")} *
                    </label>
                    <textarea
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder={t("placeholder_comment")}
                        className="w-full bg-panel dark:bg-canvas border border-line dark:border-line rounded-xl p-4 text-sm focus:outline-none min-h-[100px] resize-none"
                    />
                </div>

                <div className="flex justify-end mt-2">
                    <button
                        onClick={submitMainComment}
                        disabled={isFormInvalid}
                        className={`px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${isFormInvalid ? "bg-gray-600 opacity-50 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-500 text-white"}`}
                    >
                        <FaPaperPlane size={12} /> {t("publish_btn")}
                    </button>
                </div>
            </div>
        </div>
    );
}
