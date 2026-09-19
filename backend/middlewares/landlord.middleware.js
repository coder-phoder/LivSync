const { body, validationResult } = require('express-validator');

const PROPERTY_TYPES = ['apartment', 'house', 'room', 'commercial'];

const validateLandlordRegistration = [
    body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Name must be 2 to 80 characters'),
    body('phone').trim().matches(/^\+?[1-9]\d{7,14}$/).withMessage('Enter a valid phone number'),
    body('email').trim().isEmail().withMessage('Enter a valid email').normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('businessType').isIn(['individual', 'company']).withMessage('Business type must be individual or company'),
    body('companyName').trim().custom((value, { req }) => {
        if (req.body.businessType === 'company' && !value) {
            throw new Error('Company name is required for a company account');
        }

        if (value && value.length > 120) {
            throw new Error('Company name cannot exceed 120 characters');
        }

        return true;
    }),
    body('address').trim().isLength({ min: 5, max: 250 }).withMessage('Address must be 5 to 250 characters'),
    body('city').trim().isLength({ min: 2, max: 80 }).withMessage('City must be 2 to 80 characters'),
    body('propertyTypes').optional().isArray().withMessage('Property types must be an array'),
    body('propertyTypes.*').optional().isIn(PROPERTY_TYPES).withMessage('Enter valid property types'),
    body('profileDescription').optional().trim().isLength({ max: 500 }).withMessage('Profile description cannot exceed 500 characters'),
    handleValidationErrors,
];

const validateLandlordLogin = [
    body('identifier')
        .trim()
        .notEmpty().withMessage('Email or phone number is required')
        .bail()
        .custom((value) => {
            const isEmail = /^\S+@\S+\.\S+$/.test(value);
            const isPhone = /^\+?[1-9]\d{7,14}$/.test(value);

            if (!isEmail && !isPhone) {
                throw new Error('Enter a valid email or phone number');
            }

            return true;
        }),
    body('password').notEmpty().withMessage('Password is required'),
    handleValidationErrors,
];

// A canvas signature arrives as a PNG data URL; cap it so a huge paste cannot bloat the document.
const validateSignature = [
    body('dataUrl')
        .isString().withMessage('Signature is required')
        .bail()
        .matches(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/).withMessage('Signature must be a PNG image')
        .isLength({ max: 300000 }).withMessage('Signature image is too large'),
    handleValidationErrors,
];

function handleValidationErrors(req, res, next) {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(422).json({
            success: false,
            message: errors.array()[0].msg,
            data: {},
        });
    }

    return next();
}


module.exports = {
    validateLandlordRegistration,
    validateLandlordLogin,
    validateSignature,
};
