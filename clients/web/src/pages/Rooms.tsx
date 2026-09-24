import React, {useEffect, useState} from "react";
import {useNavigate} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {toast} from "react-toastify";
import {Radio, Plus, Users, Loader2, Music2, Link2, Lock} from "lucide-react";
import apiClient from "../api/client";
import {AxiosResponse} from "axios";
import {useConfirm} from "../context/ConfirmContext";

type SpotifyStatus = {
    connected: boolean;
    product?: string | null;
    needs_relink?: boolean;
};

type RoomSummary = {
    id: string;
    name: string;
    is_public: boolean;
    is_host?: boolean;
    participant_count?: number;
    current_track_name: string | null;
    is_playing: boolean;
};

const RoomCard: React.FC<{ room: RoomSummary; onClick: () => void }> = ({room, onClick}) => {
    const {t} = useTranslation();
    return (
        <button type="button"
            onClick={onClick}
            className="w-full text-left bg-panel border border-line rounded-2xl p-6 cursor-pointer hover:border-accent hover:-translate-y-1 transition-all"
        >
            <div className="flex items-center justify-between mb-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${room.is_playing ? "bg-emerald-500/15 text-emerald-400" : "bg-raised dark:bg-raised text-muted"}`}>
                    <Music2 size={18}/>
                </div>
                <div className="flex items-center gap-2">
                    {!room.is_public && <Lock size={14} className="text-slate-500"/>}
                    {room.is_playing && (
                        <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>
                            {t("rooms_live", "EN DIRECT")}
                        </span>
                    )}
                </div>
            </div>
            <h3 className="font-bold text-lg mb-1 truncate">{room.name}</h3>
            <p className="text-muted dark:text-muted text-sm truncate mb-2">
                {room.current_track_name || t("rooms_nothing_playing", "Rien en cours de lecture")}
            </p>
            <p className="text-slate-500 text-xs flex items-center gap-1.5">
                <Users size={13}/>
                {t("rooms_participant_count", "{{count}} participant(s)", {count: room.participant_count ?? 1})}
            </p>
        </button>
    );
};

const Rooms: React.FC = () => {
    const {t} = useTranslation();
    const navigate = useNavigate();
    const confirm = useConfirm();
    const [status, setStatus] = useState<SpotifyStatus | null>(null);
    const [rooms, setRooms] = useState<RoomSummary[]>([]);
    const [myRooms, setMyRooms] = useState<RoomSummary[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [showCreate, setShowCreate] = useState<boolean>(false);
    const [newRoomName, setNewRoomName] = useState<string>("");
    const [newRoomPublic, setNewRoomPublic] = useState<boolean>(true);
    const [newRoomPassword, setNewRoomPassword] = useState<string>("");
    const [creating, setCreating] = useState<boolean>(false);

    useEffect((): void => {
        const load = async (): Promise<void> => {
            try {
                const [statusRes, roomsRes, myRoomsRes]: AxiosResponse[] = await Promise.all([
                    apiClient.get("/api/spotify/status"),
                    apiClient.get("/rooms"),
                    apiClient.get("/rooms/mine"),
                ]);
                setStatus(statusRes.data);
                setRooms(roomsRes.data.rooms || []);
                setMyRooms(myRoomsRes.data.rooms || []);
            } catch (e) {
                console.error("Erreur chargement salons:", e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const myRoomIds = new Set(myRooms.map((r) => r.id));
    const otherPublicRooms = rooms.filter((r) => !myRoomIds.has(r.id));
    const hostedRoom: RoomSummary | undefined = myRooms.find((r) => r.is_host);

    const eligible: boolean = !!status?.connected && status?.product === "premium" && !status?.needs_relink;

    const handleConnectSpotify = (): void => {
        const token: string | null = localStorage.getItem("token");
        if (!token) {
            toast.error(t("must_be_logged_in", "Vous devez être connecté."));
            return;
        }
        const apiUrl: string = import.meta.env.VITE_API_URL;
        window.location.href = `${apiUrl}/api/spotify/connect?token=${encodeURIComponent(token)}`;
    };

    const handleCreate = async (): Promise<void> => {
        if (!newRoomName.trim()) return;
        if (!newRoomPublic && !newRoomPassword.trim()) return;
        setCreating(true);
        try {
            const res: AxiosResponse = await apiClient.post("/rooms", {
                name: newRoomName.trim(),
                is_public: newRoomPublic,
                ...(newRoomPublic ? {} : {password: newRoomPassword.trim()}),
            });
            navigate(`/rooms/${res.data.room.id}`);
        } catch (e: any) {
            toast.error(e.response?.data?.message || t("room_create_error", "Impossible de créer le salon."));
        } finally {
            setCreating(false);
        }
    };

    const handleJoinRequest = async (room: RoomSummary): Promise<void> => {
        const ok = await confirm({
            title: t("rooms_join_confirm_title", "Rejoindre le salon"),
            message: t("rooms_join_confirm_message", 'Rejoindre "{{name}}" ?', {name: room.name}),
            confirmText: t("room_password_submit_btn", "Rejoindre"),
        });
        if (!ok) return;
        navigate(`/rooms/${room.id}`);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-canvas dark:bg-canvas text-ink transition-colors duration-300">
                <Loader2 className="animate-spin" size={48}/>
            </div>
        );
    }

    if (!eligible) {
        const gateMessage: string = !status?.connected
            ? t("rooms_gate_not_connected", "Lie ton compte Spotify Premium pour créer ou rejoindre un salon d'écoute synchronisé.")
            : status?.product !== "premium"
                ? t("rooms_gate_not_premium", "Les Salons d'écoute nécessitent un compte Spotify Premium.")
                : t("rooms_gate_needs_relink", "Reconnecte ton compte Spotify pour activer les Salons d'écoute.");

        return (
            <div className="min-h-screen bg-canvas dark:bg-canvas text-ink p-6 md:p-10 flex items-center justify-center transition-colors duration-300">
                <div className="max-w-md text-center bg-panel dark:bg-panel border border-line dark:border-line rounded-2xl p-8">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-5">
                        <Radio size={28} className="text-emerald-500"/>
                    </div>
                    <h1 className="page-title text-2xl font-bold mb-2">{t("rooms_title", "Salons d'écoute")}</h1>
                    <p className="text-muted dark:text-muted text-sm mb-6">{gateMessage}</p>
                    <button
                        onClick={handleConnectSpotify}
                        className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                    >
                        <Link2 size={16}/>
                        {!status?.connected ? t("btn_link", "Lier") : t("rooms_reconnect_btn", "Reconnecter")}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-canvas dark:bg-canvas text-ink p-6 md:p-10 transition-colors duration-300">
            <div className="max-w-6xl mx-auto">
                <div className="page-heading flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">
                    <div>
                        <h1 className="page-title text-4xl font-bold mb-2">{t("rooms_title", "Salons d'écoute")}</h1>
                        <p className="text-muted dark:text-muted text-lg">
                            {t("rooms_subtitle", "Écoutez Spotify en direct et en synchro avec d'autres utilisateurs")}
                        </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                        <button
                            onClick={() => setShowCreate(true)}
                            disabled={!!hostedRoom}
                            title={hostedRoom ? t("rooms_already_hosting_tooltip", "Ferme ton salon actuel pour en créer un nouveau") : undefined}
                            className="primary-action text-sm"
                        >
                            <Plus size={18}/>
                            {t("rooms_create_btn", "Créer un salon")}
                        </button>
                        {hostedRoom && (
                            <button
                                onClick={() => navigate(`/rooms/${hostedRoom.id}`)}
                                className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                            >
                                {t("rooms_already_hosting_link", 'Tu héberges déjà "{{name}}" →', {name: hostedRoom.name})}
                            </button>
                        )}
                    </div>
                </div>

                {myRooms.length > 0 && (
                    <div className="mb-10">
                        <h2 className="text-lg font-bold mb-4 text-ink">
                            {t("rooms_mine_title", "Mes salons")}
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {myRooms.map((room) => (
                                <RoomCard key={room.id} room={room} onClick={() => navigate(`/rooms/${room.id}`)}/>
                            ))}
                        </div>
                    </div>
                )}

                {myRooms.length > 0 && (
                    <h2 className="text-lg font-bold mb-4 text-ink">
                        {t("rooms_public_title", "Salons publics")}
                    </h2>
                )}

                {otherPublicRooms.length === 0 ? (
                    <p className="empty-state">
                        {myRooms.length > 0
                            ? t("rooms_public_empty", "Aucun autre salon public pour le moment.")
                            : t("rooms_empty", "Aucun salon public pour le moment. Sois le premier à en créer un !")}
                    </p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {otherPublicRooms.map((room) => (
                            <RoomCard key={room.id} room={room} onClick={() => handleJoinRequest(room)}/>
                        ))}
                    </div>
                )}
            </div>

            {showCreate && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                    onClick={() => setShowCreate(false)}
                >
                    <div
                        className="w-full max-w-sm bg-panel dark:bg-panel border border-line dark:border-line rounded-2xl shadow-2xl p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-lg font-bold mb-4">{t("rooms_create_title", "Nouveau salon")}</h3>
                        <input
                            type="text"
                            value={newRoomName}
                            onChange={(e) => setNewRoomName(e.target.value)}
                            placeholder={t("rooms_name_placeholder", "Nom du salon")}
                            maxLength={50}
                            className="w-full bg-canvas dark:bg-canvas border border-line dark:border-line rounded-lg px-4 py-2.5 text-sm outline-none focus:border-purple-500 transition-colors mb-4"
                        />
                        <label className="flex items-center gap-2 text-sm text-slate-300 dark:text-gray-700 mb-4 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={newRoomPublic}
                                onChange={(e) => setNewRoomPublic(e.target.checked)}
                                className="rounded"
                            />
                            {t("rooms_public_label", "Salon public (visible par tous)")}
                        </label>
                        {!newRoomPublic && (
                            <div className="mb-6">
                                <div className="flex items-center bg-canvas dark:bg-canvas border border-line dark:border-line rounded-lg px-3 py-2.5 focus-within:border-purple-500 transition-colors">
                                    <Lock size={15} className="text-slate-500 shrink-0"/>
                                    <input
                                        type="password"
                                        value={newRoomPassword}
                                        onChange={(e) => setNewRoomPassword(e.target.value)}
                                        placeholder={t("rooms_password_placeholder", "Mot de passe du salon")}
                                        maxLength={50}
                                        className="bg-transparent outline-none w-full text-sm ml-2"
                                    />
                                </div>
                                <p className="text-xs text-slate-500 mt-2">
                                    {t("rooms_password_hint", "Requis pour rejoindre ce salon privé.")}
                                </p>
                            </div>
                        )}
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowCreate(false)}
                                className="flex-1 py-2.5 rounded-xl font-semibold text-sm bg-raised dark:bg-raised text-slate-200 dark:text-gray-700 hover:bg-slate-700 dark:hover:bg-gray-200 transition-colors"
                            >
                                {t("cancel", "Annuler")}
                            </button>
                            <button
                                onClick={handleCreate}
                                disabled={creating || !newRoomName.trim() || (!newRoomPublic && !newRoomPassword.trim())}
                                className="flex-1 py-2.5 rounded-xl font-semibold text-sm bg-purple-600 hover:bg-purple-500 text-white transition-colors disabled:opacity-40"
                            >
                                {creating ? "…" : t("rooms_create_confirm", "Créer")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Rooms;
