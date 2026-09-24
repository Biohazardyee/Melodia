import React, {useState, useEffect, useRef} from "react";
import {
    Edit2,
    Trash2,
    Plus,
    ArrowLeft,
    Loader2,
    MoreVertical,
    Users,
    UserPlus,
    X,
} from "lucide-react";
import {NavigateFunction, useNavigate} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {toast} from "react-toastify";
import apiClient from "../api/client";
import {useConfirm} from "../context/ConfirmContext";
import {jwtDecode} from "jwt-decode";
import {AxiosResponse} from "axios";
import CoverImage from "../components/CoverImage";

const ListCard: React.FC<any> = ({
                                     id,
                                     title,
                                     count,
                                     image,
                                     isOwner,
                                     isCollaborative,
                                     onClick,
                                     onEdit,
                                     onDelete,
                                 }) => {
    const {t} = useTranslation();
    return <article className="album-card">
        <button type="button" onClick={() => onClick(id)} aria-label={title} className="block w-full relative">
            <CoverImage src={image || ""} alt={title}/>
            {isCollaborative && <span title={t("playlist_collaborative")} className="absolute top-3 left-3 z-10 bg-black/60 p-2 rounded-lg text-white"><Users size={15}/></span>}
        </button>
        <div className="flex justify-between items-start gap-2 p-2 pt-4">
            <div className="min-w-0 flex-1">
                <h3><button onClick={() => onClick(id)} className="text-left font-semibold text-ink truncate w-full hover:text-accent">{title}</button></h3>
                <p className="text-muted text-xs mt-2">{count > 1 ? t("albums_count_plural", {count}) : t("albums_count", {count: count || 0})}</p>
            </div>
            {isOwner !== false && <div className="flex">
                <button onClick={() => onEdit(id)} aria-label={t("modify")} className="icon-button"><Edit2 size={16}/></button>
                <button onClick={() => onDelete(id)} aria-label={t("delete")} className="icon-button hover:text-rose-500"><Trash2 size={16}/></button>
            </div>}
        </div>
    </article>;
};

const LibraryPage: React.FC = () => {
    const navigate: NavigateFunction = useNavigate();
    const {t} = useTranslation();
    const confirm = useConfirm();
    const [playlists, setPlaylists] = useState<any[]>([]);
    const [selectedPlaylist, setSelectedPlaylist] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string>("");
    const [inviteUsername, setInviteUsername] = useState("");
    const [inviteLoading, setInviteLoading] = useState(false);
    const [inviteSuggestions, setInviteSuggestions] = useState<any[]>([]);
    const [showInviteSuggestions, setShowInviteSuggestions] = useState(false);
    const [inviteSearching, setInviteSearching] = useState(false);
    const inviteSearchTimeout = useRef<any>(null);

    useEffect((): void => {
        const fetchPlaylists = async (): Promise<void> => {
            try {
                setLoading(true);
                const token: string | null = localStorage.getItem("token");
                if (!token) throw new Error("Non authentifié");
                const decoded: any = jwtDecode(token);
                const userId: any = decoded.id || decoded.userId;
                setCurrentUserId(String(userId));
                const res: AxiosResponse = await apiClient.get(`/playlists/user/${userId}`);
                setPlaylists(res.data.playlists || []);
            } catch (e) {
                console.error("Erreur chargement playlists:", e);
            } finally {
                setLoading(false);
            }
        };
        fetchPlaylists();
    }, []);

    const fetchPlaylistDetails = async (id: string): Promise<void> => {
        setLoading(true);
        try {
            const res = await apiClient.get(`/playlists/${id}`);
            setSelectedPlaylist(res.data.playlist);
        } catch (e) {
            console.error("Erreur chargement détails playlist:", e);
            toast.error(t("alert_playlist_load_error", "Impossible de charger le contenu de la playlist."));
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string): Promise<void> => {
        const ok = await confirm({
            title: t("delete_playlist_title", "Supprimer la playlist"),
            message: t("delete_playlist_confirm"),
            confirmText: t("delete", "Supprimer"),
            danger: true,
        });
        if (!ok) return;
        try {
            await apiClient.delete(`/playlists/${id}`);
            setPlaylists((prev: any[]): any[] => prev.filter((p: any): boolean => p.id !== id));
            toast.success(t("playlist_delete_success", "Playlist supprimée."));
        } catch (e) {
            console.error("Erreur suppression:", e);
            toast.error(t("playlist_delete_error", "Impossible de supprimer la playlist."));
        }
    };

    const handleInviteUsernameChange = (value: string): void => {
        setInviteUsername(value);

        if (inviteSearchTimeout.current) clearTimeout(inviteSearchTimeout.current);

        if (value.trim().length < 2) {
            setInviteSuggestions([]);
            setShowInviteSuggestions(false);
            return;
        }

        setShowInviteSuggestions(true);
        inviteSearchTimeout.current = setTimeout(async (): Promise<void> => {
            try {
                setInviteSearching(true);
                const res: AxiosResponse = await apiClient.get(
                    `/users/search?q=${encodeURIComponent(value.trim())}`,
                );
                setInviteSuggestions(res.data.users || []);
            } catch (e) {
                console.error("Erreur recherche utilisateurs:", e);
            } finally {
                setInviteSearching(false);
            }
        }, 300);
    };

    const handleSelectInviteSuggestion = (username: string): void => {
        setInviteUsername(username);
        setShowInviteSuggestions(false);
        setInviteSuggestions([]);
    };

    const handleInviteCollaborator = async (): Promise<void> => {
        if (!inviteUsername.trim() || !selectedPlaylist) return;

        try {
            setInviteLoading(true);
            const res: AxiosResponse = await apiClient.post(
                `/playlists/${selectedPlaylist.id}/collaborators`,
                {username: inviteUsername.trim()},
            );
            setSelectedPlaylist((prev: any): any => ({
                ...prev,
                is_collaborative: true,
                collaborators: res.data.collaborators,
            }));
            setInviteUsername("");
            setInviteSuggestions([]);
            setShowInviteSuggestions(false);
            toast.success(t("collaborator_added_success", "Collaborateur ajouté !"));
        } catch (e: any) {
            console.error("Erreur invitation collaborateur:", e);
            toast.error(e.response?.data?.message || t("collaborator_added_error", "Impossible d'ajouter ce collaborateur."));
        } finally {
            setInviteLoading(false);
        }
    };

    const handleRemoveCollaborator = async (userId: string): Promise<void> => {
        if (!selectedPlaylist) return;
        const ok = await confirm({
            title: t("remove_collaborator_title", "Retirer le collaborateur"),
            message: t("remove_collaborator_confirm", "Voulez-vous vraiment retirer ce collaborateur ?"),
            confirmText: t("remove", "Retirer"),
            danger: true,
        });
        if (!ok) return;

        try {
            await apiClient.delete(`/playlists/${selectedPlaylist.id}/collaborators/${userId}`);
            setSelectedPlaylist((prev: any): any => {
                const remaining = prev.collaborators.filter((c: any): boolean => c.id !== userId);
                return {...prev, collaborators: remaining, is_collaborative: remaining.length > 0};
            });
            toast.success(t("collaborator_removed_success", "Collaborateur retiré."));
        } catch (e: any) {
            console.error("Erreur retrait collaborateur:", e);
            toast.error(t("collaborator_removed_error", "Impossible de retirer ce collaborateur."));
        }
    };

    const handleLeaveCollaboration = async (): Promise<void> => {
        if (!selectedPlaylist) return;
        const ok = await confirm({
            title: t("leave_playlist_title", "Quitter la playlist"),
            message: t("leave_playlist_confirm", "Voulez-vous vraiment quitter cette playlist collaborative ?"),
            confirmText: t("leave_playlist_btn", "Quitter"),
            danger: true,
        });
        if (!ok) return;

        try {
            await apiClient.delete(`/playlists/${selectedPlaylist.id}/collaborators/me`);
            setPlaylists((prev: any[]): any[] => prev.filter((p: any): boolean => p.id !== selectedPlaylist.id));
            setSelectedPlaylist(null);
            toast.success(t("leave_playlist_success", "Tu as quitté la playlist."));
        } catch (e: any) {
            console.error("Erreur pour quitter la playlist:", e);
            toast.error(t("leave_playlist_error", "Impossible de quitter cette playlist."));
        }
    };

    const removeItem = async (
        e: React.MouseEvent,
        playlistItemId: string,
        mediaTitle: string,
    ): Promise<void> => {
        e.stopPropagation();
        const ok = await confirm({
            title: t("remove_item_title", "Retirer de la playlist"),
            message: t("confirm_remove_item", {title: mediaTitle}),
            confirmText: t("remove", "Retirer"),
            danger: true,
        });
        if (!ok) return;
        try {
            await apiClient.delete(`/playlist-items/${playlistItemId}`);
            setSelectedPlaylist((prev: any): any => ({
                ...prev,
                items: prev.items.filter((i: any): boolean => i.id !== playlistItemId),
            }));
            toast.success(t("item_removed_success", "Élément retiré."));
        } catch (e) {
            console.error("Erreur suppression:", e);
            toast.error(t("alert_item_remove_error", "Impossible de retirer l'élément."));
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-canvas dark:bg-canvas text-ink transition-colors duration-300">
                <Loader2 className="animate-spin" size={48}/>
            </div>
        );
    }

    if (selectedPlaylist) {
        const currentAlbums = selectedPlaylist.items || [];
        const isOwner: boolean = selectedPlaylist.user_id === currentUserId;
        const collaborators: any[] = selectedPlaylist.collaborators || [];

        return (
            <div className="min-h-screen bg-canvas dark:bg-canvas p-6 md:p-10 text-ink font-sans transition-colors duration-300">
                <div className="max-w-7xl mx-auto space-y-8">
                    <button
                        onClick={() => setSelectedPlaylist(null)}
                        className="flex items-center gap-2 text-muted hover:text-white dark:hover:text-slate-900 transition-colors mb-4"
                    >
                        <ArrowLeft size={20}/> {t("back")}
                    </button>

                    <div className="flex flex-col md:flex-row gap-8 items-start">
                        <div className="w-48 h-48 md:w-56 md:h-56 bg-panel dark:bg-slate-200 rounded-2xl overflow-hidden shadow-2xl">
                            {selectedPlaylist.image_url ? (
                                <img
                                    src={selectedPlaylist.image_url}
                                    alt=""
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-600 dark:text-muted">
                                    {t("no_cover")}
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col gap-4 mt-2">
                            <h1 className="page-title text-4xl md:text-5xl font-bold text-ink tracking-tight">
                                {selectedPlaylist.name}
                            </h1>
                            <p className="text-slate-500 font-medium">
                                {currentAlbums.length > 1
                                    ? t("albums_count_plural", {count: currentAlbums.length})
                                    : t("albums_count", {count: currentAlbums.length})}
                            </p>

                            {!isOwner && selectedPlaylist.is_collaborative && (
                                <button
                                    onClick={handleLeaveCollaboration}
                                    className="self-start flex items-center gap-2 text-rose-500 hover:bg-rose-500/10 px-3 py-1.5 rounded-lg text-sm font-bold transition-all"
                                >
                                    <X size={14}/> {t("leave_playlist_btn", "Quitter")}
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="pt-6 border-t border-line dark:border-line space-y-4">
                        <h2 className="text-lg font-bold text-ink flex items-center gap-2">
                            <Users size={18}/> {t("playlist_collaborators_title", "Collaborateurs")}
                        </h2>

                        {collaborators.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {collaborators.map((c: any) => (
                                    <div
                                        key={c.id}
                                        className="flex items-center gap-2 bg-panel dark:bg-panel border border-line dark:border-line rounded-full pl-1 pr-3 py-1"
                                    >
                                        <div className="w-6 h-6 rounded-full bg-slate-700 dark:bg-slate-200 overflow-hidden flex items-center justify-center text-xs font-bold shrink-0">
                                            {c.profile_picture ? (
                                                <img src={c.profile_picture} alt="" className="w-full h-full object-cover"/>
                                            ) : (
                                                c.pseudo?.substring(0, 1).toUpperCase() || "?"
                                            )}
                                        </div>
                                        <span className="text-sm font-medium">{c.pseudo || c.username}</span>
                                        {isOwner && (
                                            <button
                                                onClick={() => handleRemoveCollaborator(c.id)}
                                                className="text-slate-500 hover:text-rose-500 transition-colors"
                                            >
                                                <X size={14}/>
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {isOwner && (
                            <div className="relative max-w-sm">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={inviteUsername}
                                        onChange={(e) => handleInviteUsernameChange(e.target.value)}
                                        onFocus={() => inviteSuggestions.length > 0 && setShowInviteSuggestions(true)}
                                        onBlur={() => setTimeout(() => setShowInviteSuggestions(false), 150)}
                                        placeholder={t("invite_collaborator_placeholder", "Nom d'utilisateur...")}
                                        autoComplete="off"
                                        className="flex-1 bg-panel dark:bg-panel border border-line dark:border-line rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 transition-colors"
                                    />
                                    <button
                                        onClick={handleInviteCollaborator}
                                        disabled={inviteLoading || !inviteUsername.trim()}
                                        className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-3 py-2 rounded-xl text-sm font-bold transition-all"
                                    >
                                        {inviteLoading ? <Loader2 className="animate-spin" size={16}/> : <UserPlus size={16}/>}
                                    </button>
                                </div>

                                {showInviteSuggestions && (
                                    <div className="absolute z-50 w-full mt-1 bg-panel dark:bg-panel border border-line dark:border-line rounded-xl overflow-hidden shadow-2xl max-h-60 overflow-y-auto">
                                        {inviteSearching ? (
                                            <div className="flex items-center justify-center p-3">
                                                <Loader2 className="animate-spin text-blue-500" size={18}/>
                                            </div>
                                        ) : inviteSuggestions.length > 0 ? (
                                            inviteSuggestions.map((u: any) => (
                                                <button
                                                    key={u.id}
                                                    type="button"
                                                    onClick={() => handleSelectInviteSuggestion(u.username)}
                                                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-raised dark:hover:bg-gray-100 transition-colors"
                                                >
                                                    <div className="w-7 h-7 rounded-full bg-slate-700 dark:bg-slate-200 overflow-hidden flex items-center justify-center text-xs font-bold shrink-0">
                                                        {u.profile_picture ? (
                                                            <img src={u.profile_picture} alt="" className="w-full h-full object-cover"/>
                                                        ) : (
                                                            u.pseudo?.substring(0, 1).toUpperCase() || "?"
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-bold text-ink truncate">{u.pseudo}</p>
                                                        <p className="text-xs text-slate-500 truncate">@{u.username}</p>
                                                    </div>
                                                </button>
                                            ))
                                        ) : (
                                            <div className="p-3 text-center text-sm text-slate-500">
                                                {t("no_users_found", "Aucun utilisateur trouvé")}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="mt-4 pt-8 border-t border-line dark:border-line">
                        <h2 className="text-2xl font-bold mb-6 text-ink">Albums</h2>
                        {currentAlbums.length > 0 ? (
                            <div
                                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-10 gap-y-12 max-w-262.5">
                                {currentAlbums.map((item: any) => (
                                    <div
                                        key={item.id}
                                        className="flex flex-col gap-3 group cursor-pointer relative"
                                        onClick={(): void | Promise<void> => navigate(`/album/${item.media_id}`)}
                                    >
                                        <button
                                            onClick={(e): Promise<void> =>
                                                removeItem(e, item.id, item.media?.title || "Album")
                                            }
                                            className="absolute top-2 right-2 z-20 bg-black/50 hover:bg-rose-500/80 backdrop-blur-md p-1.5 rounded-lg text-white transition-colors"
                                        >
                                            <MoreVertical size={16}/>
                                        </button>

                                        <div
                                            className="aspect-square bg-panel dark:bg-slate-200 rounded-2xl overflow-hidden shadow-lg relative">
                                            <img
                                                src={item.media?.cover || item.image}
                                                alt=""
                                                className="w-full h-full object-cover"
                                            />

                                            {item.media?.rating > 0 && (
                                                <div
                                                    className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg flex items-center gap-1">
                                                    <span className="text-yellow-400">★</span>
                                                    <span className="text-white text-xs font-bold">
                                                        {item.media.rating}
                                                      </span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="px-1">
                                            <h4 className="font-bold text-ink text-lg truncate">
                                                {item.media?.title || item.title}
                                            </h4>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-slate-500 font-medium py-12">
                                {t("no_albums_in_playlist")}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            className="min-h-screen bg-canvas dark:bg-canvas text-ink p-6 md:p-10 font-sans transition-colors duration-300">
            <div className="max-w-7xl mx-auto space-y-10">
                <header>
                    <h1 className="page-title text-4xl font-bold text-ink mb-2">
                        {t("my_playlists_title")}
                    </h1>
                </header>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="flex flex-col gap-3">
                        <button
                            onClick={(): void | Promise<void> => navigate("/create-playlist")}
                            className="aspect-square w-full bg-accent-soft border border-dashed border-accent/40 rounded-2xl flex flex-col items-center justify-center gap-4 transition-all shadow-lg hover:bg-raised dark:hover:bg-gray-50 group"
                        >
                            <Plus size={48} className="text-slate-300 dark:text-muted group-hover:scale-110 transition-transform" />
                            <span className="text-slate-300 dark:text-slate-700 font-bold text-lg">
                                {t("create_playlist_card")}
                            </span>
                        </button>
                    </div>

                    {playlists.map((list: any) => (
                        <ListCard
                            key={list.id}
                            id={list.id}
                            title={list.name}
                            count={list.items?.length || 0}
                            image={list.image_url}
                            isOwner={list.is_owner !== false}
                            isCollaborative={list.is_collaborative}
                            onClick={(id: string): Promise<void> => fetchPlaylistDetails(id)}
                            onEdit={(id: string): void | Promise<void> =>
                                navigate("/create-playlist", {
                                    state: playlists.find((p: any): boolean => p.id === id),
                                })
                            }
                            onDelete={handleDelete}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default LibraryPage;
