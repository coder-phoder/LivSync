const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const Landlord = require('../models/landlord.model');
const { AUTH_COOKIE_NAME, getCookieOptions } = require('../middlewares/auth.middleware');

function noActiveSession(res, clearCookie = false) {
    const response = clearCookie ? res.clearCookie(AUTH_COOKIE_NAME, getCookieOptions(false)) : res;

    response.set('Cache-Control', 'private, no-store');
    return response.json({
        success: true,
        message: 'No active session',
        data: { session: null },
    });
}

async function getSession(req, res) {
    try {
        const token = req.cookies[AUTH_COOKIE_NAME];

        if (!token) {
            return noActiveSession(res);
        }

        const payload = jwt.verify(token, process.env.JWT_SECRET);
        const isUser = Boolean(payload.userId);
        const accountId = payload.userId || payload.landlordId;

        if (!accountId) {
            return noActiveSession(res, true);
        }

        const account = isUser
            ? await User.findById(accountId).select('phone')
            : await Landlord.findById(accountId).select('phone');

        if (!account) {
            return noActiveSession(res, true);
        }

        res.set('Cache-Control', 'private, no-store');
        return res.json({
            success: true,
            message: 'Session restored',
            data: {
                session: {
                    role: isUser ? 'user' : 'landlord',
                    phone: account.phone,
                },
            },
        });
    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return noActiveSession(res, true);
        }

        return res.status(500).json({
            success: false,
            message: 'Unable to restore your session',
            data: {},
        });
    }
}

module.exports = { getSession };
