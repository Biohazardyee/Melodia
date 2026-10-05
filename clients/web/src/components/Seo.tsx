import {useLayoutEffect} from 'react';
import {useLocation} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {routeSeo, structuredData, SITE_URL} from '../seo/config.mjs';

function apply(meta: ReturnType<typeof routeSeo>, schema: object | null) {
    document.title = meta.title;
    const setMeta = (key: string, value: string, property = false) => {
        const attr = property ? 'property' : 'name';
        let tag = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
        if (!tag) { tag = document.createElement('meta'); tag.setAttribute(attr, key); document.head.append(tag); }
        tag.content = value;
    };
    setMeta('description', meta.description);
    setMeta('robots', meta.index ? 'index,follow,max-image-preview:large' : 'noindex,follow');
    for (const [key, value] of Object.entries({title: meta.title, description: meta.description, url: meta.canonical, image: meta.image, type: 'website', site_name: 'Melodia'})) setMeta(`og:${key}`, String(value), true);
    for (const [key, value] of Object.entries({card: 'summary', title: meta.title, description: meta.description, image: meta.image})) setMeta(`twitter:${key}`, String(value));
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.append(canonical); }
    canonical.href = meta.canonical;
    document.getElementById('seo-schema')?.remove();
    if (schema) {
        const script = document.createElement('script'); script.id = 'seo-schema'; script.type = 'application/ld+json';
        script.textContent = JSON.stringify(schema); document.head.append(script);
    }
}

export default function Seo() {
    const {pathname, search} = useLocation();
    const {i18n} = useTranslation();
    useLayoutEffect(() => {
        document.documentElement.lang = i18n.resolvedLanguage || 'fr';
        const meta = routeSeo(pathname, search);
        apply(meta, pathname === '/' ? structuredData(meta) : null);
    }, [pathname, search, i18n.resolvedLanguage]);
    return null;
}

export function useAlbumSeo(album: any, loading: boolean) {
    const {pathname, search} = useLocation();
    // Run after the route defaults, and never promote an unresolved album to an indexed page.
    useLayoutEffect(() => {
        if (loading) return;
        const meta = routeSeo(pathname, search);
        if (!album?.name) { apply({...meta, title: 'Album introuvable | Melodia', index: false}, null); return; }
        const canonical = album.db_id ? `${SITE_URL}/album/${encodeURIComponent(album.db_id)}` : meta.canonical;
        const description = `Découvrez ${album.name} de ${album.artist} : morceaux, avis et notes de la communauté musicale Melodia.`;
        apply({...meta, canonical, title: `${album.name} — ${album.artist} : avis et morceaux | Melodia`, description}, {
            '@context': 'https://schema.org', '@type': 'MusicAlbum', name: album.name,
            byArtist: {'@type': 'MusicGroup', name: album.artist}, url: canonical,
        });
    }, [album, loading, pathname, search]);
}
