import { Flag, Loader2 } from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";

interface Props {
    reportReason: string;
    setReportReason: React.Dispatch<React.SetStateAction<string>>;
    setIsReportModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
    handleSendReport: () => Promise<void>;
    isSubmittingReport: boolean;
}

export default function AlbumReportDialog({ reportReason, setReportReason, setIsReportModalOpen, handleSendReport, isSubmittingReport }: Props) {
    const { t } = useTranslation();
    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="bg-panel dark:bg-panel w-full max-w-md rounded-2xl border border-line dark:border-line shadow-2xl overflow-hidden">
                <div className="p-6">
                    <div className="flex items-center gap-3 text-rose-500 mb-4">
                        <Flag size={24} />
                        <h3 className="text-xl font-bold">{t("report_title", "Signaler un contenu")}</h3>
                    </div>

                    <p className="text-muted dark:text-muted text-sm mb-6">
                        {t("report_instruction", "Veuillez expliquer pourquoi vous signalez cet avis. Un administrateur l'examinera sous peu.")}
                    </p>

                    <textarea
                        value={reportReason}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReportReason(e.target.value)}
                        placeholder={t("report_placeholder", "Raison du signalement (ex: propos injurieux, spam...)")}
                        className="w-full bg-panel dark:bg-canvas border border-line dark:border-line rounded-xl p-4 text-sm text-ink focus:outline-none focus:border-rose-500 min-h-[120px] resize-none"
                        autoFocus
                    />

                    <div className="flex gap-3 mt-6">
                        <button
                            onClick={(): void => {
                                setIsReportModalOpen(false);
                                setReportReason("");
                            }}
                            className="flex-1 px-4 py-3 rounded-xl font-bold text-muted hover:bg-raised dark:hover:bg-gray-100 transition-colors"
                        >
                            {t("cancel")}
                        </button>
                        <button
                            onClick={handleSendReport}
                            disabled={isSubmittingReport || !reportReason.trim()}
                            className="flex-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:hover:bg-rose-600 text-white px-4 py-3 rounded-xl font-bold transition-all shadow-lg shadow-rose-600/20 flex items-center justify-center gap-2"
                        >
                            {isSubmittingReport ? (
                                <Loader2 size={18} className="animate-spin" />
                            ) : (
                                t("confirm_report", "Envoyer le signalement")
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
