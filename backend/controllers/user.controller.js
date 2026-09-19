const User = require('../models/user.model');
const Session = require('../models/session.model');
const { endSession } = require('../middlewares/auth.middleware');
const { issueOtpQuietly } = require('./verification.controller');

function invalidateUserSession(req, res) {
    return endSession(req, res, 'Your session is no longer valid. Please log in again.');
}

function serializeUser(user) {
    return {
        id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        emailVerified: user.emailVerified,
        emailVerifiedAt: user.emailVerifiedAt || null,
        dob: user.dob,
        gender: user.gender,
        role: user.role,
        preferences: user.preferences,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    };
}

async function registerUser(req, res) {
    try {
        const { name, phone, email, dob, gender, password, role } = req.body;
        const existingUser = await User.findOne({ $or: [{ email }, { phone }] });

        if (existingUser) {
            const message = existingUser.email === email ? 'Email is already registered' : 'Phone is already registered';
            return res.status(409).json({ success: false, message, data: {} });
        }

        const user = await User.create({ name, phone, email, dob, gender, password, role });
        const token = await Session.issue(user.id, 'user');

        issueOtpQuietly(user, 'user');

        return res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: { token, user: serializeUser(user) },
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'Email or phone is already registered',
                data: {},
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Unable to register user',
            data: {},
        });
    }
}

async function loginUser(req, res) {
    try {
        const { identifier, password } = req.body;
        const loginIdentifier = identifier.trim();
        const query = loginIdentifier.includes('@')
            ? { email: loginIdentifier.toLowerCase() }
            : { phone: loginIdentifier };
        const user = await User.findOne(query).select('+password');

        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password',
                data: {},
            });
        }

        const token = await Session.issue(user.id, 'user');

        return res.json({
            success: true,
            message: 'Login successful',
            data: { token, user: serializeUser(user) },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Unable to log in',
            data: {},
        });
    }
}

async function logoutUser(req, res) {
    try {
        await Session.revoke(req.sessionToken);

        return res.json({
            success: true,
            message: 'Logout successful',
            data: {},
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Unable to log out',
            data: {},
        });
    }
}

async function getUserProfile(req, res) {
    try {
        const user = await User.findById(req.userId);

        if (!user) {
            return invalidateUserSession(req, res);
        }

        res.set('Cache-Control', 'private, no-store');
        return res.json({
            success: true,
            message: 'User profile retrieved successfully',
            data: { user: serializeUser(user) },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Unable to retrieve user profile',
            data: {},
        });
    }
}

// Preferences are merged, so a form that posts one section never blanks the others.
async function updateUserPreferences(req, res) {
    try {
        const user = await User.findById(req.userId);

        if (!user) {
            return invalidateUserSession(req, res);
        }

        user.preferences = { ...user.preferences?.toObject(), ...req.body.preferences };
        await user.save();

        return res.json({
            success: true,
            message: 'Preferences saved successfully',
            data: { user: serializeUser(user) },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Unable to save your preferences',
            data: {},
        });
    }
}

module.exports = { registerUser, loginUser, logoutUser, getUserProfile, updateUserPreferences, invalidateUserSession };
