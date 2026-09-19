const axios = require('axios');
const geocoding = require('@mapbox/mapbox-sdk/services/geocoding');
const Listing = require('../models/listing.model');
const Landlord = require('../models/landlord.model');
const { notifyMatchingListing } = require('./listing-alert.controller');

const LANDLORD_FIELDS = 'name companyName businessType verificationStatus emailVerified';
// A rented listing stays readable so tenants see it marked sold out; an archived one is gone.
const TENANT_VISIBLE = ['published', 'rented'];
const EDITABLE_FIELDS = [
    'title',
    'description',
    'propertyType',
    'roomType',
    'bedrooms',
    'bathrooms',
    'areaSqFt',
    'furnished',
    'securityDeposit',
    'brokerageFee',
    'photos',
    'floorPlanUrl',
    'virtualTourUrl',
    'modelUrl',
    'mediaFolderUrl',
    'amenities',
    'documentRequirements',
    'availableFrom',
    'status',
];
const LOCATION_FIELDS = ['address', 'city', 'state', 'postalCode'];
const DRIVE_FILE_ID = /(?:\/d\/|[?&]id=)([\w-]{10,})/;
const MAX_FOLDER_PHOTOS = 24;
const DRIVE_FOLDER_ID = /folders\/([\w-]{10,})/;
// Drive serves these two straight to a browser for any file shared "anyone with the link":
// an <img> for a still, and a player in an <iframe> for a clip.
const driveImage = (id, width) => `https://drive.google.com/thumbnail?id=${id}&sz=w${width}`;
const drivePlayer = (id) => `https://drive.google.com/file/d/${id}/preview`;
const driveFolderId = (url) => DRIVE_FOLDER_ID.exec(url || '')?.[1] || '';

// Whatever else the landlord keeps in the folder — a PDF, a spreadsheet, a subfolder — is not media.
function toMedia(files = []) {
    return files
        .filter((file) => /^(image|video)\//.test(file.mimeType || ''))
        .map((file) => {
            const isVideo = file.mimeType.startsWith('video/');

            return {
                id: file.id,
                name: file.name,
                kind: isVideo ? 'video' : 'image',
                src: isVideo ? drivePlayer(file.id) : driveImage(file.id, 1600),
                poster: driveImage(file.id, 800),
            };
        });
}

// The folder is read once, when the landlord saves, and its contents become the listing's own
// photos. Every card, thumbnail and gallery downstream then works off `photos` as it always has,
// with no Drive call in the way of a page load.
async function resolveFolderMedia(folderUrl) {
    const folderId = driveFolderId(folderUrl);

    if (!folderId) throw new Error('The media folder must be a Google Drive folder link');
    if (!process.env.GOOGLE_DRIVE_API_KEY) throw new Error('Google Drive is not configured on the server');

    let files;

    try {
        const drive = await axios.get('https://www.googleapis.com/drive/v3/files', {
            params: {
                // folderId comes from the regex above, so it cannot carry a quote out of the link.
                q: `'${folderId}' in parents and trashed = false`,
                key: process.env.GOOGLE_DRIVE_API_KEY,
                fields: 'files(id,name,mimeType)',
                orderBy: 'name',
                pageSize: 100,
            },
            timeout: 15000,
        });

        files = drive.data?.files || [];

        // A folder that is not shared publicly lists as empty rather than failing, so an empty
        // answer is checked against the folder itself before it is taken at face value.
        if (!files.length) {
            await axios.get(`https://www.googleapis.com/drive/v3/files/${folderId}`, {
                params: { key: process.env.GOOGLE_DRIVE_API_KEY, fields: 'id' },
                timeout: 15000,
            });
        }
    } catch (error) {
        console.error('Drive folder read failed:', error.message);

        throw new Error([403, 404].includes(error.response?.status)
            ? 'That Google Drive folder is not shared publicly. Set it to "anyone with the link".'
            : 'Unable to read that Google Drive folder');
    }

    const media = toMedia(files);

    if (!media.length) throw new Error('That Google Drive folder has no images or videos in it');

    return {
        photos: media.filter((item) => item.kind === 'image').map((item) => item.src).slice(0, MAX_FOLDER_PHOTOS),
        videos: media.filter((item) => item.kind === 'video').map(({ id, src, poster }) => ({ id, src, poster })),
    };
}

function hasOwnProperty(object, key) {
    return Object.prototype.hasOwnProperty.call(object, key);
}

function getSortOption(sort) {
    if (sort === 'rent_asc') return { 'rent.coldRent': 1 };
    if (sort === 'rent_desc') return { 'rent.coldRent': -1 };

    return { createdAt: -1 };
}

function applyListingUpdates(listing, changes) {
    EDITABLE_FIELDS.forEach((field) => {
        if (hasOwnProperty(changes, field)) {
            listing[field] = changes[field];
        }
    });

    if (changes.location) {
        LOCATION_FIELDS.forEach((field) => {
            if (hasOwnProperty(changes.location, field)) {
                listing.location[field] = changes.location[field];
            }
        });
    }

    if (changes.rent) {
        RENT_FIELDS.forEach((field) => {
            if (hasOwnProperty(changes.rent, field)) {
                listing.rent[field] = changes.rent[field];
            }
        });
    }
}

async function createListing(req, res) {
    try {
        const landlordExists = await Landlord.exists({ _id: req.landlordId });

        if (!landlordExists) {
            return res.status(404).json({
                success: false,
                message: 'Landlord not found',
                data: {},
            });
        }

        const data = getListingData(req.body);

        if (data.mediaFolderUrl) Object.assign(data, await resolveFolderMedia(data.mediaFolderUrl));

        const listing = await Listing.create({
            ...data,
            landlord: req.landlordId,
        });
        await listing.populate('landlord', LANDLORD_FIELDS);

        // Alerts must never make a successfully created home look like a failed listing to its landlord.
        try {
            await notifyMatchingListing(listing);
        } catch (error) {
            console.error('Unable to create listing alerts:', error.message);
        }

        return res.status(201).json({
            success: true,
            message: 'Listing created successfully',
            data: { listing },
        });
    } catch (error) {
        return res.status(error.message.includes('Drive') || error.message.includes('folder') ? 400 : 500).json({
            success: false,
            message: error.message.includes('folder') ? error.message : 'Unable to create listing',
            data: {},
        });
    }
}

async function getListings(req, res) {
    try {
        const {
            city,
            propertyType,
            roomType,
            minRent,
            maxRent,
            minBedrooms,
            furnished,
            availableFrom,
            verifiedLandlord,
            page = 1,
            limit = 12,
            sort,
        } = req.query;
        const filters = { status: { $in: TENANT_VISIBLE } };

        if (city) filters['location.city'] = new RegExp(`^${escapeRegExp(city)}$`, 'i');
        if (propertyType) filters.propertyType = propertyType;
        if (roomType) filters.roomType = roomType;
        if (minBedrooms !== undefined) filters.bedrooms = { $gte: minBedrooms };
        if (furnished !== undefined) filters.furnished = furnished;
        if (minRent !== undefined || maxRent !== undefined) {
            filters['rent.coldRent'] = {};
            if (minRent !== undefined) filters['rent.coldRent'].$gte = minRent;
            if (maxRent !== undefined) filters['rent.coldRent'].$lte = maxRent;
        }
        if (availableFrom) filters.availableFrom = { $lte: availableFrom };

        if (verifiedLandlord) {
            filters.landlord = {
                $in: await Landlord.distinct('_id', { emailVerified: true }),
            };
        }

        const [listings, total] = await Promise.all([
            Listing.find(filters)
                .populate('landlord', LANDLORD_FIELDS)
                .sort(getSortOption(sort))
                .skip((page - 1) * limit)
                .limit(limit),
            Listing.countDocuments(filters),
        ]);

        return res.json({
            success: true,
            message: 'Listings retrieved successfully',
            data: {
                listings,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Unable to retrieve listings',
            data: {},
        });
    }
}

async function getListingById(req, res) {
    try {
        const listing = await Listing.findOne({
            _id: req.params.listingId,
            status: { $in: TENANT_VISIBLE },
        }).populate('landlord', LANDLORD_FIELDS);

        if (!listing) {
            return res.status(404).json({
                success: false,
                message: 'Listing not found',
                data: {},
            });
        }

        return res.json({
            success: true,
            message: 'Listing retrieved successfully',
            data: { listing },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Unable to retrieve listing',
            data: {},
        });
    }
}

// Geocoding is intentionally performed only when a visitor opens a map. This keeps
// temporary Mapbox Geocoding results out of the database and avoids map lookups for
// listings that are never viewed.
async function getListingMap(req, res) {
    try {
        const listing = await Listing.findOne({
            _id: req.params.listingId,
            status: { $in: TENANT_VISIBLE },
        }).select('title location');

        if (!listing) {
            return res.status(404).json({
                success: false,
                message: 'Listing not found',
                data: {},
            });
        }

        const accessToken = getPublicMapToken();
        const coordinates = await geocodeLocation(listing.location, accessToken);

        return res.json({
            success: true,
            message: 'Listing map retrieved successfully',
            data: { coordinates, accessToken },
        });
    } catch (error) {
        console.error('Listing map lookup failed:', error.message);

        return res.status(error.statusCode || 502).json({
            success: false,
            message: error.expose ? error.message : 'Unable to load the listing map',
            data: {},
        });
    }
}

// Drive sends no CORS headers, so the browser cannot load the .glb itself: we stream it through instead.
async function getListingModel(req, res) {
    try {
        const listing = await Listing.findOne({
            _id: req.params.listingId,
            status: { $in: TENANT_VISIBLE },
        }).select('modelUrl');
        const fileId = DRIVE_FILE_ID.exec(listing?.modelUrl || '')?.[1];

        if (!fileId) {
            return res.status(404).json({
                success: false,
                message: 'This listing has no 3D model',
                data: {},
            });
        }

        // confirm=t skips the virus-scan interstitial Drive puts in front of larger files.
        const drive = await axios.get('https://drive.usercontent.google.com/download', {
            params: { id: fileId, export: 'download', confirm: 't' },
            responseType: 'stream',
            timeout: 30000,
        });

        // A private or missing file comes back as an HTML sign-in page rather than the model.
        if (String(drive.headers['content-type'] || '').includes('text/html')) {
            drive.data.destroy();

            return res.status(502).json({
                success: false,
                message: 'The 3D model is not shared publicly on Google Drive',
                data: {},
            });
        }

        res.set('Content-Type', 'model/gltf-binary');
        res.set('Cache-Control', 'public, max-age=3600');
        if (drive.headers['content-length']) res.set('Content-Length', drive.headers['content-length']);

        drive.data.on('error', () => res.destroy());

        return drive.data.pipe(res);
    } catch (error) {
        console.error('Listing model fetch failed:', error.message);

        return res.status(502).json({
            success: false,
            message: 'Unable to load the 3D model',
            data: {},
        });
    }
}

async function getOwnListings(req, res) {
    try {
        const listings = await Listing.find({ landlord: req.landlordId })
            .populate('landlord', LANDLORD_FIELDS)
            .sort({ createdAt: -1 });

        return res.json({
            success: true,
            message: 'Landlord listings retrieved successfully',
            data: { listings },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Unable to retrieve landlord listings',
            data: {},
        });
    }
}

async function updateListing(req, res) {
    try {
        const listing = await Listing.findOne({
            _id: req.params.listingId,
            landlord: req.landlordId,
        });

        if (!listing) {
            return res.status(404).json({
                success: false,
                message: 'Listing not found or access denied',
                data: {},
            });
        }

        if (!hasEditableChanges(req.body)) {
            return res.status(400).json({
                success: false,
                message: 'Provide at least one editable listing field',
                data: {},
            });
        }

        const wasPublished = listing.status === 'published';

        applyListingUpdates(listing, req.body);

        // Re-reading the folder on every save is also how a landlord refreshes it after adding files.
        if (req.body.mediaFolderUrl) {
            Object.assign(listing, await resolveFolderMedia(req.body.mediaFolderUrl));
        }

        await listing.save();
        await listing.populate('landlord', LANDLORD_FIELDS);

        if (!wasPublished && listing.status === 'published') {
            try {
                await notifyMatchingListing(listing);
            } catch (error) {
                console.error('Unable to create listing alerts:', error.message);
            }
        }

        return res.json({
            success: true,
            message: 'Listing updated successfully',
            data: { listing },
        });
    } catch (error) {
        return res.status(error.message.includes('Drive') || error.message.includes('folder') ? 400 : 500).json({
            success: false,
            message: error.message.includes('folder') ? error.message : 'Unable to update listing',
            data: {},
        });
    }
}

async function deleteListing(req, res) {
    try {
        const listing = await Listing.findOneAndDelete({
            _id: req.params.listingId,
            landlord: req.landlordId,
        });

        if (!listing) {
            return res.status(404).json({
                success: false,
                message: 'Listing not found or access denied',
                data: {},
            });
        }

        return res.json({
            success: true,
            message: 'Listing deleted successfully',
            data: {},
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Unable to delete listing',
            data: {},
        });
    }
}

function hasEditableChanges(changes) {
    return EDITABLE_FIELDS.some((field) => hasOwnProperty(changes, field))
        || (changes.location && LOCATION_FIELDS.some((field) => hasOwnProperty(changes.location, field)))
        || (changes.rent && RENT_FIELDS.some((field) => hasOwnProperty(changes.rent, field)));
}

function getListingData(data) {
    return {
        title: data.title,
        description: data.description,
        propertyType: data.propertyType,
        roomType: data.roomType,
        location: {
            address: data.location.address,
            city: data.location.city,
            state: data.location.state,
            postalCode: data.location.postalCode,
        },
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        areaSqFt: data.areaSqFt,
        furnished: data.furnished,
        rent: {
            coldRent: data.rent.coldRent,
            utilities: data.rent.utilities,
            otherMonthlyCharges: data.rent.otherMonthlyCharges,
        },
        securityDeposit: data.securityDeposit,
        brokerageFee: data.brokerageFee,
        photos: data.photos,
        floorPlanUrl: data.floorPlanUrl,
        virtualTourUrl: data.virtualTourUrl,
        modelUrl: data.modelUrl,
        amenities: data.amenities,
        documentRequirements: data.documentRequirements,
        availableFrom: data.availableFrom,
        status: data.status,
    };
}

function getPublicMapToken() {
    const accessToken = String(process.env.MAP_TOKEN || '').trim();

    if (!accessToken || !accessToken.startsWith('pk.')) {
        const error = new Error('Map service is not configured with a public MAP_TOKEN');
        error.statusCode = 503;
        error.expose = true;
        throw error;
    }

    return accessToken;
}

async function geocodeLocation(location, accessToken) {
    const query = [location.address, location.city, location.state, location.postalCode]
        .filter(Boolean)
        .join(', ');
    const response = await geocoding({ accessToken })
        .forwardGeocode({ query, limit: 1, autocomplete: false })
        .send();
    const coordinates = response.body?.features?.[0]?.center;

    if (!hasValidCoordinates(coordinates)) {
        const error = new Error('We could not find this listing address on the map');
        error.statusCode = 422;
        error.expose = true;
        throw error;
    }

    return coordinates;
}

function hasValidCoordinates(coordinates) {
    return Array.isArray(coordinates)
        && coordinates.length === 2
        && coordinates.every(Number.isFinite)
        && coordinates[0] >= -180
        && coordinates[0] <= 180
        && coordinates[1] >= -90
        && coordinates[1] <= 90;
}

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
    createListing,
    getListings,
    getListingById,
    getListingMap,
    getListingModel,
    driveFolderId,
    toMedia,
    resolveFolderMedia,
    getOwnListings,
    updateListing,
    deleteListing,
};
