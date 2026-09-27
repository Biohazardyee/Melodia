import test from 'node:test';
import assert from 'node:assert/strict';
import {palettes} from '../src/design/tokens.ts';
import {mobileDesignTranslations} from '../src/design/translations.ts';
import {mobileTabs, hideMobileTabs, activeMobileTab} from '../src/design/navigation.ts';
import {playlistDraft, validPlaylistName} from '../src/design/playlistDraft.ts';

const luminance = hex => {
    const channels = hex.slice(1).match(/../g).map(c => parseInt(c, 16) / 255).map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
};
const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05);

test('both palettes keep readable text, muted labels and white button text', () => {
    for (const palette of Object.values(palettes)) {
        for (const surface of ['background', 'card', 'surface']) {
            for (const foreground of ['text', 'subText', 'accent']) {
                assert.ok(contrast(palette[surface], palette[foreground]) >= 4.5, surface + '/' + foreground);
            }
        }
        assert.ok(contrast(palette.action, '#ffffff') >= 4.5);
    }
});
test('translation keys are complete across five languages', () => {
    const keys = Object.keys(mobileDesignTranslations.fr).sort();
    for (const translation of Object.values(mobileDesignTranslations)) assert.deepEqual(Object.keys(translation).sort(), keys);
    for (const tab of mobileTabs) assert.ok(mobileDesignTranslations.fr[tab.label]);
});
test('tabs stay out of keyboard and focused editing flows', () => {
    assert.equal(hideMobileTabs('/', false), false);
    for (const path of ['/createplaylist', '/login', '/register', '/onboarding', '/detailsConversations', '/writereview']) assert.equal(hideMobileTabs(path, false), true);
    assert.equal(hideMobileTabs('/library', true), true);
    assert.equal(activeMobileTab('/playlistdetails'), '/library');
    assert.equal(activeMobileTab('/statDetails'), '/stats');
});
test('playlist names follow the database limit', () => {
    assert.equal(validPlaylistName('   '), false);
    assert.equal(validPlaylistName('a'.repeat(31)), false);
    assert.equal(validPlaylistName('a'.repeat(30)), true);
    assert.equal(validPlaylistName('  Jazz  '), true);
});
test('editing preserves existing remote covers without reading them as files', () => {
    assert.deepEqual(playlistDraft(' Jazz ', false, 'https://example.test/cover.jpg', false), {name: 'Jazz', is_public: false});
});
test('a changed cover or explicit removal is sent to the server', () => {
    assert.equal(playlistDraft('Jazz', true, 'data:image/jpeg;base64,fixture', true).image_url, 'data:image/jpeg;base64,fixture');
    assert.equal(playlistDraft('Jazz', true, null, true).image_url, null);
});
