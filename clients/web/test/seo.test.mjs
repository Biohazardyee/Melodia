import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pages, routeSeo, headHtml, SITE_URL} from '../src/seo/config.mjs';

test('private pages and unknown routes are not indexable', () => {
    for (const path of ['/journal', '/conversations', '/profil/someone', '/rooms/private', '/settings', '/auth/callback', '/admindashboard', '/unknown']) {
        assert.equal(routeSeo(path).index, false, path);
    }
    assert.equal(routeSeo('/home', '?q=jazz').index, false);
    assert.equal(routeSeo('/home').index, true);
});
test('canonical URLs remove tracking and tokens but preserve unresolved album identity', () => {
    assert.equal(routeSeo('/home', '?utm_source=test').canonical, `${SITE_URL}/home`);
    assert.equal(routeSeo('/auth/callback', '?token=secret').canonical.includes('secret'), false);
    assert.equal(routeSeo('/album/external', '?artist=A&album=B&cover=tracking&mbid=123').canonical, `${SITE_URL}/album/external?artist=A&album=B&mbid=123`);
});
test('metadata is escaped and JSON-LD cannot close its script element', () => {
    const html = headHtml({...routeSeo('/'), title: '"><script>alert(1)</script>'}, {name: '</script><script>alert(1)</script>'});
    assert.ok(!html.includes('<script>alert(1)'));
    assert.ok(html.includes('\\u003c/script>'));
});
test('built routes have unique metadata, prerendered public content and a public-only sitemap', async () => {
    const sitemap = await readFile('dist/sitemap.xml', 'utf8');
    for (const [path, meta] of Object.entries(pages)) {
        const html = await readFile(`dist/${path === '/' ? 'index' : path.slice(1)}.html`, 'utf8');
        assert.equal((html.match(/<title>/g) || []).length, 1, path);
        assert.ok(html.includes(`href="${SITE_URL}${path}"`), path);
        assert.equal(html.includes('content="noindex,follow"'), !meta.index, path);
        assert.equal(sitemap.includes(`<loc>${SITE_URL}${path}</loc>`), meta.index, path);
        if (meta.index) assert.ok(html.includes('<h1'), `${path} should contain real content without JavaScript`);
    }
    for (const name of ['spa', 'private', '404']) {
        const html = await readFile(`dist/${name}.html`, 'utf8');
        assert.ok(!html.includes('rel="canonical"'), `${name} must not canonicalize dynamic pages to the homepage`);
    }
});
