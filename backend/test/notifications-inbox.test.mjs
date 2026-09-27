import {test, afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {parseInboxQuery, getInbox, readInbox} from '../modules/db/notifications/notification.inbox.ts';
import {PrismaDb} from '../config/database.ts';

const restore = [];
function stub(target, name, fn) {const old = target[name]; target[name] = fn; restore.push(() => {target[name] = old;});}
afterEach(() => {while (restore.length) restore.pop()();});

test('pagination defaults, bounds and malformed filters', () => {
    assert.deepEqual(parseInboxQuery({}), {page: 1, limit: 12, filter: 'all'});
    assert.deepEqual(parseInboxQuery({page: '2', limit: '50', filter: 'unread'}), {page: 2, limit: 50, filter: 'unread'});
    for (const query of [{page:'0'}, {page:'1.5'}, {page:'-1'}, {page:['2']}, {page:'100001'}, {limit:'51'}, {limit:'0'}, {filter:'unknown'}, {filter:{all:true}}]) assert.throws(() => parseInboxQuery(query), {status:400});
});

for (const [filter, total] of [['all',29], ['unread',13], ['updates',5]]) {
    test(`owner-scoped ${filter} pagination and counters`, async () => {
        const counts = [29,13,5];
        stub(PrismaDb, '$transaction', async (run, options) => {
            assert.equal(options.isolationLevel, 'RepeatableRead');
            return run({notifications:{
                count: async ({where}) => {assert.equal(where.user_id,'alice'); return counts.shift();},
                findMany: async ({where, skip, take, orderBy}) => {
                    assert.equal(where.user_id,'alice');
                    if (filter === 'unread') assert.equal(where.is_read,false);
                    if (filter === 'updates') assert.deepEqual(where.action.in,['recommendation','badge_earned']);
                    assert.equal(skip,filter === 'updates' ? 0 : 12);
                    assert.equal(take,12);
                    assert.deepEqual(orderBy,[{created_at:'desc'},{id:'desc'}]);
                    return [];
                },
            }});
        });
        const result = await getInbox('alice',{filter,page:'2',user_id:'bob'});
        assert.equal(result.total,total);
        assert.equal(result.totalPages,Math.ceil(total/12));
        assert.equal(result.unreadCount,13);
        assert.equal(result.allCount,29);
    });
}

test('reading the last unread notification clamps an empty inbox to page one', async () => {
    stub(PrismaDb,'$transaction',async run => run({notifications:{
        count:async()=>0,
        findMany:async ({skip})=>{assert.equal(skip,0);return [];},
    }}));
    const result = await getInbox('alice',{filter:'unread',page:'7'});
    assert.equal(result.page,1);
    assert.equal(result.totalPages,1);
    assert.equal(result.total,0);
});

test('mark all read is one owner-scoped update across every page', async () => {
    stub(PrismaDb.notifications,'updateMany',async ({where,data})=>{
        assert.deepEqual(where,{user_id:'alice',is_read:false});
        assert.equal(data.is_read,true);
        assert.ok(data.read_at instanceof Date);
        return {count:37};
    });
    assert.deepEqual(await readInbox('alice'),{count:37});
});
