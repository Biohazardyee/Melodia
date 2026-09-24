import React, { useState } from "react";
import { FaEnvelope } from "react-icons/fa";
import { MailCheck } from "lucide-react";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import { NavigateFunction, useNavigate, useLocation, Location } from "react-router-dom";
import { useTranslation } from "react-i18next";
import apiClient from "../api/client.ts";
import { AxiosResponse } from "axios";

const VerifyEmail: React.FC = () => {
  const navigate: NavigateFunction = useNavigate();
  const location: Location = useLocation();
  const { t } = useTranslation();

  const initialEmail: string = (location.state as { email?: string } | null)?.email || "";

  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResendMessage(null);

    try {
      const response: AxiosResponse = await apiClient.post("/users/verify-email", {
        email,
        code,
      });

      const { token } = response.data;

      if (token) {
        localStorage.setItem("token", token);
        window.dispatchEvent(new Event("auth-changed"));
        apiClient.defaults.headers.common["Authorization"] = `Bearer ${token}`;

        navigate("/home", {
          state: { message: "Email vérifié, bienvenue !" },
        });
      } else {
        navigate("/login");
      }
    } catch (err: any) {
      if (err.response) {
        setError(err.response.data.message || "Une erreur est survenue");
      } else if (err.request) {
        setError("Le serveur ne répond pas. Vérifiez votre connexion.");
      } else {
        setError("Erreur inattendue : " + err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async (): Promise<void> => {
    if (!email) {
      setError(t("verify_email_missing_email", "Merci de renseigner votre adresse email."));
      return;
    }

    setIsResending(true);
    setError(null);
    setResendMessage(null);

    try {
      await apiClient.post("/users/resend-verification", { email });
      setResendMessage(t("verify_email_resend_success", "Un nouveau code vous a été envoyé."));
    } catch (err: any) {
      setError(err.response?.data?.message || "Une erreur est survenue");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="auth-page min-h-screen w-full bg-canvas dark:bg-canvas text-ink flex flex-col items-center justify-center p-6 font-sans transition-colors duration-300">
      <div className="mb-10 text-center">
        <div className="w-20 h-20 bg-linear-to-tr from-[#a855f7] to-[#ec4899] rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-purple-500/20">
          <MailCheck className="text-white" size={36} />
        </div>
        <h1 className="page-title text-4xl font-bold tracking-tight mb-2 text-ink">
          {t("verify_email_title", "Vérifie ton adresse email")}
        </h1>
        <p className="text-muted dark:text-muted text-lg max-w-md mx-auto">
          {t(
            "verify_email_subtitle",
            "On t'a envoyé un code à 6 chiffres. Entre-le ci-dessous pour activer ton compte.",
          )}
        </p>
      </div>

      <div className="w-full max-w-110 space-y-7">
        <form className="space-y-5" onSubmit={handleSubmit}>
          {error && (
            <div className="p-3 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg text-center">
              {error}
            </div>
          )}
          {resendMessage && (
            <div className="p-3 text-sm text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-center">
              {resendMessage}
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

          <Button type="submit" disabled={isLoading || code.length !== 6}>
            {isLoading ? t("chargement...") : t("verify_email_submit_btn", "Vérifier")}
          </Button>
        </form>

        <p className="text-center text-muted dark:text-muted text-base pt-2">
          {t("verify_email_no_code", "Pas reçu de code ?")}{" "}
          <span
            onClick={isResending ? undefined : handleResend}
            className={`text-blue-500 font-bold cursor-pointer hover:underline ml-1 ${isResending ? "opacity-50 pointer-events-none" : ""}`}
          >
            {isResending
              ? t("verify_email_resending", "Envoi en cours...")
              : t("verify_email_resend_btn", "Renvoyer le code")}
          </span>
        </p>

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

export default VerifyEmail;
