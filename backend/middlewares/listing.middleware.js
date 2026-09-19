const { body, param, query, validationResult } = require('express-validator');

const PROPERTY_TYPES = ['apartment', 'house', 'studio', 'villa', 'room'];
const ROOM_TYPES = ['entire-place', 'private-room', 'shared-room'];
const LISTING_STATUSES = ['published', 'rented', 'archived'];
const URL_OPTIONS = { protocols: ['http', 'https'], require_protocol: true };
// Both shapes Drive hands out: /file/d/<id>/view and ...?id=<id>
const DRIVE_FILE_ID = /^https:\/\/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?[^\s]*id=)([\w-]{10,})/;
// Both shapes a shared folder gets: /drive/folders/<id> and /drive/u/0/folders/<id>, with or without ?usp=
const DRIVE_FOLDER_ID = /^https:\/\/drive\.google\.com\/drive\/(?:u\/\d+\/)?folders\/([\w-]{10,})/;

const validateListingCreation = [
    body('title').trim().isLength({ min: 5, max: 120 }).withMessage('Title must be 5 to 120 characters'),
    body('description').trim().isLength({ min: 20, max: 3000 }).withMessage('Description must be 20 to 3000 characters'),
    body('propertyType').isIn(PROPERTY_TYPES).withMessage('Enter a valid property type'),
    body('roomType').isIn(ROOM_TYPES).withMessage('Enter a valid room type'),
    body('location.address').trim().isLength({ min: 5, max: 250 }).withMessage('Enter a valid address'),
    body('location.city').trim().isLength({ min: 2, max: 80 }).withMessage('Enter a valid city'),
    body('location.state').trim().isLength({ min: 2, max: 80 }).withMessage('Enter a valid state'),
    body('location.postalCode').trim().isLength({ min: 3, max: 20 }).withMessage('Enter a valid postal code'),
    body('bedrooms').isInt({ min: 0, max: 50 }).withMessage('Bedrooms must be between 0 and 50').toInt(),
    body('bathrooms').isFloat({ min: 0, max: 50 }).withMessage('Bathrooms must be between 0 and 50').toFloat(),
    body('areaSqFt').isFloat({ min: 1 }).withMessage('Area must be greater than zero').toFloat(),
    body('furnished').optional().isBoolean().withMessage('Furnished must be true or false').toBoolean(),
    body('rent').custom(isRentObject),
    body('rent.coldRent').isFloat({ min: 0 }).withMessage('Cold rent must be zero or greater').toFloat(),
    body('rent.utilities').optional().isFloat({ min: 0 }).withMessage('Utilities must be zero or greater').toFloat(),
    body('rent.otherMonthlyCharges').optional().isFloat({ min: 0 }).withMessage('Other monthly charges must be zero or greater').toFloat(),
    body('securityDeposit').optional().isFloat({ min: 0 }).withMessage('Security deposit must be zero or greater').toFloat(),
    body('brokerageFee').optional().isFloat({ min: 0 }).withMessage('Brokerage fee must be zero or greater').toFloat(),
    body('photos').optional().isArray({ max: 10 }).withMessage('Photos must contain at most 10 URLs'),
    body('photos.*').optional().isURL(URL_OPTIONS).withMessage('Photos must be valid URLs'),
    body('floorPlanUrl').optional().isURL(URL_OPTIONS).withMessage('Floor plan must be a valid URL'),
    body('virtualTourUrl').optional().isURL(URL_OPTIONS).withMessage('Virtual tour must be a valid URL'),
    body('modelUrl').optional().custom(isDriveLink),
    body('mediaFolderUrl').optional().custom(isDriveFolderLink),
    body('amenities').optional().isArray({ max: 30 }).withMessage('Amenities must contain at most 30 items'),
    body('amenities.*').optional().trim().isLength({ min: 1, max: 60 }).withMessage('Amenities must be 1 to 60 characters'),
    validateDocumentRequirements(),
    body('availableFrom').isISO8601().toDate().withMessage('Enter a valid availability date'),
    body('status').optional().isIn(LISTING_STATUSES).withMessage('Enter a valid listing status'),
    handleValidationErrors,
];

const validateListingUpdate = [
    body('title').optional().trim().isLength({ min: 5, max: 120 }).withMessage('Title must be 5 to 120 characters'),
    body('description').optional().trim().isLength({ min: 20, max: 3000 }).withMessage('Description must be 20 to 3000 characters'),
    body('propertyType').optional().isIn(PROPERTY_TYPES).withMessage('Enter a valid property type'),
    body('roomType').optional().isIn(ROOM_TYPES).withMessage('Enter a valid room type'),
    body('location').optional().custom(isLocationObject),
    body('location.address').optional().trim().isLength({ min: 5, max: 250 }).withMessage('Enter a valid address'),
    body('location.city').optional().trim().isLength({ min: 2, max: 80 }).withMessage('Enter a valid city'),
    body('location.state').optional().trim().isLength({ min: 2, max: 80 }).withMessage('Enter a valid state'),
    body('location.postalCode').optional().trim().isLength({ min: 3, max: 20 }).withMessage('Enter a valid postal code'),
    body('bedrooms').optional().isInt({ min: 0, max: 50 }).withMessage('Bedrooms must be between 0 and 50').toInt(),
    body('bathrooms').optional().isFloat({ min: 0, max: 50 }).withMessage('Bathrooms must be between 0 and 50').toFloat(),
    body('areaSqFt').optional().isFloat({ min: 1 }).withMessage('Area must be greater than zero').toFloat(),
    body('furnished').optional().isBoolean().withMessage('Furnished must be true or false').toBoolean(),
    body('rent').optional().custom(isRentObject),
    body('rent.coldRent').optional().isFloat({ min: 0 }).withMessage('Cold rent must be zero or greater').toFloat(),
    body('rent.utilities').optional().isFloat({ min: 0 }).withMessage('Utilities must be zero or greater').toFloat(),
    body('rent.otherMonthlyCharges').optional().isFloat({ min: 0 }).withMessage('Other monthly charges must be zero or greater').toFloat(),
    body('securityDeposit').optional().isFloat({ min: 0 }).withMessage('Security deposit must be zero or greater').toFloat(),
    body('brokerageFee').optional().isFloat({ min: 0 }).withMessage('Brokerage fee must be zero or greater').toFloat(),
    body('photos').optional().isArray({ max: 10 }).withMessage('Photos must contain at most 10 URLs'),
    body('photos.*').optional().isURL(URL_OPTIONS).withMessage('Photos must be valid URLs'),
    body('floorPlanUrl').optional().isURL(URL_OPTIONS).withMessage('Floor plan must be a valid URL'),
    body('virtualTourUrl').optional().isURL(URL_OPTIONS).withMessage('Virtual tour must be a valid URL'),
    body('modelUrl').optional().custom(isDriveLink),
    body('mediaFolderUrl').optional().custom(isDriveFolderLink),
    body('amenities').optional().isArray({ max: 30 }).withMessage('Amenities must contain at most 30 items'),
    body('amenities.*').optional().trim().isLength({ min: 1, max: 60 }).withMessage('Amenities must be 1 to 60 characters'),
    validateDocumentRequirements(),
    body('availableFrom').optional().isISO8601().toDate().withMessage('Enter a valid availability date'),
    body('status').optional().isIn(LISTING_STATUSES).withMessage('Enter a valid listing status'),
    handleValidationErrors,
];

const validateListingId = [
    param('listingId').isMongoId().withMessage('Invalid listing id'),
    handleValidationErrors,
];

const validateListingQuery = [
    query('city').optional().trim().isLength({ min: 2, max: 80 }).withMessage('Enter a valid city'),
    query('propertyType').optional().isIn(PROPERTY_TYPES).withMessage('Enter a valid property type'),
    query('roomType').optional().isIn(ROOM_TYPES).withMessage('Enter a valid room type'),
    query('minRent').optional().isFloat({ min: 0 }).withMessage('Minimum rent must be zero or greater').toFloat(),
    query('maxRent')
        .optional()
        .isFloat({ min: 0 }).withMessage('Maximum rent must be zero or greater')
        .toFloat()
        .custom((value, { req }) => {
            if (req.query.minRent !== undefined && value < req.query.minRent) {
                throw new Error('Maximum rent must be greater than or equal to minimum rent');
            }

            return true;
        }),
    query('minBedrooms').optional().isInt({ min: 0, max: 50 }).withMessage('Minimum bedrooms must be between 0 and 50').toInt(),
    query('furnished').optional().isBoolean().withMessage('Furnished must be true or false').toBoolean(),
    query('availableFrom').optional().isISO8601().toDate().withMessage('Enter a valid availability date'),
    query('verifiedLandlord').optional().isBoolean().withMessage('Verified landlord must be true or false').toBoolean(),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be at least 1').toInt(),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50').toInt(),
    query('sort').optional().isIn(['newest', 'rent_asc', 'rent_desc']).withMessage('Enter a valid sort option'),
    handleValidationErrors,
];

function isDriveLink(value) {
    if (!DRIVE_FILE_ID.test(String(value))) {
        throw new Error('The 3D model must be a Google Drive share link, like https://drive.google.com/file/d/FILE_ID/view');
    }

    return true;
}

function isDriveFolderLink(value) {
    if (!DRIVE_FOLDER_ID.test(String(value))) {
        throw new Error('The media folder must be a Google Drive folder link, like https://drive.google.com/drive/folders/FOLDER_ID');
    }

    return true;
}

function isRentObject(value) {
    if (!value || Array.isArray(value) || typeof value !== 'object') {
        throw new Error('Rent must be an object');
    }

    return true;
}

function isLocationObject(value) {
    if (!value || Array.isArray(value) || typeof value !== 'object') {
        throw new Error('Location must be an object');
    }

    return true;
}

function validateDocumentRequirements() {
    return body('documentRequirements')
        .optional()
        .isArray({ max: 12 }).withMessage('You can request up to 12 documents')
        .bail()
        .custom((requirements) => {
            const names = new Set();

            for (const requirement of requirements) {
                const name = String(requirement?.name || '').trim();
                const key = name.toLocaleLowerCase();

                if (name.length < 2 || name.length > 100) {
                    throw new Error('Each requested document must be 2 to 100 characters');
                }

                if (names.has(key)) throw new Error('Each requested document must be listed once');
                names.add(key);
            }

            return true;
        });
}

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
    validateListingCreation,
    validateListingUpdate,
    validateListingId,
    validateListingQuery,
};
