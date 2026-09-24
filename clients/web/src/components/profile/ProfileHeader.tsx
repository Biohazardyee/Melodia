import {
    Calendar,
    Camera,
    Flag,
    Image as ImageIcon,
    MessageSquare,
    Music,
    Settings,
    ShieldCheck,
    Sparkles,
    UserCheck,
    UserPlus
} from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import AvatarBorder from "../../components/AvatarBorder";
import NowPlayingCard from "../../components/NowPlayingCard";
import { getPseudoFontFamily } from "../../fonts.config";
import { getTextEffectClassName } from "../../textEffects.config";
import { toImageDataUri } from "../../utils/imageDataUri";

interface Props {
    handleBannerClick: () => void;
    isOwnProfile: boolean;
    equippedBannerDef: import("../../banners.config").PremiumBannerDef | undefined;
    userProfil: any;
    handleProfilePictureClick: () => void;
    equippedTitleDef: import("../../titles.config").ProfileTitleDef | undefined;
    cosmeticLabel: (id: string) => string;
    openCosmetics: () => Promise<void>;
    handleFollowToggle: () => Promise<void>;
    isFollowing: boolean;
    setIsReportModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
    openFollowModal: (type: "followers" | "following") => Promise<void>;
    followCounts: { followers: number; following: number; };
    favoriteReviews: any[];
}

export default function ProfileHeader({
        handleBannerClick,
        isOwnProfile,
        equippedBannerDef,
        userProfil,
        handleProfilePictureClick,
        equippedTitleDef,
        cosmeticLabel,
        openCosmetics,
        handleFollowToggle,
        isFollowing,
        setIsReportModalOpen,
        openFollowModal,
        followCounts,
        favoriteReviews,
    }: Props) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    return (
        <div className="relative">
            <div
                onClick={handleBannerClick}
                className={`h-44 md:h-56 w-full bg-cover bg-center relative group ${isOwnProfile ? "cursor-pointer" : ""} ${equippedBannerDef?.className || ""}`}
                style={equippedBannerDef ? undefined : {
                    backgroundImage: `url('${toImageDataUri(userProfil?.banner) || "https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=1600"
                        }')`,
                }}
            >
                {/* Léger dégradé en bas seulement (pas de flou) pour détacher l'avatar — la bannière reste nette */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none"></div>
                {isOwnProfile && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 group-hover:bg-black/30 transition-all">
                        <div className="flex items-center gap-2 bg-black/60 text-white px-4 py-2 rounded-lg text-sm font-semibold backdrop-blur-sm">
                            <ImageIcon size={16} />
                            {t("change_banner")}
                        </div>
                    </div>
                )}
            </div>

            {/* Zone des infos du profil */}
            <div className="max-w-6xl mx-auto px-6">
                <div className="relative -mt-12 mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div className="flex flex-col md:flex-row md:items-end gap-6">
                        <AvatarBorder borderId={userProfil?.equipped_avatar_border} className="z-10">
                            <div
                                onClick={handleProfilePictureClick}
                                className={`w-32 h-32 md:w-40 md:h-40 rounded-full border-[6px] border-[#0f1117] dark:border-slate-50 flex items-center justify-center text-white text-4xl font-bold shadow-xl z-10 transition-colors relative overflow-hidden group ${isOwnProfile ? "cursor-pointer" : ""}`}
                            >
                                {userProfil?.profile_picture &&
                                    typeof userProfil.profile_picture === "string" ? (
                                    <img
                                        src={toImageDataUri(userProfil.profile_picture) || undefined}
                                        alt="Profil"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-blue-500 flex items-center justify-center">
                                        {(userProfil?.pseudo || userProfil?.username)?.substring(0, 2).toUpperCase()}
                                    </div>
                                )}

                                {isOwnProfile && (
                                    <div
                                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                        <Camera size={24} className="text-white" />
                                    </div>
                                )}
                            </div>
                        </AvatarBorder>

                        <div className="pb-2">
                            <div className="flex items-center gap-3 flex-wrap">
                                <h1
                                    className={`text-4xl font-bold tracking-tight ${getTextEffectClassName(userProfil?.equipped_text_effect) || "text-ink"}`}
                                    style={{ fontFamily: getPseudoFontFamily(userProfil?.equipped_font) || undefined }}
                                >
                                    {userProfil?.pseudo || userProfil?.username}
                                </h1>
                                {userProfil?.role === "ADMIN" && (
                                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-rose-500/40 bg-rose-500/15 text-rose-400 text-sm font-bold">
                                        <ShieldCheck size={14} />
                                        {t("admin_badge", "Admin")}
                                    </span>
                                )}
                                {equippedTitleDef && (
                                    <span className={`inline-flex items-center px-3 py-1 rounded-full border text-sm font-bold ${equippedTitleDef.className}`}>
                                        {cosmeticLabel(equippedTitleDef.id)}
                                    </span>
                                )}
                            </div>
                            <p className="text-muted dark:text-muted font-medium">
                                @{userProfil?.username?.toLowerCase()}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 self-start md:self-end mb-2">
                        {isOwnProfile ? (
                            <>
                                <button
                                    onClick={openCosmetics}
                                    className="flex items-center gap-2 bg-purple-600/90 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm"
                                >
                                    <Sparkles size={16} />
                                    {t("cosmetics", "Cosmétiques")}
                                </button>
                                <button
                                    onClick={() => navigate("/settings")}
                                    className="flex items-center gap-2 bg-raised/80 dark:bg-panel hover:bg-slate-700 dark:hover:bg-gray-100 text-slate-100 dark:text-gray-900 px-4 py-2 rounded-lg text-sm font-semibold transition-all border border-line dark:border-line shadow-sm"
                                >
                                    <Settings size={16} />
                                    {t("profile_edit_btn")}
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={handleFollowToggle}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all border shadow-sm ${isFollowing
                                            ? "bg-transparent border-line dark:border-line text-slate-300 dark:text-gray-700 hover:bg-raised/40"
                                            : "bg-blue-600 border-blue-600 text-white hover:bg-blue-500"
                                        }`}
                                >
                                    {isFollowing ? (
                                        <UserCheck size={16} />
                                    ) : (
                                        <UserPlus size={16} />
                                    )}
                                    {isFollowing ? "Following" : "Follow"}
                                </button>

                                <button onClick={() => navigate(`/conversations?to=${encodeURIComponent(userProfil.id)}`)} className="secondary-action">
                                    <MessageSquare size={16} />{t("dm_message")}
                                </button>
                                <button
                                    onClick={() => setIsReportModalOpen(true)}
                                    className="p-2.5 bg-raised/80 dark:bg-panel border border-line dark:border-line rounded-lg text-muted hover:text-red-500 hover:border-red-500/50 dark:hover:text-red-600 dark:hover:border-red-500/50 transition-all shadow-sm"
                                    title={t("report_title")}
                                >
                                    <Flag size={18} />
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Biographie & Méta-données */}
                <div className="max-w-2xl space-y-4">
                    <p className="text-slate-200 dark:text-gray-700 leading-relaxed text-lg whitespace-pre-wrap break-words">
                        {userProfil?.biography || t("profile_no_bio")}
                    </p>

                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-muted dark:text-muted text-sm">
                        {userProfil?.favorite_band && (
                            <div className="flex items-center gap-1.5">
                                <Music size={16} className="text-blue-400 dark:text-blue-500 shrink-0" />
                                <span className="text-slate-300 dark:text-muted">
                                    <span className="text-slate-500 dark:text-muted">{t("label_favorite_band")} : </span>
                                    {userProfil.favorite_band}
                                </span>
                            </div>
                        )}
                        <div className="flex items-center gap-1.5">
                            <Calendar
                                size={16}
                                className="text-slate-500 dark:text-muted"
                            />
                            {t("profile_member_since")}{" "}
                            {userProfil?.created_at
                                ? (() => {
                                    const date: Date = new Date(userProfil.created_at);
                                    const day: string = String(date.getDate()).padStart(2, "0");
                                    const month: string = String(date.getMonth() + 1).padStart(
                                        2,
                                        "0",
                                    );
                                    const year: number = date.getFullYear();
                                    return `${day}/${month}/${year}`;
                                })()
                                : ""}
                        </div>
                    </div>
                    <div className="flex gap-8 pt-2">
                        <button
                            onClick={() => openFollowModal("followers")}
                            className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                        >
                            <span className="text-ink font-bold text-lg">
                                {followCounts.followers}
                            </span>
                            <span className="text-slate-500 dark:text-muted text-sm">
                                {t("profile_followers")}
                            </span>
                        </button>
                        <button
                            onClick={() => openFollowModal("following")}
                            className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                        >
                            <span className="text-ink font-bold text-lg">
                                {followCounts.following}
                            </span>
                            <span className="text-slate-500 dark:text-muted text-sm">
                                {t("profile_following")}
                            </span>
                        </button>
                        <div className="flex items-center gap-1.5">
                            <span className="text-ink font-bold text-lg">
                                {favoriteReviews.length}
                            </span>
                            <span className="text-slate-500 dark:text-muted text-sm">
                                {t("profile_albums")}
                            </span>
                        </div>
                    </div>

                    {userProfil?.id && (
                        <div className="pt-4">
                            <NowPlayingCard userId={userProfil.id} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
