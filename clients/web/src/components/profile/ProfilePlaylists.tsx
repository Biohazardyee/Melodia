import {
    ChevronRight,
    Music,
    Plus,
    Trash2
} from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import SpotifyPlaylistImport from "../../components/SpotifyPlaylistImport";

interface Props {
    isOwnProfile: boolean;
    fetchPlaylists: (userId: string, ownProfile: boolean) => Promise<void>;
    userConnected: string;
    playlists: any[];
    fetchPlaylistDetails: (id: string) => Promise<void>;
    formatPlaylistImage: (imgUrl: string) => string;
    handleDeletePlaylist: (e: React.MouseEvent, playlistId: string) => Promise<void>;
}

export default function ProfilePlaylists({ isOwnProfile, fetchPlaylists, userConnected, playlists, fetchPlaylistDetails, formatPlaylistImage, handleDeletePlaylist }: Props) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    return (
        <div className="space-y-4 w-full">
            {isOwnProfile && (
                <SpotifyPlaylistImport onImported={() => fetchPlaylists(userConnected, true)} />
            )}
            {isOwnProfile && (
                <button
                    onClick={() => navigate("/create-playlist")}
                    className="w-full flex items-center gap-5 bg-panel dark:bg-panel border border-dashed border-slate-600 dark:border-line p-5 rounded-2xl cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 hover:bg-raised dark:hover:bg-gray-50 transition-all group"
                >
                    <div className="w-20 h-20 sm:w-24 sm:h-24 bg-raised/60 dark:bg-raised rounded-xl flex items-center justify-center shrink-0 border border-line dark:border-line group-hover:border-blue-500/50 transition-colors">
                        <Plus size={28} className="text-muted dark:text-muted group-hover:text-blue-400 dark:group-hover:text-blue-500 group-hover:scale-110 transition-all" />
                    </div>
                    <span className="text-muted dark:text-muted font-semibold text-lg group-hover:text-blue-400 dark:group-hover:text-blue-500 transition-colors">
                        {t("create_playlist_card")}
                    </span>
                </button>
            )}
            {playlists.map((playlist) => {
                // Récupère dynamiquement le nombre de titres selon ce que renvoie ton API
                const tracksCount = playlist.items?.length ?? playlist._count?.items ?? playlist.items_count ?? 0;

                return (
                    <div
                        key={playlist.id}
                        onClick={() => fetchPlaylistDetails(playlist.id)}
                        className="flex items-center gap-5 bg-panel dark:bg-panel border border-line/80 dark:border-line p-5 rounded-2xl cursor-pointer hover:border-line/50 dark:hover:border-gray-300 transition-all shadow-md group"
                    >
                        {/* Pochette de la Playlist */}
                        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-raised dark:bg-raised rounded-xl flex items-center justify-center overflow-hidden shrink-0 shadow-md relative border border-line/50 dark:border-line">
                            {playlist.image_url ? (
                                <img
                                    src={formatPlaylistImage(playlist.image_url)}
                                    alt={playlist.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                            ) : (
                                <Music size={32} className="text-blue-500 group-hover:scale-110 transition-transform duration-300" />
                            )}
                        </div>

                        {/* Informations textuelles */}
                        <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <h4 className="text-ink font-bold text-lg md:text-xl truncate group-hover:text-blue-400 dark:group-hover:text-blue-600 transition-colors">
                                    {playlist.name}
                                </h4>
                                <p className="text-sm text-muted dark:text-muted mt-1 flex items-center gap-1.5 font-medium">
                                    <Music size={14} className="text-slate-500" />
                                    <span>
                                        {tracksCount} {tracksCount > 1 ? t("track_plural") : t("track_singular")}
                                    </span>
                                </p>
                            </div>

                            {/* Badges de Statut & Indicateur d'action */}
                            <div className="flex items-center gap-4 self-start sm:self-center">
                                {String(playlist.is_public) === "false" ? (
                                    <span className="bg-amber-500/10 text-amber-500 dark:text-amber-600 border border-amber-500/20 text-xs font-semibold px-3 py-1 rounded-full shadow-sm">
                                        {t("status_private")}
                                    </span>
                                ) : (
                                    <span className="bg-emerald-500/10 text-emerald-500 dark:text-emerald-600 border border-emerald-500/20 text-xs font-semibold px-3 py-1 rounded-full shadow-sm">
                                        {t("status_public")}
                                    </span>
                                )}
                                {isOwnProfile && (
                                    <button
                                        onClick={(e) => handleDeletePlaylist(e, playlist.id)}
                                        className="p-2 rounded-lg text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                                        title={t("delete_playlist_title", "Supprimer la playlist")}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                                <ChevronRight
                                    size={20}
                                    className="text-slate-500 dark:text-muted group-hover:text-white dark:group-hover:text-gray-900 group-hover:translate-x-1 transition-all hidden sm:block"
                                />
                            </div>
                        </div>
                    </div>
                );
            })}

            {playlists.length === 0 && (
                <p className="text-slate-500 font-medium py-12 text-center">
                    {t("empty_playlists_list")}
                </p>
            )}
        </div>
    );
}
