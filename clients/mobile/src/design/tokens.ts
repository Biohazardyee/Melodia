export const brand = { primary: '#7652c8', soft: 'rgba(118,82,200,0.12)', highlight: '#b6a0ff' };
export const palettes = {
    dark: {
        background: '#101114', card: '#18191e', surface: '#22232b', inputBg: '#22232b',
        text: '#f2f1f5', subText: '#a1a1af', placeholder: '#9692a4', border: '#303139', separator: '#303139',
        accent: '#b6a0ff', action: brand.primary, accentSoft: '#b6a0ff18', danger: '#ff8999',
    },
    light: {
        background: '#f6f5f8', card: '#ffffff', surface: '#efedf4', inputBg: '#efedf4',
        text: '#23212c', subText: '#696475', placeholder: '#777181', border: '#dedbe6', separator: '#dedbe6',
        accent: '#7251c6', action: brand.primary, accentSoft: '#7251c612', danger: '#b72f49',
    },
};
export type AppTheme = typeof palettes.dark;
