const test = require('node:test');
const assert = require('node:assert');
const Session = require('./models/session.model');
const { readToken, requireAuth, requireLandlordAuth, requireParticipant } = require('./middlewares/auth.middleware');

const USER_TOKEN = 'a'.repeat(64);
const LANDLORD_TOKEN = 'b'.repeat(64);

// The guards are the only thing standing between a request and someone's account, so the lookup
// is stubbed rather than mocked away: these are the real middlewares reading a real header.
Session.resolve = async function resolve(token) {
    if (token === USER_TOKEN) return { owner: 'user-id', ownerType: 'user' };
    if (token === LANDLORD_TOKEN) return { owner: 'landlord-id', ownerType: 'landlord' };

    return null;
};

function request(header) {
    return { get: (name) => (name.toLowerCase() === 'authorization' ? header : undefined) };
}

function responseSpy() {
    return {
        statusCode: null,
        body: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(body) {
            this.body = body;
            return this;
        },
    };
}

async function run(guard, header) {
    const req = request(header);
    const res = responseSpy();
    let passed = false;

    await guard(req, res, () => { passed = true; });

    return { req, res, passed };
}

test('a bearer token is read however the client spaces or cases the header', () => {
    assert.strictEqual(readToken(request(`Bearer ${USER_TOKEN}`)), USER_TOKEN);
    assert.strictEqual(readToken(request(`bearer ${USER_TOKEN}`)), USER_TOKEN);
    assert.strictEqual(readToken(request(`Bearer   ${USER_TOKEN}`)), USER_TOKEN);
});

test('anything that is not a bearer token reads as no token at all', () => {
    assert.strictEqual(readToken(request(undefined)), '');
    assert.strictEqual(readToken(request('')), '');
    assert.strictEqual(readToken(request('Bearer')), '');
    assert.strictEqual(readToken(request('Bearer ')), '');
    assert.strictEqual(readToken(request(USER_TOKEN)), '');
    assert.strictEqual(readToken(request(`Basic ${USER_TOKEN}`)), '');
});

test('a tenant session opens tenant routes', async () => {
    const { req, passed } = await run(requireAuth, `Bearer ${USER_TOKEN}`);

    assert.ok(passed);
    assert.strictEqual(req.userId, 'user-id');
    assert.strictEqual(req.sessionToken, USER_TOKEN);
});

test('a landlord session is not a tenant session, and the reverse', async () => {
    const tenantRoute = await run(requireAuth, `Bearer ${LANDLORD_TOKEN}`);
    const landlordRoute = await run(requireLandlordAuth, `Bearer ${USER_TOKEN}`);

    assert.ok(!tenantRoute.passed);
    assert.strictEqual(tenantRoute.res.statusCode, 401);
    assert.ok(!landlordRoute.passed);
    assert.strictEqual(landlordRoute.res.statusCode, 401);
});

test('a missing, malformed or unknown token is refused', async () => {
    for (const header of [undefined, 'Bearer', `Basic ${USER_TOKEN}`, `Bearer ${'c'.repeat(64)}`]) {
        const { passed, res } = await run(requireAuth, header);

        assert.ok(!passed, `header ${header} should not authenticate`);
        assert.strictEqual(res.statusCode, 401);
        assert.strictEqual(res.body.success, false);
    }
});

test('shared routes accept either account type and label which one asked', async () => {
    const tenant = await run(requireParticipant, `Bearer ${USER_TOKEN}`);
    const landlord = await run(requireParticipant, `Bearer ${LANDLORD_TOKEN}`);

    assert.deepStrictEqual(tenant.req.participant, { id: 'user-id', role: 'user' });
    assert.deepStrictEqual(landlord.req.participant, { id: 'landlord-id', role: 'landlord' });
});

test('a stored token is never the token the browser holds', () => {
    const hash = Session.hashToken(USER_TOKEN);

    assert.notStrictEqual(hash, USER_TOKEN);
    assert.strictEqual(hash, Session.hashToken(USER_TOKEN));
    assert.notStrictEqual(hash, Session.hashToken(LANDLORD_TOKEN));
});
