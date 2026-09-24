import {
    Loader2,
    X
} from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import AvatarBorder from "../../components/AvatarBorder";
import { getPseudoFontFamily } from "../../fonts.config";
import { getTextEffectClassName } from "../../textEffects.config";

interface Props {
    setFollowModalType: React.Dispatch<React.SetStateAction<"followers" | "following" | null>>;
    followModalType: "followers" | "following";
    followModalLoading: boolean;
    followModalUsers: any[];
}

export default function ProfileFollowDialog({ setFollowModalType, followModalType, followModalLoading, followModalUsers }: Props) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setFollowModalType(null)}
        >
            <div
                className="w-full max-w-sm bg-panel dark:bg-panel border border-line dark:border-line rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-5 border-b border-line dark:border-line">
                    <h2 className="text-lg font-bold text-ink">
                        {followModalType === "followers"
                            ? t("profile_followers")
                            : t("profile_following")}
                    </h2>
                    <button
                        onClick={() => setFollowModalType(null)}
                        className="p-1.5 rounded-full text-slate-500 hover:text-white dark:hover:text-gray-900 hover:bg-raised dark:hover:bg-slate-100 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="overflow-y-auto p-3">
                    {followModalLoading ? (
                        <div className="flex justify-center py-10">
                            <Loader2 size={22} className="animate-spin text-slate-500" />
                        </div>
                    ) : followModalUsers.length === 0 ? (
                        <p className="text-sm text-muted dark:text-muted text-center py-10">
                            {followModalType === "followers"
                                ? t("no_followers", "Personne ne suit ce profil pour le moment.")
                                : t("no_following", "Ne suit personne pour le moment.")}
                        </p>
                    ) : (
                        <div className="space-y-1">
                            {followModalUsers.map((u: any) => (
                                <button
                                    key={u.id}
                                    onClick={() => {
                                        setFollowModalType(null);
                                        navigate(`/profil/${u.id}`);
                                    }}
                                    className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-raised/60 dark:hover:bg-gray-100 transition-colors text-left"
                                >
                                    <AvatarBorder borderId={u.equipped_avatar_border} compact>
                                        <div className="w-11 h-11 rounded-full overflow-hidden bg-raised dark:bg-raised flex items-center justify-center flex-shrink-0">
                                            {u.profile_picture ? (
                                                <img src={u.profile_picture} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-sm font-bold text-blue-400">
                                                    {(u.pseudo || u.username)?.substring(0, 2).toUpperCase()}
                                                </span>
                                            )}
                                        </div>
                                    </AvatarBorder>
                                    <div className="min-w-0">
                                        <p
                                            className={`font-bold truncate ${getTextEffectClassName(u.equipped_text_effect) || "text-ink"}`}
                                            style={{ fontFamily: getPseudoFontFamily(u.equipped_font) || undefined }}
                                        >
                                            {u.pseudo || u.username}
                                        </p>
                                        <p className="text-xs text-slate-500 dark:text-muted truncate">
                                            @{u.username}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
