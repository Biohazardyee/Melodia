import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {COSMETICS} from '../../../backend/modules/db/users/cosmetics.catalog.ts';
import {PROFILE_PATTERNS, getPattern} from '../src/patterns.config.ts';
import {PREMIUM_THEMES, PREMIUM_THEME_COSMETIC} from '../src/themes.config.ts';
import {cosmeticsTranslations} from '../src/cosmetics.translations.ts';

test('every pattern has a purchasable catalogue entry and a CSS renderer', () => {
  const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
  for (const pattern of PROFILE_PATTERNS) {
    assert.equal(COSMETICS.find(c => c.id === pattern.id)?.type, 'pattern');
    assert.ok(css.includes(`.${pattern.className} {`));
  }
  for (const id of ['pattern_dots', 'pattern_grid', 'pattern_waves', 'pattern_diagonal']) {
    assert.ok(getPattern(id), 'existing purchases remain usable');
  }
  assert.equal(getPattern('unknown'), undefined);
});

test('all premium themes are linked to ownership and semantic palettes', () => {
  const css = readFileSync(new URL('../src/design.css', import.meta.url), 'utf8');
  for (const theme of PREMIUM_THEMES) {
    assert.equal(PREMIUM_THEME_COSMETIC[theme.value], theme.cosmeticId);
    assert.equal(COSMETICS.find(c => c.id === theme.cosmeticId)?.type, 'theme');
    assert.ok(css.includes(`html.theme-${theme.value} {`));
  }
  assert.equal(new Set(COSMETICS.map(c => c.id)).size, COSMETICS.length);
});

test('new cosmetics are translated in every supported language', () => {
  for (const language of ['fr', 'en', 'es', 'de', 'it']) {
    for (const key of ['theme_amber', 'cosmetic_item_theme_amber', 'cosmetic_item_pattern_halo', 'cosmetic_item_pattern_vinyl']) {
      assert.ok(cosmeticsTranslations[language][key]);
    }
  }
});
