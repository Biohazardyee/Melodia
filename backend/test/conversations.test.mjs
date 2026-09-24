// Pure policy + service regression tests; Prisma is stubbed, no database is contacted.
// Run: node --import tsx --test test/conversations.test.mjs
import {test, afterEach, mock} from 'node:test';
import assert from 'node:assert/strict';
import {PrismaDb} from '../config/database.ts';
import {ConversationService} from '../modules/db/conversations/conversation.service.ts';
import {MessageService} from '../modules/db/messages/message.service.ts';
import {FollowService} from '../modules/db/follows/follow.service.ts';
import {badgeService} from '../modules/db/badges/badge.service.ts';
import {assertCanSend, assertParticipant, assertCanRespond} from '../modules/db/conversations/conversation.policy.ts';

const restorers = [];
const stub = (target, method, implementation) => {
    const original = target[method];
    const fn = mock.fn(implementation);
    target[method] = fn;
    restorers.push(() => {target[method] = original;});
    return fn;
};
afterEach(() => {while (restorers.length) restorers.pop()(); mock.restoreAll();});
const base = {id: 'conv', user1_id: 'alice', user2_id: 'bob', status: 'PENDING', initiated_by: 'alice', invitation_sent: false, created_at: new Date()};
const transaction = () => {
    stub(PrismaDb, '$transaction', async fn => fn(PrismaDb));
    stub(PrismaDb, '$queryRaw', async () => []);
};

test('only participants can access a conversation', () => {
    assert.doesNotThrow(() => assertParticipant(base, 'bob'));
    assert.throws(() => assertParticipant(base, 'mallory'));
});
test('one introductory message, recipient must accept before replying', () => {
    assert.doesNotThrow(() => assertCanSend(base, 'alice'));
    assert.throws(() => assertCanSend(base, 'bob'));
    assert.throws(() => assertCanSend({...base, invitation_sent: true}, 'alice'));
    for (const id of ['alice', 'bob']) assert.throws(() => assertCanSend({...base, status: 'DECLINED'}, id));
});
test('acceptance allows both participants, never outsiders', () => {
    for (const id of ['alice', 'bob']) assert.doesNotThrow(() => assertCanSend({...base, status: 'ACCEPTED'}, id));
    assert.throws(() => assertCanSend({...base, status: 'ACCEPTED'}, 'mallory'));
    assert.throws(() => assertCanRespond(base, 'alice'));
    assert.doesNotThrow(() => assertCanRespond(base, 'bob'));
});
for (const follows of [false, true]) {
    test(`explicit creation: recipient follows sender = ${follows}`, async () => {
        stub(PrismaDb.users, 'findUnique', async () => ({id: 'user'}));
        stub(PrismaDb.conversations, 'findFirst', async () => null);
        const follow = stub(PrismaDb.follows, 'findUnique', async () => follows ? {} : null);
        const upsert = stub(PrismaDb.conversations, 'upsert', async ({create}) => ({...base, ...create}));
        await new ConversationService().create({user1_id: 'bob', user2_id: 'alice'});
        assert.deepEqual(follow.mock.calls[0].arguments[0].where.user_id_follow_user_id, {user_id: 'alice', follow_user_id: 'bob'});
        assert.equal(upsert.mock.calls[0].arguments[0].create.status, follows ? 'ACCEPTED' : 'PENDING');
        assert.deepEqual(upsert.mock.calls[0].arguments[0].where.user1_id_user2_id, {user1_id: 'alice', user2_id: 'bob'});
    });
}
test('opening an existing conversation preserves consent and identity without checking follows', async () => {
    stub(PrismaDb.users, 'findUnique', async () => ({}));
    stub(PrismaDb.conversations, 'findFirst', async () => ({...base, status: 'ACCEPTED'}));
    const follow = stub(PrismaDb.follows, 'findUnique', async () => {throw Error('must not query follows');});
    assert.equal((await new ConversationService().create({user1_id: 'bob', user2_id: 'alice'})).id, 'conv');
    assert.equal(follow.mock.callCount(), 0);
});
test('self messaging is rejected', async () => {
    await assert.rejects(new ConversationService().create({user1_id: 'alice', user2_id: 'alice'}));
});
test('sending an invitation consumes the allowance even if the message is later deleted', async () => {
    transaction();
    let conversation = {...base};
    stub(PrismaDb.conversations, 'findUnique', async () => conversation);
    stub(PrismaDb.conversations, 'update', async ({data}) => (conversation = {...conversation, ...data}));
    stub(PrismaDb.users, 'findUnique', async () => ({}));
    const create = stub(PrismaDb.messages, 'create', async ({data}) => ({id: 'message', ...data, created_at: new Date(), is_read: false}));
    const service = new MessageService();
    await service.create({conversation_id: 'conv', sender_id: 'alice', content: 'Bonjour'});
    assert.equal(conversation.invitation_sent, true);
    await assert.rejects(service.create({conversation_id: 'conv', sender_id: 'alice', content: 'Encore'}));
    await assert.rejects(service.create({conversation_id: 'conv', sender_id: 'mallory', content: 'Intrusion'}));
    assert.equal(create.mock.callCount(), 1);
});
test('only the recipient can accept or decline; reopening cannot reset a refusal', async () => {
    transaction();
    let conversation = {...base, invitation_sent: true};
    stub(PrismaDb.conversations, 'findUnique', async () => conversation);
    stub(PrismaDb.conversations, 'update', async ({data}) => (conversation = {...conversation, ...data}));
    const service = new ConversationService();
    await assert.rejects(service.respond('conv', 'alice', 'accept'));
    await assert.rejects(service.respond('conv', 'mallory', 'accept'));
    await assert.rejects(service.respond('conv', 'bob', 'invalid'));
    await service.respond('conv', 'bob', 'decline');
    assert.equal(conversation.status, 'DECLINED');
    await service.respond('conv', 'bob', 'accept');
    assert.equal(conversation.status, 'ACCEPTED');
});
test('follow and unfollow never create or delete conversations', async () => {
    transaction();
    stub(PrismaDb.users, 'findUnique', async () => ({}));
    const relation = {user_id: 'alice', follow_user_id: 'bob', created_at: new Date()};
    let followChecks = 0;
    stub(PrismaDb.follows, 'findUnique', async () => followChecks++ === 0 ? null : relation);
    stub(PrismaDb.conversations, 'findUnique', async () => base);
    stub(PrismaDb.follows, 'create', async () => relation);
    stub(PrismaDb.notifications, 'findFirst', async () => ({}));
    stub(badgeService, 'checkAndAwardBadges', async () => []);
    const create = stub(PrismaDb.conversations, 'create', async () => {throw Error('unexpected conversation creation');});
    const remove = stub(PrismaDb.conversations, 'delete', async () => {throw Error('unexpected history deletion');});
    const service = new FollowService();
    await service.create(relation);
    assert.equal(followChecks, 1, "follow must not check mutuality to start a chat");
    stub(PrismaDb.follows, 'findUnique', async () => relation);
    stub(PrismaDb.follows, 'delete', async () => relation);
    await service.delete('alice', 'bob');
    assert.equal(create.mock.callCount(), 0);
    assert.equal(remove.mock.callCount(), 0);
});
