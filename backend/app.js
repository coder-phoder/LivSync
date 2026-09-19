const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const connectToDb = require('./db/db');
const userRoutes = require('./routes/user.routes');
const landlordRoutes = require('./routes/landlord.routes');
const listingRoutes = require('./routes/listing.routes');
const messageRoutes = require('./routes/message.routes');
const rentalRoutes = require('./routes/rental.routes');
const buddyRoutes = require('./routes/buddy.routes');
const callRoutes = require('./routes/call.routes');
const verificationRoutes = require('./routes/verification.routes');
const savedListingRoutes = require('./routes/saved-listing.routes');
const listingAlertRoutes = require('./routes/listing-alert.routes');
const tenantDocumentRoutes = require('./routes/tenant-document.routes');
const sessionRoutes = require('./routes/session.routes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

function getAllowedClientOrigins() {
    const configuredOrigins = process.env.CLIENT_URL || 'http://localhost:5173';

    return new Set(
        configuredOrigins
            .split(',')
            .map((origin) => origin.trim())
            .filter(Boolean)
            .map((origin) => {
                try {
                    return new URL(origin).origin;
                } catch {
                    return null;
                }
            })
            .filter(Boolean)
    );
}

const allowedClientOrigins = getAllowedClientOrigins();

app.set('trust proxy', 1);

app.use(cors({
    origin(origin, callback) {
        // Requests without Origin are server-to-server, health checks, or direct navigation.
        // Browser requests must match an explicitly configured frontend origin.
        return callback(null, !origin || allowedClientOrigins.has(origin));
    },
    credentials: true,
}));
// The raw body is kept so the Razorpay webhook signature can be checked against exactly what was sent.
app.use(express.json({ verify: (req, res, buffer) => { req.rawBody = buffer; } }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

connectToDb();

app.get('/', (req, res) => {
    res.json({ success: true, message: 'LivSync API is running', data: {} });
});

app.use('/auth', userRoutes);
app.use('/landlord', landlordRoutes);
app.use('/listings', listingRoutes);
app.use('/messages', messageRoutes);
app.use('/rentals', rentalRoutes);
app.use('/buddies', buddyRoutes);
app.use('/calls', callRoutes);
app.use('/verify', verificationRoutes);
app.use('/saved-listings', savedListingRoutes);
app.use('/listing-alerts', listingAlertRoutes);
app.use('/tenant-documents', tenantDocumentRoutes);
app.use('/session', sessionRoutes);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
