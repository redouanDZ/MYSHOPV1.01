const { test, describe } = require('node:test');
const assert = require('node:assert');

const db = require('../src/data/db-connection.js');
const {
    issueSession,
    createAccessToken,
    parseUserFromReq,
    revokeSession,
    revokeAllUserSessions,
    activeSessions,
    SESSION_CACHE_TTL
} = require('../src/utils/tokenUtils.js');

describe('Security: Session Invalidation and Cache TTL', () => {
    let testUser;

    test.before(async () => {
        await db.initializeDatabase();
        testUser = await db.findUserByEmail('user@example.com');
        if (!testUser) {
            testUser = await db.createUser({
                username: 'مستخدم تجريبي',
                email: 'user@example.com',
                phone: '0550000000',
                password: 'password123',
                role: 'customer'
            });
        }
    });

    test('1. Session revoked directly in database is rejected after TTL expires', async () => {
        // 1. Issue a new session and token
        const sessionId = await issueSession(
            { id: testUser.id, email: testUser.email, role: 'customer' },
            { headers: { 'user-agent': 'TTLTest/1.0' }, ip: '127.0.0.1' }
        );
        assert.ok(sessionId, 'Session ID must be issued');
        const token = createAccessToken({ id: testUser.id, email: testUser.email, role: 'customer' }, sessionId);

        // 2. Initial request populates and confirms active cache
        const authenticatedUserId = await parseUserFromReq({ headers: { authorization: `Bearer ${token}` } });
        assert.strictEqual(authenticatedUserId, testUser.id, 'User must authenticate successfully');
        assert.ok(activeSessions.has(sessionId), 'Session must be cached in activeSessions');

        // 3. Directly revoke session in database (simulating out-of-band DB update / another server worker)
        // Note: we intentionally do NOT call tokenUtils.revokeSession nor activeSessions.delete
        await db.revokeSession(sessionId);

        // 4. While within TTL, local cache still holds the session
        const cachedEntry = activeSessions.get(sessionId);
        assert.ok(cachedEntry, 'Cache entry still exists before TTL expiry');

        // 5. Simulate TTL expiration by aging cachedAt past SESSION_CACHE_TTL
        cachedEntry.cachedAt = Date.now() - (SESSION_CACHE_TTL + 5000);

        // 6. Next request must re-verify against database, discover revoked status, and reject
        const rejectedUserId = await parseUserFromReq({ headers: { authorization: `Bearer ${token}` } });
        assert.strictEqual(rejectedUserId, null, 'Session revoked in database MUST be rejected after TTL expiration');
        assert.strictEqual(activeSessions.has(sessionId), false, 'Revoked session must be evicted from activeSessions cache');
    });

    test('2. revokeAllUserSessions immediately revokes all sessions of user from local cache and DB', async () => {
        // 1. Issue two concurrent sessions for the same user
        const session1 = await issueSession(
            { id: testUser.id, email: testUser.email, role: 'customer' },
            { headers: { 'user-agent': 'DeviceA' }, ip: '127.0.0.1' }
        );
        const session2 = await issueSession(
            { id: testUser.id, email: testUser.email, role: 'customer' },
            { headers: { 'user-agent': 'DeviceB' }, ip: '127.0.0.2' }
        );
        const token1 = createAccessToken({ id: testUser.id, email: testUser.email, role: 'customer' }, session1);
        const token2 = createAccessToken({ id: testUser.id, email: testUser.email, role: 'customer' }, session2);

        // 2. Both sessions authenticate and are cached
        assert.strictEqual(await parseUserFromReq({ headers: { authorization: `Bearer ${token1}` } }), testUser.id);
        assert.strictEqual(await parseUserFromReq({ headers: { authorization: `Bearer ${token2}` } }), testUser.id);
        assert.ok(activeSessions.has(session1));
        assert.ok(activeSessions.has(session2));

        // 3. Invalidate all user sessions (e.g. password change, refresh reuse, or admin action)
        await revokeAllUserSessions(testUser.id);

        // 4. Verify immediately (0 delay) that local cache is evicted
        assert.strictEqual(activeSessions.has(session1), false, 'Session 1 must be evicted immediately from activeSessions');
        assert.strictEqual(activeSessions.has(session2), false, 'Session 2 must be evicted immediately from activeSessions');

        // 5. Subsequent requests with both tokens must be immediately rejected
        assert.strictEqual(await parseUserFromReq({ headers: { authorization: `Bearer ${token1}` } }), null, 'Session 1 must be rejected immediately');
        assert.strictEqual(await parseUserFromReq({ headers: { authorization: `Bearer ${token2}` } }), null, 'Session 2 must be rejected immediately');
    });
});
