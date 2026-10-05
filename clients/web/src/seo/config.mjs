export const SITE_URL = 'https://www.melodia.cloud';
export const DEFAULT_DESCRIPTION = 'Découvrez des albums, partagez vos avis et vos playlists, et échangez avec une communauté de passionnés de musique sur Melodia.';
const page = (title, description, index = false) => ({title: `${title} | Melodia`, description, index});
export const pages = {
    '/': page('Melodia, votre communauté musicale', DEFAULT_DESCRIPTION, true),
    '/home': page('Découvrir des albums et des artistes', 'Explorez des albums et des artistes, trouvez votre prochaine découverte musicale et partagez vos coups de cœur sur Melodia.', true),
    '/login': page('Connexion', 'Connectez-vous à votre compte Melodia pour retrouver votre communauté musicale.'),
    '/register': page('Inscription', 'Créez votre compte Melodia pour noter des albums, créer des playlists et partager votre passion pour la musique.'),
    '/verify-email': page('Vérifier mon adresse email', 'Vérifiez votre adresse email pour activer votre compte Melodia.'),
    '/forgot-password': page('Réinitialiser mon mot de passe', 'Retrouvez l’accès à votre compte Melodia.'),
    '/auth/callback': page('Connexion en cours', 'Finalisation de votre connexion à Melodia.'),
    '/auth-required': page('Connexion requise', 'Connectez-vous pour accéder à votre espace musical.'),
    '/authguard': page('Accès au compte', 'Accédez à votre compte Melodia.'),
    '/feed': page('Fil musical', 'Retrouvez les découvertes et avis de votre communauté musicale.'),
    '/stats': page('Mes statistiques musicales', 'Consultez vos statistiques musicales personnelles.'),
    '/library': page('Ma bibliothèque musicale', 'Retrouvez vos albums, favoris et playlists.'),
    '/journal': page('Mon journal musical', 'Retrouvez les notes de votre journal musical privé.'),
    '/notifications': page('Mes notifications', 'Consultez les notifications de votre compte.'),
    '/conversations': page('Mes messages', 'Retrouvez vos conversations privées sur Melodia.'),
    '/profil': page('Profil musical', 'Consultez votre profil et votre activité musicale.'),
    '/settings': page('Paramètres du compte', 'Gérez les préférences et les connexions de votre compte.'),
    '/shop': page('Boutique', 'Personnalisez votre espace musical sur Melodia.'),
    '/rooms': page('Salons d’écoute', 'Retrouvez les salons d’écoute de la communauté Melodia.'),
    '/create-playlist': page('Créer une playlist', 'Rassemblez vos albums dans une playlist Melodia.'),
    '/admindashboard': page('Administration', 'Administration de Melodia.'),
};
export function routeSeo(pathname, search = '') {
    const path = pathname.replace(/\/+$/, '') || '/';
    const params = new URLSearchParams(search);
    const meta = pages[path] || (/^\/profil\/[^/]+$/.test(path) ? pages['/profil']
        : /^\/rooms\/[^/]+$/.test(path) ? pages['/rooms']
        : /^\/album\/[^/]+$/.test(path) ? page('Album : avis et morceaux', 'Découvrez cet album et les avis de la communauté Melodia.', true)
        : page('Page introuvable', 'Cette page n’existe pas. Découvrez les albums et artistes sur Melodia.'));
    // Search result pages are not landing pages for search engines.
    const index = meta.index && !(path === '/home' && params.has('q'));
    let canonical = `${SITE_URL}${path}`;
    // External albums may need these parameters to resolve before being saved in the database.
    if (path.startsWith('/album/')) {
        const identity = new URLSearchParams();
        for (const key of ['artist', 'album', 'mbid']) if (params.get(key)) identity.set(key, params.get(key));
        if (identity.size) canonical += `?${identity}`;
    }
    return {...meta, index, canonical, image: `${SITE_URL}/logo.png`};
}
export function structuredData(meta) {
    return {'@context': 'https://schema.org', '@type': 'WebSite', name: 'Melodia', url: `${SITE_URL}/`, description: meta.description};
}
export function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[char]));
}
export function headHtml(meta, schema = null) {
    const e = escapeHtml;
    return `<title>${e(meta.title)}</title>
<meta name="description" content="${e(meta.description)}">
<meta name="robots" content="${meta.index ? 'index,follow,max-image-preview:large' : 'noindex,follow'}">
${meta.canonical ? `<link rel="canonical" href="${e(meta.canonical)}">` : ''}
<meta property="og:site_name" content="Melodia">
<meta property="og:type" content="website">
<meta property="og:title" content="${e(meta.title)}">
<meta property="og:description" content="${e(meta.description)}">
${meta.canonical ? `<meta property="og:url" content="${e(meta.canonical)}">` : ''}
<meta property="og:image" content="${e(meta.image)}">
<meta property="og:image:alt" content="Melodia, communauté musicale">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${e(meta.title)}">
<meta name="twitter:description" content="${e(meta.description)}">
<meta name="twitter:image" content="${e(meta.image)}">
${schema ? `<script id="seo-schema" type="application/ld+json">${JSON.stringify(schema).replace(/</g, '\\u003c')}</script>` : ''}`;
}
