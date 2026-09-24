import {test, afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {parseJournalEntry, parseJournalQuery} from '../modules/db/journal/journal.validation.ts';
import {journalService} from '../modules/db/journal/journal.service.ts';
import {PrismaDb} from '../config/database.ts';

const restore = [];
function stub(target, name, fn) {const old = target[name]; target[name] = fn; restore.push(() => {target[name] = old;});}
afterEach(() => {while (restore.length) restore.pop()();});
const entry = {title: 'Discovery', artist: 'Daft Punk', listened_on: '2024-02-29', mood: 'happy', rating: 5, note: 'Un souvenir personnel'};

test('valid date, optional rating and whitespace normalization', () => {
    assert.equal(parseJournalEntry({...entry, title: '  Discovery  ', rating: null}).title, 'Discovery');
});
for (const [key, value] of [['listened_on', '2025-02-29'], ['listened_on', '2026-13-01'], ['title', ' '], ['title', 'a'.repeat(201)], ['note', 'a'.repeat(4001)], ['rating', 6], ['rating', '5'], ['rating', 1.5], ['mood', 'unknown']]) {
    test(`reject invalid ${key}: ${String(value).slice(0, 20)}`, () => assert.throws(() => parseJournalEntry({...entry, [key]: value})));
}
test('pagination and filter bounds', () => {
    assert.deepEqual(parseJournalQuery({month: '2026-09', page: '2', q: '  test  '}), {month: '2026-09', page: 2, q: 'test', mood: ''});
    for (const query of [{page: -1}, {page: 0}, {page: 1.5}, {page: 'oops'}, {month: '2026-00'}, {mood: 'unknown'}]) assert.throws(() => parseJournalQuery(query));
});
test('creation ignores forged owner and unrelated fields', async () => {
    stub(PrismaDb.journalEntries, 'create', async ({data}) => {
        assert.equal(data.user_id, 'alice');
        assert.equal(data.is_public, undefined);
        return data;
    });
    await journalService.create('alice', {...entry, user_id: 'bob', is_public: true});
});
test('updates and deletion filter by owner atomically', async () => {
    for (const method of ['updateMany', 'deleteMany']) stub(PrismaDb.journalEntries, method, async ({where}) => {
        assert.deepEqual(where, {id: 'private-entry', user_id: 'bob'});
        return {count: 0};
    });
    await assert.rejects(journalService.update('bob', 'private-entry', entry), {status: 404});
    await assert.rejects(journalService.delete('bob', 'private-entry'), {status: 404});
});
test('list, count and averages all stay inside the authenticated journal', async () => {
    let queries = 0;
    for (const method of ['findMany', 'count', 'aggregate']) stub(PrismaDb.journalEntries, method, async (args) => {
        assert.equal(args.where.user_id, 'alice');
        assert.deepEqual(args.where.listened_on, {startsWith: '2026-09-'});
        if (method === 'findMany') {assert.equal(args.skip, 30); assert.equal(args.take, 30);}
        queries++;
        return method === 'findMany' ? [] : method === 'count' ? 31 : {_avg: {rating: 4.5}};
    });
    stub(PrismaDb, '$transaction', async args => Promise.all(args));
    const result = await journalService.list('alice', {user_id: 'bob', month: '2026-09', page: '2'});
    assert.equal(queries, 3);
    assert.equal(result.hasMore, false);
    assert.equal(result.averageRating, 4.5);
});
