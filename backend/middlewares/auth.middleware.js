const jwt = require('jsonwebtoken');

const COOKIE_DURATION = 7 * 24 * 60 * 60 * 1000;
// Safari blocks third-party cookies outright, so the API has to reach the browser through the
// site's own domain (a Render rewrite of /api/* onto this service) rather than a sibling
// onrender.com subdomain. That makes the session cookie first-party, which Lax covers and every
// browser accepts. Keyed off CLIENT_URL because Render sets no NODE_ENV.
const isDeployed = (process.env.CLIENT_URL || '').startsWith('https://');

function getCookieOptions(includeMaxAge = true) {
    const options = {
        httpOnly: true,
        secure: isDeployed,
        sameSite: 'lax',
    };

    if (includeMaxAge) options.maxAge = COOKIE_DURATION;

    return options;
}

function requireAuth(req, res, next) {
    try {
        const token = req.cookies.token;

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
        const payload = jwt.verify(req.cookies.token, process.env.JWT_SECRET);

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

module.exports = { requireAuth, requireParticipant, requireRole, getCookieOptions };
