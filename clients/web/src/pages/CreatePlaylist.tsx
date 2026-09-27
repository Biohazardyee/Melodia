import {useState, useRef, useEffect, type ChangeEvent, type FormEvent} from "react";
import {ArrowLeft, Camera, Check, Globe2, ImagePlus, ListMusic, Loader2, LockKeyhole, Music2, Trash2} from "lucide-react";
import {useNavigate, useLocation} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {jwtDecode} from "jwt-decode";
import {toast} from "react-toastify";
import apiClient from "../api/client";
import {useGoBack} from "../hooks/useGoBack";
import {toImageDataUri} from "../utils/imageDataUri";

interface PlaylistRouteState {
    id?: string;
    title?: string;
    image?: string;
    returnTo?: string;
    albumToAdd?: {db_id?: string; id?: string; name?: string; artist?: string};
}

export default function CreatePlaylist() {
    const {t} = useTranslation();
    const navigate = useNavigate();
    const goBack = useGoBack("/library");
    const state = useLocation().state as PlaylistRouteState | null;
    const isEditing = !!state?.id;
    const [name, setName] = useState(state?.title || "");
    const [image, setImage] = useState<string | null>(state?.image || null);
    const [isPublic, setIsPublic] = useState(false);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(isEditing);
    const [loadError, setLoadError] = useState(false);
    const [revision, setRevision] = useState(0);
    const [readingImage, setReadingImage] = useState(false);
    const fileInput = useRef<HTMLInputElement>(null);
    const readerRef = useRef<FileReader | null>(null);
    const saveLock = useRef(false);
    const disabled = saving || loading || loadError || readingImage;
    const imageSrc = image?.startsWith("/") ? image : toImageDataUri(image);

    useEffect(() => {
        if (!state?.id) return;
        const controller = new AbortController();
        setLoading(true); setLoadError(false);
        apiClient.get(`/playlists/${state.id}`, {signal: controller.signal})
            .then(({data}) => {
                if (controller.signal.aborted) return;
                const playlist = data.playlist;
                setName(playlist.name); setImage(playlist.image_url || null);
                setIsPublic(playlist.is_public === true || playlist.is_public === "true");
            })
            .catch(() => {if (!controller.signal.aborted) setLoadError(true);})
            .finally(() => {if (!controller.signal.aborted) setLoading(false);});
        return () => controller.abort();
    }, [state?.id, revision]);

    useEffect(() => () => {readerRef.current?.abort();}, []);

    const changeImage = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type) || file.size > 5 * 1024 * 1024) {
            toast.error(t("playlist_editor_image_error")); return;
        }
        readerRef.current?.abort();
        const reader = new FileReader();
        readerRef.current = reader;
        setReadingImage(true);
        reader.onload = () => {setImage(reader.result as string); setReadingImage(false);};
        reader.onerror = () => {setReadingImage(false); toast.error(t("playlist_editor_image_error"));};
        reader.readAsDataURL(file);
    };

    const save = async (event: FormEvent) => {
        event.preventDefault();
        if (disabled || saveLock.current || !name.trim() || name.trim().length > 30) return;
        saveLock.current = true; setSaving(true);
        try {
            const token = localStorage.getItem("token");
            if (!token) {navigate("/login"); return;}
            const decoded = jwtDecode<{id?: string; userId?: string}>(token);
            const userId = decoded.id || decoded.userId;
            if (!userId) throw new Error("Missing user");
            const payload = {name: name.trim(), is_public: isPublic, image_url: image};
            let playlistId = state?.id;
            if (isEditing) await apiClient.put(`/playlists/${playlistId}`, payload);
            else {
                const {data} = await apiClient.post("/playlists", {...payload, user_id: userId});
                playlistId = data.playlist?.id || data.id;
            }
            if (state?.albumToAdd) {
                const mediaId = state.albumToAdd.db_id || state.albumToAdd.id;
                try {
                    if (!playlistId || !mediaId) throw new Error("Missing playlist or album");
                    await apiClient.post("/playlist-items", {playlist_id: playlistId, media_id: mediaId});
                } catch {toast.warn(t("playlist_editor_album_error"));}
            }
            toast.success(t(isEditing ? "playlist_update_success" : "playlist_create_success"));
            navigate(state?.returnTo || "/library");
        } catch {toast.error(t("playlist_editor_save_error"));}
        finally {saveLock.current = false; setSaving(false);}
    };

    return <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 sm:py-12 text-ink">
        <button type="button" onClick={goBack} disabled={saving} className="inline-flex items-center gap-2 text-sm text-muted hover:text-ink transition-colors mb-7"><ArrowLeft size={17}/>{t("back")}</button>
        <header className="mb-8">
            <p className="flex items-center gap-2 text-accent text-[11px] font-semibold tracking-[0.18em] uppercase mb-3"><ListMusic size={15}/>{t("playlist_editor_eyebrow")}</p>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{t(isEditing ? "edit_playlist" : "new_playlist")}</h1>
            <p className="text-muted text-sm leading-relaxed mt-3 max-w-lg">{t("playlist_editor_intro")}</p>
        </header>

        {loadError && <div role="alert" className="mb-6 rounded-2xl border border-line bg-panel p-5 flex flex-wrap gap-3 items-center justify-between"><p className="text-sm">{t("playlist_editor_load_error")}</p><button className="secondary-action" onClick={() => setRevision(value => value + 1)}>{t("inbox_retry")}</button></div>}
        {loading ? <div role="status" aria-label={t("loading")} className="grid md:grid-cols-[280px_1fr] gap-8 rounded-3xl border border-line bg-panel p-6 sm:p-8"><div className="skeleton aspect-square rounded-2xl"/><div className="space-y-6"><div className="skeleton h-12 rounded-xl"/><div className="skeleton h-36 rounded-xl"/><div className="skeleton h-12 rounded-xl"/></div></div> :
            <form onSubmit={save} className="rounded-3xl border border-line bg-panel overflow-hidden">
                <div className="grid md:grid-cols-[260px_1fr] lg:grid-cols-[280px_1fr] gap-8 lg:gap-12 p-6 sm:p-8">
                    <aside className="min-w-0">
                        <button type="button" onClick={() => fileInput.current?.click()} disabled={disabled} aria-label={t("add_cover")} className="group relative block aspect-square w-full max-w-[280px] mx-auto rounded-2xl overflow-hidden border border-line bg-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">
                            {imageSrc ? <img src={imageSrc} alt={t("playlist_editor_cover")} className="h-full w-full object-cover"/> : <div className="absolute inset-0 flex flex-col items-center justify-center bg-accent-soft text-accent">
                                <div aria-hidden="true" className="relative w-32 h-32 rounded-full border border-accent/20 flex items-center justify-center mb-6"><div className="absolute inset-3 rounded-full border border-accent/15"/><div className="absolute inset-6 rounded-full border border-accent/15"/><div className="w-12 h-12 rounded-full bg-panel border border-accent/20 flex items-center justify-center"><Music2 size={22}/></div></div>
                                <span className="flex items-center gap-2 text-sm font-medium"><ImagePlus size={16}/>{t("add_cover")}</span>
                            </div>}
                            {imageSrc && <span className="absolute bottom-3 right-3 bg-black/60 text-white backdrop-blur-sm p-2 rounded-xl"><Camera size={17}/></span>}
                            {readingImage && <span role="status" aria-label={t("loading")} className="absolute inset-0 bg-panel/80 flex items-center justify-center"><Loader2 className="animate-spin text-accent"/></span>}
                        </button>
                        <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={changeImage} disabled={disabled} className="hidden"/>
                        <p className="text-xs text-muted text-center leading-relaxed mt-4">{t("playlist_editor_image_hint")}</p>
                        {image && <button type="button" disabled={disabled} onClick={() => setImage(null)} className="flex items-center gap-1.5 text-xs text-muted hover:text-rose-500 mx-auto mt-3 py-1"><Trash2 size={14}/>{t("playlist_editor_remove_cover")}</button>}
                    </aside>

                    <div className="min-w-0 space-y-7">
                        <div>
                            <div className="flex items-center justify-between gap-3 mb-2.5"><label htmlFor="playlist-name" className="text-sm font-semibold">{t("label_playlist_name")}</label><span className="text-xs text-muted tabular-nums">{name.length}/30</span></div>
                            <input id="playlist-name" type="text" required maxLength={30} value={name} onChange={event => setName(event.target.value)} disabled={disabled} placeholder={t("playlist_name_placeholder")} autoComplete="off" className="w-full rounded-xl bg-canvas border border-line text-ink placeholder:text-muted px-4 py-3.5 text-base focus:border-accent transition-colors"/>
                            <p className="text-xs text-muted mt-2.5">{t("playlist_editor_name_hint")}</p>
                        </div>

                        <fieldset disabled={disabled}>
                            <legend className="text-sm font-semibold mb-3">{t("playlist_editor_visibility")}</legend>
                            <div className="space-y-3">{[false, true].map(visibility => {
                                const Icon = visibility ? Globe2 : LockKeyhole;
                                const selected = isPublic === visibility;
                                return <label key={String(visibility)} className={`relative flex items-center gap-3 rounded-2xl border p-4 cursor-pointer transition-colors ${selected ? "border-accent/50 bg-accent-soft" : "border-line hover:bg-raised"} ${disabled ? "opacity-50 pointer-events-none" : ""}`}>
                                    <input type="radio" name="playlist-visibility" value={String(visibility)} checked={selected} onChange={() => setIsPublic(visibility)} className="peer sr-only"/>
                                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${selected ? "bg-panel text-accent" : "bg-raised text-muted"}`}><Icon size={18}/></span>
                                    <span className="flex-1 min-w-0"><span className="block text-sm font-semibold">{t(visibility ? "playlist_public" : "playlist_private")}</span><span className="block text-xs text-muted leading-relaxed mt-1">{t(visibility ? "playlist_public_desc" : "playlist_private_desc")}</span></span>
                                    <span aria-hidden="true" className={`flex items-center justify-center h-5 w-5 shrink-0 rounded-full border peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-accent ${selected ? "bg-accent text-panel border-accent" : "border-line"}`}>{selected && <Check size={12}/>}</span>
                                </label>;
                            })}</div>
                        </fieldset>

                        {state?.albumToAdd && <div className="flex items-start gap-3 rounded-xl bg-raised px-4 py-3"><Music2 size={18} className="text-accent shrink-0 mt-0.5"/><div className="min-w-0"><p className="text-xs text-muted">{t("playlist_editor_first_album")}</p><p className="text-sm font-medium break-words mt-1">{state.albumToAdd.name || t("album")}{state.albumToAdd.artist && ` · ${state.albumToAdd.artist}`}</p></div></div>}
                    </div>
                </div>
                <footer className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 border-t border-line bg-canvas/40 px-6 sm:px-8 py-5">
                    <button type="button" disabled={saving} onClick={goBack} className="secondary-action justify-center">{t("cancel")}</button>
                    <button type="submit" disabled={disabled || !name.trim() || name.length > 30} className="primary-action justify-center disabled:opacity-40">{saving ? <Loader2 size={17} className="animate-spin"/> : <ListMusic size={17}/>}<span>{saving ? t("loading") : t(isEditing ? "save_changes_btn" : "create_playlist_btn")}</span></button>
                </footer>
            </form>}
    </div>;
}
