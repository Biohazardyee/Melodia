import { AxiosResponse } from "axios";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import apiClient from "../api/client";
import { useConfirm } from "../context/ConfirmContext";

export function useSpotifyConnection(onReturn: () => void) {
    const { t } = useTranslation();
    const confirm = useConfirm();

    const [searchParams, setSearchParams] = useSearchParams();

    const [spotifyConnected, setSpotifyConnected] = useState(false);

    const [spotifyDisplayName, setSpotifyDisplayName] = useState<string | null>(null);

    const [spotifyProduct, setSpotifyProduct] = useState<string | null>(null);

    const [spotifyNeedsRelink, setSpotifyNeedsRelink] = useState(false);

    const [loadingSpotify, setLoadingSpotify] = useState(false);

    const fetchSpotifyStatus = async (): Promise<void> => {
        try {
            const res: AxiosResponse = await apiClient.get("/api/spotify/status");
            setSpotifyConnected(!!res.data.connected);
            setSpotifyDisplayName(res.data.display_name || null);
            setSpotifyProduct(res.data.product || null);
            setSpotifyNeedsRelink(!!res.data.needs_relink);
        } catch (e) {
            console.error("Erreur lors de la vérification du compte Spotify:", e);
        }
    };

    useEffect((): void => {
        fetchSpotifyStatus();
    }, []);

    useEffect((): void => {
        const spotifyParam: string | null = searchParams.get("spotify");
        if (!spotifyParam) return;

        if (spotifyParam === "connected") {
            toast.success(t("spotify_link_success", "Compte Spotify lié avec succès !"));
            fetchSpotifyStatus();
        } else if (spotifyParam === "error") {
            toast.error(t("spotify_link_error", "Échec de la liaison avec Spotify."));
        }

        onReturn();
        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete("spotify");
        setSearchParams(nextParams, { replace: true });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    const handleConnectSpotify = (): void => {
        const token: string | null = localStorage.getItem("token") || localStorage.getItem("userToken");
        if (!token) {
            toast.error(t("must_be_logged_in", "Vous devez être connecté."));
            return;
        }
        const apiUrl: string = import.meta.env.VITE_API_URL;
        window.location.href = `${apiUrl}/api/spotify/connect?token=${encodeURIComponent(token)}`;
    };

    const handleDisconnectSpotify = async (): Promise<void> => {
        const ok: boolean = await confirm({
            title: t("spotify_unlink_title", "Délier Spotify"),
            message: t("spotify_unlink_confirm", "Voulez-vous vraiment délier votre compte Spotify ?"),
            confirmText: t("spotify_unlink_confirm_btn", "Délier"),
            danger: true,
        });
        if (!ok) return;

        try {
            setLoadingSpotify(true);
            await apiClient.delete("/api/spotify/disconnect");
            setSpotifyConnected(false);
            setSpotifyDisplayName(null);
            toast.success(t("spotify_unlink_success", "Compte Spotify délié."));
        } catch (err) {
            console.error(err);
            toast.error(t("spotify_unlink_error", "Erreur lors de la déliaison."));
        } finally {
            setLoadingSpotify(false);
        }
    };
    return { spotifyConnected, spotifyDisplayName, spotifyProduct, spotifyNeedsRelink, loadingSpotify, handleConnectSpotify, handleDisconnectSpotify };
}
