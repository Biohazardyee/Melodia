import React, {useEffect, useState} from "react";
import {Music2} from "lucide-react";
import {useTranslation} from "react-i18next";
import apiClient from "../api/client";

interface NowPlaying {
    isPlaying: boolean;
    trackName: string;
    artist: string;
    albumName: string;
    albumArt: string | null;
    progressMs: number;
    durationMs: number;
    spotifyUrl: string | null;
}

const REFRESH_INTERVAL_MS = 20_000;
const TICK_INTERVAL_MS = 500;

interface NowPlayingCardProps {
    userId: string;
}

/**
 * Affiche ce que l'utilisateur écoute en ce moment sur Spotify (s'il a lié
 * son compte et écoute effectivement quelque chose). Rafraîchi périodiquement
 * tant que la page profil est ouverte. Ne rend rien si aucune donnée.
 *
 * La progression n'est renvoyée par Spotify qu'au moment du fetch (toutes les
 * 20s) : sans interpolation locale, la barre resterait figée entre deux
 * rafraîchissements. On calcule donc l'avancée réelle en continu à partir du
 * dernier instant connu (fetchedAt + progressMs), et on ne s'appuie sur le
 * serveur que pour recaler périodiquement (nouveau titre, pause, seek...).
 */
const NowPlayingCard: React.FC<NowPlayingCardProps> = ({userId}) => {
    const {t} = useTranslation();
    const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
    const [fetchedAt, setFetchedAt] = useState<number>(Date.now());
    const [displayProgressMs, setDisplayProgressMs] = useState(0);

    useEffect(() => {
        let cancelled = false;

        const fetchNowPlaying = async (): Promise<void> => {
            try {
                const res = await apiClient.get(`/api/spotify/now-playing/${userId}`);
                if (cancelled) return;
                const data: NowPlaying | null = res.data.nowPlaying || null;
                setNowPlaying(data);
                setFetchedAt(Date.now());
                setDisplayProgressMs(data?.progressMs ?? 0);
            } catch {
                if (!cancelled) setNowPlaying(null);
            }
        };

        fetchNowPlaying();
        const interval = setInterval(fetchNowPlaying, REFRESH_INTERVAL_MS);

        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, [userId]);

    useEffect(() => {
        if (!nowPlaying?.isPlaying) return;

        const tick = setInterval(() => {
            setDisplayProgressMs(() => {
                const elapsed = Date.now() - fetchedAt;
                return Math.min(nowPlaying.durationMs, nowPlaying.progressMs + elapsed);
            });
        }, TICK_INTERVAL_MS);

        return () => clearInterval(tick);
    }, [nowPlaying, fetchedAt]);

    if (!nowPlaying) return null;

    const progressRatio = nowPlaying.durationMs > 0
        ? Math.min(1, displayProgressMs / nowPlaying.durationMs)
        : 0;

    return (
        <a
            href={nowPlaying.spotifyUrl || undefined}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-panel dark:bg-panel border border-emerald-500/30 rounded-2xl p-3 max-w-md hover:border-emerald-500/60 transition-colors"
        >
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-canvas dark:bg-raised flex items-center justify-center flex-shrink-0">
                {nowPlaying.albumArt ? (
                    <img src={nowPlaying.albumArt} alt="" className="w-full h-full object-cover"/>
                ) : (
                    <Music2 size={18} className="text-gray-600"/>
                )}
            </div>
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"/>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"/>
                    </span>
                    <span className="text-[11px] font-bold text-emerald-500 uppercase tracking-wide">
                        {t("now_playing", "Écoute actuellement")}
                    </span>
                </div>
                <p className="text-sm font-bold text-ink truncate">{nowPlaying.trackName}</p>
                <p className="text-xs text-muted dark:text-muted truncate">{nowPlaying.artist}</p>
                <div className="h-1 rounded-full bg-gray-700 dark:bg-gray-200 mt-1.5 overflow-hidden">
                    <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{width: `${progressRatio * 100}%`, transition: "width 0.5s linear"}}
                    />
                </div>
            </div>
        </a>
    );
};

export default NowPlayingCard;
