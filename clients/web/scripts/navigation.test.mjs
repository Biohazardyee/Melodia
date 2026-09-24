import {test} from 'node:test';
import assert from 'node:assert/strict';
import {backDestination} from '../src/utils/navigation.ts';
test('direct entry, missing and malformed history use the fallback', () => {
    for (const index of [undefined, null, 0, -1, NaN, Infinity, '2']) assert.equal(backDestination(index, '/rooms'), '/rooms');
});
test('an existing in-app history goes back exactly once', () => {
    assert.equal(backDestination(1), -1);
    assert.equal(backDestination(5), -1);
});
