import {
    Download,
    KeyRound,
    Loader2,
    Shield,
    ShieldAlert,
    ShieldCheck,
    Smartphone,
    X
} from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";
import type { useAccountSecurity } from "../../hooks/useAccountSecurity";

type Props = ReturnType<typeof useAccountSecurity>;

export default function SettingsSecurityPanel({
        backupCodesToShow,
        handleDownloadBackupCodes,
        setBackupCodesToShow,
        oldPassword,
        setOldPassword,
        newPassword,
        setNewPassword,
        handleUpdatePassword,
        loading,
        twofaEnabled,
        twofaSetup,
        handleStartTwofaSetup,
        twofaLoading,
        handleCancelTwofaSetup,
        twofaConfirmCode,
        setTwofaConfirmCode,
        handleConfirmTwofa,
        showRegenerateInput,
        setShowRegenerateInput,
        regenerateCode,
        setRegenerateCode,
        handleRegenerateBackupCodes,
        showTwofaDisable,
        setShowTwofaDisable,
        twofaDisableCode,
        setTwofaDisableCode,
        handleDisableTwofa,
    }: Props) {
    const { t } = useTranslation();
    return (
        <div className="space-y-6 animate-in fade-in duration-300 max-w-xl">
            {backupCodesToShow && (
                <div className="bg-amber-500/5 border border-amber-500/30 rounded-2xl p-5 space-y-4">
                    <div className="flex items-start justify-between gap-2">
                        <div>
                            <h3 className="font-bold text-amber-400 flex items-center gap-2">
                                <KeyRound size={16} /> {t("twofa_backup_codes_title", "Tes codes de secours")}
                            </h3>
                            <p className="text-xs text-muted dark:text-muted mt-1">
                                {t("twofa_backup_codes_hint", "Sauvegarde-les dans un endroit sûr : chacun ne fonctionne qu'une seule fois et te permet de te connecter si tu perds l'accès à ton application d'authentification.")}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 font-mono text-sm bg-canvas dark:bg-panel border border-line dark:border-line rounded-xl p-4">
                        {backupCodesToShow.map((c) => (
                            <span key={c} className="text-slate-200 dark:text-gray-800 select-all">{c}</span>
                        ))}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            onClick={handleDownloadBackupCodes}
                            className="flex-1 flex items-center justify-center gap-2 bg-raised dark:bg-gray-200 hover:bg-slate-700 dark:hover:bg-gray-300 text-ink px-4 py-2.5 rounded-lg text-sm font-bold transition-all"
                        >
                            <Download size={16} /> {t("twofa_backup_codes_download", "Télécharger (.txt)")}
                        </button>
                        <button
                            onClick={() => setBackupCodesToShow(null)}
                            className="flex-1 bg-amber-600 hover:bg-amber-500 text-white px-4 py-2.5 rounded-lg text-sm font-bold shadow-lg shadow-amber-500/20 transition-all"
                        >
                            {t("twofa_backup_codes_saved", "Je les ai sauvegardés")}
                        </button>
                    </div>
                </div>
            )}

            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    <Shield size={18} className="text-blue-400" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-ink">{t("security_title")}</h3>
                    <p className="text-xs text-muted dark:text-muted">
                        {t("security_subtitle", "Choisis un mot de passe que tu n'utilises nulle part ailleurs.")}
                    </p>
                </div>
            </div>
            <div className="space-y-4">
                <input
                    type="password"
                    placeholder={t("old_password_placeholder")}
                    value={oldPassword}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOldPassword(e.target.value)}
                    className="w-full bg-canvas dark:bg-canvas border border-line dark:border-line rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 text-ink transition-colors"
                />
                <input
                    type="password"
                    placeholder={t("new_password_placeholder")}
                    value={newPassword}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
                    className="w-full bg-canvas dark:bg-canvas border border-line dark:border-line rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 text-ink transition-colors"
                />
                <button
                    onClick={handleUpdatePassword}
                    disabled={loading}
                    className="w-full flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
                >
                    {loading ? <Loader2 className="animate-spin" size={18} /> : t("btn_update_password")}
                </button>
            </div>

            {/* --- Double authentification (2FA) --- */}
            <div className="pt-6 border-t border-line dark:border-gray-100 space-y-4">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${twofaEnabled ? "bg-emerald-500/10" : "bg-raised dark:bg-raised"}`}>
                        {twofaEnabled
                            ? <ShieldCheck size={18} className="text-emerald-500" />
                            : <ShieldAlert size={18} className="text-muted" />}
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-ink">
                            {t("twofa_title", "Double authentification (2FA)")}
                        </h3>
                        <p className="text-xs text-muted dark:text-muted">
                            {twofaEnabled
                                ? t("twofa_status_enabled", "Activée — ton compte est protégé par une application d'authentification.")
                                : t("twofa_status_disabled", "Désactivée — ajoute une couche de sécurité supplémentaire.")}
                        </p>
                    </div>
                </div>

                {!twofaEnabled && !twofaSetup && (
                    <button
                        onClick={handleStartTwofaSetup}
                        disabled={twofaLoading}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-lg text-sm font-bold shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
                    >
                        {twofaLoading ? <Loader2 className="animate-spin" size={16} /> : <Smartphone size={16} />}
                        {t("twofa_enable_btn", "Activer la 2FA")}
                    </button>
                )}

                {twofaSetup && (
                    <div className="bg-canvas dark:bg-canvas border border-line dark:border-line rounded-2xl p-5 space-y-4">
                        <div className="flex items-start justify-between gap-2">
                            <p className="text-sm text-slate-300 dark:text-gray-700">
                                {t("twofa_scan_hint", "Scanne ce QR code avec ton application d'authentification (Google Authenticator, Authy...), puis entre le code généré.")}
                            </p>
                            <button onClick={handleCancelTwofaSetup} className="text-slate-500 hover:text-white dark:hover:text-gray-900 flex-shrink-0" type="button">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="flex justify-center">
                            <img src={twofaSetup.qrCodeDataUri} alt="QR code 2FA" className="w-44 h-44 rounded-xl border border-line dark:border-line bg-white p-2" />
                        </div>

                        <div className="flex items-center gap-2 justify-center text-xs text-slate-500 dark:text-muted">
                            <KeyRound size={14} />
                            <code className="select-all">{twofaSetup.secret}</code>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                            <input
                                type="text"
                                inputMode="numeric"
                                maxLength={6}
                                value={twofaConfirmCode}
                                onChange={(e) => setTwofaConfirmCode(e.target.value.replace(/\D/g, ""))}
                                placeholder="123456"
                                className="flex-1 bg-panel dark:bg-panel border border-line dark:border-line rounded-xl px-4 py-3 text-center text-xl tracking-[0.4em] font-bold outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 text-ink transition-colors"
                            />
                            <button
                                onClick={handleConfirmTwofa}
                                disabled={twofaLoading || twofaConfirmCode.length !== 6}
                                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
                            >
                                {twofaLoading ? <Loader2 className="animate-spin" size={18} /> : t("twofa_confirm_btn", "Confirmer")}
                            </button>
                        </div>
                    </div>
                )}

                {twofaEnabled && (
                    <div className="space-y-3">
                        {!showRegenerateInput ? (
                            <button
                                onClick={() => setShowRegenerateInput(true)}
                                className="flex items-center gap-2 text-slate-300 dark:text-gray-700 hover:bg-white/5 dark:hover:bg-gray-100 px-4 py-2.5 rounded-lg text-sm font-bold transition-all border border-line dark:border-line"
                            >
                                <KeyRound size={16} /> {t("twofa_backup_regenerate_btn", "Régénérer mes codes de secours")}
                            </button>
                        ) : (
                            <div className="bg-canvas dark:bg-canvas border border-line dark:border-line rounded-2xl p-5 space-y-3">
                                <p className="text-sm text-slate-300 dark:text-gray-700">
                                    {t("twofa_backup_regenerate_hint", "Entre le code de ton application d'authentification. Tes anciens codes de secours deviendront invalides.")}
                                </p>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={6}
                                        value={regenerateCode}
                                        onChange={(e) => setRegenerateCode(e.target.value.replace(/\D/g, ""))}
                                        placeholder="123456"
                                        className="flex-1 bg-panel dark:bg-panel border border-line dark:border-line rounded-xl px-4 py-3 text-center text-xl tracking-[0.4em] font-bold outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 text-ink transition-colors"
                                    />
                                    <button
                                        onClick={handleRegenerateBackupCodes}
                                        disabled={twofaLoading || regenerateCode.length !== 6}
                                        className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
                                    >
                                        {twofaLoading ? <Loader2 className="animate-spin" size={18} /> : t("twofa_confirm_btn", "Confirmer")}
                                    </button>
                                </div>
                                <button
                                    onClick={() => { setShowRegenerateInput(false); setRegenerateCode(""); }}
                                    className="text-xs text-muted dark:text-muted hover:underline"
                                    type="button"
                                >
                                    {t("cancel", "Annuler")}
                                </button>
                            </div>
                        )}

                        {!showTwofaDisable ? (
                            <button
                                onClick={() => setShowTwofaDisable(true)}
                                className="flex items-center gap-2 text-rose-500 hover:bg-rose-500/10 px-4 py-2.5 rounded-lg text-sm font-bold transition-all"
                            >
                                {t("twofa_disable_btn", "Désactiver la 2FA")}
                            </button>
                        ) : (
                            <div className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-5 space-y-3">
                                <p className="text-sm text-slate-300 dark:text-gray-700">
                                    {t("twofa_disable_hint", "Entre le code de ton application d'authentification pour confirmer la désactivation.")}
                                </p>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={6}
                                        value={twofaDisableCode}
                                        onChange={(e) => setTwofaDisableCode(e.target.value.replace(/\D/g, ""))}
                                        placeholder="123456"
                                        className="flex-1 bg-canvas dark:bg-panel border border-line dark:border-line rounded-xl px-4 py-3 text-center text-xl tracking-[0.4em] font-bold outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500/40 text-ink transition-colors"
                                    />
                                    <button
                                        onClick={handleDisableTwofa}
                                        disabled={twofaLoading || twofaDisableCode.length !== 6}
                                        className="flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-rose-500/20 transition-all disabled:opacity-50"
                                    >
                                        {twofaLoading ? <Loader2 className="animate-spin" size={18} /> : t("twofa_disable_confirm_btn", "Confirmer")}
                                    </button>
                                </div>
                                <button
                                    onClick={() => { setShowTwofaDisable(false); setTwofaDisableCode(""); }}
                                    className="text-xs text-muted dark:text-muted hover:underline"
                                    type="button"
                                >
                                    {t("cancel", "Annuler")}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
