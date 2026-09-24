import React, {useEffect, useState} from "react";
import {X, Download, Loader2} from "lucide-react";
import {useTranslation} from "react-i18next";
import {toast} from "react-toastify";
import {generateReviewShareCard, ShareCardData} from "../utils/shareCard";

interface ShareCardModalProps {
    data: ShareCardData;
    onClose: () => void;
}

const ShareCardModal: React.FC<ShareCardModalProps> = ({data, onClose}) => {
    const {t} = useTranslation();
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [generating, setGenerating] = useState(true);

    useEffect(() => {
        let cancelled = false;

        generateReviewShareCard(data)
            .then((url) => {
                if (!cancelled) setImageUrl(url);
            })
            .catch((err) => {
                console.error("Erreur génération carte de partage:", err);
                if (!cancelled) toast.error(t("share_card_error", "Impossible de générer l'image."));
            })
            .finally(() => {
                if (!cancelled) setGenerating(false);
            });

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleDownload = (): void => {
        if (!imageUrl) return;
        const a = document.createElement("a");
        a.href = imageUrl;
        a.download = `melodia-${data.artist}-${data.album}.png`.replace(/[^a-z0-9-.]/gi, "_");
        document.body.appendChild(a);
        a.click();
        a.remove();
    };

    return (
        <div
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-100 flex items-center justify-center p-6"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="bg-panel dark:bg-panel border border-line dark:border-line rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden"
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-line dark:border-line">
                    <h3 className="font-bold text-ink">
                        {t("share_card_title", "Partager cette critique")}
                    </h3>
                    <button onClick={onClose} className="text-slate-500 hover:text-white dark:hover:text-gray-900 transition-colors">
                        <X size={20}/>
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    <div className="aspect-[4/5] rounded-xl overflow-hidden bg-panel dark:bg-raised flex items-center justify-center">
                        {generating ? (
                            <Loader2 className="animate-spin text-indigo-400" size={32}/>
                        ) : imageUrl ? (
                            <img src={imageUrl} alt="" className="w-full h-full object-cover"/>
                        ) : (
                            <p className="text-sm text-slate-500 p-4 text-center">
                                {t("share_card_error", "Impossible de générer l'image.")}
                            </p>
                        )}
                    </div>

                    <button
                        onClick={handleDownload}
                        disabled={!imageUrl || generating}
                        className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all"
                    >
                        <Download size={18}/>
                        {t("share_card_download", "Télécharger l'image")}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ShareCardModal;
