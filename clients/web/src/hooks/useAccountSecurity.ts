import { AxiosResponse } from "axios";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import apiClient from "../api/client";

export function useAccountSecurity(userId: string) {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [oldPassword, setOldPassword] = useState("");

    const [newPassword, setNewPassword] = useState("");

    const [twofaEnabled, setTwofaEnabled] = useState(false);

    const [twofaSetup, setTwofaSetup] = useState<{ secret: string; qrCodeDataUri: string } | null>(null);

    const [twofaConfirmCode, setTwofaConfirmCode] = useState("");

    const [twofaDisableCode, setTwofaDisableCode] = useState("");

    const [showTwofaDisable, setShowTwofaDisable] = useState(false);

    const [twofaLoading, setTwofaLoading] = useState(false);

    const [backupCodesToShow, setBackupCodesToShow] = useState<string[] | null>(null);

    const [showRegenerateInput, setShowRegenerateInput] = useState(false);

    const [regenerateCode, setRegenerateCode] = useState("");

    const handleUpdatePassword = async (): Promise<void> => {
        if (!oldPassword || !newPassword) {
            toast.error(t("fill_all_fields", "Veuillez remplir tous les champs"));
            return;
        }

        try {
            setLoading(true);
            await apiClient.put(`/users/${userId}`, {
                oldPassword,
                password: newPassword,
            });

            setOldPassword("");
            setNewPassword("");
            toast.success(t("password_update_success", "Mot de passe mis à jour avec succès"));
        } catch (err: any) {
            console.error(err);
            toast.error(err.response?.data?.message || t("password_update_error", "Erreur lors de la modification"));
        } finally {
            setLoading(false);
        }
    };

    const handleStartTwofaSetup = async (): Promise<void> => {
        try {
            setTwofaLoading(true);
            const res: AxiosResponse = await apiClient.post("/users/2fa/setup");
            setTwofaSetup({ secret: res.data.secret, qrCodeDataUri: res.data.qrCodeDataUri });
        } catch (err: any) {
            toast.error(err.response?.data?.message || t("twofa_setup_error", "Erreur lors de l'activation de la 2FA."));
        } finally {
            setTwofaLoading(false);
        }
    };

    const handleCancelTwofaSetup = (): void => {
        setTwofaSetup(null);
        setTwofaConfirmCode("");
    };

    const handleConfirmTwofa = async (): Promise<void> => {
        if (twofaConfirmCode.length !== 6) return;

        try {
            setTwofaLoading(true);
            const res: AxiosResponse = await apiClient.post("/users/2fa/confirm", { code: twofaConfirmCode });
            setTwofaEnabled(true);
            setTwofaSetup(null);
            setTwofaConfirmCode("");
            setBackupCodesToShow(res.data.backupCodes || null);
            toast.success(t("twofa_enable_success", "Double authentification activée !"));
        } catch (err: any) {
            toast.error(err.response?.data?.message || t("twofa_confirm_error", "Code invalide."));
        } finally {
            setTwofaLoading(false);
        }
    };

    const handleRegenerateBackupCodes = async (): Promise<void> => {
        if (regenerateCode.length !== 6) return;

        try {
            setTwofaLoading(true);
            const res: AxiosResponse = await apiClient.post("/users/2fa/backup-codes/regenerate", { code: regenerateCode });
            setBackupCodesToShow(res.data.backupCodes || null);
            setShowRegenerateInput(false);
            setRegenerateCode("");
            toast.success(t("twofa_backup_regenerate_success", "Nouveaux codes de secours générés."));
        } catch (err: any) {
            toast.error(err.response?.data?.message || t("twofa_confirm_error", "Code invalide."));
        } finally {
            setTwofaLoading(false);
        }
    };

    const handleDownloadBackupCodes = (): void => {
        if (!backupCodesToShow) return;

        const blob = new Blob([backupCodesToShow.join("\n")], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "melodia-2fa-backup-codes.txt";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };

    const handleDisableTwofa = async (): Promise<void> => {
        if (twofaDisableCode.length !== 6) return;

        try {
            setTwofaLoading(true);
            await apiClient.post("/users/2fa/disable", { code: twofaDisableCode });
            setTwofaEnabled(false);
            setShowTwofaDisable(false);
            setTwofaDisableCode("");
            toast.success(t("twofa_disable_success", "Double authentification désactivée."));
        } catch (err: any) {
            toast.error(err.response?.data?.message || t("twofa_disable_error", "Code invalide."));
        } finally {
            setTwofaLoading(false);
        }
    };
    return {
        loading,
        oldPassword,
        setOldPassword,
        newPassword,
        setNewPassword,
        twofaEnabled,
        setTwofaEnabled,
        twofaSetup,
        twofaConfirmCode,
        setTwofaConfirmCode,
        twofaDisableCode,
        setTwofaDisableCode,
        showTwofaDisable,
        setShowTwofaDisable,
        twofaLoading,
        backupCodesToShow,
        setBackupCodesToShow,
        showRegenerateInput,
        setShowRegenerateInput,
        regenerateCode,
        setRegenerateCode,
        handleUpdatePassword,
        handleStartTwofaSetup,
        handleCancelTwofaSetup,
        handleConfirmTwofa,
        handleRegenerateBackupCodes,
        handleDownloadBackupCodes,
        handleDisableTwofa,
    };
}
