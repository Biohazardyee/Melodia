import React, {useEffect, useRef, useState} from "react";
import {ChevronLeft, ChevronRight, Loader2, Music2, Pause, Play, Volume1, Volume2, VolumeX, X} from "lucide-react";
import {useTranslation} from "react-i18next";

interface MiniPlayerProps {
    trackName: string;
    artist: string;
    artworkUrl: string | null;
    isLoading: boolean;
    hasError: boolean;
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    volume: number;
    hasNext: boolean;
    onTogglePlay: () => void;
    onSeek: (ratio: number) => void;
    onNext: () => void;
    onPrev: () => void;
    onVolumeChange: (value: number) => void;
    onClose: () => void;
}

const formatTime = (seconds: number): string => {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
};

const clientXOf = (e: MouseEvent | TouchEvent): number =>
    "touches" in e ? (e.touches[0] ?? e.changedTouches[0]).clientX : e.clientX;

interface ScrubBarProps {
    ratio: number;
    onDrag?: (ratio: number) => void;
    onCommit: (ratio: number) => void;
}

// Curseur "à la Spotify" entièrement custom (pas un <input type="range"> natif,
// dont le rendu diffère trop d'un navigateur/OS à l'autre pour rester joli).
// Pendant le glissement, le point suit la souris en direct ; onCommit n'est
// appelé qu'au relâchement (utile pour ne pas saccader la lecture audio en cherchant).
const ScrubBar: React.FC<ScrubBarProps> = ({ratio, onDrag, onCommit}) => {
    const barRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragRatio, setDragRatio] = useState(0);

    const ratioFromClientX = (clientX: number): number => {
        const bar = barRef.current;
        if (!bar) return 0;
        const rect = bar.getBoundingClientRect();
        return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    };

    const handlePointerDown = (e: React.MouseEvent | React.TouchEvent): void => {
        const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
        const r = ratioFromClientX(clientX);
        setDragRatio(r);
        setIsDragging(true);
        onDrag?.(r);
    };

    useEffect(() => {
        if (!isDragging) return;

        const handleMove = (e: MouseEvent | TouchEvent): void => {
            const r = ratioFromClientX(clientXOf(e));
            setDragRatio(r);
            onDrag?.(r);
        };

        const handleUp = (e: MouseEvent | TouchEvent): void => {
            const r = ratioFromClientX(clientXOf(e));
            setIsDragging(false);
            onCommit(r);
        };

        window.addEventListener("mousemove", handleMove);
        window.addEventListener("touchmove", handleMove);
        window.addEventListener("mouseup", handleUp);
        window.addEventListener("touchend", handleUp);

        return () => {
            window.removeEventListener("mousemove", handleMove);
            window.removeEventListener("touchmove", handleMove);
            window.removeEventListener("mouseup", handleUp);
            window.removeEventListener("touchend", handleUp);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isDragging]);

    const displayRatio = isDragging ? dragRatio : ratio;

    return (
        <div
            ref={barRef}
            onMouseDown={handlePointerDown}
            onTouchStart={handlePointerDown}
            className="relative py-2 -my-2 cursor-pointer group select-none"
        >
            <div className="h-1 rounded-full bg-gray-700 dark:bg-gray-200 relative">
                <div
                    className="h-full rounded-full bg-purple-500"
                    style={{width: `${displayRatio * 100}%`, transition: isDragging ? "none" : "width 0.1s linear"}}
                />
                <div
                    className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white shadow-md pointer-events-none transition-opacity ${
                        isDragging ? "opacity-100 scale-125" : "opacity-0 group-hover:opacity-100"
                    }`}
                    style={{left: `${displayRatio * 100}%`, transition: isDragging ? "none" : "left 0.1s linear, opacity 0.15s"}}
                />
            </div>
        </div>
    );
};

const MiniPlayer: React.FC<MiniPlayerProps> = ({
    trackName,
    artist,
    artworkUrl,
    isLoading,
    hasError,
    isPlaying,
    currentTime,
    duration,
    volume,
    hasNext,
    onTogglePlay,
    onSeek,
    onNext,
    onPrev,
    onVolumeChange,
    onClose,
}) => {
    const {t} = useTranslation();
    const [previewRatio, setPreviewRatio] = useState<number | null>(null);

    const progressRatio = duration > 0 ? Math.min(1, currentTime / duration) : 0;
    const displayedTime = (previewRatio ?? progressRatio) * duration;
    const VolumeIcon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

    return (
        <div className="fixed bottom-4 left-4 z-50 w-80 max-w-[calc(100vw-2rem)] bg-panel dark:bg-panel border border-line dark:border-line rounded-2xl shadow-2xl p-4">
            <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-canvas dark:bg-raised flex items-center justify-center flex-shrink-0">
                    {artworkUrl ? (
                        <img src={artworkUrl} alt="" className="w-full h-full object-cover"/>
                    ) : (
                        <Music2 size={20} className="text-gray-600"/>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-ink truncate">{trackName}</p>
                    <p className="text-xs text-gray-500 truncate">{artist}</p>
                </div>
                <button
                    onClick={onClose}
                    className="text-gray-500 hover:text-white dark:hover:text-gray-900 transition-colors flex-shrink-0"
                    title={t("close_player", "Fermer le lecteur")}
                >
                    <X size={16}/>
                </button>
            </div>

            {hasError ? (
                <p className="text-xs text-rose-500 mb-3 h-1.5 flex items-center">
                    {t("no_preview_available", "Aucun extrait trouvé")}
                </p>
            ) : (
                <div className="mb-1">
                    <ScrubBar
                        ratio={progressRatio}
                        onDrag={setPreviewRatio}
                        onCommit={(r) => {
                            onSeek(r);
                            setPreviewRatio(null);
                        }}
                    />
                    <div className="flex justify-between text-[11px] text-gray-500 mt-1.5 tabular-nums">
                        <span>{formatTime(displayedTime)}</span>
                        <span>{formatTime(duration)}</span>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-center gap-6">
                <button
                    onClick={onPrev}
                    className="text-muted hover:text-white dark:hover:text-gray-900 transition-colors"
                    title={t("prev_track", "Titre précédent")}
                >
                    <ChevronLeft size={22}/>
                </button>
                <button
                    onClick={onTogglePlay}
                    disabled={isLoading || hasError}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-white text-black hover:scale-105 transition-transform disabled:opacity-40 disabled:hover:scale-100"
                    title={isPlaying ? t("pause_preview", "Mettre en pause") : t("play_preview", "Écouter un extrait")}
                >
                    {isLoading ? (
                        <Loader2 size={18} className="animate-spin"/>
                    ) : isPlaying ? (
                        <Pause size={18}/>
                    ) : (
                        <Play size={18} className="ml-0.5"/>
                    )}
                </button>
                <button
                    onClick={onNext}
                    disabled={!hasNext}
                    className="text-muted hover:text-white dark:hover:text-gray-900 transition-colors disabled:opacity-30 disabled:hover:text-muted"
                    title={t("next_track", "Titre suivant")}
                >
                    <ChevronRight size={22}/>
                </button>
            </div>

            <div className="flex items-center gap-2.5 mt-3 pt-3 border-t border-line dark:border-line">
                <VolumeIcon size={14} className="text-gray-500 flex-shrink-0"/>
                <div className="flex-1">
                    <ScrubBar ratio={volume} onDrag={onVolumeChange} onCommit={onVolumeChange}/>
                </div>
            </div>
        </div>
    );
};

export default MiniPlayer;
