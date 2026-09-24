import { Loader2 } from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";
import {
    FaPlus
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";

interface Props {
    loadingPlaylists: boolean;
    userPlaylists: any[];
    handleAddToPlaylist: (playlistId: string) => Promise<void>;
    id: string | undefined;
    albumData: any;
    setIsPlaylistModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function AlbumPlaylistDialog({ loadingPlaylists, userPlaylists, handleAddToPlaylist, id, albumData, setIsPlaylistModalOpen }: Props) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="bg-panel dark:bg-panel border border-line dark:border-line rounded-2xl p-6 w-full max-w-sm shadow-2xl">
                <h3 className="text-xl font-bold mb-4">{t("add_to_playlist")}</h3>

                <div className="space-y-2 mb-6 max-h-48 overflow-y-auto pr-2">
                    {loadingPlaylists ? (
                        <div className="flex justify-center py-4"><Loader2 className="animate-spin" /></div>
                    ) : userPlaylists.length > 0 ? (
                        userPlaylists.map((pl) => (
                            <button
                                key={pl.id}
                                onClick={() => handleAddToPlaylist(pl.id)}
                                className="w-full text-left p-3 rounded-lg hover:bg-raised dark:hover:bg-gray-100 transition-colors border border-line dark:border-line"
                            >
                                <span className="font-bold text-ink">{pl.name}</span>
                            </button>
                        ))
                    ) : (
                        <p className="text-sm text-gray-500 text-center py-4">
                            {t("no_playlist")}
                        </p>
                    )}
                </div>
                <div className="space-y-3">
                    <button
                        onClick={() =>
                            navigate("/create-playlist", {
                                state: {
                                    returnTo: `/album/${id}`,
                                    albumToAdd: albumData,
                                },
                            })
                        }
                        className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center justify-center gap-2"
                    >
                        <FaPlus size={14} /> {t("create_playlist")}
                    </button>
                    <button
                        onClick={() => setIsPlaylistModalOpen(false)}
                        className="w-full py-3 text-muted font-bold"
                    >
                        {t("cancel")}
                    </button>
                </div>
            </div>
        </div>
    );
}
