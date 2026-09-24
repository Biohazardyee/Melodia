import React, {useEffect, useState} from "react";
import {Check, Download, Loader2, Music2, X} from "lucide-react";
import {useTranslation} from "react-i18next";
import {useNavigate} from "react-router-dom";
import {toast} from "react-toastify";
import apiClient from "../api/client";

interface SpotifyPlaylistSummary {
    id: string;
    name: string;
    image: string | null;
    tracksTotal: number;
    imported?: boolean;
}

const PLAYLIST_NAME_MAX = 30;

interface SpotifyPlaylistImportProps {
    onImported: () => void;
}

const SpotifyPlaylistImport: React.FC<SpotifyPlaylistImportProps> = ({onImported}) => {
    const {t} = useTranslation();
    const navigate = useNavigate();

    const [connected, setConnected] = useState<boolean | null>(null);
    const [playlists, setPlaylists] = useState<SpotifyPlaylistSummary[]>([]);
    const [loadingPlaylists, setLoadingPlaylists] = useState(false);

    const [importTarget, setImportTarget] = useState<SpotifyPlaylistSummary | null>(null);
    const [importName, setImportName] = useState("");
    const [importIsPublic, setImportIsPublic] = useState(false);
    const [importing, setImporting] = useState(false);

    useEffect(() => {
        const load = async (): Promise<void> => {
            try {
                const statusRes = await apiClient.get("/api/spotify/status");
                const isConnected: boolean = !!statusRes.data.connected;
                setConnected(isConnected);

                if (isConnected) {
                    setLoadingPlaylists(true);
                    const playlistsRes = await apiClient.get("/api/spotify/playlists");
                    setPlaylists(playlistsRes.data.playlists || []);
                }
            } catch (e) {
                console.error("Erreur chargement Spotify:", e);
                setConnected(false);
            } finally {
                setLoadingPlaylists(false);
            }
        };
        load();
    }, []);

    const openImportModal = (playlist: SpotifyPlaylistSummary): void => {
        setImportTarget(playlist);
        setImportName(playlist.name.slice(0, PLAYLIST_NAME_MAX));
        setImportIsPublic(false);
    };

    const handleImport = async (): Promise<void> => {
        if (!importTarget || !importName.trim()) return;

        try {
            setImporting(true);
            const res = await apiClient.post(`/api/spotify/playlists/${importTarget.id}/import`, {
                name: importName.trim(),
                is_public: importIsPublic,
                image: importTarget.image,
            });

            toast.success(
                t(
                    "spotify_import_success",
                    "{{count}} albums importés dans \"{{name}}\"",
                    {count: res.data.importedAlbums, name: importName.trim()},
                ),
            );

            if (res.data.skippedTracks > 0) {
                toast.info(
                    t(
                        "spotify_import_skipped",
                        "{{skipped}} titre(s) sur {{total}} ignoré(s) (fichiers locaux, épisodes de podcast ou métadonnées incomplètes)",
                        {skipped: res.data.skippedTracks, total: res.data.totalTracks},
                    ),
                );
            }

            setPlaylists((prev) =>
                prev.map((p) => (p.id === importTarget.id ? {...p, imported: true} : p)),
            );
            setImportTarget(null);
            onImported();
        } catch (err: any) {
            console.error(err);
            toast.error(err.response?.data?.message || t("spotify_import_error", "Erreur lors de l'import"));
        } finally {
            setImporting(false);
        }
    };

    if (connected === null) return null;

    return (
        <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
                <Music2 size={20} className="text-emerald-500"/>
                <h3 className="text-lg font-bold text-ink">
                    {t("spotify_library_title", "Bibliothèque Spotify")}
                </h3>
            </div>

            {!connected ? (
                <button
                    onClick={() => navigate("/settings")}
                    className="w-full text-left flex items-center gap-4 bg-panel dark:bg-panel border border-line dark:border-line p-5 rounded-2xl hover:border-emerald-500/50 transition-colors"
                >
                    <div className="w-11 h-11 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                        <Music2 size={20} className="text-emerald-500"/>
                    </div>
                    <span className="text-muted dark:text-muted text-sm">
                        {t("spotify_connect_cta", "Lie ton compte Spotify dans les paramètres pour importer tes playlists.")}
                    </span>
                </button>
            ) : loadingPlaylists ? (
                <div className="flex justify-center py-8">
                    <Loader2 size={24} className="animate-spin text-emerald-500"/>
                </div>
            ) : playlists.length === 0 ? (
                <p className="text-slate-500 text-sm py-4">
                    {t("spotify_no_playlists", "Aucune playlist trouvée sur ton compte Spotify.")}
                </p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {playlists.map((playlist) => {
                        const alreadyImported = !!playlist.imported;

                        return (
                            <div
                                key={playlist.id}
                                className="flex items-center gap-4 bg-panel dark:bg-panel border border-line/80 dark:border-line p-4 rounded-xl"
                            >
                                <div className="w-14 h-14 rounded-lg bg-raised dark:bg-raised overflow-hidden flex items-center justify-center flex-shrink-0">
                                    {playlist.image ? (
                                        <img src={playlist.image} alt="" className="w-full h-full object-cover"/>
                                    ) : (
                                        <Music2 size={22} className="text-emerald-500"/>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-ink truncate">{playlist.name}</p>
                                    <p className="text-xs text-muted dark:text-muted">
                                        {playlist.tracksTotal} {t("spotify_tracks_count", "titres")}
                                    </p>
                                </div>
                                <button
                                    onClick={() => openImportModal(playlist)}
                                    className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg transition-colors flex-shrink-0 ${
                                        alreadyImported
                                            ? "bg-transparent border border-emerald-600/50 text-emerald-500 hover:bg-emerald-600/10"
                                            : "bg-emerald-600 hover:bg-emerald-500 text-white"
                                    }`}
                                >
                                    {alreadyImported ? <Check size={14}/> : <Download size={14}/>}
                                    {alreadyImported
                                        ? t("btn_reimport", "Réimporter")
                                        : t("btn_import", "Importer")}
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {importTarget && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                    onClick={() => !importing && setImportTarget(null)}
                >
                    <div
                        className="w-full max-w-sm bg-panel dark:bg-panel border border-line dark:border-line rounded-2xl shadow-2xl p-6 space-y-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between">
                            <h4 className="font-bold text-ink">
                                {t("spotify_import_modal_title", "Importer la playlist")}
                            </h4>
                            <button onClick={() => !importing && setImportTarget(null)} disabled={importing}>
                                <X size={18} className="text-muted"/>
                            </button>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-muted mb-2 uppercase">
                                {t("label_playlist_name", "Nom de la playlist")}
                            </label>
                            <input
                                value={importName}
                                onChange={(e) => e.target.value.length <= PLAYLIST_NAME_MAX && setImportName(e.target.value)}
                                className="w-full bg-canvas dark:bg-canvas border border-line dark:border-line rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 text-ink"
                            />
                            <p className="text-[11px] text-slate-500 dark:text-muted mt-1.5">
                                {importName.length}/{PLAYLIST_NAME_MAX}
                            </p>
                        </div>

                        <label className="flex items-center gap-2 text-sm text-slate-300 dark:text-gray-700 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={importIsPublic}
                                onChange={(e) => setImportIsPublic(e.target.checked)}
                                className="accent-emerald-500"
                            />
                            {t("label_public_playlist", "Rendre cette playlist publique")}
                        </label>

                        <p className="text-xs text-slate-500 dark:text-muted">
                            {t("spotify_import_hint", "Les titres de cette playlist Spotify seront regroupés par album, comme sur le reste du site.")}
                        </p>

                        <button
                            onClick={handleImport}
                            disabled={importing || !importName.trim()}
                            className="w-full flex justify-center items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold transition-all disabled:opacity-50"
                        >
                            {importing ? <Loader2 className="animate-spin" size={18}/> :
                                t("btn_import_confirm", "Importer")}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SpotifyPlaylistImport;
