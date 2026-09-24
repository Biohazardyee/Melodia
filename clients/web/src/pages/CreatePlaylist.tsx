import React, { useState, useRef, useEffect } from "react";
import { Camera, X, Trash2, Loader2, Eye, EyeOff } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { jwtDecode } from "jwt-decode";
import { toast } from "react-toastify";
import apiClient from "../api/client";
import { useGoBack } from "../hooks/useGoBack";

const CreatePlaylist: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const goBack = useGoBack("/library");
  const location = useLocation();

  const state = location.state as any;
  const isEditing = !!state?.id;
  const albumToAdd = state?.albumToAdd;
  const returnTo = state?.returnTo;

  const [name, setName] = useState(state?.title || "");
  const [image, setImage] = useState<string | null>(state?.image || null);
  const [loading, setLoading] = useState(false);
  const [isPublic, setIsPublic] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect((): void => {
    if (isEditing) {
      const fetchPlaylist = async (): Promise<void> => {
        try {
          const res = await apiClient.get(`/playlists/${state.id}`);
          const pl = res.data.playlist;
          setName(pl.name);
          setImage(pl.image_url);
          setIsPublic(pl.is_public);
        } catch (err) {
          console.error("Erreur chargement playlist:", err);
        }
      };
      fetchPlaylist();
    }
  }, [isEditing, state?.id]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file: File | undefined = e.target.files?.[0];
    if (file) {
      const reader: FileReader = new FileReader();
      reader.onloadend = (): void => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (): Promise<void> => {
    if (!name.trim()) return;
    setLoading(true);

    try {
      const token: string | null = localStorage.getItem("token");
      if (!token) throw new Error("Non authentifié");
      const decoded: any = jwtDecode(token);
      const userId = decoded.id || decoded.userId;

      console.log("Album à ajouter:", albumToAdd);
      const mediaId = albumToAdd?.db_id || albumToAdd?.id;
      console.log("Media ID détecté:", mediaId);

      let newPlaylistId = state?.id;

      if (isEditing) {
        await apiClient.put(`/playlists/${state.id}`, {
          name: name.trim(),
          is_public: isPublic,
          image_url: image,
        });
      } else {
        const playlistPayload = {
          name: name.trim(),
          user_id: userId,
          is_public: isPublic,
          image_url: image,
        };
        const res = await apiClient.post("/playlists", playlistPayload);
        newPlaylistId = res.data.playlist?.id || res.data.id;
      }

      if (albumToAdd && newPlaylistId) {
        if (!mediaId) {
          console.error(
              "Impossible d'ajouter l'album : Aucun ID trouvé pour cet album.",
          );
          toast.warn(
              "La playlist a été créée, mais l'album n'a pas pu être ajouté (ID manquant).",
          );
        } else {
          try {
            await apiClient.post("/playlist-items", {
              playlist_id: newPlaylistId,
              media_id: mediaId,
            });
          } catch (err: any) {
            console.error("Erreur API playlist-items:", err.response?.data);
            toast.warn(
                "Playlist créée, mais erreur lors de l'ajout de l'album : " +
                (err.response?.data?.message || "Erreur serveur"),
            );
          }
        }
      }

      toast.success(
          isEditing
              ? t("playlist_update_success", "Playlist mise à jour !")
              : t("playlist_create_success", "Playlist créée avec succès !")
      );

      if (returnTo) navigate(returnTo);
      else navigate("/library");
    } catch (e: any) {
      console.error("Erreur sauvegarde:", e);
      toast.error(e.response?.data?.message || "Erreur lors de l'enregistrement.");
    } finally {
      setLoading(false);
    }
  };

  return (
      <div className="min-h-screen bg-slate-950 dark:bg-canvas text-slate-50 dark:text-slate-900 flex flex-col font-sans transition-colors duration-300">
        <div className="flex justify-between items-center p-6 border-b border-line dark:border-line">
          <button
              onClick={goBack}
              className="p-2 hover:bg-raised dark:hover:bg-slate-200 rounded-full transition-colors text-slate-50 dark:text-slate-700"
          >
            <X size={28} />
          </button>
          <h1 className="page-title text-lg font-bold">
            {isEditing ? t("edit_playlist") : t("new_playlist")}
          </h1>
          <div className="w-12"></div>
        </div>

        <div className="flex flex-col items-center grow pt-16 px-6">
          <div
              className="w-56 h-56 bg-panel dark:bg-panel border-2 border-line dark:border-slate-3300 border-dashed rounded-xl overflow-hidden flex flex-col justify-center items-center cursor-pointer mb-12 shadow-lg hover:border-line dark:hover:border-slate-400 transition-colors"
              onClick={() => fileInputRef.current?.click()}
          >
            {image ? (
                <div className="relative w-full h-full group">
                  <img
                      src={image}
                      alt="Cover"
                      className="w-full h-full object-cover"
                  />
                  <button
                      onClick={(e): void => {
                        e.stopPropagation();
                        setImage(null);
                      }}
                      className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/50 transition-opacity"
                  >
                    <Trash2 size={32} className="text-white" />
                  </button>
                </div>
            ) : (
                <div className="flex flex-col items-center">
                  <Camera size={48} className="text-slate-500 mb-3" />
                  <span className="text-muted dark:text-muted font-medium">
                {t("add_cover")}
              </span>
                </div>
            )}
          </div>

          <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageChange}
              accept="image/*"
              className="hidden"
          />

          <input
              type="text"
              placeholder={t("playlist_name_placeholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full max-w-md bg-transparent border-b-2 border-line dark:border-line focus:border-blue-500 dark:focus:border-blue-500 text-ink text-3xl text-center py-3 mb-8 outline-none font-bold transition-colors"
          />

          <button
              type="button"
              onClick={() => setIsPublic((prev: boolean) => !prev)}
              className="w-full max-w-md flex justify-between items-center bg-panel dark:bg-panel border border-line dark:border-line hover:border-line dark:hover:border-slate-300 rounded-xl px-5 py-4 mb-12 transition-all shadow-md group select-none text-left"
          >
            <div className="flex flex-col">
            <span className="font-bold text-ink text-base">
              {isPublic
                  ? t("playlist_public", "Playlist publique")
                  : t("playlist_private", "Playlist privée")}
            </span>
              <span className="text-xs text-muted dark:text-muted mt-0.5">
              {isPublic
                  ? t("playlist_public_desc", "Visible par tous les utilisateurs")
                  : t("playlist_private_desc", "Visible uniquement par vous")}
            </span>
            </div>

            <div className="flex items-center gap-3">
              {isPublic ? (
                  <Eye size={22} className="text-blue-500" />
              ) : (
                  <EyeOff size={22} className="text-slate-500" />
              )}

              <div
                  className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors duration-300 ${isPublic ? "bg-blue-600" : "bg-slate-700 dark:bg-slate-200"}`}
              >
                <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${isPublic ? "translate-x-4" : "translate-x-0"}`}
                ></div>
              </div>
            </div>
          </button>

          <button
              onClick={handleSave}
              disabled={!name.trim() || loading}
              className={`px-10 py-4 rounded-full font-bold text-lg transition-all shadow-lg ${
                  name.trim()
                      ? "bg-blue-600 hover:bg-blue-500 text-white"
                      : "bg-raised dark:bg-slate-200 text-slate-500 dark:text-muted cursor-not-allowed"
              }`}
          >
            {loading ? (
                <Loader2 className="animate-spin" />
            ) : isEditing ? (
                t("save_changes_btn")
            ) : (
                t("create_playlist_btn")
            )}
          </button>
        </div>
      </div>
  );
};

export default CreatePlaylist;
