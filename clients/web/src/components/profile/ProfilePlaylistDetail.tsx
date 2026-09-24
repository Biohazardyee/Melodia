import {
    ArrowLeft,
    MoreVertical
} from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

interface Props {
    setSelectedPlaylist: React.Dispatch<any>;
    selectedPlaylist: any;
    formatPlaylistImage: (imgUrl: string) => string;
    isOwnProfile: boolean;
    removeItem: (e: React.MouseEvent, playlistItemId: string, mediaTitle: string) => Promise<void>;
}

export default function ProfilePlaylistDetail({ setSelectedPlaylist, selectedPlaylist, formatPlaylistImage, isOwnProfile, removeItem }: Props) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    return (
        <div className="space-y-8 animate-fadeIn">
            <button
                onClick={() => setSelectedPlaylist(null)}
                className="flex items-center gap-2 text-muted hover:text-white dark:text-muted dark:hover:text-gray-900 transition-colors mb-4"
            >
                <ArrowLeft size={20} /> {t("back") || "Retour"}
            </button>

            <div className="flex flex-col md:flex-row gap-8 items-start">
                <div
                    className="w-48 h-48 md:w-56 md:h-56 bg-panel dark:bg-raised rounded-2xl overflow-hidden shadow-2xl shrink-0">
                    {selectedPlaylist.image_url ? (
                        <img
                            src={formatPlaylistImage(selectedPlaylist.image_url)}
                            alt=""
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div
                            className="w-full h-full flex items-center justify-center text-slate-600 dark:text-muted">
                            {t("no_cover") || "Sans couverture"}
                        </div>
                    )}
                </div>
                <div className="flex flex-col gap-4 mt-2">
                    <h1 className="page-title text-4xl md:text-5xl font-bold text-ink tracking-tight">
                        {selectedPlaylist.name}
                    </h1>
                    <p className="text-slate-500 dark:text-muted font-medium">
                        {selectedPlaylist.items?.length || 0} Albums
                    </p>
                </div>
            </div>

            <div className="mt-12 pt-8 border-t border-line dark:border-line">
                <h2 className="text-2xl font-bold mb-6 text-ink">
                    Albums
                </h2>
                {selectedPlaylist.items && selectedPlaylist.items.length > 0 ? (
                    <div
                        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-10">
                        {selectedPlaylist.items.map((item: any) => (
                            <div
                                key={item.id}
                                className="flex flex-col gap-3 group cursor-pointer relative"
                                onClick={() => navigate(`/album/${item.media_id}`)}
                            >
                                {isOwnProfile && (
                                    <button
                                        onClick={(e: React.MouseEvent<HTMLButtonElement>) =>
                                            removeItem(e, item.id, item.media?.title || "Album")
                                        }
                                        className="absolute top-2 right-2 z-20 bg-black/50 hover:bg-rose-500/80 backdrop-blur-md p-1.5 rounded-lg text-white transition-colors"
                                    >
                                        <MoreVertical size={16} />
                                    </button>
                                )}

                                <div
                                    className="aspect-square bg-panel dark:bg-raised rounded-2xl overflow-hidden shadow-lg relative border border-transparent dark:border-line group-hover:border-line dark:group-hover:border-gray-300 transition-colors">
                                    <img
                                        src={item.media?.cover || item.image}
                                        alt=""
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                    {item.media?.rating > 0 && (
                                        <div
                                            className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg flex items-center gap-1">
                                            <span className="text-yellow-400">★</span>
                                            <span className="text-white text-xs font-bold">
                                                {item.media.rating}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="px-1">
                                    <h4 className="font-bold text-ink text-lg truncate">
                                        {item.media?.title || item.title}
                                    </h4>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-slate-500 font-medium py-12">
                        {t("empty_playlist")}
                    </p>
                )}
            </div>
        </div>
    );
}
