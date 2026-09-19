const crypto = require('crypto');
const mongoose = require('mongoose');

const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000;

// Plain server-side sessions. The browser holds a random opaque token and sends it in an
// Authorization header, so nothing here depends on cookie policy: Safari's third-party blocking,
// SameSite, private tabs and in-app webviews all behave the same because no cookie is involved.
// Only the hash of the token is stored, so a dump of this collection cannot be replayed, and
// Mongo's TTL monitor clears expired rows without a sweeper.
const sessionSchema = new mongoose.Schema(
    {
        tokenHash: {
            type: String,
            required: true,
            unique: true,
        },
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
        },
        ownerType: {
            type: String,
            required: true,
            enum: ['user', 'landlord'],
        },
        expiresAt: {
            type: Date,
            required: true,
        },
    },
    { timestamps: true }
);

sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

sessionSchema.statics.hashToken = function hashToken(token) {
    return crypto.createHash('sha256').update(String(token)).digest('hex');
};

// Each login gets its own row, so a phone, a laptop and a tablet stay signed in side by side.
sessionSchema.statics.issue = async function issue(owner, ownerType) {
    const token = crypto.randomBytes(32).toString('hex');

    await this.create({
        tokenHash: this.hashToken(token),
        owner,
        ownerType,
        expiresAt: new Date(Date.now() + SESSION_DURATION),
    });

    return token;
};

// The TTL monitor only runs every minute or so; the date clause closes that window.
sessionSchema.statics.resolve = function resolve(token) {
    return this.findOne({ tokenHash: this.hashToken(token), expiresAt: { $gt: new Date() } });
};

sessionSchema.statics.revoke = function revoke(token) {
    return this.deleteOne({ tokenHash: this.hashToken(token) });
};

const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;
