import React, {useEffect, useState} from "react";
import {useTranslation} from "react-i18next";
import {jwtDecode} from "jwt-decode";
import {toast} from "react-toastify";
import {Coins, Sparkles, Check, Music, Palette, Type, Tag, Wand2, Image as ImageIcon, LayoutGrid} from "lucide-react";
import apiClient from "../api/client";
import {AxiosResponse} from "axios";
import AvatarBorder from "../components/AvatarBorder";
import {useConfirm} from "../context/ConfirmContext";
import {useDarkMode, setOwnedThemes} from "../useDarkMode";
import {PREMIUM_THEMES} from "../themes.config";
import {getPseudoFontFamily} from "../fonts.config";
import {getProfileTitle} from "../titles.config";
import {getTextEffectClassName} from "../textEffects.config";
import {getPremiumBanner} from "../banners.config";
import {getPattern} from "../patterns.config";
import {toImageDataUri} from "../utils/imageDataUri";

type CatalogItem = {
    id: string;
    name: string;
    price: number;
    type: string;
};

type CosmeticSlot = "avatar_border" | "font" | "title" | "text_effect" | "banner" | "pattern";

const EQUIP_MESSAGES: Record<CosmeticSlot, { equippedKey: string; equippedFallback: string; unequippedKey: string; unequippedFallback: string }> = {
    avatar_border: {equippedKey: "cosmetic_equipped", equippedFallback: "Contour équipé !", unequippedKey: "cosmetic_unequipped", unequippedFallback: "Contour retiré."},
    font: {equippedKey: "font_equipped", equippedFallback: "Police équipée !", unequippedKey: "font_unequipped", unequippedFallback: "Police retirée."},
    title: {equippedKey: "title_equipped", equippedFallback: "Titre équipé !", unequippedKey: "title_unequipped", unequippedFallback: "Titre retiré."},
    text_effect: {equippedKey: "text_effect_equipped", equippedFallback: "Effet équipé !", unequippedKey: "text_effect_unequipped", unequippedFallback: "Effet retiré."},
    banner: {equippedKey: "banner_equipped", equippedFallback: "Bannière équipée !", unequippedKey: "banner_unequipped", unequippedFallback: "Bannière retirée."},
    pattern: {equippedKey: "pattern_equipped", equippedFallback: "Motif équipé !", unequippedKey: "pattern_unequipped", unequippedFallback: "Motif retiré."},
};

const Shop: React.FC = () => {
    const {t} = useTranslation();
    const confirm = useConfirm();
    const {theme, setTheme} = useDarkMode();
    const [, setUserId] = useState<string>("");
    const [points, setPoints] = useState<number>(0);
    const [owned, setOwned] = useState<string[]>([]);
    const [equipped, setEquipped] = useState<string | null>(null);
    const [equippedFont, setEquippedFont] = useState<string | null>(null);
    const [equippedTitle, setEquippedTitle] = useState<string | null>(null);
    const [equippedTextEffect, setEquippedTextEffect] = useState<string | null>(null);
    const [equippedBanner, setEquippedBanner] = useState<string | null>(null);
    const [equippedPattern, setEquippedPattern] = useState<string | null>(null);
    const [pseudo, setPseudo] = useState<string>("Aa");
    const [profilePic, setProfilePic] = useState<string | null>(null);
    const [catalog, setCatalog] = useState<CatalogItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [busyId, setBusyId] = useState<string | null>(null);

    const itemName = (item: CatalogItem): string => t(`cosmetic_item_${item.id}`, item.name);

    useEffect(() => {
        const load = async (): Promise<void> => {
            try {
                const token: string | null = localStorage.getItem("token");
                if (!token) return;
                const decoded: any = jwtDecode(token);
                const uId: string = decoded.id || decoded.userId;
                setUserId(uId);

                const [profileRes, catalogRes]: AxiosResponse[] = await Promise.all([
                    apiClient.get(`/users/public/${uId}`),
                    apiClient.get(`/users/cosmetics/catalog`),
                ]);
                const data = profileRes.data.user || profileRes.data;
                setPoints(data.shop_points ?? 0);
                setOwned(data.owned_cosmetics ?? []);
                setEquipped(data.equipped_avatar_border ?? null);
                setEquippedFont(data.equipped_font ?? null);
                setEquippedTitle(data.equipped_title ?? null);
                setEquippedTextEffect(data.equipped_text_effect ?? null);
                setEquippedBanner(data.equipped_banner ?? null);
                setEquippedPattern(data.equipped_pattern ?? null);
                setPseudo(data.pseudo || data.username || "Aa");

                if (data.profile_picture) {
                    setProfilePic(toImageDataUri(data.profile_picture));
                }
                setCatalog(catalogRes.data.catalog || []);
            } catch (err) {
                console.error("Erreur chargement boutique :", err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const handleBuy = async (item: CatalogItem): Promise<void> => {
        if (points < item.price) {
            toast.error(t("not_enough_points", "Points insuffisants."));
            return;
        }
        const ok = await confirm({
            title: t("confirm_purchase_title", "Confirmer l'achat"),
            message: t("confirm_purchase", {
                name: itemName(item),
                price: item.price,
                defaultValue: 'Acheter "{{name}}" pour {{price}} points ?',
            }),
            confirmText: t("buy", "Acheter"),
        });
        if (!ok) return;

        setBusyId(item.id);
        try {
            const res: AxiosResponse = await apiClient.post("/users/cosmetics/buy", {
                cosmetic_id: item.id,
            });
            setPoints(res.data.shop_points);
            setOwned(res.data.owned_cosmetics);
            setOwnedThemes(res.data.owned_cosmetics);
            window.dispatchEvent(new Event("profileUpdated"));
            toast.success(t("cosmetic_bought", "Cosmétique débloqué ! 🎉"));
        } catch (e: any) {
            toast.error(e.response?.data?.message || t("cosmetic_buy_error", "Achat impossible."));
        } finally {
            setBusyId(null);
        }
    };

    const handleEquip = async (
        cosmeticId: string | null,
        slot: CosmeticSlot = "avatar_border",
    ): Promise<void> => {
        setBusyId(cosmeticId || `none-${slot}`);
        try {
            const res: AxiosResponse = await apiClient.post("/users/cosmetics/equip", {
                cosmetic_id: cosmeticId,
                slot,
            });
            setEquipped(res.data.equipped_avatar_border);
            setEquippedFont(res.data.equipped_font);
            setEquippedTitle(res.data.equipped_title);
            setEquippedTextEffect(res.data.equipped_text_effect);
            setEquippedBanner(res.data.equipped_banner);
            setEquippedPattern(res.data.equipped_pattern);
            window.dispatchEvent(new Event("profileUpdated"));
            const messages = EQUIP_MESSAGES[slot];
            toast.success(
                cosmeticId
                    ? t(messages.equippedKey, messages.equippedFallback)
                    : t(messages.unequippedKey, messages.unequippedFallback),
            );
        } catch (e: any) {
            toast.error(e.response?.data?.message || t("cosmetic_equip_error", "Action impossible."));
        } finally {
            setBusyId(null);
        }
    };

    const Preview: React.FC<{ borderId: string }> = ({borderId}) => (
        <AvatarBorder borderId={borderId}>
            <div className="w-20 h-20 rounded-full overflow-hidden bg-raised dark:bg-raised flex items-center justify-center">
                {profilePic ? (
                    <img src={profilePic} alt="" className="w-full h-full object-cover"/>
                ) : (
                    <Music size={28} className="text-purple-400 dark:text-purple-500"/>
                )}
            </div>
        </AvatarBorder>
    );

    return (
        <div className="min-h-screen bg-transparent dark:bg-canvas text-ink p-6 md:p-10 transition-colors duration-300">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10 page-heading">
                    <div>
                        <h1 className="page-title text-4xl font-bold mb-2 text-ink">
                            {t("shop_title", "Boutique")}
                        </h1>
                        <p className="text-muted dark:text-muted text-lg">
                            {t("shop_subtitle", "Dépensez vos points pour personnaliser votre profil")}
                        </p>
                    </div>
                    <div className="inline-flex items-center gap-3 bg-gradient-to-r from-amber-500/15 to-yellow-500/10 dark:from-amber-100 dark:to-yellow-50 border border-amber-500/30 dark:border-amber-300 px-5 py-3 rounded-2xl shadow-sm self-start">
                        <Coins size={24} className="text-amber-400 dark:text-amber-500"/>
                        <span className="text-amber-300 dark:text-amber-700 font-bold text-2xl">
                            {loading ? "…" : points}
                        </span>
                        <span className="text-amber-400/80 dark:text-amber-600 text-sm font-medium">
                            {t("shop_points_label", "points boutique")}
                        </span>
                    </div>
                </div>

                <nav className="shop-categories" aria-label={t("shop_title")}>
                    {["borders","themes","fonts","titles","text_effects","banners","patterns"].map(section => <a key={section} href={`#shop-${section}`}>{t(`shop_section_${section}`)}</a>)}
                </nav>

                {/* Info */}
                <div className="mb-8 flex items-center gap-3 bg-blue-500/10 dark:bg-blue-50 border border-blue-500/20 dark:border-blue-200 rounded-xl px-5 py-4">
                    <Sparkles size={20} className="text-blue-400 dark:text-blue-500 shrink-0"/>
                    <p className="text-sm text-blue-200 dark:text-blue-700">
                        {t("shop_earn_hint", "Gagnez 10 points à chaque critique d'album publiée !")}
                    </p>
                </div>

                <h2 id="shop-borders" className="shop-section-title text-xl font-bold mb-5 text-ink">
                            {t("shop_section_borders", "Contours de photo de profil")}
                </h2>

                {/* Grille des contours */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
                    {catalog.filter((c) => c.type === "avatar_border").map((item) => {
                        const isOwned: boolean = owned.includes(item.id);
                        const isEquipped: boolean = equipped === item.id;
                        const busy: boolean = busyId === item.id;

                        return (
                            <div
                                key={item.id}
                                className={`relative bg-panel dark:bg-panel border rounded-2xl p-6 flex flex-col items-center text-center shadow-sm transition-all ${
                                    isEquipped
                                        ? "border-purple-500 dark:border-purple-400"
                                        : "border-line dark:border-line"
                                }`}
                            >
                                {isEquipped && (
                                    <div className="absolute top-3 right-3 flex items-center gap-1 bg-purple-500/15 text-purple-400 dark:text-purple-500 text-[11px] font-bold px-2.5 py-1 rounded-full">
                                        <Check size={12}/>
                                        {t("equipped", "Équipé")}
                                    </div>
                                )}

                                <div className="mb-4 mt-2">
                                    <Preview borderId={item.id}/>
                                </div>

                                <h3 className="font-bold text-ink mb-2">
                                    {itemName(item)}
                                </h3>

                                <div className="flex items-center gap-1.5 text-amber-400 dark:text-amber-500 font-bold mb-4">
                                    <Coins size={16}/>
                                    {item.price}
                                </div>

                                {/* Action */}
                                {!isOwned ? (
                                    <button
                                        onClick={() => handleBuy(item)}
                                        disabled={busy || points < item.price}
                                        className="w-full py-2.5 rounded-xl font-semibold text-sm bg-amber-500 hover:bg-amber-400 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        {busy
                                            ? "…"
                                            : points < item.price
                                                ? t("not_enough_points_short", "Trop cher")
                                                : t("buy", "Acheter")}
                                    </button>
                                ) : isEquipped ? (
                                    <button
                                        onClick={() => handleEquip(null)}
                                        disabled={busy}
                                        className="w-full py-2.5 rounded-xl font-semibold text-sm bg-raised dark:bg-raised text-slate-300 dark:text-gray-700 hover:bg-slate-700 dark:hover:bg-gray-200 transition-colors disabled:opacity-40"
                                    >
                                        {busy ? "…" : t("unequip", "Retirer")}
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleEquip(item.id)}
                                        disabled={busy}
                                        className="w-full py-2.5 rounded-xl font-semibold text-sm bg-purple-600 hover:bg-purple-500 text-white transition-colors disabled:opacity-40"
                                    >
                                        {busy ? "…" : t("equip", "Équiper")}
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Section thèmes */}
                {catalog.some((c) => c.type === "theme") && (
                    <>
                        <h2 id="shop-themes" className="shop-section-title text-xl font-bold mt-12 mb-5 text-ink">
                            {t("shop_section_themes", "Thèmes du site")}
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {catalog.filter((c) => c.type === "theme").map((item) => {
                                const def = PREMIUM_THEMES.find((p) => p.cosmeticId === item.id);
                                const isOwned: boolean = owned.includes(item.id);
                                const isActive: boolean = !!def && theme === def.value;
                                const busy: boolean = busyId === item.id;

                                return (
                                    <div
                                        key={item.id}
                                        className={`relative bg-panel dark:bg-panel border rounded-2xl p-6 shadow-sm transition-all ${
                                            isActive ? "border-blue-500" : "border-line dark:border-line"
                                        }`}
                                    >
                                        {/* Aperçu du thème */}
                                        <div className="h-28 rounded-xl overflow-hidden mb-4 flex items-end p-3 relative"
                                             style={{background: def?.previewGradient || "#1a1d26"}}>
                                            <div className="flex gap-1.5 relative z-10">
                                                {(def?.swatches || []).map((c, i) => (
                                                    <span key={i} className="w-5 h-5 rounded-full border border-white/10" style={{backgroundColor: c}}/>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="font-bold text-ink flex items-center gap-2">
                                                <Palette size={16} className={def?.accentClass || "text-purple-500"}/>
                                                {itemName(item)}
                                            </h3>
                                            <div className="flex items-center gap-1.5 text-amber-400 dark:text-amber-500 font-bold">
                                                <Coins size={16}/>
                                                {item.price}
                                            </div>
                                        </div>

                                        {!isOwned ? (
                                            <button
                                                onClick={() => handleBuy(item)}
                                                disabled={busy || points < item.price}
                                                className="w-full py-2.5 rounded-xl font-semibold text-sm bg-amber-500 hover:bg-amber-400 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                                {busy ? "…" : points < item.price ? t("not_enough_points_short", "Trop cher") : t("buy", "Acheter")}
                                            </button>
                                        ) : isActive ? (
                                            <button
                                                onClick={() => setTheme("dark")}
                                                className="w-full py-2.5 rounded-xl font-semibold text-sm bg-raised dark:bg-raised text-slate-300 dark:text-gray-700 hover:bg-slate-700 dark:hover:bg-gray-200 transition-colors"
                                            >
                                                {t("deactivate_theme", "Revenir au thème sombre")}
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => def && setTheme(def.value)}
                                                className="w-full py-2.5 rounded-xl font-semibold text-sm bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                                            >
                                                {t("activate_theme", "Activer le thème")}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}

                {/* Section polices (pseudo sur le profil) */}
                {catalog.some((c) => c.type === "font") && (
                    <>
                        <h2 id="shop-fonts" className="shop-section-title text-xl font-bold mt-12 mb-5 text-ink">
                            {t("shop_section_fonts", "Polices du pseudo")}
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {catalog.filter((c) => c.type === "font").map((item) => {
                                const isOwned: boolean = owned.includes(item.id);
                                const isEquipped: boolean = equippedFont === item.id;
                                const busy: boolean = busyId === item.id;

                                return (
                                    <div
                                        key={item.id}
                                        className={`relative bg-panel dark:bg-panel border rounded-2xl p-6 shadow-sm transition-all ${
                                            isEquipped ? "border-purple-500" : "border-line dark:border-line"
                                        }`}
                                    >
                                        {/* Aperçu du pseudo dans la police */}
                                        <div className="h-24 rounded-xl mb-4 flex items-center justify-center bg-panel/60 dark:bg-canvas px-3 overflow-hidden">
                                            <span
                                                className="text-3xl text-ink truncate"
                                                style={{fontFamily: getPseudoFontFamily(item.id)}}
                                            >
                                                {pseudo}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="font-bold text-ink flex items-center gap-2">
                                                <Type size={16} className="text-purple-400"/>
                                                {itemName(item)}
                                            </h3>
                                            <div className="flex items-center gap-1.5 text-amber-400 dark:text-amber-500 font-bold">
                                                <Coins size={16}/>
                                                {item.price}
                                            </div>
                                        </div>

                                        {!isOwned ? (
                                            <button
                                                onClick={() => handleBuy(item)}
                                                disabled={busy || points < item.price}
                                                className="w-full py-2.5 rounded-xl font-semibold text-sm bg-amber-500 hover:bg-amber-400 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                                {busy ? "…" : points < item.price ? t("not_enough_points_short", "Trop cher") : t("buy", "Acheter")}
                                            </button>
                                        ) : isEquipped ? (
                                            <button
                                                onClick={() => handleEquip(null, "font")}
                                                disabled={busy}
                                                className="w-full py-2.5 rounded-xl font-semibold text-sm bg-raised dark:bg-raised text-slate-300 dark:text-gray-700 hover:bg-slate-700 dark:hover:bg-gray-200 transition-colors disabled:opacity-40"
                                            >
                                                {busy ? "…" : t("unequip", "Retirer")}
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleEquip(item.id, "font")}
                                                disabled={busy}
                                                className="w-full py-2.5 rounded-xl font-semibold text-sm bg-purple-600 hover:bg-purple-500 text-white transition-colors disabled:opacity-40"
                                            >
                                                {busy ? "…" : t("equip", "Équiper")}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}

                {/* Section titres (badge à côté du pseudo) */}
                {catalog.some((c) => c.type === "title") && (
                    <>
                        <h2 id="shop-titles" className="shop-section-title text-xl font-bold mt-12 mb-5 text-ink">
                            {t("shop_section_titles", "Titres de profil")}
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {catalog.filter((c) => c.type === "title").map((item) => {
                                const def = getProfileTitle(item.id);
                                const isOwned: boolean = owned.includes(item.id);
                                const isEquipped: boolean = equippedTitle === item.id;
                                const busy: boolean = busyId === item.id;

                                return (
                                    <div
                                        key={item.id}
                                        className={`relative bg-panel dark:bg-panel border rounded-2xl p-6 shadow-sm transition-all ${
                                            isEquipped ? "border-purple-500" : "border-line dark:border-line"
                                        }`}
                                    >
                                        {/* Aperçu du badge */}
                                        <div className="h-24 rounded-xl mb-4 flex items-center justify-center bg-panel/60 dark:bg-canvas px-3 overflow-hidden">
                                            <span className={`inline-flex items-center px-3 py-1.5 rounded-full border text-sm font-bold ${def?.className || "bg-slate-700 text-slate-200 border-slate-600"}`}>
                                                {itemName(item)}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="font-bold text-ink flex items-center gap-2">
                                                <Tag size={16} className="text-purple-400"/>
                                                {itemName(item)}
                                            </h3>
                                            <div className="flex items-center gap-1.5 text-amber-400 dark:text-amber-500 font-bold">
                                                <Coins size={16}/>
                                                {item.price}
                                            </div>
                                        </div>

                                        {!isOwned ? (
                                            <button
                                                onClick={() => handleBuy(item)}
                                                disabled={busy || points < item.price}
                                                className="w-full py-2.5 rounded-xl font-semibold text-sm bg-amber-500 hover:bg-amber-400 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                                {busy ? "…" : points < item.price ? t("not_enough_points_short", "Trop cher") : t("buy", "Acheter")}
                                            </button>
                                        ) : isEquipped ? (
                                            <button
                                                onClick={() => handleEquip(null, "title")}
                                                disabled={busy}
                                                className="w-full py-2.5 rounded-xl font-semibold text-sm bg-raised dark:bg-raised text-slate-300 dark:text-gray-700 hover:bg-slate-700 dark:hover:bg-gray-200 transition-colors disabled:opacity-40"
                                            >
                                                {busy ? "…" : t("unequip", "Retirer")}
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleEquip(item.id, "title")}
                                                disabled={busy}
                                                className="w-full py-2.5 rounded-xl font-semibold text-sm bg-purple-600 hover:bg-purple-500 text-white transition-colors disabled:opacity-40"
                                            >
                                                {busy ? "…" : t("equip", "Équiper")}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}

                {/* Section effets de texte (pseudo) */}
                {catalog.some((c) => c.type === "text_effect") && (
                    <>
                        <h2 id="shop-text_effects" className="shop-section-title text-xl font-bold mt-12 mb-5 text-ink">
                            {t("shop_section_text_effects", "Effets de texte du pseudo")}
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {catalog.filter((c) => c.type === "text_effect").map((item) => {
                                const isOwned: boolean = owned.includes(item.id);
                                const isEquipped: boolean = equippedTextEffect === item.id;
                                const busy: boolean = busyId === item.id;

                                return (
                                    <div
                                        key={item.id}
                                        className={`relative bg-panel dark:bg-panel border rounded-2xl p-6 shadow-sm transition-all ${
                                            isEquipped ? "border-purple-500" : "border-line dark:border-line"
                                        }`}
                                    >
                                        {/* Aperçu de l'effet sur le pseudo */}
                                        <div className="h-24 rounded-xl mb-4 flex items-center justify-center bg-panel/60 dark:bg-canvas px-3 overflow-hidden">
                                            <span className={`text-3xl font-bold truncate ${getTextEffectClassName(item.id)}`}>
                                                {pseudo}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="font-bold text-ink flex items-center gap-2">
                                                <Wand2 size={16} className="text-purple-400"/>
                                                {itemName(item)}
                                            </h3>
                                            <div className="flex items-center gap-1.5 text-amber-400 dark:text-amber-500 font-bold">
                                                <Coins size={16}/>
                                                {item.price}
                                            </div>
                                        </div>

                                        {!isOwned ? (
                                            <button
                                                onClick={() => handleBuy(item)}
                                                disabled={busy || points < item.price}
                                                className="w-full py-2.5 rounded-xl font-semibold text-sm bg-amber-500 hover:bg-amber-400 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                                {busy ? "…" : points < item.price ? t("not_enough_points_short", "Trop cher") : t("buy", "Acheter")}
                                            </button>
                                        ) : isEquipped ? (
                                            <button
                                                onClick={() => handleEquip(null, "text_effect")}
                                                disabled={busy}
                                                className="w-full py-2.5 rounded-xl font-semibold text-sm bg-raised dark:bg-raised text-slate-300 dark:text-gray-700 hover:bg-slate-700 dark:hover:bg-gray-200 transition-colors disabled:opacity-40"
                                            >
                                                {busy ? "…" : t("unequip", "Retirer")}
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleEquip(item.id, "text_effect")}
                                                disabled={busy}
                                                className="w-full py-2.5 rounded-xl font-semibold text-sm bg-purple-600 hover:bg-purple-500 text-white transition-colors disabled:opacity-40"
                                            >
                                                {busy ? "…" : t("equip", "Équiper")}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}

                {/* Section bannières premium */}
                {catalog.some((c) => c.type === "banner") && (
                    <>
                        <h2 id="shop-banners" className="shop-section-title text-xl font-bold mt-12 mb-5 text-ink">
                            {t("shop_section_banners", "Bannières premium")}
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {catalog.filter((c) => c.type === "banner").map((item) => {
                                const def = getPremiumBanner(item.id);
                                const isOwned: boolean = owned.includes(item.id);
                                const isEquipped: boolean = equippedBanner === item.id;
                                const busy: boolean = busyId === item.id;

                                return (
                                    <div
                                        key={item.id}
                                        className={`relative bg-panel dark:bg-panel border rounded-2xl p-6 shadow-sm transition-all ${
                                            isEquipped ? "border-purple-500" : "border-line dark:border-line"
                                        }`}
                                    >
                                        {/* Aperçu animé de la bannière */}
                                        <div className={`h-24 rounded-xl mb-4 overflow-hidden ${def?.className || ""}`}/>

                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="font-bold text-ink flex items-center gap-2">
                                                <ImageIcon size={16} className="text-purple-400"/>
                                                {itemName(item)}
                                            </h3>
                                            <div className="flex items-center gap-1.5 text-amber-400 dark:text-amber-500 font-bold">
                                                <Coins size={16}/>
                                                {item.price}
                                            </div>
                                        </div>

                                        {!isOwned ? (
                                            <button
                                                onClick={() => handleBuy(item)}
                                                disabled={busy || points < item.price}
                                                className="w-full py-2.5 rounded-xl font-semibold text-sm bg-amber-500 hover:bg-amber-400 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                                {busy ? "…" : points < item.price ? t("not_enough_points_short", "Trop cher") : t("buy", "Acheter")}
                                            </button>
                                        ) : isEquipped ? (
                                            <button
                                                onClick={() => handleEquip(null, "banner")}
                                                disabled={busy}
                                                className="w-full py-2.5 rounded-xl font-semibold text-sm bg-raised dark:bg-raised text-slate-300 dark:text-gray-700 hover:bg-slate-700 dark:hover:bg-gray-200 transition-colors disabled:opacity-40"
                                            >
                                                {busy ? "…" : t("unequip", "Retirer")}
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleEquip(item.id, "banner")}
                                                disabled={busy}
                                                className="w-full py-2.5 rounded-xl font-semibold text-sm bg-purple-600 hover:bg-purple-500 text-white transition-colors disabled:opacity-40"
                                            >
                                                {busy ? "…" : t("equip", "Équiper")}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}

                {/* Section motifs de fond (page profil) */}
                {catalog.some((c) => c.type === "pattern") && (
                    <>
                        <h2 id="shop-patterns" className="shop-section-title text-xl font-bold mt-12 mb-5 text-ink">
                            {t("shop_section_patterns", "Motifs de profil")}
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {catalog.filter((c) => c.type === "pattern").map((item) => {
                                const def = getPattern(item.id);
                                const isOwned: boolean = owned.includes(item.id);
                                const isEquipped: boolean = equippedPattern === item.id;
                                const busy: boolean = busyId === item.id;

                                return (
                                    <div
                                        key={item.id}
                                        className={`relative bg-panel dark:bg-panel border rounded-2xl p-6 shadow-sm transition-all ${
                                            isEquipped ? "border-purple-500" : "border-line dark:border-line"
                                        }`}
                                    >
                                        <div className={`h-24 rounded-xl mb-4 bg-panel/60 dark:bg-canvas ${def?.className || ""}`}/>

                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="font-bold text-ink flex items-center gap-2">
                                                <LayoutGrid size={16} className="text-purple-400"/>
                                                {itemName(item)}
                                            </h3>
                                            <div className="flex items-center gap-1.5 text-amber-400 dark:text-amber-500 font-bold">
                                                <Coins size={16}/>
                                                {item.price}
                                            </div>
                                        </div>

                                        {!isOwned ? (
                                            <button
                                                onClick={() => handleBuy(item)}
                                                disabled={busy || points < item.price}
                                                className="w-full py-2.5 rounded-xl font-semibold text-sm bg-amber-500 hover:bg-amber-400 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                                {busy ? "…" : points < item.price ? t("not_enough_points_short", "Trop cher") : t("buy", "Acheter")}
                                            </button>
                                        ) : isEquipped ? (
                                            <button
                                                onClick={() => handleEquip(null, "pattern")}
                                                disabled={busy}
                                                className="w-full py-2.5 rounded-xl font-semibold text-sm bg-raised dark:bg-raised text-slate-300 dark:text-gray-700 hover:bg-slate-700 dark:hover:bg-gray-200 transition-colors disabled:opacity-40"
                                            >
                                                {busy ? "…" : t("unequip", "Retirer")}
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleEquip(item.id, "pattern")}
                                                disabled={busy}
                                                className="w-full py-2.5 rounded-xl font-semibold text-sm bg-purple-600 hover:bg-purple-500 text-white transition-colors disabled:opacity-40"
                                            >
                                                {busy ? "…" : t("equip", "Équiper")}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}

                {!loading && catalog.length === 0 && (
                    <p className="text-center text-slate-500 py-12">
                        {t("shop_empty", "Aucun cosmétique disponible pour le moment.")}
                    </p>
                )}
            </div>
        </div>
    );
};

export default Shop;
