import {useCallback, useEffect, useState} from "react";
import apiClient from "../api/client";

// Minimal ambient types for the Spotify Web Playback SDK (no @types package published).
declare global {
    interface Window {
        onSpotifyWebPlaybackSDKReady?: () => void;
        Spotify?: {
            Player: new (init: {
                name: string;
                getOAuthToken: (cb: (token: string) => void) => void;
                volume?: number;
            }) => SpotifyPlayerInstance;
        };
    }
}

interface SpotifyPlayerInstance {
    connect(): Promise<boolean>;
    disconnect(): void;
    addListener(event: string, cb: (payload: any) => void): boolean;
    removeListener(event: string): boolean;
    togglePlay(): Promise<void>;
    pause(): Promise<void>;
    resume(): Promise<void>;
    seek(positionMs: number): Promise<void>;
    getCurrentState(): Promise<any | null>;
    setVolume(volume: number): Promise<void>;
    activateElement(): Promise<void>;
}

const VOLUME_STORAGE_KEY = "roomPlayerVolume";

const getStoredVolume = (): number => {
    const saved: string | null = localStorage.getItem(VOLUME_STORAGE_KEY);
    const parsed: number = saved !== null ? parseFloat(saved) : NaN;
    return Number.isFinite(parsed) ? Math.min(1, Math.max(0, parsed)) : 0.5;
};

// Le volume perçu par l'oreille n'est pas linéaire : sans cette courbe, la moitié
// du curseur sonne quasiment aussi fort que le max. Même taper quadratique que pour
// les extraits d'aperçu (AlbumTrackList) — curseur au milieu -> ~25% du volume réel.
const toGainValue = (sliderValue: number): number => sliderValue * sliderValue;

export type SpotifyPlayerError =
    | "account_error"
    | "authentication_error"
    | "initialization_error"
    | "playback_error"
    | null;

const SDK_URL = "https://sdk.scdn.co/spotify-player.js";
let sdkLoadPromise: Promise<void> | null = null;

function loadSpotifySdk(): Promise<void> {
    if (window.Spotify) return Promise.resolve();
    if (sdkLoadPromise) return sdkLoadPromise;

    sdkLoadPromise = new Promise((resolve) => {
        window.onSpotifyWebPlaybackSDKReady = (): void => resolve();
        const script: HTMLScriptElement = document.createElement("script");
        script.src = SDK_URL;
        script.async = true;
        document.body.appendChild(script);
    });

    return sdkLoadPromise;
}

// --- Device Spotify Connect partagé pour tout l'onglet -----------------------
// Recréer un Spotify.Player (donc un nouveau device Connect) à chaque fois
// qu'on entre/sort d'une room (mount/unmount React) laissait parfois le device
// précédent dans un état "fantôme" côté serveurs Spotify pendant quelques
// secondes — le morceau suivant se lançait alors sans aucun son. Le device est
// donc créé UNE seule fois par onglet et jamais déconnecté tant que la page
// reste ouverte ; les pages s'abonnent/désabonnent à son état au lieu de le
// recréer à chaque visite d'un salon.
type SharedState = {
    deviceId: string | null;
    isReady: boolean;
    error: SpotifyPlayerError;
    unlocked: boolean;
};

let sharedPlayer: SpotifyPlayerInstance | null = null;
let sharedPlayerPromise: Promise<SpotifyPlayerInstance> | null = null;
let sharedState: SharedState = {deviceId: null, isReady: false, error: null, unlocked: false};
const subscribers = new Set<(state: SharedState) => void>();

function updateSharedState(patch: Partial<SharedState>): void {
    sharedState = {...sharedState, ...patch};
    subscribers.forEach((cb) => cb(sharedState));
}

function getOrCreatePlayer(): Promise<SpotifyPlayerInstance> {
    if (sharedPlayer) return Promise.resolve(sharedPlayer);
    if (sharedPlayerPromise) return sharedPlayerPromise;

    sharedPlayerPromise = loadSpotifySdk().then((): SpotifyPlayerInstance => {
        const player: SpotifyPlayerInstance = new window.Spotify!.Player({
            name: "Melodia",
            getOAuthToken: (cb: (token: string) => void): void => {
                apiClient
                    .get("/api/spotify/playback-token")
                    .then((res) => cb(res.data.access_token))
                    .catch(() => updateSharedState({error: "authentication_error"}));
            },
            volume: toGainValue(getStoredVolume()),
        });

        player.addListener("ready", ({device_id}: { device_id: string }): void => {
            updateSharedState({deviceId: device_id, isReady: true, error: null});

            // Le device n'est pas toujours immédiatement reconnu par l'API Connect
            // juste après "ready" — un transfert explicite (sans lancer la lecture)
            // le fait apparaître comme device actif avant le premier vrai `play`.
            apiClient
                .get("/api/spotify/playback-token")
                .then((res) =>
                    fetch("https://api.spotify.com/v1/me/player", {
                        method: "PUT",
                        headers: {
                            Authorization: `Bearer ${res.data.access_token}`,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({device_ids: [device_id], play: false}),
                    }),
                )
                .catch((e) => console.error("Device transfer error:", e));
        });
        player.addListener("not_ready", (): void => updateSharedState({isReady: false}));
        player.addListener("account_error", (): void => updateSharedState({error: "account_error"}));
        player.addListener("authentication_error", (): void => updateSharedState({error: "authentication_error"}));
        player.addListener("initialization_error", (): void => updateSharedState({error: "initialization_error"}));
        player.addListener("playback_error", (): void => updateSharedState({error: "playback_error"}));

        player.connect();
        sharedPlayer = player;
        return player;
    });

    return sharedPlayerPromise;
}

/**
 * Se connecte au device Spotify Connect partagé de l'onglet (créé une seule
 * fois pour toute la session, voir plus haut). `enabled` doit rester false
 * tant que l'utilisateur n'est pas confirmé Premium + lié — le SDK rejette
 * sinon avec "account_error".
 */
export function useSpotifyPlayer(enabled: boolean) {
    const [state, setState] = useState<SharedState>(sharedState);
    const [volume, setVolumeState] = useState<number>(getStoredVolume);

    useEffect((): (() => void) | void => {
        if (!enabled) return;

        // Ignore une éventuelle erreur laissée par une room précédente dans le même
        // onglet — seules les erreurs survenant PENDANT cette visite doivent remonter.
        setState({...sharedState, error: null});
        subscribers.add(setState);
        getOrCreatePlayer().catch((e) => console.error("Spotify player init error:", e));

        return (): void => {
            subscribers.delete(setState);
        };
    }, [enabled]);

    const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

    /**
     * Le SDK n'a pas de "jouer cette URI" — il faut appeler le Web API avec le
     * device_id. Juste après "ready", le device peut ne pas encore être reconnu
     * par l'API Connect (404 "Device not found") ; on retente quelques fois avant
     * d'abandonner plutôt que d'échouer silencieusement.
     */
    const playUris = useCallback(async (uris: string[], positionMs: number = 0): Promise<void> => {
        if (!sharedState.deviceId) return;

        for (let attempt = 0; attempt < 4; attempt++) {
            const tokenRes = await apiClient.get("/api/spotify/playback-token");

            const response: Response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${sharedState.deviceId}`, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${tokenRes.data.access_token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({uris, position_ms: positionMs}),
            });

            if (response.ok) {
                console.log(`[Melodia Room] playUris OK on attempt ${attempt + 1} (device ${sharedState.deviceId})`);
                return;
            }

            const body: string = await response.text().catch(() => "");
            console.warn(`[Melodia Room] playUris attempt ${attempt + 1} failed: HTTP ${response.status} — ${body}`);
            await wait(500);
        }

        updateSharedState({error: "playback_error"});
    }, []);

    const pause = useCallback(async (): Promise<void> => {
        await sharedPlayer?.pause();
    }, []);

    const resume = useCallback(async (): Promise<void> => {
        await sharedPlayer?.resume();
    }, []);

    const seek = useCallback(async (positionMs: number): Promise<void> => {
        await sharedPlayer?.seek(positionMs);
    }, []);

    const getCurrentState = useCallback(async (): Promise<any | null> => {
        return sharedPlayer?.getCurrentState() ?? null;
    }, []);

    const setVolume = useCallback(async (value: number): Promise<void> => {
        const clamped: number = Math.min(1, Math.max(0, value));
        setVolumeState(clamped);
        localStorage.setItem(VOLUME_STORAGE_KEY, String(clamped));
        await sharedPlayer?.setVolume(toGainValue(clamped));
    }, []);

    /**
     * Débloque la lecture audio dans le navigateur (une seule fois par onglet,
     * voir le voile dans RoomDetail). Les commandes play/pause de la room
     * transitent par le serveur (socket) avant de revenir au client, donc elles
     * ne comptent jamais comme un "geste utilisateur" direct — le navigateur
     * laisse alors la lecture démarrer côté Spotify sans émettre aucun son tant
     * que cette fonction n'a pas été appelée depuis un vrai clic.
     */
    const activate = useCallback(async (): Promise<void> => {
        await sharedPlayer?.activateElement();
        updateSharedState({unlocked: true});
    }, []);

    return {
        deviceId: state.deviceId,
        isReady: state.isReady,
        error: state.error,
        audioUnlocked: state.unlocked,
        volume,
        playUris,
        pause,
        resume,
        seek,
        getCurrentState,
        setVolume,
        activate,
    };
}
