const Session = require('../models/session.model');

const BEARER = /^Bearer\s+(\S+)$/i;

function readToken(req) {
    const match = BEARER.exec(req.get('authorization') || '');

    return match ? match[1] : '';
}

function unauthorized(res, message = 'Please log in to continue') {
    return res.status(401).json({ success: false, message, data: {} });
}

// Every guard below is this one lookup plus an assertion about who the session belongs to.
// A database failure is left to throw: Express turns it into a 500, which is honest, where
// swallowing it into a 401 would sign people out over a blip.
async function loadSession(req) {
    const token = readToken(req);

    if (!token) return null;

    const session = await Session.resolve(token);

    if (session) req.sessionToken = token;

    return session;
}

async function requireAuth(req, res, next) {
    const session = await loadSession(req);

    if (session?.ownerType !== 'user') {
        return unauthorized(res);
    }

    req.userId = String(session.owner);
    return next();
}

async function requireLandlordAuth(req, res, next) {
    const session = await loadSession(req);

    if (session?.ownerType !== 'landlord') {
        return unauthorized(res, 'Please log in as a landlord to continue');
    }

    req.landlordId = String(session.owner);
    return next();
}

// Tenants and landlords are separate collections, so shared flows (messaging, rentals) accept
// either session and reduce it to { id, role }.
async function requireParticipant(req, res, next) {
    const session = await loadSession(req);

    if (!session) {
        return unauthorized(res);
    }

    req.participant = { id: String(session.owner), role: session.ownerType };
    return next();
}

function requireRole(role, message) {
    return function checkRole(req, res, next) {
        if (req.participant.role !== role) {
            return res.status(403).json({ success: false, message, data: {} });
        }

        return next();
    };
}

// An account can disappear under a live session (a database reset, a deleted profile). Drop the
// row so the token stops working, and tell the client to clear its local role state.
async function endSession(req, res, message) {
    if (req.sessionToken) await Session.revoke(req.sessionToken);

    return res.status(401).json({ success: false, message, data: {} });
}

module.exports = {
    readToken,
    requireAuth,
    requireLandlordAuth,
    requireParticipant,
    requireRole,
    endSession,
};
