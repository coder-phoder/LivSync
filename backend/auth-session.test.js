const test = require('node:test');
const assert = require('node:assert');
const { invalidateLandlordSession } = require('./controllers/landlord.controller');
const { invalidateUserSession } = require('./controllers/user.controller');

function responseSpy() {
    return {
        cookie: null,
        statusCode: null,
        body: null,
        clearCookie(name, options) {
            this.cookie = { name, options };
            return this;
        },
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

test('a missing landlord account invalidates its stale browser session', () => {
    const res = responseSpy();

    invalidateLandlordSession(res);

    assert.strictEqual(res.cookie.name, 'token');
    assert.strictEqual(res.statusCode, 401);
    assert.deepStrictEqual(res.body, {
        success: false,
        message: 'Your landlord session is no longer valid. Please log in again.',
        data: {},
    });
});

test('a missing tenant account invalidates its stale browser session', () => {
    const res = responseSpy();

    invalidateUserSession(res);

    assert.strictEqual(res.cookie.name, 'token');
    assert.strictEqual(res.statusCode, 401);
    assert.deepStrictEqual(res.body, {
        success: false,
        message: 'Your session is no longer valid. Please log in again.',
        data: {},
    });
});
