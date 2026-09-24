import {test, afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {PrismaDb} from '../config/database.ts';
import {roomService} from '../modules/db/rooms/room.service.ts';

const restore = [];
function stub(target, name, fn) {const old = target[name]; target[name] = fn; restore.push(() => {target[name] = old;});}
afterEach(() => {while (restore.length) restore.pop()();});
const version = '2026-09-24T12:00:00.000Z';
function setup(queue = []) {
    let room = {id: 'room', host_id: 'host', current_track_uri: 'spotify:track:old', position_updated_at: new Date(version)};
    // Simulate serialized transactions; SQL locking itself needs a PostgreSQL integration run.
    let pending = Promise.resolve();
    stub(PrismaDb, '$transaction', fn => {const result = pending.then(() => fn(PrismaDb)); pending = result.catch(() => {}); return result;});
    stub(PrismaDb, '$queryRaw', async () => []);
    stub(PrismaDb.rooms, 'findUnique', async () => room);
    stub(PrismaDb.rooms, 'update', async ({data}) => (room = {...room, ...data}));
    stub(PrismaDb.roomQueueItems, 'findFirst', async () => queue[0] || null);
    stub(PrismaDb.roomQueueItems, 'delete', async ({where}) => {assert.equal(where.id, queue[0].id); return queue.shift();});
    return () => room;
}
test('next track becomes current with a reset position', async () => {
    setup([{id: 'first', track_uri: 'spotify:track:new', track_name: 'New', artist_name: 'Artist', duration_ms: 120000}]);
    const room = await roomService.advancePlayback('room', 'host', version);
    assert.equal(room.current_track_uri, 'spotify:track:new');
    assert.equal(room.position_ms, 0);
    assert.equal(room.is_playing, true);
});
test('empty queue restores the stopped placeholder', async () => {
    setup();
    const room = await roomService.advancePlayback('room', 'host', version);
    assert.equal(room.current_track_uri, null);
    assert.equal(room.current_track_name, null);
    assert.equal(room.is_playing, false);
});
test('another participant cannot skip', async () => {
    setup();
    await assert.rejects(roomService.advancePlayback('room', 'guest', version), {status: 403});
});
test('two host tabs reporting the same ending consume only one track, even repeated URIs', async () => {
    const queue = [{id: 'one', track_uri: 'same'}, {id: 'two', track_uri: 'same'}];
    setup(queue);
    const results = await Promise.all([roomService.advancePlayback('room', 'host', version), roomService.advancePlayback('room', 'host', version)]);
    assert.equal(results.filter(Boolean).length, 1);
    assert.equal(queue.length, 1);
});
