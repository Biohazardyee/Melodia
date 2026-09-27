export interface ProfilePatternDef {
    id: string; // cosmetic id (catalogue, type "pattern")
    name: string; // nom affiché
    className: string; // classe CSS de fond définie dans index.css
}

/**
 * Motifs de fond achetables, affichés derrière le contenu de la page profil.
 * Visible par tout le monde qui consulte le profil (comme la bannière ou le
 * contour d'avatar), pas seulement par le propriétaire.
 */
export const PROFILE_PATTERNS: ProfilePatternDef[] = [
    {id: "pattern_dots", name: "Motif Pointillés", className: "cosmetic-pattern_dots"},
    {id: "pattern_grid", name: "Motif Grille", className: "cosmetic-pattern_grid"},
    {id: "pattern_waves", name: "Motif Vagues", className: "cosmetic-pattern_waves"},
    {id: "pattern_diagonal", name: "Motif Diagonales", className: "cosmetic-pattern_diagonal"},
    {id: "pattern_halo", name: "Motif Halo", className: "cosmetic-pattern_halo"},
    {id: "pattern_vinyl", name: "Motif Vinyle", className: "cosmetic-pattern_vinyl"},
];

export const PROFILE_PATTERN_IDS: string[] = PROFILE_PATTERNS.map((p) => p.id);

export const isValidPattern = (id?: string | null): boolean =>
    !!id && PROFILE_PATTERN_IDS.includes(id);

export const getPattern = (id?: string | null): ProfilePatternDef | undefined =>
    PROFILE_PATTERNS.find((p) => p.id === id);
