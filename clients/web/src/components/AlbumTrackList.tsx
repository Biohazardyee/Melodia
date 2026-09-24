import React, {useEffect, useRef, useState} from "react";
import {ExternalLink, Loader2, Pause, Play} from "lucide-react";
import {useTranslation} from "react-i18next";
import apiClient from "../api/client";
import MiniPlayer from "./MiniPlayer";

const VOLUME_STORAGE_KEY = "trackPreviewVolume";

interface AlbumTrack {
    name: string;
    duration?: string | number;
}

interface AlbumTrackListProps {
    tracks: AlbumTrack[];
    artist: string;
}

interface TrackPreview {
    previewUrl: string | null;
    artworkUrl: string | null;
    spotifyUrl: string;
}

const formatDuration = (duration?: string | number): string => {
    const totalSeconds = Number(duration);
    if (!totalSeconds || Number.isNaN(totalSeconds)) return "";
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

// Le volume perçu par l'oreille n'est pas linéaire : sans cette courbe, la moitié
// du curseur sonne quasiment aussi fort que le max. On applique donc une taper
// quadratique (curseur au milieu -> ~25% du volume réel) pour un ressenti correct.
const toGainValue = (sliderValue: number): number => sliderValue * sliderValue;

const AlbumTrackList: React.FC<AlbumTrackListProps> = ({tracks, artist}) => {
    const {t} = useTranslation();
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [loadingTrack, setLoadingTrack] = useState<string | null>(null);
    const [errorTrack, setErrorTrack] = useState<string | null>(null);
    const [previewCache, setPreviewCache] = useState<Record<string, TrackPreview>>({});
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState<number>((): number => {
        const saved = localStorage.getItem(VOLUME_STORAGE_KEY);
        const parsed = saved !== null ? Number(saved) : NaN;
        return Number.isFinite(parsed) ? Math.min(1, Math.max(0, parsed)) : 0.5;
    });
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const requestIdRef = useRef(0);

    useEffect(() => {
        return () => {
            audioRef.current?.pause();
            audioRef.current = null;
        };
    }, []);

    if (!tracks || tracks.length === 0) return null;

    const teardownAudio = (): void => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.onended = null;
            audioRef.current.ontimeupdate = null;
            audioRef.current.onloadedmetadata = null;
            audioRef.current = null;
        }
    };

    const stopPlayback = (): void => {
        requestIdRef.current++;
        teardownAudio();
        setActiveIndex(null);
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);
        setLoadingTrack(null);
    };

    const playTrackAtIndex = async (index: number): Promise<void> => {
        if (index < 0 || index >= tracks.length) {
            stopPlayback();
            return;
        }

        const requestId = ++requestIdRef.current;
        const track = tracks[index];

        setErrorTrack(null);
        teardownAudio();
        setActiveIndex(index);
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);

        let preview: TrackPreview | undefined = previewCache[track.name];
        if (!preview) {
            setLoadingTrack(track.name);
            try {
                const res = await apiClient.get("/api/tracks/preview", {
                    params: {artist, track: track.name},
                });
                if (requestIdRef.current !== requestId) return;
                preview = {
                    previewUrl: res.data.previewUrl,
                    artworkUrl: res.data.artworkUrl,
                    spotifyUrl: res.data.spotifyUrl,
                };
                setPreviewCache((prev) => ({...prev, [track.name]: preview as TrackPreview}));
            } catch (err) {
                if (requestIdRef.current !== requestId) return;
                setLoadingTrack(null);
                setErrorTrack(track.name);
                await playTrackAtIndex(index + 1);
                return;
            }
            if (requestIdRef.current !== requestId) return;
            setLoadingTrack(null);
        }

        if (requestIdRef.current !== requestId) return;

        if (!preview.previewUrl) {
            setErrorTrack(track.name);
            await playTrackAtIndex(index + 1);
            return;
        }

        const audio = new Audio(preview.previewUrl);
        audio.volume = toGainValue(volume);
        audio.ontimeupdate = () => setCurrentTime(audio.currentTime);
        audio.onloadedmetadata = () => setDuration(audio.duration || 0);
        audio.onended = () => {
            void playTrackAtIndex(index + 1);
        };
        audioRef.current = audio;

        try {
            await audio.play();
            if (requestIdRef.current !== requestId) return;
            setIsPlaying(true);
        } catch (err) {
            if (requestIdRef.current !== requestId) return;
            setErrorTrack(track.name);
            await playTrackAtIndex(index + 1);
        }
    };

    const togglePlayPause = (): void => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            audioRef.current
                .play()
                .then(() => setIsPlaying(true))
                .catch(() => setErrorTrack(activeIndex !== null ? tracks[activeIndex].name : null));
        }
    };

    const handleRowClick = (index: number): void => {
        if (activeIndex === index && audioRef.current) {
            togglePlayPause();
        } else {
            void playTrackAtIndex(index);
        }
    };

    const handleSeek = (ratio: number): void => {
        if (!audioRef.current || !duration) return;
        const time = Math.min(duration, Math.max(0, ratio * duration));
        audioRef.current.currentTime = time;
        setCurrentTime(time);
    };

    const handleNext = (): void => {
        if (activeIndex === null) return;
        void playTrackAtIndex(activeIndex + 1);
    };

    const handlePrev = (): void => {
        if (activeIndex === null) return;
        // Comme sur Spotify : si on est plus de 3s dans le titre (ou qu'il n'y a pas de titre
        // précédent), on redémarre le titre courant au lieu de reculer.
        const shouldRestart = activeIndex === 0 || (audioRef.current !== null && audioRef.current.currentTime > 3);
        if (shouldRestart) {
            if (audioRef.current) {
                audioRef.current.currentTime = 0;
                setCurrentTime(0);
            }
            return;
        }
        void playTrackAtIndex(activeIndex - 1);
    };

    const handleVolumeChange = (next: number): void => {
        setVolume(next);
        localStorage.setItem(VOLUME_STORAGE_KEY, String(next));
        if (audioRef.current) {
            audioRef.current.volume = toGainValue(next);
        }
    };

    const activeTrack = activeIndex !== null ? tracks[activeIndex] : null;
    const activePreview = activeTrack ? previewCache[activeTrack.name] : undefined;

    return (
        <section>
            <h3 className="text-xl font-bold mb-4 border-b border-line dark:border-line pb-2 w-fit max-w-2xl">
                {t("tracklist_title", "Titres de l'album")}
            </h3>
            <ul className="divide-y divide-gray-800 dark:divide-gray-200 max-w-2xl">
                {tracks.map((track, idx) => {
                    const isActive = activeIndex === idx;
                    const isLoading = loadingTrack === track.name;
                    const hasError = errorTrack === track.name;
                    const spotifyUrl = previewCache[track.name]?.spotifyUrl
                        || `https://open.spotify.com/search/${encodeURIComponent(`${artist} ${track.name}`)}`;

                    return (
                        <li key={`${track.name}-${idx}`} className="flex items-center gap-3 py-3">
                            <span className="text-gray-500 w-6 text-sm text-right flex-shrink-0">{idx + 1}</span>
                            <button
                                onClick={() => handleRowClick(idx)}
                                className={`w-9 h-9 flex items-center justify-center rounded-full bg-panel dark:bg-panel border transition-colors flex-shrink-0 ${
                                    isActive ? "border-purple-500 text-purple-400" : "border-line dark:border-line text-ink hover:border-purple-500"
                                }`}
                                title={t("play_preview", "Écouter un extrait")}
                            >
                                {isLoading ? (
                                    <Loader2 size={14} className="animate-spin"/>
                                ) : isActive && isPlaying ? (
                                    <Pause size={14}/>
                                ) : (
                                    <Play size={14} className="ml-0.5"/>
                                )}
                            </button>
                            <span className="flex-1 text-gray-200 dark:text-gray-800 truncate">
                                {track.name}
                                {hasError && (
                                    <span className="text-xs text-rose-500 ml-2">
                                        {t("no_preview_available", "Aucun extrait trouvé")}
                                    </span>
                                )}
                            </span>
                            {track.duration ? (
                                <span className="text-gray-500 text-sm flex-shrink-0">{formatDuration(track.duration)}</span>
                            ) : null}
                            <a
                                href={spotifyUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-500 hover:text-green-500 transition-colors flex-shrink-0"
                                title={t("listen_full_spotify", "Écouter en entier sur Spotify")}
                            >
                                <ExternalLink size={14}/>
                            </a>
                        </li>
                    );
                })}
            </ul>

            {activeTrack && (
                <MiniPlayer
                    trackName={activeTrack.name}
                    artist={artist}
                    artworkUrl={activePreview?.artworkUrl || null}
                    isLoading={loadingTrack === activeTrack.name}
                    hasError={errorTrack === activeTrack.name}
                    isPlaying={isPlaying}
                    currentTime={currentTime}
                    duration={duration}
                    volume={volume}
                    hasNext={activeIndex !== null && activeIndex < tracks.length - 1}
                    onTogglePlay={togglePlayPause}
                    onSeek={handleSeek}
                    onNext={handleNext}
                    onPrev={handlePrev}
                    onVolumeChange={handleVolumeChange}
                    onClose={stopPlayback}
                />
            )}
        </section>
    );
};

export default AlbumTrackList;
