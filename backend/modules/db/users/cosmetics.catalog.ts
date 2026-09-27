export interface CosmeticItem {
    id: string;
    name: string;
    price: number;
    type: "avatar_border" | "theme" | "font" | "title" | "text_effect" | "banner" | "pattern";
}

/**
 * Catalogue des cosmétiques achetables avec les points boutique.
 * Source de vérité pour les prix (le front mappe l'id vers le rendu visuel).
 */
export const COSMETICS: CosmeticItem[] = [
    {id: "border_aurora", name: "Aurore", price: 150, type: "avatar_border"},
    {id: "border_gold", name: "Or royal", price: 250, type: "avatar_border"},
    {id: "border_neon", name: "Néon", price: 200, type: "avatar_border"},
    {id: "border_fire", name: "Brasier", price: 300, type: "avatar_border"},
    {id: "border_emerald", name: "Émeraude", price: 180, type: "avatar_border"},
    {id: "border_ice", name: "Glace", price: 220, type: "avatar_border"},
    {id: "border_flame", name: "Flammes", price: 600, type: "avatar_border"},
    {id: "border_galaxy", name: "Galaxie", price: 350, type: "avatar_border"},
    {id: "border_toxic", name: "Toxique", price: 200, type: "avatar_border"},
    {id: "theme_crimson", name: "Thème Cramoisi", price: 500, type: "theme"},
    {id: "theme_cyan", name: "Thème Givre", price: 500, type: "theme"},
    {id: "theme_amber", name: "Thème Ambre", price: 500, type: "theme"},
    {id: "font_michroma", name: "Police Michroma", price: 90, type: "font"},
    {id: "font_pixel", name: "Police Pixel", price: 90, type: "font"},
    {id: "font_bebas", name: "Police Bebas", price: 110, type: "font"},
    {id: "font_cinzel", name: "Police Cinzel", price: 130, type: "font"},
    {id: "font_pacifico", name: "Police Pacifico", price: 150, type: "font"},
    {id: "title_melomane", name: "🎧 Mélomane", price: 60, type: "title"},
    {id: "title_critique", name: "✍️ Critique", price: 100, type: "title"},
    {id: "title_collectionneur", name: "💿 Collectionneur", price: 150, type: "title"},
    {id: "title_veteran", name: "⭐ Vétéran", price: 220, type: "title"},
    {id: "title_legende", name: "👑 Légende", price: 400, type: "title"},
    {id: "effect_glow_blue", name: "Lueur Bleue", price: 120, type: "text_effect"},
    {id: "effect_glow_pink", name: "Lueur Rose", price: 120, type: "text_effect"},
    {id: "effect_shadow_gold", name: "Ombre Dorée", price: 180, type: "text_effect"},
    {id: "effect_gradient_sunset", name: "Dégradé Coucher de Soleil", price: 200, type: "text_effect"},
    {id: "effect_gradient_ocean", name: "Dégradé Océan", price: 200, type: "text_effect"},
    {id: "banner_midnight", name: "Bannière Minuit", price: 300, type: "banner"},
    {id: "banner_sunset", name: "Bannière Coucher de Soleil", price: 350, type: "banner"},
    {id: "banner_ocean", name: "Bannière Océan", price: 350, type: "banner"},
    {id: "banner_aurora", name: "Bannière Aurore", price: 450, type: "banner"},
    {id: "pattern_dots", name: "Motif Pointillés", price: 130, type: "pattern"},
    {id: "pattern_grid", name: "Motif Grille", price: 150, type: "pattern"},
    {id: "pattern_waves", name: "Motif Vagues", price: 170, type: "pattern"},
    {id: "pattern_diagonal", name: "Motif Diagonales", price: 150, type: "pattern"},
    {id: "pattern_halo", name: "Motif Halo", price: 200, type: "pattern"},
    {id: "pattern_vinyl", name: "Motif Vinyle", price: 200, type: "pattern"},
];

export function getCosmeticById(id: string): CosmeticItem | undefined {
    return COSMETICS.find((c) => c.id === id);
}

// "theme" n'est pas équipable via ce mécanisme générique : il s'applique
// via une classe CSS sur <html> (cf. useDarkMode), pas via un champ equipped_X.
export type CosmeticSlot = "avatar_border" | "font" | "title" | "text_effect" | "banner" | "pattern";

export const COSMETIC_SLOT_FIELDS: Record<CosmeticSlot, string> = {
    avatar_border: "equipped_avatar_border",
    font: "equipped_font",
    title: "equipped_title",
    text_effect: "equipped_text_effect",
    banner: "equipped_banner",
    pattern: "equipped_pattern",
};
