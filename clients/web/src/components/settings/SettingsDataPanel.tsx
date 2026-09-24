import {
    AlertTriangle,
    Download,
    ExternalLink,
    Loader2,
    Trash2
} from "lucide-react";
import { useTranslation } from "react-i18next";

interface Props {
    handleExportData: () => Promise<void>;
    exportLoading: boolean;
}

export default function SettingsDataPanel({ handleExportData, exportLoading }: Props) {
    const { t } = useTranslation();
    return (
        <div className="space-y-4 animate-in fade-in duration-300 max-w-xl">
            <h3 className="text-lg font-bold text-ink">{t("data_title")}</h3>

            <div
                className="flex items-center justify-between gap-4 bg-canvas dark:bg-canvas border border-line dark:border-line rounded-2xl px-5 py-4">
                <div className="flex items-center gap-4 min-w-0">
                    <div className="w-11 h-11 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                        <Download size={18} className="text-blue-400" />
                    </div>
                    <div className="min-w-0">
                        <p className="font-bold text-ink">{t("btn_export_data")}</p>
                        <p className="text-xs text-muted dark:text-muted">
                            {t("export_data_desc", "Télécharge une copie de tes données Melodia.")}
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleExportData}
                    disabled={exportLoading}
                    className="flex items-center gap-2 bg-raised dark:bg-gray-200 hover:bg-slate-700 dark:hover:bg-gray-300 px-4 py-2 rounded-lg text-sm font-bold text-ink transition-all flex-shrink-0 disabled:opacity-50">
                    {exportLoading ? <Loader2 className="animate-spin" size={16} /> : <ExternalLink size={16} />}
                    {t("btn_export_data")}
                </button>
            </div>

            <div
                className="flex items-center justify-between gap-4 bg-rose-500/5 border border-rose-500/20 rounded-2xl px-5 py-4">
                <div className="flex items-center gap-4 min-w-0">
                    <div className="w-11 h-11 rounded-full bg-rose-500/10 flex items-center justify-center flex-shrink-0">
                        <AlertTriangle size={18} className="text-rose-500" />
                    </div>
                    <div className="min-w-0">
                        <p className="font-bold text-rose-400">{t("danger_zone", "Zone de danger")}</p>
                        <p className="text-xs text-muted dark:text-muted">
                            {t("danger_zone_desc", "Cette action est irréversible.")}
                        </p>
                    </div>
                </div>
                <button
                    className="flex items-center gap-2 border border-rose-500/40 text-rose-500 hover:bg-rose-500/10 px-4 py-2 rounded-lg text-sm font-bold transition-all flex-shrink-0">
                    <Trash2 size={16} /> {t("btn_delete_account")}
                </button>
            </div>
        </div>
    );
}
