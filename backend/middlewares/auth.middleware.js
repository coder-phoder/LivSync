const jwt = require('jsonwebtoken');

const AUTH_COOKIE_NAME = 'livsync_session';
const COOKIE_DURATION = 7 * 24 * 60 * 60 * 1000;

function usesSecureCookies() {
    // Render's NODE_ENV is not guaranteed, while CLIENT_URL is required for credentialed CORS.
    // Either signal means the browser reaches the application over HTTPS.
    return process.env.NODE_ENV === 'production' || (process.env.CLIENT_URL || '').startsWith('https://');
}

function getSameSitePolicy(secure) {
    const configuredPolicy = (process.env.COOKIE_SAME_SITE || '').trim().toLowerCase();

    if (['lax', 'strict', 'none'].includes(configuredPolicy)) {
        // Browsers reject SameSite=None without Secure. Keep local development usable even if
        // a production-only variable was copied into a local .env file.
        return configuredPolicy === 'none' && !secure ? 'lax' : configuredPolicy;
    }

    // The current public Render hostnames are cross-site, so their direct API fallback needs
    // None. A custom frontend/API pair under one registrable domain should explicitly use Lax
    // (COOKIE_SAME_SITE=lax), which is accepted by all major browsers.
    return secure ? 'none' : 'lax';
}

function getCookieOptions(includeMaxAge = true) {
    const secure = usesSecureCookies();
    const options = {
        httpOnly: true,
        secure,
        sameSite: getSameSitePolicy(secure),
        path: '/',
    };

    if (includeMaxAge) options.maxAge = COOKIE_DURATION;

    return options;
}

function requireAuth(req, res, next) {
    try {
        const token = req.cookies[AUTH_COOKIE_NAME];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required',
                data: {},
            });
        }

        const payload = jwt.verify(token, process.env.JWT_SECRET);

        if (!payload.userId) {
            throw new Error('Invalid user session');
        }

        req.userId = payload.userId;
        return next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired session',
            data: {},
        });
    }
}

// Tenants and landlords are separate collections with separate tokens, so shared flows
// (messaging, rentals) accept either session and reduce it to { id, role }.
function requireParticipant(req, res, next) {
    try {
        const payload = jwt.verify(req.cookies[AUTH_COOKIE_NAME], process.env.JWT_SECRET);

        if (payload.userId) {
            req.participant = { id: payload.userId, role: 'user' };
            return next();
        }

        if (payload.landlordId) {
            req.participant = { id: payload.landlordId, role: 'landlord' };
            return next();
        }

        throw new Error('Invalid session');
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired session',
            data: {},
        });
    }
}

function requireRole(role, message) {
    return function checkRole(req, res, next) {
        if (req.participant.role !== role) {
            return res.status(403).json({ success: false, message, data: {} });
        }

        return next();
    };
}

module.exports = {
    AUTH_COOKIE_NAME,
    requireAuth,
    requireParticipant,
    requireRole,
    getCookieOptions,
};
