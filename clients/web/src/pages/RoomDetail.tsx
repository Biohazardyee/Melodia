import React, {useEffect, useRef, useState} from "react";
import {useNavigate, useParams} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {toast} from "react-toastify";
import {jwtDecode} from "jwt-decode";
import {io, Socket} from "socket.io-client";
import {
    ArrowLeft,
    Play,
    Pause,
    SkipForward,
    Users,
    Search,
    Send,
    X,
    Loader2,
    Music2,
    Plus,
    LogOut,
    Trash2,
    Volume,
    Volume1,
    Volume2,
    VolumeX,
    Lock,
} from "lucide-react";
import apiClient from "../api/client";
import {AxiosResponse} from "axios";
import {useConfirm} from "../context/ConfirmContext";
import {useSpotifyPlayer} from "../hooks/useSpotifyPlayer";

const BACKEND_URL: string = import.meta.env.VITE_API_URL;
const QUICK_REACTIONS: string[] = ["🔥", "❤️", "🎧", "👏", "😍"];

type RoomParticipant = {
    id: string;
    username: string;
    pseudo: string;
    profile_picture: string | null;
};

type RoomQueueItem = {
    id: string;
    track_uri: string;
    track_name: string;
    artist_name: string;
    album_art_url: string | null;
    duration_ms: number;
    added_by_id: string;
    position: number;
};

type RoomData = {
    id: string;
    host_id: string;
    host?: RoomParticipant;
    name: string;
    is_public: boolean;
    participants: RoomParticipant[];
    queue_items: RoomQueueItem[];
};

type PlaybackState = {
    version?: string;
    trackUri: string | null;
    trackName: string | null;
    artistName: string | null;
    albumArt: string | null;
    durationMs: number | null;
    positionMs: number;
    isPlaying: boolean;
    serverTime: number;
};

type ChatMessage = {
    user: { id: string; username: string };
    content: string;
    sent_at: string;
};

type TrackResult = {
    uri: string;
    name: string;
    artist: string;
    album: string;
    albumArt: string | null;
    durationMs: number;
};

const formatDuration = (ms: number): string => {
    const totalSeconds: number = Math.max(0, Math.floor(ms / 1000));
    const minutes: number = Math.floor(totalSeconds / 60);
    const seconds: number = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

const RoomDetail: React.FC = () => {
    const {id} = useParams<{ id: string }>();
    const navigate = useNavigate();
    const {t} = useTranslation();
    const confirm = useConfirm();

    const [userId, setUserId] = useState<string>("");
    const [room, setRoom] = useState<RoomData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [socket, setSocket] = useState<Socket | null>(null);

    const [playback, setPlayback] = useState<PlaybackState>({
        trackUri: null,
        trackName: null,
        artistName: null,
        albumArt: null,
        durationMs: null,
        positionMs: 0,
        isPlaying: false,
        serverTime: Date.now(),
    });
    const [displayPositionMs, setDisplayPositionMs] = useState<number>(0);
    const [queue, setQueue] = useState<RoomQueueItem[]>([]);
    const [participants, setParticipants] = useState<RoomParticipant[]>([]);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState<string>("");
    const [showAddTrack, setShowAddTrack] = useState<boolean>(false);
    const [trackQuery, setTrackQuery] = useState<string>("");
    const [trackResults, setTrackResults] = useState<TrackResult[]>([]);
    const [trackSearching, setTrackSearching] = useState<boolean>(false);
    const [reactions, setReactions] = useState<{ id: string; emoji: string }[]>([]);
    const [showParticipants, setShowParticipants] = useState<boolean>(false);
    const [needsPassword, setNeedsPassword] = useState<boolean>(false);
    const [passwordInput, setPasswordInput] = useState<string>("");
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [submittingPassword, setSubmittingPassword] = useState<boolean>(false);

    const spotifyPlayer = useSpotifyPlayer(!!room);
    const audioUnlocked: boolean = spotifyPlayer.audioUnlocked;
    const isHost: boolean = room ? room.host_id === userId : false;
    const chatEndRef = useRef<HTMLDivElement>(null);
    const searchTimeoutRef = useRef<any>(null);

    useEffect((): void => {
        const token: string | null = localStorage.getItem("token");
        if (token) {
            const decoded: any = jwtDecode(token);
            setUserId(decoded.id || decoded.userId);
        }
    }, []);

    const applyRoomData = (r: any): void => {
        setRoom(r);
        setParticipants(r.participants || []);
        setQueue(r.queue_items || []);
        setPlayback({
            trackUri: r.current_track_uri,
            version: r.position_updated_at,
            trackName: r.current_track_name,
            artistName: r.current_artist_name,
            albumArt: r.current_album_art_url,
            durationMs: r.current_duration_ms,
            positionMs: r.position_ms,
            isPlaying: r.is_playing,
            serverTime: Date.now(),
        });
    };

    useEffect(() => {
        if (!id) return;
        const controller = new AbortController();
        setLoading(true);
        setRoom(null);
        setNeedsPassword(false);
        const load = async (): Promise<void> => {
            try {
                const res: AxiosResponse = await apiClient.post(`/rooms/${id}/join`, undefined, {signal: controller.signal});
                if (controller.signal.aborted) return;
                applyRoomData(res.data.room);
            } catch (e: any) {
                if (controller.signal.aborted) return;
                if (e.response?.status === 403) {
                    // Salon privé, mot de passe requis — on montre le prompt au lieu de rediriger.
                    setNeedsPassword(true);
                } else {
                    console.error("Erreur chargement salon:", e);
                    toast.error(e.response?.data?.message || t("room_not_found_error", "Ce salon n'existe pas ou n'est plus accessible."));
                    navigate("/rooms");
                }
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        };
        load();
        return () => controller.abort();
    }, [id]);

    const handlePasswordSubmit = async (): Promise<void> => {
        if (!id || !passwordInput.trim()) return;
        setSubmittingPassword(true);
        setPasswordError(null);
        try {
            const res: AxiosResponse = await apiClient.post(`/rooms/${id}/join`, {password: passwordInput.trim()});
            applyRoomData(res.data.room);
            setNeedsPassword(false);
        } catch (e: any) {
            if (e.response?.status === 403) {
                setPasswordError(t("room_password_incorrect", "Mot de passe incorrect."));
            } else {
                console.error("Erreur rejoindre salon:", e);
                toast.error(e.response?.data?.message || t("room_not_found_error", "Ce salon n'existe pas ou n'est plus accessible."));
                navigate("/rooms");
            }
        } finally {
            setSubmittingPassword(false);
        }
    };

    useEffect((): (() => void) | void => {
        const token: string | null = localStorage.getItem("token");
        if (!token || !id || !room || room.id !== id) return;

        const s: Socket = io(BACKEND_URL, {auth: {token}, transports: ["websocket"]});
        setSocket(s);

        return (): void => {
            s.emit("leave_room", {room_id: id});
            s.disconnect();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, !!room]);

    useEffect((): (() => void) | void => {
        if (!socket || !id) return;

        const applySync = (state: any): void => {
            setPlayback({
                version: state.position_updated_at,
                trackUri: state.current_track_uri,
                trackName: state.current_track_name,
                artistName: state.current_artist_name,
                albumArt: state.current_album_art_url,
                durationMs: state.current_duration_ms,
                positionMs: state.position_ms,
                isPlaying: state.is_playing,
                serverTime: state.server_time,
            });
        };

        const refreshParticipants = (): void => {
            apiClient
                .get(`/rooms/${id}`)
                .then((res) => setParticipants(res.data.room.participants || []))
                .catch(() => undefined);
        };

        socket.on("room_state", applySync);
        const rejoin = () => {
            socket.emit("join_room", {room_id: id});
            apiClient.get(`/rooms/${id}`).then(res => {
                setParticipants(res.data.room.participants || []);
                setQueue(res.data.room.queue_items || []);
            }).catch(() => undefined);
        };
        socket.on("connect", rejoin);
        if (socket.connected) rejoin();
        socket.on("room_playback_sync", applySync);
        socket.on("room_queue_updated", (data: { items: RoomQueueItem[] }): void => setQueue(data.items || []));
        socket.on("room_participant_joined", refreshParticipants);
        socket.on("room_participant_left", refreshParticipants);
        socket.on("room_chat_message_received", (msg: ChatMessage): void => {
            setChatMessages((prev) => [...prev, msg].slice(-100));
        });
        socket.on("room_reaction_received", (data: { emoji: string }): void => {
            const reactionId = `${Date.now()}-${Math.random()}`;
            setReactions((prev) => [...prev, {id: reactionId, emoji: data.emoji}]);
            setTimeout(() => setReactions((prev) => prev.filter((r) => r.id !== reactionId)), 2000);
        });

        return (): void => {
            socket.off("room_state", applySync);
            socket.off("connect", rejoin);
            socket.off("room_playback_sync", applySync);
            socket.off("room_queue_updated");
            socket.off("room_participant_joined", refreshParticipants);
            socket.off("room_participant_left", refreshParticipants);
            socket.off("room_chat_message_received");
            socket.off("room_reaction_received");
        };
    }, [socket, id]);

    // Reconcilie la lecture Spotify locale avec l'état synchronisé du salon.
    // Bloqué tant que l'audio n'a pas été débloqué par un vrai clic (audioUnlocked) :
    // tenter de jouer avant ça échoue silencieusement (blocage autoplay navigateur),
    // et comme audioUnlocked est dans les deps, débloquer relance cet effet tout seul.
    useEffect((): void => {
        if (!spotifyPlayer.isReady || !audioUnlocked) return;

        const target: number = playback.isPlaying
            ? playback.positionMs + (Date.now() - playback.serverTime)
            : playback.positionMs;

        if (playback.isPlaying && playback.trackUri) {
            spotifyPlayer.playUris([playback.trackUri], Math.max(0, target)).catch((e) => console.error("Sync playback error:", e));
        } else if (!playback.isPlaying && playback.trackUri) {
            // Ne tente pas de mettre en pause tant qu'aucun morceau n'a jamais été
            // chargé (salon fraîchement créé) — le SDK jette sinon une erreur.
            spotifyPlayer.pause().catch(() => undefined);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [playback.trackUri, playback.isPlaying, playback.serverTime, spotifyPlayer.isReady, audioUnlocked]);

    // Avance automatiquement à la fin d'un morceau (piste suivante de la file,
    // ou vidage vers le placeholder si elle est vide — room_skip gère déjà les
    // deux cas côté serveur). Seul l'hôte programme ce minuteur, sinon chaque
    // participant déclencherait son propre skip en même temps.
    useEffect((): (() => void) | void => {
        if (!isHost || !socket || !id || !playback.isPlaying || !playback.trackUri || !playback.durationMs) return;

        const elapsed: number = Date.now() - playback.serverTime;
        const currentPosition: number = playback.positionMs + elapsed;
        const remaining: number = playback.durationMs - currentPosition;

        const timer = setTimeout((): void => {
            socket.emit("room_skip", {room_id: id, expected_updated_at: playback.version});
        }, Math.max(0, remaining) + 500);

        return (): void => clearTimeout(timer);
    }, [isHost, socket, id, playback.isPlaying, playback.trackUri, playback.durationMs, playback.positionMs, playback.serverTime, playback.version]);

    useEffect((): void => {
        if (spotifyPlayer.error === "account_error") {
            toast.error(t("room_playback_error_account", "Ce compte Spotify n'est pas Premium ou n'est plus valide."));
        } else if (spotifyPlayer.error) {
            toast.error(t("room_playback_error", "Erreur de lecture Spotify. Réessaie dans un instant."));
        }
    }, [spotifyPlayer.error]);

    // Horloge locale d'affichage de la progression (indépendante du serveur).
    useEffect((): (() => void) | void => {
        if (!playback.isPlaying) {
            setDisplayPositionMs(playback.positionMs);
            return;
        }
        const tick = (): void => setDisplayPositionMs(playback.positionMs + (Date.now() - playback.serverTime));
        tick();
        const interval = setInterval(tick, 500);
        return (): void => clearInterval(interval);
    }, [playback]);

    useEffect((): void => {
        chatEndRef.current?.scrollIntoView({behavior: "smooth"});
    }, [chatMessages]);

    const handleUnlockAudio = (): void => {
        spotifyPlayer.activate().catch((e) => console.error("Activate error:", e));
    };

    const handleTogglePlay = (): void => {
        if (!socket || !isHost || !id) return;
        spotifyPlayer.activate().catch(() => undefined);
        if (playback.isPlaying) {
            socket.emit("room_pause", {room_id: id, position_ms: displayPositionMs});
        } else if (playback.trackUri) {
            socket.emit("room_play", {
                room_id: id,
                track_uri: playback.trackUri,
                track_name: playback.trackName,
                artist_name: playback.artistName,
                album_art_url: playback.albumArt,
                duration_ms: playback.durationMs,
                position_ms: displayPositionMs,
            });
        }
    };

    const handleSkip = (): void => {
        if (!socket || !isHost || !id) return;
        spotifyPlayer.activate().catch(() => undefined);
        socket.emit("room_skip", {room_id: id, expected_updated_at: playback.version});
    };

    const handleTrackQueryChange = (value: string): void => {
        setTrackQuery(value);
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

        if (value.trim().length < 2) {
            setTrackResults([]);
            return;
        }

        searchTimeoutRef.current = setTimeout(async (): Promise<void> => {
            setTrackSearching(true);
            try {
                const res: AxiosResponse = await apiClient.get(`/api/spotify/search-tracks?q=${encodeURIComponent(value.trim())}`);
                setTrackResults(res.data.tracks || []);
            } catch (e) {
                console.error("Erreur recherche titres:", e);
            } finally {
                setTrackSearching(false);
            }
        }, 400);
    };

    const handleAddTrack = (track: TrackResult): void => {
        if (!socket || !id) return;
        socket.emit("room_queue_add", {
            room_id: id,
            track_uri: track.uri,
            track_name: track.name,
            artist_name: track.artist,
            album_art_url: track.albumArt,
            duration_ms: track.durationMs,
        });
        setShowAddTrack(false);
        setTrackQuery("");
        setTrackResults([]);
        toast.success(t("room_track_added", "Titre ajouté à la file d'attente."));
    };

    const handleRemoveQueueItem = (itemId: string): void => {
        if (!socket || !id) return;
        socket.emit("room_queue_remove", {room_id: id, item_id: itemId});
    };

    const handleSendChat = (): void => {
        if (!socket || !id || !chatInput.trim()) return;
        socket.emit("room_chat_message", {room_id: id, content: chatInput.trim()});
        setChatInput("");
    };

    const handleSendReaction = (emoji: string): void => {
        if (!socket || !id) return;
        socket.emit("room_reaction", {room_id: id, emoji});
    };

    const handleLeaveOrDelete = async (): Promise<void> => {
        if (!id) return;
        const ok = await confirm({
            title: isHost ? t("room_delete_title", "Fermer le salon") : t("room_leave_title", "Quitter le salon"),
            message: isHost
                ? t("room_delete_confirm", "Fermer ce salon pour tout le monde ?")
                : t("room_leave_confirm", "Quitter ce salon d'écoute ?"),
            confirmText: isHost ? t("delete", "Supprimer") : t("leave_playlist_btn", "Quitter"),
            danger: true,
        });
        if (!ok) return;

        try {
            await apiClient.delete(`/rooms/${id}/leave`);
            // On quitte vraiment le salon (contrairement à "Retour", qui laisse la
            // musique continuer) : on coupe la lecture sur ce device.
            spotifyPlayer.pause().catch(() => undefined);
            navigate("/rooms");
        } catch (e) {
            console.error("Erreur pour quitter le salon:", e);
            toast.error(t("room_leave_error", "Impossible de quitter ce salon."));
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-canvas dark:bg-canvas text-ink transition-colors duration-300">
                <Loader2 className="animate-spin" size={48}/>
            </div>
        );
    }

    if (needsPassword) {
        return (
            <div className="min-h-screen bg-canvas dark:bg-canvas text-ink p-6 md:p-10 flex items-center justify-center transition-colors duration-300">
                <div className="max-w-sm w-full text-center bg-panel dark:bg-panel border border-line dark:border-line rounded-2xl p-8">
                    <div className="w-14 h-14 rounded-full bg-purple-500/15 flex items-center justify-center mx-auto mb-4">
                        <Lock size={24} className="text-purple-400"/>
                    </div>
                    <h1 className="page-title text-xl font-bold mb-2">{t("room_password_required_title", "Salon protégé")}</h1>
                    <p className="text-muted dark:text-muted text-sm mb-6">
                        {t("room_password_required_desc", "Ce salon est privé. Entre le mot de passe pour le rejoindre.")}
                    </p>
                    <input
                        type="password"
                        value={passwordInput}
                        onChange={(e) => {
                            setPasswordInput(e.target.value);
                            setPasswordError(null);
                        }}
                        onKeyDown={(e) => e.key === "Enter" && handlePasswordSubmit()}
                        placeholder={t("rooms_password_placeholder", "Mot de passe du salon")}
                        autoFocus
                        className={`w-full bg-canvas dark:bg-canvas border rounded-lg px-4 py-2.5 text-sm outline-none transition-colors mb-2 ${
                            passwordError ? "border-rose-500" : "border-line dark:border-line focus:border-purple-500"
                        }`}
                    />
                    {passwordError && (
                        <p className="text-rose-500 text-xs mb-4 text-left">{passwordError}</p>
                    )}
                    <div className="flex gap-3 mt-4">
                        <button
                            onClick={() => navigate("/rooms")}
                            className="flex-1 py-2.5 rounded-xl font-semibold text-sm bg-raised dark:bg-raised text-slate-200 dark:text-gray-700 hover:bg-slate-700 dark:hover:bg-gray-200 transition-colors"
                        >
                            {t("cancel", "Annuler")}
                        </button>
                        <button
                            onClick={handlePasswordSubmit}
                            disabled={submittingPassword || !passwordInput.trim()}
                            className="flex-1 py-2.5 rounded-xl font-semibold text-sm bg-purple-600 hover:bg-purple-500 text-white transition-colors disabled:opacity-40"
                        >
                            {submittingPassword ? "…" : t("room_password_submit_btn", "Rejoindre")}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!room) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-canvas dark:bg-canvas text-ink transition-colors duration-300">
                <Loader2 className="animate-spin" size={48}/>
            </div>
        );
    }

    const progressPercent: number = playback.durationMs
        ? Math.min(100, (displayPositionMs / playback.durationMs) * 100)
        : 0;

    const VolumeIcon = spotifyPlayer.volume === 0
        ? VolumeX
        : spotifyPlayer.volume < 0.33
            ? Volume
            : spotifyPlayer.volume < 0.66
                ? Volume1
                : Volume2;

    return (
        <div className="min-h-screen bg-canvas dark:bg-canvas text-ink p-6 md:p-10 transition-colors duration-300 relative">
            {/* Réactions flottantes */}
            <div className="fixed bottom-24 right-6 z-50 flex flex-col items-end gap-1 pointer-events-none">
                {reactions.map((r) => (
                    <span key={r.id} className="text-3xl animate-bounce">{r.emoji}</span>
                ))}
            </div>

            {/* Le navigateur bloque le son tant qu'aucun clic direct n'a "débloqué" le
                lecteur — les commandes play/pause du salon arrivent via le serveur, ce
                qui ne compte jamais comme un geste utilisateur direct. Ce voile bloque
                TOUTE la room dès le chargement (pas seulement une fois le SDK prêt) :
                sinon rien n'empêche d'ajouter un titre et de cliquer "suivant" pendant
                la connexion du SDK, avant même que ce bouton ait eu la chance d'apparaître. */}
            {!audioUnlocked && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="w-full max-w-sm bg-panel dark:bg-panel border border-line dark:border-line rounded-2xl shadow-2xl p-6 text-center">
                        <div className="w-14 h-14 rounded-full bg-purple-500/15 flex items-center justify-center mx-auto mb-4">
                            <Volume2 size={26} className="text-purple-400"/>
                        </div>
                        <h3 className="text-lg font-bold mb-2">{t("room_unlock_audio_title", "Activer le son")}</h3>
                        <p className="text-sm text-muted dark:text-muted mb-6">
                            {t("room_unlock_audio_desc", "Ton navigateur bloque la lecture automatique. Clique pour activer le son de ce salon.")}
                        </p>
                        <button
                            onClick={handleUnlockAudio}
                            disabled={!spotifyPlayer.isReady}
                            className="w-full py-2.5 rounded-xl font-semibold text-sm bg-purple-600 hover:bg-purple-500 text-white transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                        >
                            {!spotifyPlayer.isReady && <Loader2 size={16} className="animate-spin"/>}
                            {spotifyPlayer.isReady
                                ? t("room_unlock_audio_btn", "Activer le son")
                                : t("room_connecting_spotify", "Connexion à Spotify...")}
                        </button>
                    </div>
                </div>
            )}

            <div className="max-w-5xl mx-auto space-y-6">
                <div className="flex items-center justify-between gap-4">
                    <button
                        onClick={() => navigate("/rooms")}
                        className="flex items-center gap-2 text-muted hover:text-white dark:hover:text-slate-900 transition-colors"
                    >
                        <ArrowLeft size={20}/> {t("back")}
                    </button>
                    <button
                        onClick={handleLeaveOrDelete}
                        className="flex items-center gap-2 text-rose-500 hover:bg-rose-500/10 px-3 py-1.5 rounded-lg text-sm font-bold transition-all"
                    >
                        {isHost ? <Trash2 size={16}/> : <LogOut size={16}/>}
                        {isHost ? t("room_close_btn", "Fermer le salon") : t("leave_playlist_btn", "Quitter")}
                    </button>
                </div>

                <div className="flex items-center justify-between flex-wrap gap-3">
                    <h1 className="page-title text-3xl md:text-4xl font-bold flex items-center gap-2.5">
                        {room.name}
                        {!room.is_public && <Lock size={20} className="text-slate-500"/>}
                    </h1>
                    <button
                        onClick={() => setShowParticipants(true)}
                        className="flex items-center gap-2 text-muted dark:text-muted hover:text-white dark:hover:text-gray-900 text-sm transition-colors"
                    >
                        <Users size={16}/>
                        {t("rooms_participant_count", "{{count}} participant(s)", {count: participants.length + 1})}
                    </button>
                </div>

                {/* Now playing */}
                <div className="bg-panel dark:bg-panel border border-line dark:border-line rounded-2xl p-6 flex flex-col sm:flex-row gap-6 items-center">
                    <div className="w-32 h-32 rounded-xl bg-panel dark:bg-raised overflow-hidden flex items-center justify-center shrink-0">
                        {playback.albumArt ? (
                            <img src={playback.albumArt} alt="" className="w-full h-full object-cover"/>
                        ) : (
                            <Music2 size={36} className="text-slate-600"/>
                        )}
                    </div>
                    <div className="flex-1 w-full min-w-0">
                        <h3 className="font-bold text-xl truncate">
                            {playback.trackName || t("rooms_nothing_playing", "Rien en cours de lecture")}
                        </h3>
                        <p className="text-muted dark:text-muted truncate mb-4">{playback.artistName || "—"}</p>

                        <div className="w-full h-1.5 bg-raised dark:bg-gray-200 rounded-full overflow-hidden mb-2">
                            <div className="h-full bg-purple-500 transition-all" style={{width: `${progressPercent}%`}}/>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-500">
                            <span>{formatDuration(displayPositionMs)}</span>
                            <span>{playback.durationMs ? formatDuration(playback.durationMs) : "--:--"}</span>
                        </div>

                        <div className="flex items-center gap-4 mt-4 flex-wrap">
                            {isHost && (
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={handleTogglePlay}
                                        disabled={!playback.trackUri}
                                        className="flex items-center justify-center w-11 h-11 rounded-full bg-purple-600 hover:bg-purple-500 text-white transition-colors disabled:opacity-40"
                                    >
                                        {playback.isPlaying ? <Pause size={20}/> : <Play size={20}/>}
                                    </button>
                                    <button
                                        onClick={handleSkip}
                                        disabled={queue.length === 0}
                                        className="flex items-center justify-center w-11 h-11 rounded-full bg-raised dark:bg-raised text-slate-200 dark:text-gray-700 hover:bg-slate-700 dark:hover:bg-gray-200 transition-colors disabled:opacity-40"
                                    >
                                        <SkipForward size={18}/>
                                    </button>
                                </div>
                            )}

                            <div className="flex items-center gap-2 flex-1 min-w-[120px] max-w-[180px]">
                                <VolumeIcon size={16} className="text-slate-500 shrink-0"/>
                                <input
                                    type="range"
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={spotifyPlayer.volume}
                                    onChange={(e) => spotifyPlayer.setVolume(parseFloat(e.target.value))}
                                    className="w-full accent-purple-500 cursor-pointer"
                                    aria-label={t("room_volume_label", "Volume")}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* File d'attente */}
                    <div className="bg-panel dark:bg-panel border border-line dark:border-line rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold">{t("room_queue_title", "File d'attente")}</h3>
                            <button
                                onClick={() => setShowAddTrack(true)}
                                className="flex items-center gap-1.5 text-purple-400 hover:text-purple-300 text-sm font-semibold transition-colors"
                            >
                                <Plus size={16}/> {t("room_add_track_btn", "Ajouter")}
                            </button>
                        </div>

                        {queue.length === 0 ? (
                            <p className="text-slate-500 text-sm py-6 text-center">
                                {t("room_queue_empty", "La file d'attente est vide.")}
                            </p>
                        ) : (
                            <div className="space-y-2 max-h-80 overflow-y-auto">
                                {queue.map((item) => (
                                    <div key={item.id} className="flex items-center gap-3 group">
                                        <div className="w-10 h-10 rounded-lg bg-panel dark:bg-raised overflow-hidden flex items-center justify-center shrink-0">
                                            {item.album_art_url ? (
                                                <img src={item.album_art_url} alt="" className="w-full h-full object-cover"/>
                                            ) : (
                                                <Music2 size={16} className="text-slate-600"/>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold truncate">{item.track_name}</p>
                                            <p className="text-xs text-slate-500 truncate">{item.artist_name}</p>
                                        </div>
                                        {(isHost || item.added_by_id === userId) && (
                                            <button
                                                onClick={() => handleRemoveQueueItem(item.id)}
                                                className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-500 transition-all shrink-0"
                                            >
                                                <X size={16}/>
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex items-center gap-2 mt-5 pt-5 border-t border-line dark:border-line">
                            {participants.length === 0 && (
                                <span className="text-xs text-slate-500">{t("room_only_host", "Toi seul(e) pour l'instant")}</span>
                            )}
                            <div className="flex -space-x-2">
                                {participants.slice(0, 8).map((p) => (
                                    <div
                                        key={p.id}
                                        title={p.pseudo || p.username}
                                        className="w-8 h-8 rounded-full border-2 border-[#1a1d26] dark:border-white bg-slate-700 flex items-center justify-center text-[10px] font-bold overflow-hidden"
                                    >
                                        {p.profile_picture ? (
                                            <img src={p.profile_picture} alt="" className="w-full h-full object-cover"/>
                                        ) : (
                                            (p.pseudo || p.username || "?").substring(0, 2).toUpperCase()
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Chat */}
                    <div className="bg-panel dark:bg-panel border border-line dark:border-line rounded-2xl p-6 flex flex-col h-[420px]">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold">{t("room_chat_title", "Discussion")}</h3>
                            <div className="flex items-center gap-1.5">
                                {QUICK_REACTIONS.map((emoji) => (
                                    <button
                                        key={emoji}
                                        onClick={() => handleSendReaction(emoji)}
                                        className="text-lg hover:scale-125 transition-transform"
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-2 mb-3">
                            {chatMessages.length === 0 ? (
                                <p className="text-slate-500 text-sm text-center py-6">
                                    {t("room_chat_empty", "Dites bonjour !")}
                                </p>
                            ) : (
                                chatMessages.map((msg, idx) => (
                                    <div key={idx} className="text-sm">
                                        <span className="font-bold text-purple-400">{msg.user.username}</span>
                                        <span className="text-slate-300 dark:text-gray-700"> : {msg.content}</span>
                                    </div>
                                ))
                            )}
                            <div ref={chatEndRef}/>
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                                placeholder={t("room_chat_placeholder", "Écrire un message...")}
                                className="flex-1 bg-canvas dark:bg-canvas border border-line dark:border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-500 transition-colors"
                            />
                            <button
                                onClick={handleSendChat}
                                disabled={!chatInput.trim()}
                                className="flex items-center justify-center w-9 h-9 rounded-lg bg-purple-600 hover:bg-purple-500 text-white transition-colors disabled:opacity-40 shrink-0"
                            >
                                <Send size={16}/>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {showParticipants && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                    onClick={() => setShowParticipants(false)}
                >
                    <div
                        className="w-full max-w-sm bg-panel dark:bg-panel border border-line dark:border-line rounded-2xl shadow-2xl p-6 max-h-[80vh] flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold">{t("room_participants_title", "Participants")}</h3>
                            <button onClick={() => setShowParticipants(false)} className="text-slate-500 hover:text-white dark:hover:text-gray-900">
                                <X size={20}/>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-2">
                            {room.host && (
                                <div className="flex items-center gap-3 p-2 rounded-lg">
                                    <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-[11px] font-bold overflow-hidden shrink-0">
                                        {room.host.profile_picture ? (
                                            <img src={room.host.profile_picture} alt="" className="w-full h-full object-cover"/>
                                        ) : (
                                            (room.host.pseudo || room.host.username || "?").substring(0, 2).toUpperCase()
                                        )}
                                    </div>
                                    <span className="text-sm font-semibold truncate flex-1">{room.host.pseudo || room.host.username}</span>
                                    <span className="text-[11px] font-bold text-purple-400 bg-purple-500/15 px-2 py-0.5 rounded-full shrink-0">
                                        {t("room_host_badge", "Hôte")}
                                    </span>
                                </div>
                            )}
                            {participants.map((p) => (
                                <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg">
                                    <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-[11px] font-bold overflow-hidden shrink-0">
                                        {p.profile_picture ? (
                                            <img src={p.profile_picture} alt="" className="w-full h-full object-cover"/>
                                        ) : (
                                            (p.pseudo || p.username || "?").substring(0, 2).toUpperCase()
                                        )}
                                    </div>
                                    <span className="text-sm font-semibold truncate flex-1">{p.pseudo || p.username}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {showAddTrack && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                    onClick={() => setShowAddTrack(false)}
                >
                    <div
                        className="w-full max-w-md bg-panel dark:bg-panel border border-line dark:border-line rounded-2xl shadow-2xl p-6 max-h-[80vh] flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold">{t("room_add_track_title", "Ajouter un titre")}</h3>
                            <button onClick={() => setShowAddTrack(false)} className="text-slate-500 hover:text-white dark:hover:text-gray-900">
                                <X size={20}/>
                            </button>
                        </div>
                        <div className="flex items-center bg-canvas dark:bg-canvas rounded-lg px-3 py-2.5 border border-line dark:border-line mb-4">
                            <Search size={16} className="text-slate-500"/>
                            <input
                                type="text"
                                value={trackQuery}
                                onChange={(e) => handleTrackQueryChange(e.target.value)}
                                placeholder={t("room_track_search_placeholder", "Rechercher un titre sur Spotify...")}
                                className="bg-transparent outline-none w-full text-sm ml-2"
                                autoFocus
                            />
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-2">
                            {trackSearching ? (
                                <div className="flex justify-center py-6">
                                    <Loader2 className="animate-spin text-slate-500" size={24}/>
                                </div>
                            ) : trackResults.length === 0 ? (
                                <p className="text-slate-500 text-sm text-center py-6">
                                    {trackQuery.trim().length < 2
                                        ? t("room_track_search_hint", "Tape au moins 2 caractères pour chercher.")
                                        : t("no_result_found", "Aucun résultat trouvé")}
                                </p>
                            ) : (
                                trackResults.map((track) => (
                                    <button
                                        key={track.uri}
                                        onClick={() => handleAddTrack(track)}
                                        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-raised/60 dark:hover:bg-gray-100 transition-colors text-left"
                                    >
                                        <div className="w-10 h-10 rounded-lg bg-panel dark:bg-raised overflow-hidden flex items-center justify-center shrink-0">
                                            {track.albumArt ? (
                                                <img src={track.albumArt} alt="" className="w-full h-full object-cover"/>
                                            ) : (
                                                <Music2 size={16} className="text-slate-600"/>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold truncate">{track.name}</p>
                                            <p className="text-xs text-slate-500 truncate">{track.artist}</p>
                                        </div>
                                        <Plus size={16} className="text-purple-400 shrink-0"/>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RoomDetail;
