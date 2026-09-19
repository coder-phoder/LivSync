const test = require('node:test');
const assert = require('node:assert');
const { invalidateLandlordSession } = require('./controllers/landlord.controller');
const { invalidateUserSession } = require('./controllers/user.controller');
const { getSession } = require('./controllers/session.controller');
const { getCookieOptions } = require('./middlewares/auth.middleware');

function withEnvironment(overrides, callback) {
    const previous = Object.fromEntries(
        Object.keys(overrides).map((key) => [key, process.env[key]])
    );

    try {
        Object.entries(overrides).forEach(([key, value]) => {
            if (value === undefined) {
                delete process.env[key];
            } else {
                process.env[key] = value;
            }
        });
        callback();
    } finally {
        Object.entries(previous).forEach(([key, value]) => {
            if (value === undefined) {
                delete process.env[key];
            } else {
                process.env[key] = value;
            }
        });
    }
}

function responseSpy() {
    return {
        cookie: null,
        headers: {},
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
        set(name, value) {
            this.headers[name] = value;
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

    assert.strictEqual(res.cookie.name, 'livsync_session');
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

    assert.strictEqual(res.cookie.name, 'livsync_session');
    assert.strictEqual(res.statusCode, 401);
    assert.deepStrictEqual(res.body, {
        success: false,
        message: 'Your session is no longer valid. Please log in again.',
        data: {},
    });
});

test('restoring without a cookie is a normal logged-out state, not an authentication error', async () => {
    const res = responseSpy();

    await getSession({ cookies: {} }, res);

    assert.strictEqual(res.statusCode, null);
    assert.strictEqual(res.headers['Cache-Control'], 'private, no-store');
    assert.deepStrictEqual(res.body, {
        success: true,
        message: 'No active session',
        data: { session: null },
    });
});

test('HTTPS deployments issue cookies that credentialed cross-site requests can return', () => {
    withEnvironment({ NODE_ENV: undefined, CLIENT_URL: 'https://livsync.onrender.com', COOKIE_SAME_SITE: undefined }, () => {
        assert.deepStrictEqual(getCookieOptions(), {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            path: '/',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
    });
});

test('a same-site production deployment can use the browser-safe Lax policy', () => {
    withEnvironment({ NODE_ENV: 'production', CLIENT_URL: 'https://app.livsync.example', COOKIE_SAME_SITE: 'lax' }, () => {
        assert.deepStrictEqual(getCookieOptions(false), {
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            path: '/',
        });
    });
});

test('local HTTP development retains a Lax cookie policy', () => {
    withEnvironment({ NODE_ENV: 'development', CLIENT_URL: 'http://localhost:5173', COOKIE_SAME_SITE: 'none' }, () => {
        assert.deepStrictEqual(getCookieOptions(false), {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            path: '/',
        });
    });
});
