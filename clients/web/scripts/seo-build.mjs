import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {createServer} from 'vite';
import {pages, routeSeo, headHtml, structuredData, SITE_URL} from '../src/seo/config.mjs';

const template = await readFile('dist/index.html', 'utf8');
function documentFor(meta, content = '', schema = null) {
    return template.replace(/<!-- SEO:start -->[\s\S]*?<!-- SEO:end -->/, `<!-- SEO:start -->${headHtml(meta, schema)}<!-- SEO:end -->`)
        .replace('<div id="root"></div>', () => `<div id="root">${content}</div>`);
}
const server = await createServer({server: {middlewareMode: true}, appType: 'custom'});
try {
    const {render} = await server.ssrLoadModule('/src/seo/prerender.tsx');
    for (const path of Object.keys(pages)) {
        const meta = routeSeo(path);
        const content = meta.index ? await render(path) : '';
        const file = resolve('dist', path === '/' ? 'index.html' : `${path.slice(1)}.html`);
        await mkdir(dirname(file), {recursive: true});
        await writeFile(file, documentFor(meta, content, path === '/' ? structuredData(meta) : null));
    }
} finally { await server.close(); }
// Dynamic URLs must not inherit the homepage canonical or homepage content.
await writeFile('dist/spa.html', documentFor({...routeSeo('/album/pending'), canonical: ''}));
await writeFile('dist/private.html', documentFor({...routeSeo('/profil'), canonical: ''}));
await writeFile('dist/404.html', documentFor({...routeSeo('/not-found'), canonical: ''}));
await writeFile('dist/robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);
await writeFile('dist/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${Object.entries(pages).filter(([, p]) => p.index).map(([path]) => `<url><loc>${SITE_URL}${path}</loc></url>`).join('')}</urlset>\n`);
console.log('SEO: public pages prerendered; route metadata, robots.txt and sitemap.xml generated.');
