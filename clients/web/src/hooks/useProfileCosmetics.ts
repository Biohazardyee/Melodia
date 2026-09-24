import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import apiClient from "../api/client";

export function useProfileCosmetics(setUserProfil: React.Dispatch<React.SetStateAction<any>>) {
    const { t } = useTranslation();

    const [showCosmetics, setShowCosmetics] = useState<boolean>(false);

    const [cosmeticNames, setCosmeticNames] = useState<Record<string, string>>({});

    const cosmeticLabel = (id: string): string => t(`cosmetic_item_${id}`, cosmeticNames[id] || id);

    const [equipping, setEquipping] = useState<string | null>(null);

    const openCosmetics = async (): Promise<void> => {
        setShowCosmetics(true);
        try {
            const res = await apiClient.get("/users/cosmetics/catalog");
            const map: Record<string, string> = {};
            (res.data.catalog || []).forEach((c: any) => {
                map[c.id] = c.name;
            });
            setCosmeticNames(map);
        } catch (e) {
            console.error("Erreur chargement catalogue cosmétiques:", e);
        }
    };

    const equipBorder = async (cosmeticId: string | null): Promise<void> => {
        setEquipping(cosmeticId || "none-border");
        try {
            const res = await apiClient.post("/users/cosmetics/equip", {
                cosmetic_id: cosmeticId,
                slot: "avatar_border",
            });
            setUserProfil((prev: any) => ({
                ...prev,
                equipped_avatar_border: res.data.equipped_avatar_border,
            }));
            window.dispatchEvent(new Event("profileUpdated"));
            toast.success(
                cosmeticId
                    ? t("cosmetic_equipped", "Contour équipé !")
                    : t("cosmetic_unequipped", "Contour retiré."),
            );
        } catch (e: any) {
            toast.error(e.response?.data?.message || t("cosmetic_equip_error", "Action impossible."));
        } finally {
            setEquipping(null);
        }
    };

    const equipFont = async (cosmeticId: string | null): Promise<void> => {
        setEquipping(cosmeticId || "none-font");
        try {
            const res = await apiClient.post("/users/cosmetics/equip", {
                cosmetic_id: cosmeticId,
                slot: "font",
            });
            setUserProfil((prev: any) => ({
                ...prev,
                equipped_font: res.data.equipped_font,
            }));
            toast.success(
                cosmeticId
                    ? t("font_equipped", "Police équipée !")
                    : t("font_unequipped", "Police retirée."),
            );
        } catch (e: any) {
            toast.error(e.response?.data?.message || t("cosmetic_equip_error", "Action impossible."));
        } finally {
            setEquipping(null);
        }
    };

    const equipTitle = async (cosmeticId: string | null): Promise<void> => {
        setEquipping(cosmeticId || "none-title");
        try {
            const res = await apiClient.post("/users/cosmetics/equip", {
                cosmetic_id: cosmeticId,
                slot: "title",
            });
            setUserProfil((prev: any) => ({
                ...prev,
                equipped_title: res.data.equipped_title,
            }));
            window.dispatchEvent(new Event("profileUpdated"));
            toast.success(
                cosmeticId
                    ? t("title_equipped", "Titre équipé !")
                    : t("title_unequipped", "Titre retiré."),
            );
        } catch (e: any) {
            toast.error(e.response?.data?.message || t("cosmetic_equip_error", "Action impossible."));
        } finally {
            setEquipping(null);
        }
    };

    const equipTextEffect = async (cosmeticId: string | null): Promise<void> => {
        setEquipping(cosmeticId || "none-text_effect");
        try {
            const res = await apiClient.post("/users/cosmetics/equip", {
                cosmetic_id: cosmeticId,
                slot: "text_effect",
            });
            setUserProfil((prev: any) => ({
                ...prev,
                equipped_text_effect: res.data.equipped_text_effect,
            }));
            window.dispatchEvent(new Event("profileUpdated"));
            toast.success(
                cosmeticId
                    ? t("text_effect_equipped", "Effet équipé !")
                    : t("text_effect_unequipped", "Effet retiré."),
            );
        } catch (e: any) {
            toast.error(e.response?.data?.message || t("cosmetic_equip_error", "Action impossible."));
        } finally {
            setEquipping(null);
        }
    };

    const equipBanner = async (cosmeticId: string | null): Promise<void> => {
        setEquipping(cosmeticId || "none-banner");
        try {
            const res = await apiClient.post("/users/cosmetics/equip", {
                cosmetic_id: cosmeticId,
                slot: "banner",
            });
            setUserProfil((prev: any) => ({
                ...prev,
                equipped_banner: res.data.equipped_banner,
            }));
            window.dispatchEvent(new Event("profileUpdated"));
            toast.success(
                cosmeticId
                    ? t("banner_equipped", "Bannière équipée !")
                    : t("banner_unequipped", "Bannière retirée."),
            );
        } catch (e: any) {
            toast.error(e.response?.data?.message || t("cosmetic_equip_error", "Action impossible."));
        } finally {
            setEquipping(null);
        }
    };

    const equipPattern = async (cosmeticId: string | null): Promise<void> => {
        setEquipping(cosmeticId || "none-pattern");
        try {
            const res = await apiClient.post("/users/cosmetics/equip", {
                cosmetic_id: cosmeticId,
                slot: "pattern",
            });
            setUserProfil((prev: any) => ({
                ...prev,
                equipped_pattern: res.data.equipped_pattern,
            }));
            window.dispatchEvent(new Event("profileUpdated"));
            toast.success(
                cosmeticId
                    ? t("pattern_equipped", "Motif équipé !")
                    : t("pattern_unequipped", "Motif retiré."),
            );
        } catch (e: any) {
            toast.error(e.response?.data?.message || t("cosmetic_equip_error", "Action impossible."));
        } finally {
            setEquipping(null);
        }
    };
    return { showCosmetics, setShowCosmetics, cosmeticLabel, equipping, openCosmetics, equipBorder, equipFont, equipTitle, equipTextEffect, equipBanner, equipPattern };
}
