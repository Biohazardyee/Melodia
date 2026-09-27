export type Theme = "light" | "dark" | "crimson" | "cyan" | "amber";

export interface PremiumThemeDef {
    value: Theme; // valeur appliquée (classe `theme-<value>`)
    cosmeticId: string; // cosmétique requis (catalogue)
    labelKey: string; // clé i18n du nom
    labelFallback: string; // nom par défaut
    accentClass: string; // couleur d'icône (Tailwind)
    previewGradient: string; // fond d'aperçu (boutique)
    swatches: string[]; // pastilles d'aperçu (boutique)
}

/** Thèmes payants. Pour en ajouter un : une entrée ici + les overrides CSS + l'entrée catalogue. */
export const PREMIUM_THEMES: PremiumThemeDef[] = [
    {
        value: "amber",
        cosmeticId: "theme_amber",
        labelKey: "theme_amber",
        labelFallback: "Ambre",
        accentClass: "text-amber-300",
        previewGradient: "radial-gradient(ellipse at 90% 0%, #93632b 0%, transparent 65%), linear-gradient(135deg, #17120e, #35271b)",
        swatches: ["#17120e", "#35271b", "#edc080"],
    },
    {
        value: "crimson",
        cosmeticId: "theme_crimson",
        labelKey: "theme_crimson",
        labelFallback: "Cramoisi",
        accentClass: "text-red-500",
        previewGradient: "linear-gradient(135deg, #0c0709 0%, #1a0e11 55%, #7f1d1d 130%)",
        swatches: ["#0c0709", "#1a0e11", "#dc2626"],
    },
    {
        value: "cyan",
        cosmeticId: "theme_cyan",
        labelKey: "theme_cyan",
        labelFallback: "Givre",
        accentClass: "text-cyan-400",
        previewGradient: "linear-gradient(135deg, #070d15 0%, #0e1a2a 55%, #0e7490 130%)",
        swatches: ["#070d15", "#0e1a2a", "#06b6d4"],
    },
];

/** Map valeur de thème -> cosmétique requis (pour le contrôle de possession). */
export const PREMIUM_THEME_COSMETIC: Partial<Record<Theme, string>> = Object.fromEntries(
    PREMIUM_THEMES.map((p) => [p.value, p.cosmeticId]),
) as Partial<Record<Theme, string>>;
