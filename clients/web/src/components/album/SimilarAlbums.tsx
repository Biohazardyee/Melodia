import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

interface Props {
    loadingSimilar: boolean;
    similarAlbums: any[];
    PLACEHOLDER_IMAGE: "/melodia_placeholder.png";
}

export default function SimilarAlbums({ loadingSimilar, similarAlbums, PLACEHOLDER_IMAGE }: Props) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    return (
        <div className="mt-6">
            {loadingSimilar ? (
                <div className="flex justify-center py-10">
                    <Loader2 className="animate-spin text-[#FF1E56]" size={32} />
                </div>
            ) : similarAlbums.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {similarAlbums.map((item: any, idx: number) => (
                        <div
                            key={idx}
                            className="cursor-pointer group"
                            onClick={(): void => {
                                const artistName = item.artist?.name || item.artist || "";
                                const albumName = item.name || "";
                                const coverUrl = item.image?.[3]?.["#text"] || item.image?.[2]?.["#text"] || "";
                                const albumId = item.mbid || item.api_id || item.media_id || `album:${artistName}:${albumName}`;
                                const params: string = new URLSearchParams({
                                    artist: artistName,
                                    album: albumName,
                                    cover: coverUrl,
                                    mbid: item.mbid || "",
                                }).toString();

                                navigate(`/album/${albumId}?${params}`);
                            }}
                        >
                            <div className="w-full aspect-square rounded-lg overflow-hidden bg-panel dark:bg-raised">
                                <img
                                    src={item.image?.[3]?.["#text"] || item.image?.[2]?.["#text"] || PLACEHOLDER_IMAGE}
                                    alt={item.name}
                                    onError={(e) => {
                                        const img = e.currentTarget;
                                        if (img.src !== window.location.origin + PLACEHOLDER_IMAGE) {
                                            img.src = PLACEHOLDER_IMAGE;
                                        }
                                    }}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                            </div>
                            <p className="text-sm mt-2 font-medium text-ink truncate">
                                {item.name}
                            </p>
                            <p className="text-xs text-muted dark:text-muted truncate">
                                {item.artist.name}
                            </p>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-10 text-gray-500">
                    {t("no_similar", "Aucun album similaire trouvé.")}
                </div>
            )}
        </div>
    );
}
