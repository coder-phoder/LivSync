const Landlord = require('../models/landlord.model');
const Session = require('../models/session.model');
const { endSession } = require('../middlewares/auth.middleware');
const { issueOtpQuietly } = require('./verification.controller');

function invalidateLandlordSession(req, res) {
    return endSession(req, res, 'Your landlord session is no longer valid. Please log in again.');
}

function serializeLandlord(landlord) {
    return {
        id: landlord._id,
        name: landlord.name,
        phone: landlord.phone,
        email: landlord.email,
        emailVerified: landlord.emailVerified,
        emailVerifiedAt: landlord.emailVerifiedAt || null,
        businessType: landlord.businessType,
        companyName: landlord.companyName,
        address: landlord.address,
        city: landlord.city,
        propertyTypes: landlord.propertyTypes,
        profileDescription: landlord.profileDescription,
        verificationStatus: landlord.verificationStatus,
        hasSignature: Boolean(landlord.signature?.signedAt),
        signedAt: landlord.signature?.signedAt || null,
        createdAt: landlord.createdAt,
        updatedAt: landlord.updatedAt,
    };
}

async function registerLandlord(req, res) {
    try {
        const {
            name,
            phone,
            email,
            password,
            businessType,
            companyName,
            address,
            city,
            propertyTypes,
            profileDescription,
        } = req.body;
        const existingLandlord = await Landlord.findOne({ $or: [{ email }, { phone }] });

        if (existingLandlord) {
            const message = existingLandlord.email === email ? 'Email is already registered' : 'Phone is already registered';
            return res.status(409).json({ success: false, message, data: {} });
        }

        const landlord = await Landlord.create({
            name,
            phone,
            email,
            password,
            businessType,
            companyName,
            address,
            city,
            propertyTypes,
            profileDescription,
        });
        const token = await Session.issue(landlord.id, 'landlord');

        issueOtpQuietly(landlord, 'landlord');

        return res.status(201).json({
            success: true,
            message: 'Landlord registered successfully',
            data: { token, landlord: serializeLandlord(landlord) },
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
            message: 'Unable to register landlord',
            data: {},
        });
    }
}

async function loginLandlord(req, res) {
    try {
        const { identifier, password } = req.body;
        const loginIdentifier = identifier.trim();
        const query = loginIdentifier.includes('@')
            ? { email: loginIdentifier.toLowerCase() }
            : { phone: loginIdentifier };
        const landlord = await Landlord.findOne(query).select('+password');

        if (!landlord || !(await landlord.comparePassword(password))) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password',
                data: {},
            });
        }

        const token = await Session.issue(landlord.id, 'landlord');

        return res.json({
            success: true,
            message: 'Landlord login successful',
            data: { token, landlord: serializeLandlord(landlord) },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Unable to log in landlord',
            data: {},
        });
    }
}

async function logoutLandlord(req, res) {
    try {
        await Session.revoke(req.sessionToken);

        return res.json({
            success: true,
            message: 'Landlord logout successful',
            data: {},
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Unable to log out landlord',
            data: {},
        });
    }
}

async function getLandlordProfile(req, res) {
    try {
        const landlord = await Landlord.findById(req.landlordId);

        if (!landlord) {
            return invalidateLandlordSession(req, res);
        }

        res.set('Cache-Control', 'private, no-store');
        return res.json({
            success: true,
            message: 'Landlord profile retrieved successfully',
            data: { landlord: serializeLandlord(landlord) },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Unable to retrieve landlord profile',
            data: {},
        });
    }
}

async function saveLandlordSignature(req, res) {
    try {
        const landlord = await Landlord.findByIdAndUpdate(
            req.landlordId,
            { $set: { signature: { dataUrl: req.body.dataUrl, signedAt: new Date() } } },
            { new: true }
        );

        if (!landlord) {
            return invalidateLandlordSession(req, res);
        }

        return res.json({
            success: true,
            message: 'Signature saved successfully',
            data: { landlord: serializeLandlord(landlord) },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Unable to save signature',
            data: {},
        });
    }
}

module.exports = {
    registerLandlord,
    loginLandlord,
    logoutLandlord,
    getLandlordProfile,
    saveLandlordSignature,
    invalidateLandlordSession,
};
