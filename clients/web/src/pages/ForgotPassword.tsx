import React, { useState } from "react";
import { FaEnvelope, FaLock } from "react-icons/fa";
import { KeyRound } from "lucide-react";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import { NavigateFunction, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import apiClient from "../api/client.ts";

type Phase = "request" | "reset";

const ForgotPassword: React.FC = () => {
  const navigate: NavigateFunction = useNavigate();
  const { t } = useTranslation();

  const [phase, setPhase] = useState<Phase>("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const handleRequestCode = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setInfo(null);

    try {
      await apiClient.post("/users/forgot-password", { email });
      setPhase("reset");
      setInfo(t("forgot_password_code_sent", "Un code te permettant de réinitialiser ton mot de passe a été envoyé."));
    } catch (err: any) {
      setError(err.response?.data?.message || "Une erreur est survenue");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (newPassword !== confirmPassword) {
      setError(t("register_password_mismatch", "Les mots de passe ne correspondent pas"));
      return;
    }

    setIsLoading(true);

    try {
      await apiClient.post("/users/reset-password", { email, code, newPassword });
      navigate("/login", {
        state: { message: t("forgot_password_success", "Mot de passe réinitialisé, connecte-toi.") },
      });
    } catch (err: any) {
      setError(err.response?.data?.message || "Une erreur est survenue");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page min-h-screen w-full bg-canvas dark:bg-canvas text-ink flex flex-col items-center justify-center p-6 font-sans transition-colors duration-300">
      <div className="mb-10 text-center">
        <div className="w-20 h-20 bg-linear-to-tr from-[#a855f7] to-[#ec4899] rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-purple-500/20">
          <KeyRound className="text-white" size={36} />
        </div>
        <h1 className="page-title text-4xl font-bold tracking-tight mb-2 text-ink">
          {t("forgot_password_title", "Mot de passe oublié")}
        </h1>
        <p className="text-muted dark:text-muted text-lg max-w-md mx-auto">
          {phase === "request"
            ? t("forgot_password_subtitle", "Entre ton email, on t'envoie un code pour réinitialiser ton mot de passe.")
            : t("forgot_password_reset_subtitle", "Entre le code reçu par email et choisis un nouveau mot de passe.")}
        </p>
      </div>

      <div className="w-full max-w-110 space-y-7">
        {phase === "request" ? (
          <form className="space-y-5" onSubmit={handleRequestCode}>
            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg text-center">
                {error}
              </div>
            )}

            <Input
              label={t("register_email_label")}
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
              icon={FaEnvelope}
              required
            />

            <Button type="submit" disabled={isLoading}>
              {isLoading ? t("chargement...") : t("forgot_password_send_btn", "Envoyer le code")}
            </Button>
          </form>
        ) : (
          <form className="space-y-5" onSubmit={handleResetPassword}>
            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg text-center">
                {error}
              </div>
            )}
            {info && (
              <div className="p-3 text-sm text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-center">
                {info}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 dark:text-gray-700 mb-2">
                {t("verify_email_code_label", "Code de vérification")}
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                required
                className="w-full bg-panel dark:bg-panel border border-line dark:border-line rounded-xl px-4 py-3 text-center text-2xl tracking-[0.5em] font-bold outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/40 text-ink transition-colors"
              />
            </div>

            <Input
              label={t("forgot_password_new_password_label", "Nouveau mot de passe")}
              type="password"
              name="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              icon={FaLock}
              required
            />
            <Input
              label={t("register_confirm_password_label")}
              type="password"
              name="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              icon={FaLock}
              required
            />

            <Button type="submit" disabled={isLoading || code.length !== 6}>
              {isLoading ? t("chargement...") : t("forgot_password_reset_btn", "Réinitialiser le mot de passe")}
            </Button>

            <p className="text-center text-sm">
              <span
                onClick={() => {
                  setPhase("request");
                  setCode("");
                  setError(null);
                  setInfo(null);
                }}
                className="text-muted dark:text-muted hover:underline cursor-pointer"
              >
                {t("forgot_password_resend_link", "Je n'ai pas reçu de code, recommencer")}
              </span>
            </p>
          </form>
        )}

        <p className="text-center text-muted dark:text-muted text-sm">
          <span
            onClick={() => navigate("/login")}
            className="text-blue-500 font-bold cursor-pointer hover:underline"
          >
            {t("verify_email_back_to_login", "Retour à la connexion")}
          </span>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
