import React, { useState } from "react";
import { FaEnvelope, FaLock, FaGoogle, FaDiscord } from "react-icons/fa";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import { NavigateFunction, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import apiClient from "../api/client";
import { AxiosResponse } from "axios";

const Login: React.FC = () => {
  const API_URL: any = import.meta.env.VITE_API_URL || "http://localhost:3000";
  const navigate: NavigateFunction = useNavigate();
  const { t } = useTranslation();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [preAuthToken, setPreAuthToken] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response: AxiosResponse<any, any> = await apiClient.post("/users/login", {
        email: formData.email,
        password: formData.password,
      });

      if (response.data.requires2FA) {
        setPreAuthToken(response.data.preAuthToken);
        setIsLoading(false);
        return;
      }

      const token: string = response.data.token;
      localStorage.setItem("token", token);
      window.dispatchEvent(new Event("auth-changed"));

      navigate("/home");
    } catch (err: any) {
      if (err.response && err.response.data) {
        const serverMessage = err.response.data.message;

        if (serverMessage === "EMAIL_NOT_VERIFIED") {
          navigate("/verify-email", { state: { email: formData.email } });
          return;
        }

        setError(t(serverMessage));
        if (err.response.status === 401) {
          setFormData((prev) => ({ ...prev, password: "" }));
        }
      } else {
        setError(t("login_error_network"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleTwoFactorSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response: AxiosResponse<any, any> = await apiClient.post("/users/2fa/login-verify", {
        preAuthToken,
        code: twoFactorCode,
      });

      const token: string = response.data.token;
      localStorage.setItem("token", token);
      window.dispatchEvent(new Event("auth-changed"));

      navigate("/home");
    } catch (err: any) {
      if (err.response && err.response.data) {
        setError(t(err.response.data.message));
        setTwoFactorCode("");
      } else {
        setError(t("login_error_network"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthLogin = (provider: "google" | "discord"): void => {
    window.location.href = `${API_URL}/api/oauth/auth/${provider}?platform=web`;
  };

  return (
      <div className="auth-page min-h-screen bg-canvas dark:bg-canvas text-ink flex flex-col items-center justify-center p-6 font-sans transition-colors duration-300">
        <div className="mb-10 text-center">
          <div className="w-20 h-20 bg-linear-to-tr from-[#a855f7] to-[#ec4899] rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-purple-500/20">
            <span className="text-4xl text-white">♪</span>
          </div>
          <h1 className="page-title text-4xl font-bold tracking-tight mb-2 text-ink">
            {t("login_welcome")}
          </h1>
          <p className="text-muted dark:text-muted text-lg">
            {t("login_subtitle")}
          </p>
        </div>

        <div className="w-full max-w-110 space-y-7">
          {preAuthToken ? (
            <form className="space-y-5" onSubmit={handleTwoFactorSubmit}>
              {error && (
                  <div className="p-3 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg text-center">
                    {error}
                  </div>
              )}

              <p className="text-sm text-muted dark:text-muted text-center">
                {t("login_2fa_hint", "Entre le code généré par ton application d'authentification.")}
              </p>

              <input
                  type="text"
                  autoCapitalize="characters"
                  maxLength={9}
                  autoFocus
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.toUpperCase().replace(/[^0-9A-Z-]/g, ""))}
                  placeholder="123456"
                  required
                  className="w-full bg-panel dark:bg-panel border border-line dark:border-line rounded-xl px-4 py-3 text-center text-2xl tracking-[0.3em] font-bold outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 text-ink transition-colors"
              />
              <p className="text-xs text-gray-500 dark:text-muted text-center -mt-3">
                {t("login_2fa_backup_hint", "Tu peux aussi utiliser un code de secours.")}
              </p>

              <button
                  type="submit"
                  disabled={isLoading || twoFactorCode.length < 6}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? t("login_loading") : t("login_2fa_submit_btn", "Vérifier")}
              </button>

              <p className="text-center text-sm">
                <span
                    onClick={() => {
                      setPreAuthToken(null);
                      setTwoFactorCode("");
                      setError(null);
                    }}
                    className="text-muted dark:text-muted hover:underline cursor-pointer"
                >
                  {t("login_2fa_back", "Retour")}
                </span>
              </p>
            </form>
          ) : (
            <>
              <form className="space-y-5" onSubmit={handleSubmit}>
                {/* Message d'erreur */}
                {error && (
                    <div className="p-3 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg text-center">
                      {error}
                    </div>
                )}

                <Input
                    label={t("login_email_label")}
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="votre@email.com"
                    icon={FaEnvelope}
                    required
                />

                <div className="space-y-1">
                  <Input
                      label={t("login_password_label")}
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      icon={FaLock}
                      required
                  />
                  <div className="text-right">
                  <span
                      onClick={() => navigate("/forgot-password")}
                      className="text-sm text-blue-500 hover:underline cursor-pointer"
                  >
                    {t("login_forgot_password")}
                  </span>
                  </div>
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? t("login_loading") : t("login_submit_btn")}
                </button>
              </form>

              <div className="relative flex items-center py-2">
                <div className="grow border-t border-line dark:border-line"></div>
                <span className="mx-4 text-gray-500 text-sm uppercase tracking-wider">
                {t("login_separator")}
              </span>
                <div className="grow border-t border-line dark:border-line"></div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Button
                    variant="social"
                    type="button"
                    onClick={(): void => handleOAuthLogin("google")}
                    aria-label="Google"
                    className="flex items-center justify-center py-3 rounded-xl transition-colors bg-raised text-white hover:bg-gray-700 dark:bg-panel dark:text-gray-900 dark:border dark:border-line dark:hover:bg-gray-50"
                >
                  <FaGoogle className="text-xl" />
                </Button>
                <Button
                    variant="social"
                    type="button"
                    onClick={(): void => handleOAuthLogin("discord")}
                    aria-label="Discord"
                    className="flex items-center justify-center py-3 rounded-xl transition-colors bg-raised text-white hover:bg-gray-700 dark:bg-panel dark:text-gray-900 dark:border dark:border-line dark:hover:bg-gray-50"
                >
                  <FaDiscord className="text-xl" />
                </Button>
              </div>

              <p className="text-center text-muted dark:text-muted text-base pt-2">
                {t("login_no_account")}{" "}
                <span
                    onClick={(): void | Promise<void> => navigate("/register")}
                    className="text-blue-500 font-bold cursor-pointer hover:underline ml-1"
                >
                {t("login_register_link")}
              </span>
              </p>
            </>
          )}
        </div>
      </div>
  );
};

export default Login;
