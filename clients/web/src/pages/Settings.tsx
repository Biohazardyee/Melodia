import { AxiosResponse } from "axios";
import { jwtDecode } from "jwt-decode";
import {
    Database,
    Link2,
    Settings as SettingsIcon,
    Shield,
    User
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { NavigateFunction, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import apiClient from "../api/client";
import SettingsConnectionsPanel from "../components/settings/SettingsConnectionsPanel";
import SettingsDataPanel from "../components/settings/SettingsDataPanel";
import SettingsProfilePanel from "../components/settings/SettingsProfilePanel";
import SettingsSecurityPanel from "../components/settings/SettingsSecurityPanel";
import { useConfirm } from "../context/ConfirmContext";
import { useAccountSecurity } from "../hooks/useAccountSecurity";
import { useSpotifyConnection } from "../hooks/useSpotifyConnection";
import { resetOwnedThemesCache } from "../useDarkMode";
import { toImageDataUri } from "../utils/imageDataUri";

type TabType = "Profile" | "Privacy" | "Data" | "Connections";

const Settings: React.FC = () => {
    const { t } = useTranslation();
    const confirm = useConfirm();
    const navigate: NavigateFunction = useNavigate();
    const [activeTab, setActiveTab] = useState<TabType>("Profile");
    const spotify = useSpotifyConnection(() => setActiveTab("Connections"));

    const [userId, setUserId] = useState<string>("");
    const security = useAccountSecurity(userId);

    const [username, setUsername] = useState("");
    const [pseudo, setPseudo] = useState("");
    const [favoriteBand, setFavoriteBand] = useState("");
    const [biography, setBiography] = useState("");
    const [profilePicture, setProfilePicture] = useState<string>(() => {
        return localStorage.getItem("user_profile_pic") || "";
    });
    const [exportLoading, setExportLoading] = useState(false);

    const [loading, setLoading] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [statusMessage] = useState("");

    const [suggestions, setSuggestions] = useState<{ name: string }[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

    const fileInputRef: React.RefObject<HTMLInputElement | null> = useRef<HTMLInputElement>(null);
    const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const searchRequest = useRef<AbortController | null>(null);

    useEffect(() => () => {
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        searchRequest.current?.abort();
    }, []);

    useEffect((): void => {
        const loadUserData = async (): Promise<void> => {
            try {
                const token: string | null = localStorage.getItem("token") || localStorage.getItem("userToken");
                if (!token) return;

                const decoded: any = jwtDecode(token);
                const decodedId = decoded.id;

                setUserId(decodedId);

                const res: AxiosResponse = await apiClient.get(`/users/public/${decodedId}`);
                const user = res.data.user || res.data;

                setUsername(user.username || "");
                setPseudo(user.pseudo || "");
                setFavoriteBand(user.favorite_band || "");
                setBiography(user.biography || "");

                if (user.profile_picture) {
                    const formattedPic = toImageDataUri(user.profile_picture) as string;

                    setProfilePicture(formattedPic);
                    localStorage.setItem("user_profile_pic", formattedPic);
                }

                const fullRes: AxiosResponse = await apiClient.get(`/users/${decodedId}`);
                security.setTwofaEnabled(!!fullRes.data.user?.twofa_enabled);
            } catch (e) {
                console.error("Erreur lors du chargement du profil:", e);
            }
        };

        loadUserData();
    }, []);

    const searchArtists = (text: string): void => {
        setFavoriteBand(text);

        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        searchRequest.current?.abort();

        if (text.length > 2) {
            setIsSearching(true);
            setShowSuggestions(true);
            const controller = new AbortController();
            searchRequest.current = controller;

            searchTimeout.current = setTimeout(async (): Promise<void> => {
                try {
                    const response: AxiosResponse = await apiClient.get("/api/search", {
                        params: {query: text}, signal: controller.signal,
                    });
                    if (controller.signal.aborted) return;
                    const albums = response.data.searchResults?.results?.albummatches?.album || [];
                    const uniqueArtists: string[] = [...new Set(albums.map((a: any) => a.artist))] as string[];

                    setSuggestions(uniqueArtists.map((name: string): { name: string } => ({ name })).slice(0, 5));
                } catch (e) {
                    if (!controller.signal.aborted) console.error(e);
                } finally {
                    if (!controller.signal.aborted) setIsSearching(false);
                }
            }, 300);
        } else {
            setSuggestions([]);
            setShowSuggestions(false);
            setIsSearching(false);
        }
    };

    const handleSaveProfile = async (): Promise<void> => {
        if (!userId) return;

        try {
            setLoading(true);
            const base64ForBackend: string = profilePicture.includes("base64,")
                ? profilePicture.split("base64,")[1]
                : profilePicture;

            await apiClient.put(`/users/${userId}`, {
                username,
                pseudo,
                favorite_band: favoriteBand,
                biography,
                profile_picture: base64ForBackend,
            });

            const currentLocalUser: string | null = localStorage.getItem("user");
            if (currentLocalUser) {
                const parsedUser = JSON.parse(currentLocalUser);
                localStorage.setItem("user", JSON.stringify({
                    ...parsedUser,
                    username,
                    pseudo,
                    biography,
                    favorite_band: favoriteBand
                }));
            }

            window.dispatchEvent(new Event("profileUpdated"));

            setIsSaved(true);
            setTimeout(() => setIsSaved(false), 3000);
        } catch (err) {
            console.error(err);
            toast.error(t("save_error", "Erreur lors de la sauvegarde."));
        } finally {
            setLoading(false);
        }
    };

    const handleExportData = async (): Promise<void> => {
        try {
            setExportLoading(true);
            const res: AxiosResponse = await apiClient.get("/users/export");

            const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `melodia-export-${username || "data"}.json`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (err: any) {
            console.error(err);
            toast.error(err.response?.data?.message || t("export_data_error", "Erreur lors de l'export des données."));
        } finally {
            setExportLoading(false);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>): void => {
        const file: File | undefined = e.target.files?.[0];
        if (file) {
            const reader: FileReader = new FileReader();
            reader.onloadend = (): void => {
                setProfilePicture(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDeletePic = (e: React.MouseEvent): void => {
        e.stopPropagation();
        setProfilePicture("");
        localStorage.removeItem("user_profile_pic");
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleLogout = async (): Promise<void> => {
        const ok = await confirm({
            title: t("logout_title", "Déconnexion"),
            message: t("logout_confirm"),
            confirmText: t("logout", "Se déconnecter"),
            danger: true,
        });
        if (!ok) return;
        localStorage.removeItem("token");
        localStorage.removeItem("userToken");
        localStorage.removeItem("user");
        localStorage.removeItem("user_profile_pic");
        resetOwnedThemesCache();
        window.dispatchEvent(new Event("auth-changed"));
        navigate("/");
    };

    const TABS: { id: TabType; label: string; icon: React.ReactNode }[] = [
        { id: "Profile", label: t("tab_profile"), icon: <User size={18} /> },
        { id: "Privacy", label: t("tab_security"), icon: <Shield size={18} /> },
        { id: "Connections", label: t("tab_connections", "Connexions"), icon: <Link2 size={18} /> },
        { id: "Data", label: t("tab_data"), icon: <Database size={18} /> },
    ];

    return (
        <div
            className="min-h-screen bg-canvas dark:bg-canvas text-ink p-6 md:p-10 font-sans transition-colors duration-300">
            <div className="max-w-5xl mx-auto space-y-8">
                <header className="flex items-center gap-4">
                    <div
                        className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 flex-shrink-0">
                        <SettingsIcon size={22} className="text-white" />
                    </div>
                    <div>
                        <h1 className="page-title text-3xl md:text-4xl font-bold text-ink"
                        >
                            {t("settings_title")}
                        </h1>
                        <p className="text-muted dark:text-muted text-sm mt-0.5">{t("settings_subtitle")}</p>
                    </div>
                </header>

                <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">
                    {/* Navigation Onglets */}
                    <nav
                        className="flex md:flex-col gap-1.5 w-full md:w-56 flex-shrink-0 overflow-x-auto md:overflow-visible pb-1 md:pb-0 md:sticky md:top-10">
                        {TABS.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap flex-shrink-0 md:flex-shrink md:whitespace-normal border ${activeTab === tab.id
                                        ? "bg-blue-600/10 border-blue-500/40 text-blue-400 dark:bg-blue-50 dark:border-blue-300 dark:text-blue-600"
                                        : "border-transparent text-muted hover:text-white hover:bg-white/5 dark:hover:text-gray-900 dark:hover:bg-gray-100"
                                    }`}
                            >
                                {tab.icon} {tab.label}
                            </button>
                        ))}
                    </nav>

                    <main
                        className="flex-1 w-full bg-panel dark:bg-panel border border-line dark:border-line rounded-2xl p-6 md:p-8 shadow-xl transition-colors min-h-125">

                        {/* --- ONGLET : PROFIL --- */}
                        {activeTab === "Profile" && (
                            <SettingsProfilePanel
                                fileInputRef={fileInputRef}
                                profilePicture={profilePicture}
                                username={username}
                                handleDeletePic={handleDeletePic}
                                pseudo={pseudo}
                                handleImageUpload={handleImageUpload}
                                setUsername={setUsername}
                                setPseudo={setPseudo}
                                favoriteBand={favoriteBand}
                                searchArtists={searchArtists}
                                showSuggestions={showSuggestions}
                                isSearching={isSearching}
                                suggestions={suggestions}
                                setFavoriteBand={setFavoriteBand}
                                setShowSuggestions={setShowSuggestions}
                                biography={biography}
                                setBiography={setBiography}
                                handleLogout={handleLogout}
                                isSaved={isSaved}
                                statusMessage={statusMessage}
                                handleSaveProfile={handleSaveProfile}
                                loading={loading}
                            />
                        )}

                        {/* --- ONGLET : SÉCURITÉ --- */}
                        {activeTab === "Privacy" && (
                            <SettingsSecurityPanel {...security} />
                        )}

                        {/* --- ONGLET : CONNEXIONS --- */}
                        {activeTab === "Connections" && (
                            <SettingsConnectionsPanel {...spotify} />
                        )}

                        {/* --- ONGLET : DONNÉES --- */}
                        {activeTab === "Data" && (
                            <SettingsDataPanel
                                handleExportData={handleExportData}
                                exportLoading={exportLoading}
                            />
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
};

export default Settings;
