import {
    AlertTriangle,
    Link2,
    Loader2,
    Music2,
    Sparkles,
    Unlink
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { useSpotifyConnection } from "../../hooks/useSpotifyConnection";

type Props = ReturnType<typeof useSpotifyConnection>;

export default function SettingsConnectionsPanel({ spotifyConnected, spotifyProduct, spotifyDisplayName, handleDisconnectSpotify, loadingSpotify, handleConnectSpotify, spotifyNeedsRelink }: Props) {
    const { t } = useTranslation();
    return (
        <div className="space-y-6 animate-in fade-in duration-300 max-w-xl">
            <div>
                <h3 className="text-lg font-bold text-ink">
                    {t("connections_title", "Comptes liés")}
                </h3>
                <p className="text-xs text-muted dark:text-muted mt-1">
                    {t("connections_subtitle", "Connecte des services externes pour enrichir ton expérience Melodia.")}
                </p>
            </div>

            <div
                className="flex items-center justify-between gap-4 bg-canvas dark:bg-canvas border border-line dark:border-line rounded-2xl px-5 py-4">
                <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                        <Music2 size={22} className="text-emerald-500" />
                    </div>
                    <div className="min-w-0">
                        <p className="font-bold text-ink flex items-center gap-2">
                            Spotify
                            {spotifyConnected && spotifyProduct && (
                                <span
                                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide ${spotifyProduct === "premium"
                                            ? "bg-emerald-500/20 text-emerald-400"
                                            : "bg-slate-700 dark:bg-gray-200 text-muted dark:text-muted"
                                        }`}
                                >
                                    {spotifyProduct === "premium" ? t("spotify_premium", "Premium") : t("spotify_free", "Gratuit")}
                                </span>
                            )}
                        </p>
                        <p className="text-xs text-muted dark:text-muted flex items-center gap-1.5 mt-0.5">
                            <span
                                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${spotifyConnected ? "bg-emerald-500" : "bg-slate-600"}`} />
                            <span className="truncate">
                                {spotifyConnected
                                    ? t("spotify_connected_as", "Connecté en tant que {{name}}", { name: spotifyDisplayName || "—" })
                                    : t("spotify_not_connected", "Non connecté")}
                            </span>
                        </p>
                    </div>
                </div>

                {spotifyConnected ? (
                    <button
                        onClick={handleDisconnectSpotify}
                        disabled={loadingSpotify}
                        className="flex items-center gap-2 text-rose-500 hover:bg-rose-500/10 px-4 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50 flex-shrink-0"
                    >
                        {loadingSpotify ? <Loader2 className="animate-spin" size={16} /> :
                            <Unlink size={16} />}
                        {t("btn_unlink", "Délier")}
                    </button>
                ) : (
                    <button
                        onClick={handleConnectSpotify}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg shadow-emerald-500/20 transition-all flex-shrink-0"
                    >
                        <Link2 size={16} />
                        {t("btn_link", "Lier")}
                    </button>
                )}
            </div>

            {spotifyConnected && spotifyNeedsRelink && (
                <div className="flex items-center justify-between gap-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl px-5 py-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <AlertTriangle size={18} className="text-amber-400 shrink-0" />
                        <p className="text-sm text-amber-200">
                            {t("spotify_needs_relink", "Reconnecte ton compte pour activer les Salons d'écoute.")}
                        </p>
                    </div>
                    <button
                        onClick={handleConnectSpotify}
                        className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all flex-shrink-0"
                    >
                        {t("rooms_reconnect_btn", "Reconnecter")}
                    </button>
                </div>
            )}

            <div
                className="flex items-center gap-4 bg-transparent border border-dashed border-line dark:border-line rounded-2xl px-5 py-4 opacity-60">
                <div className="w-12 h-12 rounded-full bg-raised dark:bg-raised flex items-center justify-center flex-shrink-0">
                    <Sparkles size={20} className="text-slate-500" />
                </div>
                <p className="text-sm text-muted dark:text-muted">
                    {t("more_integrations_soon", "D'autres intégrations arriveront bientôt.")}
                </p>
            </div>
        </div>
    );
}
