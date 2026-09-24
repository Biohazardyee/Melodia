import {
    Coins,
    Sparkles,
    X
} from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { getPremiumBanner, isValidPremiumBanner } from "../../banners.config";
import AvatarBorder, { isValidBorder } from "../../components/AvatarBorder";
import { PSEUDO_FONTS, getPseudoFontFamily, isValidPseudoFont } from "../../fonts.config";
import { getPattern, isValidPattern } from "../../patterns.config";
import { getTextEffectClassName, isValidTextEffect } from "../../textEffects.config";
import { getProfileTitle, isValidProfileTitle } from "../../titles.config";
import { toImageDataUri } from "../../utils/imageDataUri";

interface Props {
    setShowCosmetics: React.Dispatch<React.SetStateAction<boolean>>;
    userProfil: any;
    equipBorder: (cosmeticId: string | null) => Promise<void>;
    equipping: string | null;
    cosmeticLabel: (id: string) => string;
    equipFont: (cosmeticId: string | null) => Promise<void>;
    equipTitle: (cosmeticId: string | null) => Promise<void>;
    equipTextEffect: (cosmeticId: string | null) => Promise<void>;
    equipBanner: (cosmeticId: string | null) => Promise<void>;
    equipPattern: (cosmeticId: string | null) => Promise<void>;
}

export default function ProfileCosmeticsDialog({ setShowCosmetics, userProfil, equipBorder, equipping, cosmeticLabel, equipFont, equipTitle, equipTextEffect, equipBanner, equipPattern }: Props) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowCosmetics(false)}
        >
            <div
                className="w-full max-w-lg bg-panel dark:bg-panel border border-line dark:border-line rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-5 border-b border-line dark:border-line">
                    <h2 className="text-lg font-bold text-ink flex items-center gap-2">
                        <Sparkles size={18} className="text-purple-400" />
                        {t("my_cosmetics", "Mes cosmétiques")}
                    </h2>
                    <button
                        onClick={() => setShowCosmetics(false)}
                        className="p-1.5 rounded-full text-slate-500 hover:text-white dark:hover:text-gray-900 hover:bg-raised dark:hover:bg-slate-100 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="overflow-y-auto p-5">
                    {(() => {
                        const ownedBorders: string[] = (userProfil?.owned_cosmetics || []).filter((id: string) => isValidBorder(id));
                        const ownedFonts: string[] = (userProfil?.owned_cosmetics || []).filter((id: string) => isValidPseudoFont(id));
                        const ownedTitles: string[] = (userProfil?.owned_cosmetics || []).filter((id: string) => isValidProfileTitle(id));
                        const ownedTextEffects: string[] = (userProfil?.owned_cosmetics || []).filter((id: string) => isValidTextEffect(id));
                        const ownedBanners: string[] = (userProfil?.owned_cosmetics || []).filter((id: string) => isValidPremiumBanner(id));
                        const ownedPatterns: string[] = (userProfil?.owned_cosmetics || []).filter((id: string) => isValidPattern(id));
                        const pic: string | null =
                            typeof userProfil?.profile_picture === "string"
                                ? toImageDataUri(userProfil.profile_picture)
                                : null;
                        const equipped: string | null = userProfil?.equipped_avatar_border || null;
                        const equippedFont: string | null = userProfil?.equipped_font || null;
                        const equippedTitle: string | null = userProfil?.equipped_title || null;
                        const equippedTextEffect: string | null = userProfil?.equipped_text_effect || null;
                        const equippedBanner: string | null = userProfil?.equipped_banner || null;
                        const equippedPattern: string | null = userProfil?.equipped_pattern || null;
                        const pseudoText: string = (userProfil?.pseudo || userProfil?.username) || "Aa";

                        const PreviewInner = (
                            <div className="w-16 h-16 rounded-full overflow-hidden bg-raised dark:bg-raised flex items-center justify-center">
                                {pic ? (
                                    <img src={pic} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-sm font-bold text-blue-400">
                                        {(userProfil?.pseudo || userProfil?.username)?.substring(0, 2).toUpperCase()}
                                    </span>
                                )}
                            </div>
                        );

                        if (
                            ownedBorders.length === 0 &&
                            ownedFonts.length === 0 &&
                            ownedTitles.length === 0 &&
                            ownedTextEffects.length === 0 &&
                            ownedBanners.length === 0 &&
                            ownedPatterns.length === 0
                        ) {
                            return (
                                <div className="text-center py-8">
                                    <p className="text-sm text-muted dark:text-muted mb-5">
                                        {t("no_owned_cosmetics", "Tu n'as pas encore de contour. Visite la boutique pour en débloquer !")}
                                    </p>
                                    <button
                                        onClick={() => navigate("/shop")}
                                        className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                                    >
                                        <Coins size={16} />
                                        {t("go_to_shop", "Aller à la boutique")}
                                    </button>
                                </div>
                            );
                        }

                        return (
                            <div className="space-y-6">
                                {/* Contours */}
                                {ownedBorders.length > 0 && (
                                    <div>
                                        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-muted mb-3">
                                            {t("shop_section_borders", "Contours")}
                                        </h3>
                                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-5">
                                            <button
                                                onClick={() => equipBorder(null)}
                                                disabled={equipping !== null}
                                                className="flex flex-col items-center gap-2 disabled:opacity-50"
                                            >
                                                <div className={`p-1 rounded-full ${!equipped ? "ring-2 ring-purple-500" : ""}`}>
                                                    {PreviewInner}
                                                </div>
                                                <span className={`text-xs ${!equipped ? "text-purple-400 dark:text-purple-500 font-bold" : "text-muted dark:text-muted"}`}>
                                                    {t("none", "Aucun")}
                                                </span>
                                            </button>
                                            {ownedBorders.map((id: string) => (
                                                <button
                                                    key={id}
                                                    onClick={() => equipBorder(id)}
                                                    disabled={equipping !== null}
                                                    className="flex flex-col items-center gap-2 disabled:opacity-50"
                                                >
                                                    <div className={`p-1 rounded-full ${equipped === id ? "ring-2 ring-purple-500" : ""}`}>
                                                        <AvatarBorder borderId={id}>
                                                            {PreviewInner}
                                                        </AvatarBorder>
                                                    </div>
                                                    <span className={`text-xs truncate max-w-full ${equipped === id ? "text-purple-400 dark:text-purple-500 font-bold" : "text-muted dark:text-muted"}`}>
                                                        {cosmeticLabel(id)}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Polices (aperçu du pseudo) */}
                                {ownedFonts.length > 0 && (
                                    <div>
                                        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-muted mb-3">
                                            {t("shop_section_fonts", "Polices")}
                                        </h3>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                            <button
                                                onClick={() => equipFont(null)}
                                                disabled={equipping !== null}
                                                className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all disabled:opacity-50 ${!equippedFont ? "border-purple-500 bg-purple-500/10" : "border-line dark:border-line hover:border-slate-600 dark:hover:border-gray-300"}`}
                                            >
                                                <span className="text-xl text-ink truncate max-w-full leading-tight">
                                                    {pseudoText}
                                                </span>
                                                <span className={`text-[11px] ${!equippedFont ? "text-purple-400 dark:text-purple-500 font-bold" : "text-muted dark:text-muted"}`}>
                                                    {t("default_font", "Défaut")}
                                                </span>
                                            </button>
                                            {ownedFonts.map((id: string) => (
                                                <button
                                                    key={id}
                                                    onClick={() => equipFont(id)}
                                                    disabled={equipping !== null}
                                                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all disabled:opacity-50 ${equippedFont === id ? "border-purple-500 bg-purple-500/10" : "border-line dark:border-line hover:border-slate-600 dark:hover:border-gray-300"}`}
                                                >
                                                    <span className="text-xl text-ink truncate max-w-full leading-tight" style={{ fontFamily: getPseudoFontFamily(id) }}>
                                                        {pseudoText}
                                                    </span>
                                                    <span className={`text-[11px] truncate max-w-full ${equippedFont === id ? "text-purple-400 dark:text-purple-500 font-bold" : "text-muted dark:text-muted"}`}>
                                                        {PSEUDO_FONTS.find((f) => f.id === id)?.name || id}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Titres de profil */}
                                {ownedTitles.length > 0 && (
                                    <div>
                                        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-muted mb-3">
                                            {t("shop_section_titles", "Titres de profil")}
                                        </h3>
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                onClick={() => equipTitle(null)}
                                                disabled={equipping !== null}
                                                className={`px-3 py-1.5 rounded-full border text-xs font-bold transition-all disabled:opacity-50 ${!equippedTitle ? "border-purple-500 bg-purple-500/10 text-purple-400 dark:text-purple-500" : "border-line dark:border-line text-muted dark:text-muted"}`}
                                            >
                                                {t("none", "Aucun")}
                                            </button>
                                            {ownedTitles.map((id: string) => {
                                                const def = getProfileTitle(id);
                                                return (
                                                    <button
                                                        key={id}
                                                        onClick={() => equipTitle(id)}
                                                        disabled={equipping !== null}
                                                        className={`px-3 py-1.5 rounded-full border text-xs font-bold transition-all disabled:opacity-50 ${def?.className || "border-line text-slate-300"} ${equippedTitle === id ? "ring-2 ring-purple-500" : ""}`}
                                                    >
                                                        {cosmeticLabel(id)}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Effets de texte du pseudo */}
                                {ownedTextEffects.length > 0 && (
                                    <div>
                                        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-muted mb-3">
                                            {t("shop_section_text_effects", "Effets de texte")}
                                        </h3>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                            <button
                                                onClick={() => equipTextEffect(null)}
                                                disabled={equipping !== null}
                                                className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all disabled:opacity-50 ${!equippedTextEffect ? "border-purple-500 bg-purple-500/10" : "border-line dark:border-line hover:border-slate-600 dark:hover:border-gray-300"}`}
                                            >
                                                <span className="text-xl text-ink truncate max-w-full leading-tight">
                                                    {pseudoText}
                                                </span>
                                                <span className={`text-[11px] ${!equippedTextEffect ? "text-purple-400 dark:text-purple-500 font-bold" : "text-muted dark:text-muted"}`}>
                                                    {t("default_font", "Défaut")}
                                                </span>
                                            </button>
                                            {ownedTextEffects.map((id: string) => (
                                                <button
                                                    key={id}
                                                    onClick={() => equipTextEffect(id)}
                                                    disabled={equipping !== null}
                                                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all disabled:opacity-50 ${equippedTextEffect === id ? "border-purple-500 bg-purple-500/10" : "border-line dark:border-line hover:border-slate-600 dark:hover:border-gray-300"}`}
                                                >
                                                    <span className={`text-xl font-bold truncate max-w-full leading-tight ${getTextEffectClassName(id)}`}>
                                                        {pseudoText}
                                                    </span>
                                                    <span className={`text-[11px] truncate max-w-full ${equippedTextEffect === id ? "text-purple-400 dark:text-purple-500 font-bold" : "text-muted dark:text-muted"}`}>
                                                        {cosmeticLabel(id)}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Bannières premium */}
                                {ownedBanners.length > 0 && (
                                    <div>
                                        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-muted mb-3">
                                            {t("shop_section_banners", "Bannières")}
                                        </h3>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                            <button
                                                onClick={() => equipBanner(null)}
                                                disabled={equipping !== null}
                                                className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all disabled:opacity-50 ${!equippedBanner ? "border-purple-500" : "border-line dark:border-line hover:border-slate-600 dark:hover:border-gray-300"}`}
                                            >
                                                <div className="w-full h-10 rounded-lg bg-raised dark:bg-raised" />
                                                <span className={`text-[11px] ${!equippedBanner ? "text-purple-400 dark:text-purple-500 font-bold" : "text-muted dark:text-muted"}`}>
                                                    {t("none", "Aucun")}
                                                </span>
                                            </button>
                                            {ownedBanners.map((id: string) => {
                                                const def = getPremiumBanner(id);
                                                return (
                                                    <button
                                                        key={id}
                                                        onClick={() => equipBanner(id)}
                                                        disabled={equipping !== null}
                                                        className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all disabled:opacity-50 ${equippedBanner === id ? "border-purple-500" : "border-line dark:border-line hover:border-slate-600 dark:hover:border-gray-300"}`}
                                                    >
                                                        <div className={`w-full h-10 rounded-lg ${def?.className || "bg-raised"}`} />
                                                        <span className={`text-[11px] truncate max-w-full ${equippedBanner === id ? "text-purple-400 dark:text-purple-500 font-bold" : "text-muted dark:text-muted"}`}>
                                                            {cosmeticLabel(id)}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Motifs de fond (page profil) */}
                                {ownedPatterns.length > 0 && (
                                    <div>
                                        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-muted mb-3">
                                            {t("shop_section_patterns", "Motifs de profil")}
                                        </h3>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                            <button
                                                onClick={() => equipPattern(null)}
                                                disabled={equipping !== null}
                                                className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all disabled:opacity-50 ${!equippedPattern ? "border-purple-500" : "border-line dark:border-line hover:border-slate-600 dark:hover:border-gray-300"}`}
                                            >
                                                <div className="w-full h-10 rounded-lg bg-raised dark:bg-raised" />
                                                <span className={`text-[11px] ${!equippedPattern ? "text-purple-400 dark:text-purple-500 font-bold" : "text-muted dark:text-muted"}`}>
                                                    {t("none", "Aucun")}
                                                </span>
                                            </button>
                                            {ownedPatterns.map((id: string) => {
                                                const def = getPattern(id);
                                                return (
                                                    <button
                                                        key={id}
                                                        onClick={() => equipPattern(id)}
                                                        disabled={equipping !== null}
                                                        className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all disabled:opacity-50 ${equippedPattern === id ? "border-purple-500" : "border-line dark:border-line hover:border-slate-600 dark:hover:border-gray-300"}`}
                                                    >
                                                        <div className={`w-full h-10 rounded-lg bg-raised dark:bg-raised ${def?.className || ""}`} />
                                                        <span className={`text-[11px] truncate max-w-full ${equippedPattern === id ? "text-purple-400 dark:text-purple-500 font-bold" : "text-muted dark:text-muted"}`}>
                                                            {cosmeticLabel(id)}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </div>
            </div>
        </div>
    );
}
