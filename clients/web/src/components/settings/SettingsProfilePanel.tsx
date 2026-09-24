import {
    AtSign,
    Camera,
    CheckCircle,
    Loader2,
    LogOut,
    Music,
    Trash2,
    User
} from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";
const USERNAME_MAX: number = 20;
const PSEUDO_MAX: number = 30;
const BIO_MAX: number = 150;

interface Props {
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    profilePicture: string;
    username: string;
    handleDeletePic: (e: React.MouseEvent) => void;
    pseudo: string;
    handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    setUsername: React.Dispatch<React.SetStateAction<string>>;
    setPseudo: React.Dispatch<React.SetStateAction<string>>;
    favoriteBand: string;
    searchArtists: (text: string) => void;
    showSuggestions: boolean;
    isSearching: boolean;
    suggestions: { name: string; }[];
    setFavoriteBand: React.Dispatch<React.SetStateAction<string>>;
    setShowSuggestions: React.Dispatch<React.SetStateAction<boolean>>;
    biography: string;
    setBiography: React.Dispatch<React.SetStateAction<string>>;
    handleLogout: () => Promise<void>;
    isSaved: boolean;
    statusMessage: string;
    handleSaveProfile: () => Promise<void>;
    loading: boolean;
}

export default function SettingsProfilePanel({
        fileInputRef,
        profilePicture,
        username,
        handleDeletePic,
        pseudo,
        handleImageUpload,
        setUsername,
        setPseudo,
        favoriteBand,
        searchArtists,
        showSuggestions,
        isSearching,
        suggestions,
        setFavoriteBand,
        setShowSuggestions,
        biography,
        setBiography,
        handleLogout,
        isSaved,
        statusMessage,
        handleSaveProfile,
        loading,
    }: Props) {
    const { t } = useTranslation();
    return (
        <div className="space-y-8 animate-in fade-in duration-300">
            <section className="flex flex-col items-center sm:flex-row gap-6 pb-6 border-b border-line dark:border-gray-100">
                <div
                    onClick={() => fileInputRef.current?.click()}
                    className="relative group w-24 h-24 rounded-full bg-raised ring-4 ring-blue-500/20 border-2 border-blue-500 flex items-center justify-center overflow-hidden cursor-pointer shadow-lg flex-shrink-0"
                >
                    {profilePicture ? (
                        <img src={profilePicture} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                        <span
                            className="text-2xl font-bold text-blue-400">{username?.substring(0, 2).toUpperCase() || "U"}</span>
                    )}

                    <div
                        className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        {!profilePicture ? (
                            <Camera size={20} className="text-white" />
                        ) : (
                            <button onClick={handleDeletePic}
                                className="text-white hover:text-rose-500 p-2" type="button">
                                <Trash2 size={20} />
                            </button>
                        )}
                    </div>
                </div>
                <div className="text-center sm:text-left">
                    <p className="font-bold text-ink">{pseudo || username || "—"}</p>
                    <p className="text-xs text-muted dark:text-muted mt-1">
                        {t("avatar_hint", "Clique sur l'avatar pour changer ta photo de profil.")}
                    </p>
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*"
                    onChange={handleImageUpload} />
            </section>

            <div>
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-muted mb-4">
                    {t("settings_section_info", "Informations générales")}
                </h3>
                <div className="grid gap-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Champ Username */}
                        <div>
                            <label
                                className="flex justify-between items-center gap-2 text-xs font-bold text-muted mb-2 uppercase">
                                <span className="flex items-center gap-1.5"><AtSign size={12} /> {t("label_username")}</span>
                                <span
                                    className="text-slate-500 text-[11px] font-normal">{username.length}/{USERNAME_MAX}</span>
                            </label>
                            <input
                                name="username"
                                value={username}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => e.target.value.length <= USERNAME_MAX && setUsername(e.target.value)}
                                className="w-full bg-canvas dark:bg-canvas border border-line dark:border-line rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 text-ink transition-colors"
                            />
                            <p className="text-[11px] text-slate-500 dark:text-muted mt-1.5">
                                {t("username_hint", "Identifiant unique (@) utilisé pour vous retrouver.")}
                            </p>
                        </div>

                        {/* Champ Pseudo (nom d'affichage, non unique) */}
                        <div>
                            <label
                                className="flex justify-between items-center gap-2 text-xs font-bold text-muted mb-2 uppercase">
                                <span className="flex items-center gap-1.5"><User size={12} /> {t("label_pseudo")}</span>
                                <span
                                    className="text-slate-500 text-[11px] font-normal">{pseudo.length}/{PSEUDO_MAX}</span>
                            </label>
                            <input
                                name="pseudo"
                                value={pseudo}
                                placeholder={t("pseudo_placeholder", "Votre nom d'affichage")}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => e.target.value.length <= PSEUDO_MAX && setPseudo(e.target.value)}
                                className="w-full bg-canvas dark:bg-canvas border border-line dark:border-line rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 text-ink placeholder:text-slate-600 transition-colors"
                            />
                            <p className="text-[11px] text-slate-500 dark:text-muted mt-1.5">
                                {t("pseudo_hint", "Nom affiché sur votre profil (peut être identique à d'autres).")}
                            </p>
                        </div>

                        {/* Champ Favorite Band avec suggestions */}
                        <div className="relative">
                            <label className="flex items-center gap-1.5 text-xs font-bold text-muted mb-2 uppercase">
                                <Music size={12} /> {t("label_favorite_band")}
                            </label>
                            <input
                                name="favoriteBand"
                                value={favoriteBand}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => searchArtists(e.target.value)}
                                placeholder={t("favorite_band_placeholder", "Rechercher un artiste...")}
                                className="w-full bg-canvas dark:bg-canvas border border-line dark:border-line rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 text-ink transition-colors"
                            />

                            {/* Menu déroulant des suggestions */}
                            {showSuggestions && (
                                <div
                                    className="absolute z-50 w-full bg-panel dark:bg-panel border border-line dark:border-line rounded-xl mt-1 overflow-hidden shadow-2xl max-h-60">
                                    {isSearching ? (
                                        <div className="flex items-center justify-center p-4">
                                            <Loader2 className="animate-spin text-blue-500" size={20} />
                                        </div>
                                    ) : (
                                        suggestions.map((item: { name: string }, i: number) => (
                                            <button
                                                key={i}
                                                type="button"
                                                onClick={(): void => {
                                                    setFavoriteBand(item.name);
                                                    setShowSuggestions(false);
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm hover:bg-raised dark:hover:bg-gray-100 transition-colors text-white dark:text-gray-800"
                                            >
                                                <Music size={14} className="text-muted" />
                                                {item.name}
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Champ Biographie */}
                    <div>
                        <label
                            className="flex justify-between text-xs font-bold text-muted mb-2 uppercase">
                            <span>{t("label_bio")}</span>
                            <span
                                className="text-slate-500 text-[11px] font-normal">{biography.length}/{BIO_MAX}</span>
                        </label>
                        <textarea
                            name="biography"
                            rows={3}
                            value={biography}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => e.target.value.length <= BIO_MAX && setBiography(e.target.value)}
                            className="w-full bg-canvas dark:bg-canvas border border-line dark:border-line rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 resize-none text-ink transition-colors"
                        />
                    </div>
                </div>
            </div>

            {/* Barre d'action Footer */}
            <div
                className="pt-6 border-t border-line dark:border-gray-100 flex justify-between items-center">
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 text-rose-500 hover:bg-rose-500/10 px-4 py-2 rounded-lg font-bold transition-all"
                >
                    <LogOut size={18} /> {t("btn_logout")}
                </button>
                <div className="flex items-center gap-4">
                    {isSaved && (
                        <span
                            className="flex items-center gap-1 text-emerald-500 text-sm font-bold animate-pulse">
                            <CheckCircle
                                size={16} /> {statusMessage}
                        </span>
                    )}
                    <button
                        onClick={handleSaveProfile}
                        disabled={loading}
                        className="flex items-center justify-center min-w-35 bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="animate-spin" size={18} /> : t("btn_save")}
                    </button>
                </div>
            </div>
        </div>
    );
}
