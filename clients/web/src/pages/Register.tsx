import React, { useState, useRef } from "react";
import {
  FaEnvelope,
  FaUser,
  FaLock,
  FaGoogle,
  FaDiscord,
  FaMusic,
} from "react-icons/fa";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import {NavigateFunction, useNavigate} from "react-router-dom";
import { useTranslation } from "react-i18next";
import apiClient from "../api/client.ts";
import {AxiosResponse} from "axios";

const Register: React.FC = () => {
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
  const navigate: NavigateFunction = useNavigate();
  const { t } = useTranslation();

  const [formData, setFormData] = useState({
    email: "",
    username: "",
    pseudo: "",
    password: "",
    confirmPassword: "",
    favorite_band: "",
  });

  const [suggestions, setSuggestions] = useState<{ name: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeout = useRef<any>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleBandSearch = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const value: string = e.target.value;
    setFormData((prev) => ({ ...prev, favorite_band: value }));

    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (value.length > 2) {
      setIsSearching(true);
      setShowSuggestions(true);

      searchTimeout.current = setTimeout(async (): Promise<void> => {
        try {
          const response: AxiosResponse = await apiClient.get(`/api/search?query=${value}`);
          const albums =
            response.data.searchResults?.results?.albummatches?.album || [];

          const uniqueArtists: string[] = [
            ...new Set(albums.map((item: any) => item.artist)),
          ] as string[];

          setSuggestions(uniqueArtists.map((name: string) => ({ name })).slice(0, 5));
        } catch (error) {
          console.error("Erreur lors de la recherche de l'artiste :", error);
        } finally {
          setIsSearching(false);
        }
      }, 300);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!formData.favorite_band) {
      setError("Veuillez sélectionner votre artiste ou groupe préféré.");
      setIsLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError(t("Les mots de passe ne correspondent pas"));
      setIsLoading(false);
      return;
    }

    try {
      const response: AxiosResponse = await apiClient.post("/users/signin", {
        email: formData.email,
        username: formData.username,
        pseudo: formData.pseudo,
        password: formData.password,
        favorite_band: formData.favorite_band,
        profile_picture: null,
      });

      if (response.status === 201 || response.status === 200) {
        navigate("/verify-email", {
          state: { email: formData.email },
        });
      }
    } catch (error: any) {
      if (error.response) {
        setError(error.response.data.message || "Une erreur est survenue");
      } else if (error.request) {
        setError("Le serveur ne répond pas. Vérifiez votre connexion.");
      } else {
        setError("Erreur inattendue : " + error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOAuthRegister = (provider: "google" | "discord") => {
    window.location.href = `${API_URL}/api/oauth/auth/${provider}?platform=web`;
  };

  return (
    <div className="auth-page min-h-screen w-full bg-canvas dark:bg-canvas text-ink flex flex-col items-center justify-center p-6 font-sans transition-colors duration-300">
      <div className="mb-10 text-center">
        <div className="w-20 h-20 bg-linear-to-tr from-[#a855f7] to-[#ec4899] rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-purple-500/20">
          <span className="text-4xl text-white">♪</span>
        </div>
        <h1 className="page-title text-4xl font-bold tracking-tight mb-2 text-ink">
          {t("register_title")}
        </h1>
        <p className="text-muted dark:text-muted text-lg">
          {t("register_subtitle")}
        </p>
      </div>

      <div className="w-full max-w-110 space-y-7">
        <form className="space-y-5" onSubmit={handleSubmit}>
          {error && (
            <div className="p-3 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg text-center">
              {error}
            </div>
          )}

          <Input
            label={t("register_email_label")}
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="votre@email.com"
            icon={FaEnvelope}
            required
          />
          <Input
            label={t("register_username_label")}
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            placeholder="melomane37"
            icon={FaUser}
            required
          />
          <Input
            label={t("register_pseudo_label", "Pseudo (nom affiché)")}
            type="text"
            name="pseudo"
            value={formData.pseudo}
            onChange={handleChange}
            placeholder="Mélomane 🎧"
            icon={FaUser}
            required
          />

          <div className="relative">
            <Input
              label="Artiste ou Groupe préféré"
              type="text"
              name="favorite_band"
              value={formData.favorite_band}
              onChange={handleBandSearch}
              placeholder="Ex: Daft Punk, Angèle, Linkin Park..."
              icon={FaMusic}
              required
              onFocus={() =>
                formData.favorite_band.length > 2 && setShowSuggestions(true)
              }
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            />

            {showSuggestions && (
              <div className="absolute z-50 w-full mt-1 bg-panel dark:bg-panel border border-line dark:border-line rounded-lg shadow-xl max-h-60 overflow-y-auto">
                {isSearching ? (
                  <div className="p-3 text-center text-sm text-muted dark:text-muted">
                    Recherche en cours...
                  </div>
                ) : suggestions.length > 0 ? (
                  suggestions.map((item: {name: string}, index: number) => (
                    <div
                      key={index}
                      onClick={(): void => {
                        setFormData((prev) => ({
                          ...prev,
                          favorite_band: item.name,
                        }));
                        setShowSuggestions(false);
                      }}
                      className="p-3 text-sm text-gray-200 dark:text-gray-800 hover:bg-purple-600 hover:text-white dark:hover:bg-purple-100 cursor-pointer transition-colors duration-150 flex items-center gap-2"
                    >
                      <FaMusic className="text-muted dark:text-muted text-xs" />
                      {item.name}
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-center text-sm text-gray-500">
                    Aucun résultat trouvé
                  </div>
                )}
              </div>
            )}
          </div>

          <Input
            label={t("register_password_label")}
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="••••••••"
            icon={FaLock}
            required
          />
          <Input
            label={t("register_confirm_password_label")}
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="••••••••"
            icon={FaLock}
            required
          />

          <div className="flex items-center space-x-3 py-1">
            <input
              type="checkbox"
              required
              className="w-5 h-5 rounded-md border-line dark:border-line bg-raised dark:bg-panel text-blue-500 cursor-pointer focus:ring-0"
            />
            <p className="text-sm text-muted dark:text-muted">
              {t("register_terms_text")}{" "}
              <span className="text-blue-500 font-medium hover:underline cursor-pointer">
                {t("register_terms_link")}
              </span>{" "}
              {t("register_and")}{" "}
              <span className="text-blue-500 font-medium hover:underline cursor-pointer">
                {t("register_privacy_link")}
              </span>
            </p>
          </div>

          <Button type="submit" disabled={isLoading}>
            {isLoading ? t("chargement...") : t("register_submit_btn")}
          </Button>
        </form>

        <div className="relative flex items-center py-2">
          <div className="grow border-t border-line dark:border-line"></div>
          <span className="mx-4 text-gray-500 text-sm uppercase tracking-wider">
            {t("register_separator")}
          </span>
          <div className="grow border-t border-line dark:border-line"></div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Button
            variant="social"
            type="button"
            onClick={() => handleOAuthRegister("google")}
            aria-label="Google"
          >
            <FaGoogle />
          </Button>
          <Button
            variant="social"
            type="button"
            onClick={() => handleOAuthRegister("discord")}
            aria-label="Discord"
          >
            <FaDiscord />
          </Button>
        </div>

        <p className="text-center text-muted dark:text-muted text-base pt-2">
          {t("register_already_account")}{" "}
          <span
            onClick={() => navigate("/login")}
            className="text-blue-500 font-bold cursor-pointer hover:underline ml-1"
          >
            {t("register_login_link")}
          </span>
        </p>
      </div>
    </div>
  );
};

export default Register;
