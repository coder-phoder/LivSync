const crypto = require('crypto');
const axios = require('axios');
const mongoose = require('mongoose');
const PDFDocument = require('pdfkit');
const Rental = require('../models/rental.model');
const Listing = require('../models/listing.model');
const Landlord = require('../models/landlord.model');
const Buddy = require('../models/buddy.model');
const TenantDocument = require('../models/tenant-document.model');

const RAZORPAY_ORDERS_URL = 'https://api.razorpay.com/v1/orders';
const TENANT_FIELDS = 'name email phone dob gender preferences';
const POPULATE = [
    { path: 'user', select: TENANT_FIELDS },
    { path: 'buddy', select: TENANT_FIELDS },
    { path: 'landlord', select: 'name companyName businessType email phone address city verificationStatus' },
    { path: 'listing', select: 'title location rent securityDeposit brokerageFee photos propertyType roomType areaSqFt bedrooms bathrooms furnished' },
    { path: 'documentSubmissions.document', select: 'label originalName mimeType size expiresAt createdAt' },
];

function formatMoney(value) {
    return `INR ${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Number(value) || 0)}`;
}

function formatDate(value) {
    return value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
}

function idOf(value) {
    return value?._id || value;
}

function toObjectId(value) {
    return new mongoose.Types.ObjectId(String(idOf(value)));
}

// The deal the landlord is agreeing to: one month up front, plus deposit and brokerage.
function buildTerms(listing) {
    const monthlyRent = (listing.rent.coldRent || 0) + (listing.rent.utilities || 0) + (listing.rent.otherMonthlyCharges || 0);
    const securityDeposit = listing.securityDeposit || 0;
    const brokerageFee = listing.brokerageFee || 0;

    return {
        monthlyRent,
        securityDeposit,
        brokerageFee,
        totalDue: monthlyRent + securityDeposit + brokerageFee,
    };
}

// One payable share per tenant. The requester's share is whatever they asked for — a
// percentage of the frozen total or a flat amount — clamped so both tenants owe something,
// and the buddy takes the rest, so the two shares always add back up to the exact total.
function buildPayments(rental) {
    const total = rental.terms.totalDue;

    if (!rental.buddy) {
        return [{ payer: idOf(rental.user), share: 100, amount: total }];
    }

    const asked = rental.split.mode === 'amount' ? rental.split.value : (total * rental.split.value) / 100;
    const mine = total < 2 ? total : Math.min(Math.max(Math.round(asked), 1), total - 1);
    const minePercent = total ? Math.round((mine / total) * 100) : 50;

    return [
        { payer: idOf(rental.user), share: minePercent, amount: mine },
        { payer: idOf(rental.buddy), share: 100 - minePercent, amount: total - mine },
    ];
}

function paymentFor(rental, userId) {
    return rental.payments.find((payment) => String(payment.payer) === String(idOf(userId)));
}

function timingSafeEqual(a, b) {
    const left = Buffer.from(String(a || ''));
    const right = Buffer.from(String(b || ''));

    return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function isValidPaymentSignature({ orderId, paymentId, signature, secret }) {
    const expected = crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');

    return timingSafeEqual(expected, signature);
}

function serializeParty(person, payment, viewerId) {
    return {
        id: person._id,
        name: person.name,
        email: person.email,
        phone: person.phone,
        dob: person.dob,
        gender: person.gender,
        lifestyle: person.preferences,
        mine: String(person._id) === String(viewerId),
        payment: payment && {
            share: payment.share,
            amount: payment.amount,
            mode: payment.mode || null,
            paid: Boolean(payment.paidAt),
            paidAt: payment.paidAt || null,
            receiptNo: payment.receiptNo || null,
        },
    };
}

function serializeSharedDocument(document) {
    if (!document?._id) return null;

    return {
        id: document._id,
        label: document.label,
        originalName: document.originalName,
        mimeType: document.mimeType,
        size: document.size,
        expiresAt: document.expiresAt || null,
        createdAt: document.createdAt,
    };
}

function requirementId(requirement) {
    return String(requirement.requirementId || requirement._id);
}

function missingDocumentsFor(rental, tenantId) {
    const supplied = new Set(
        rental.documentSubmissions
            .filter((submission) => String(submission.tenant) === String(tenantId) && submission.document)
            .map((submission) => String(submission.requirementId))
    );

    return rental.documentRequirements.filter((requirement) => !supplied.has(requirementId(requirement)));
}

function hasCompleteDocuments(rental) {
    return [rental.user, rental.buddy].filter(Boolean)
        .every((tenant) => missingDocumentsFor(rental, idOf(tenant)).length === 0);
}

function serializeTenantDocuments(rental, tenant, role, viewerId) {
    const tenantId = tenant.id || tenant._id;
    const submissions = rental.documentSubmissions.filter((submission) => String(submission.tenant) === String(tenantId));
    const canSeeFileDetails = role === 'landlord' || String(tenantId) === String(viewerId);

    return {
        tenantId,
        tenantName: tenant.name,
        mine: Boolean(tenant.mine),
        complete: missingDocumentsFor(rental, tenantId).length === 0,
        requirements: rental.documentRequirements.map((requirement) => {
            const submission = submissions.find((entry) => String(entry.requirementId) === requirementId(requirement));

            return {
                requirementId: requirementId(requirement),
                name: requirement.name,
                document: canSeeFileDetails ? serializeSharedDocument(submission?.document) : null,
                shared: Boolean(submission?.document),
                sharedAt: canSeeFileDetails ? submission?.sharedAt || null : null,
            };
        }),
    };
}

function serializeRental(rental, role, viewerId) {
    const isPaid = rental.status === 'paid';
    const tenants = [rental.user, rental.buddy].filter((tenant) => tenant?.name);
    const myPayment = paymentFor(rental, viewerId);
    const tenantDetails = tenants.map((tenant) => serializeParty(tenant, paymentFor(rental, tenant._id), viewerId));

    return {
        id: rental._id,
        status: rental.status,
        message: rental.message,
        preferences: rental.preferences,
        isBuddyRequest: Boolean(rental.buddy),
        split: rental.buddy ? { mode: rental.split.mode, value: rental.split.value } : null,
        terms: rental.terms?.totalDue === undefined ? null : rental.terms,
        tenants: tenantDetails,
        documentRequirements: rental.documentRequirements.map((requirement) => ({
            requirementId: requirementId(requirement),
            name: requirement.name,
        })),
        tenantDocuments: tenantDetails.map((tenant) => serializeTenantDocuments(rental, tenant, role, viewerId)),
        myPayment: myPayment ? serializeParty({ _id: idOf(viewerId) }, myPayment, viewerId).payment : null,
        agreement: rental.agreement?.number ? rental.agreement : null,
        documents: {
            // The agreement is only issued once every tenant has settled their share.
            agreement: isPaid,
            // The receipt only exists for money that actually moved through LivSync.
            receipt: Boolean(myPayment?.paidAt && myPayment.mode === 'online'),
        },
        listing: rental.listing && {
            id: rental.listing._id,
            title: rental.listing.title,
            city: rental.listing.location?.city,
            photo: rental.listing.photos?.[0] || '',
        },
        landlord: role === 'user' && rental.landlord ? {
            id: rental.landlord._id,
            name: rental.landlord.companyName || rental.landlord.name,
            verificationStatus: rental.landlord.verificationStatus,
        } : undefined,
        createdAt: rental.createdAt,
        decidedAt: rental.decidedAt,
    };
}

// A tenant reaches their own requests and the ones a buddy applied with them on.
function scopeFor(participant) {
    return participant.role === 'landlord'
        ? { landlord: participant.id }
        : { $or: [{ user: participant.id }, { buddy: participant.id }] };
}

async function findRentalFor(rentalId, participant) {
    return Rental.findOne({ _id: rentalId, ...scopeFor(participant) }).populate(POPULATE);
}

function snapshotDocumentRequirements(listing) {
    return (listing.documentRequirements || []).map((requirement) => ({
        requirementId: requirement._id,
        name: requirement.name,
    }));
}

// A document may only be shared by its owner, and every requested item must be chosen
// exactly once. The same file cannot impersonate two different identity documents.
async function buildDocumentSubmissions(documents, requirements, tenantId) {
    const selections = documents || [];

    if (!Array.isArray(selections) || selections.some((selection) => !selection || typeof selection !== 'object')) {
        throw new Error('Documents must be a list of vault selections');
    }

    const requiredIds = new Set(requirements.map(requirementId));

    if (new Set(selections.map((selection) => String(selection?.requirementId))).size !== selections.length
        || new Set(selections.map((selection) => String(selection?.documentId))).size !== selections.length) {
        throw new Error('Select one distinct vault document for each requirement');
    }

    if (selections.length !== requirements.length
        || selections.some((selection) => !requiredIds.has(String(selection.requirementId)))) {
        const missing = requirements.find((requirement) => !selections.some(
            (selection) => String(selection.requirementId) === requirementId(requirement)
        ));
        throw new Error(missing ? `Select a document for ${missing.name}` : 'Select each requested document once');
    }

    if (!selections.length) return [];

    const documentIds = selections.map((selection) => selection.documentId);
    const ownedDocuments = await TenantDocument.find({
        _id: { $in: documentIds },
        owner: tenantId,
    }).select('_id');

    if (ownedDocuments.length !== documentIds.length) {
        throw new Error('One or more selected documents are not in your vault');
    }

    return selections.map((selection) => ({
        tenant: tenantId,
        requirementId: selection.requirementId,
        document: selection.documentId,
        sharedAt: new Date(),
    }));
}

// Claims one tenant's share atomically so the checkout callback and the webhook cannot both
// settle it, and issues the agreement only on the share that completes the deal.
async function settlePayment(filter, payerId, fields) {
    const payer = toObjectId(payerId);
    const claimed = await Rental.findOneAndUpdate(
        { ...filter, status: 'accepted', payments: { $elemMatch: { payer, paidAt: { $exists: false } } } },
        { $set: { 'payments.$[entry].paidAt': new Date(), ...fields } },
        { arrayFilters: [{ 'entry.payer': payer, 'entry.paidAt': { $exists: false } }], new: true }
    );

    if (!claimed) return null;

    const year = new Date().getFullYear();
    const suffix = claimed.id.slice(-6).toUpperCase();
    const entry = paymentFor(claimed, payer);

    if (entry.mode === 'online') entry.receiptNo = `LS-R-${year}-${suffix}-${claimed.payments.indexOf(entry) + 1}`;

    if (claimed.payments.every((payment) => payment.paidAt)) {
        claimed.status = 'paid';
        claimed.agreement = { number: `LS-A-${year}-${suffix}`, signedAt: new Date() };
    }

    await claimed.save();

    return claimed.populate(POPULATE);
}

async function createRental(req, res) {
    try {
        const { listingId, message, preferences, buddyId, split, documents } = req.body;
        const listing = await Listing.findOne({ _id: listingId, status: 'published' }).select('landlord documentRequirements');

        if (!listing) {
            return res.status(404).json({
                success: false,
                message: 'Listing not found',
                data: {},
            });
        }

        // Applying together is only possible once both sides have swiped right on each other.
        if (buddyId) {
            const match = await Buddy.findOne({ users: { $all: [req.participant.id, buddyId] }, status: 'matched' });

            if (!match) {
                return res.status(403).json({
                    success: false,
                    message: 'You can only apply with a matched buddy',
                    data: {},
                });
            }
        }

        const documentRequirements = snapshotDocumentRequirements(listing);
        let documentSubmissions;

        try {
            documentSubmissions = await buildDocumentSubmissions(documents, documentRequirements, req.participant.id);
        } catch (error) {
            return res.status(422).json({ success: false, message: error.message, data: {} });
        }

        const parties = buddyId ? [req.participant.id, buddyId] : [req.participant.id];
        const involved = await Rental.find({
            listing: listing._id,
            $or: [{ user: { $in: parties } }, { buddy: { $in: parties } }],
        });
        const live = involved.find((rental) => rental.status !== 'rejected');

        if (live) {
            return res.status(409).json({
                success: false,
                message: String(live.user) === String(req.participant.id)
                    ? 'You already have a request on this listing'
                    : 'Your buddy already has a request on this listing',
                data: {},
            });
        }

        // A rejected request is reopened in place, which keeps the one-request-per-listing rule intact.
        const rental = involved.find((existing) => String(existing.user) === String(req.participant.id))
            || new Rental({ user: req.participant.id, landlord: listing.landlord, listing: listing._id });

        rental.set({
            message,
            preferences,
            buddy: buddyId || null,
            split: (buddyId && split) || { mode: 'percent', value: 50 },
            status: 'pending',
            decidedAt: undefined,
            terms: undefined,
            payments: [],
            documentRequirements,
            documentSubmissions,
        });
        await rental.save();
        await rental.populate(POPULATE);

        return res.status(201).json({
            success: true,
            message: 'Rental request sent successfully',
            data: { rental: serializeRental(rental, 'user', req.participant.id) },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Unable to send rental request',
            data: {},
        });
    }
}

async function updateRentalDocuments(req, res) {
    try {
        const rental = await Rental.findOne({ _id: req.params.rentalId, ...scopeFor(req.participant) });

        if (!rental) {
            return res.status(404).json({ success: false, message: 'Rental request not found or access denied', data: {} });
        }

        if (rental.status !== 'pending') {
            return res.status(409).json({
                success: false,
                message: 'Documents can only be changed while the application is under review',
                data: {},
            });
        }

        let submissions;

        try {
            submissions = await buildDocumentSubmissions(req.body.documents, rental.documentRequirements, req.participant.id);
        } catch (error) {
            return res.status(422).json({ success: false, message: error.message, data: {} });
        }

        rental.documentSubmissions = rental.documentSubmissions
            .filter((submission) => String(submission.tenant) !== String(req.participant.id));
        rental.documentSubmissions.push(...submissions);
        await rental.save();
        await rental.populate(POPULATE);

        return res.json({
            success: true,
            message: 'Application documents shared successfully',
            data: { rental: serializeRental(rental, 'user', req.participant.id) },
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Unable to update application documents', data: {} });
    }
}

async function getRentals(req, res) {
    try {
        const { id, role } = req.participant;
        const rentals = await Rental.find(scopeFor(req.participant)).populate(POPULATE).sort({ createdAt: -1 });

        return res.json({
            success: true,
            message: 'Rental requests retrieved successfully',
            data: { rentals: rentals.map((rental) => serializeRental(rental, role, id)) },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Unable to retrieve rental requests',
            data: {},
        });
    }
}

async function decideRental(req, res) {
    try {
        const rental = await findRentalFor(req.params.rentalId, req.participant);

        if (!rental) {
            return res.status(404).json({
                success: false,
                message: 'Rental request not found or access denied',
                data: {},
            });
        }

        if (rental.status !== 'pending') {
            return res.status(409).json({
                success: false,
                message: 'This request has already been decided',
                data: {},
            });
        }

        if (req.body.decision === 'accept') {
            const landlord = await Landlord.findById(req.participant.id).select('signature.signedAt');

            // No signature, no agreement to hand over once the tenants pay.
            if (!landlord?.signature?.signedAt) {
                return res.status(409).json({
                    success: false,
                    message: 'Add your e-signature before accepting a request',
                    data: {},
                });
            }

            if (!hasCompleteDocuments(rental)) {
                const waitingOn = [rental.user, rental.buddy].filter(Boolean)
                    .filter((tenant) => missingDocumentsFor(rental, tenant._id).length > 0)
                    .map((tenant) => tenant.name)
                    .join(' and ');

                return res.status(409).json({
                    success: false,
                    message: `Required documents are still missing from ${waitingOn || 'the applicant'}`,
                    data: {},
                });
            }

            // Claiming the listing is what makes an acceptance exclusive: it drops out of every
            // tenant-facing read, and a second request on it can no longer be accepted.
            const claimed = await Listing.findOneAndUpdate(
                { _id: rental.listing._id, status: 'published' },
                { $set: { status: 'rented' } }
            );

            if (!claimed) {
                return res.status(409).json({
                    success: false,
                    message: 'This listing is already rented',
                    data: {},
                });
            }

            rental.terms = buildTerms(rental.listing);
            rental.payments = buildPayments(rental);
        }

        rental.status = req.body.decision === 'accept' ? 'accepted' : 'rejected';
        rental.decidedAt = new Date();
        await rental.save();

        return res.json({
            success: true,
            message: `Rental request ${rental.status}`,
            data: { rental: serializeRental(rental, 'landlord', req.participant.id) },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Unable to update rental request',
            data: {},
        });
    }
}

// Reads back the tenant's own share after an update to it, populated and ready to serialize.
async function updateMyPayment(rentalId, payerId, update) {
    const payer = toObjectId(payerId);

    return Rental.findOneAndUpdate(
        { _id: rentalId, status: 'accepted', payments: { $elemMatch: { payer, paidAt: { $exists: false } } } },
        update,
        { arrayFilters: [{ 'entry.payer': payer, 'entry.paidAt': { $exists: false } }], new: true }
    ).populate(POPULATE);
}

async function createPaymentOrder(req, res) {
    try {
        const rental = await findRentalFor(req.params.rentalId, req.participant);
        const share = rental && paymentFor(rental, req.participant.id);

        if (!rental || !share) {
            return res.status(404).json({
                success: false,
                message: 'Rental request not found or access denied',
                data: {},
            });
        }

        if (rental.status !== 'accepted' || share.paidAt) {
            return res.status(409).json({
                success: false,
                message: share.paidAt ? 'You have already paid your share' : 'Payment opens once the landlord accepts your request',
                data: {},
            });
        }

        // Amount always comes from the accepted terms, never from the client.
        const response = await axios.post(
            RAZORPAY_ORDERS_URL,
            {
                amount: Math.round(share.amount * 100),
                currency: 'INR',
                receipt: rental.id,
                notes: { rentalId: rental.id, listing: rental.listing.title },
            },
            { auth: { username: process.env.RAZORPAY_KEY_ID, password: process.env.RAZORPAY_KEY_SECRET } }
        );

        await updateMyPayment(rental._id, req.participant.id, {
            $set: {
                'payments.$[entry].mode': 'online',
                'payments.$[entry].orderId': response.data.id,
            },
        });

        const payer = rental.user._id.equals(req.participant.id) ? rental.user : rental.buddy;

        return res.json({
            success: true,
            message: 'Payment order created successfully',
            data: {
                order: { id: response.data.id, amount: response.data.amount, currency: response.data.currency },
                keyId: process.env.RAZORPAY_KEY_ID,
                prefill: { name: payer.name, email: payer.email, contact: payer.phone },
            },
        });
    } catch (error) {
        return res.status(502).json({
            success: false,
            message: 'Unable to start the payment',
            data: {},
        });
    }
}

async function verifyPayment(req, res) {
    try {
        const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body;
        const isValid = isValidPaymentSignature({
            orderId,
            paymentId,
            signature,
            secret: process.env.RAZORPAY_KEY_SECRET,
        });

        if (!isValid) {
            return res.status(400).json({
                success: false,
                message: 'Payment could not be verified',
                data: {},
            });
        }

        const rental = await settlePayment(
            { _id: req.params.rentalId, payments: { $elemMatch: { payer: toObjectId(req.participant.id), orderId } } },
            req.participant.id,
            { 'payments.$[entry].paymentId': paymentId }
        );

        if (!rental) {
            // Already settled by the webhook, or never in a payable state.
            const settled = await findRentalFor(req.params.rentalId, req.participant);

            if (paymentFor(settled || { payments: [] }, req.participant.id)?.paidAt) {
                return res.json({
                    success: true,
                    message: 'Payment already recorded',
                    data: { rental: serializeRental(settled, 'user', req.participant.id) },
                });
            }

            return res.status(409).json({
                success: false,
                message: 'This request is not awaiting payment',
                data: {},
            });
        }

        return res.json({
            success: true,
            message: 'Payment successful',
            data: { rental: serializeRental(rental, 'user', req.participant.id) },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Unable to confirm the payment',
            data: {},
        });
    }
}

async function chooseOfflinePayment(req, res) {
    try {
        const rental = await updateMyPayment(req.params.rentalId, req.participant.id, {
            $set: { 'payments.$[entry].mode': 'in-person' },
            $unset: { 'payments.$[entry].orderId': '' },
        });

        if (!rental) {
            return res.status(409).json({
                success: false,
                message: 'Payment opens once the landlord accepts your request',
                data: {},
            });
        }

        return res.json({
            success: true,
            message: 'The landlord will confirm your in-person payment',
            data: { rental: serializeRental(rental, 'user', req.participant.id) },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Unable to select in-person payment',
            data: {},
        });
    }
}

// Money paid in person never reaches LivSync, so only the landlord can attest that it arrived.
async function confirmOfflinePayment(req, res) {
    try {
        const { payerId } = req.body;
        const paid = await settlePayment(
            {
                _id: req.params.rentalId,
                landlord: req.participant.id,
                payments: { $elemMatch: { payer: toObjectId(payerId), mode: 'in-person' } },
            },
            payerId,
            {}
        );

        if (!paid) {
            return res.status(404).json({
                success: false,
                message: 'No in-person payment is awaiting your confirmation',
                data: {},
            });
        }

        return res.json({
            success: true,
            message: 'Payment confirmed',
            data: { rental: serializeRental(paid, 'landlord', req.participant.id) },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Unable to confirm the payment',
            data: {},
        });
    }
}

// Razorpay retries this if the tenant closes the tab before the checkout callback lands.
async function handleWebhook(req, res) {
    try {
        const expected = crypto
            .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
            .update(req.rawBody || Buffer.alloc(0))
            .digest('hex');

        if (!timingSafeEqual(expected, req.headers['x-razorpay-signature'])) {
            return res.status(400).json({ success: false, message: 'Invalid webhook signature', data: {} });
        }

        const entity = req.body?.payload?.payment?.entity;

        if (req.body?.event === 'payment.captured' && entity?.order_id) {
            const rental = await Rental.findOne({ 'payments.orderId': entity.order_id }).select('payments');
            const entry = rental?.payments.find((payment) => payment.orderId === entity.order_id);

            if (entry) {
                await settlePayment({ _id: rental._id }, entry.payer, { 'payments.$[entry].paymentId': entity.id });
            }
        }

        return res.json({ success: true, message: 'Webhook processed', data: {} });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Unable to process webhook', data: {} });
    }
}

function streamPdf(res, filename, draw) {
    const doc = new PDFDocument({ size: 'A4', margin: 56 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    doc.pipe(res);
    draw(doc);
    doc.end();
}

// Brand palette, kept in step with the app's own tokens in frontend/src/index.css.
const INK = '#15130F';
const FOREST = '#13322A';
const MUTED = '#5F5A4E';
const SOFT = '#3B372F';
const RULE = '#D8D3C6';
const WASH = '#F4F1EA';
const LABEL_WIDTH = 96;

function bodyWidth(doc) {
    return doc.page.width - doc.page.margins.left - doc.page.margins.right;
}

function rule(doc, y = doc.y, color = RULE, thickness = 0.75) {
    const { left } = doc.page.margins;

    doc.save().lineWidth(thickness).strokeColor(color)
        .moveTo(left, y).lineTo(left + bodyWidth(doc), y).stroke().restore();
}

// Drawn on the first page and again whenever the text flows onto a new one, so every sheet of a
// printed agreement identifies itself.
function paginate(doc, reference) {
    let page = 0;
    const draw = () => {
        const { left, bottom } = doc.page.margins;
        const width = bodyWidth(doc);
        const y = doc.page.height - bottom + 20;
        const resume = doc.y;

        page += 1;
        rule(doc, y - 10);
        // The footer sits inside the bottom margin, and writing there would otherwise trip
        // pdfkit's own page break and recurse straight back into this handler.
        doc.page.margins.bottom = 0;
        doc.font('Helvetica').fontSize(7.5).fillColor(MUTED)
            .text(`${reference} · Generated by LivSync`, left, y, { width, lineBreak: false })
            .text(`Page ${page}`, left, y, { width, align: 'right', lineBreak: false });
        doc.page.margins.bottom = bottom;
        doc.y = resume;
    };

    doc.on('pageAdded', draw);
    draw();
}

function documentHeader(doc, title, subtitle, reference) {
    const { left, top } = doc.page.margins;
    const width = bodyWidth(doc);

    doc.save().rect(0, 0, doc.page.width, 10).fill(FOREST).restore();

    doc.font('Helvetica-Bold').fontSize(17).fillColor(FOREST).text('LivSync', left, top);
    doc.font('Helvetica').fontSize(8).fillColor(MUTED).text('Rental management, end to end', left, top + 21);

    doc.font('Helvetica').fontSize(7).fillColor(MUTED)
        .text('REFERENCE', left, top + 2, { width, align: 'right', characterSpacing: 1.1 });
    doc.font('Helvetica-Bold').fontSize(10).fillColor(INK)
        .text(reference, left, top + 13, { width, align: 'right' });

    doc.y = top + 40;
    rule(doc, doc.y, FOREST, 1.2);

    doc.y += 16;
    doc.font('Helvetica-Bold').fontSize(21).fillColor(INK).text(title, left, doc.y);
    doc.font('Helvetica').fontSize(9.5).fillColor(MUTED).text(subtitle, left, doc.y + 3);
}

function sectionTitle(doc, text) {
    doc.y += 11;
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(FOREST)
        .text(text.toUpperCase(), doc.page.margins.left, doc.y, { characterSpacing: 1.2 });
    doc.y += 4;
    rule(doc, doc.y);
    doc.y += 10;
}

// One row of a label/value block, with both columns on a fixed grid so the values line up.
function field(doc, label, value, x = doc.page.margins.left, width = null) {
    const columnWidth = width || bodyWidth(doc);
    const y = doc.y;

    doc.font('Helvetica').fontSize(9).fillColor(MUTED).text(label, x, y + 1, { width: LABEL_WIDTH - 10 });
    const labelBottom = doc.y;

    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(INK)
        .text(value, x + LABEL_WIDTH, y, { width: columnWidth - LABEL_WIDTH });

    doc.y = Math.max(labelBottom, doc.y) + 2;
}

function partyBlock(doc, role, name, lines, x, width) {
    if (role) {
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor(MUTED)
            .text(role.toUpperCase(), x, doc.y, { width, characterSpacing: 1.1 });
        doc.y += 2;
    }
    doc.font('Helvetica-Bold').fontSize(11.5).fillColor(INK).text(name, x, doc.y, { width });
    doc.y += 1;
    lines.filter(Boolean).forEach((line) => {
        doc.font('Helvetica').fontSize(9).fillColor(SOFT).text(line, x, doc.y, { width });
        doc.y += 1;
    });
    doc.y += 8;
}

// A charges line: description left, amount right-aligned on the margin so the column scans.
function charge(doc, label, amount, isTotal = false) {
    const { left } = doc.page.margins;
    const width = bodyWidth(doc);
    const y = doc.y;

    if (isTotal) {
        doc.save().rect(left, y - 5, width, 27).fill(WASH).restore();
    }

    doc.font(isTotal ? 'Helvetica-Bold' : 'Helvetica').fontSize(isTotal ? 10.5 : 9.5)
        .fillColor(isTotal ? INK : MUTED)
        .text(label, isTotal ? left + 10 : left, y + (isTotal ? 3 : 0), { width: width - 20, lineBreak: false });
    doc.font('Helvetica-Bold').fontSize(isTotal ? 12 : 9.5).fillColor(isTotal ? FOREST : INK)
        .text(amount, left, y + (isTotal ? 1 : 0), { width: width - (isTotal ? 10 : 0), align: 'right', lineBreak: false });

    doc.y = y + (isTotal ? 26 : 14);
}

function clause(doc, index, title, body) {
    const { left } = doc.page.margins;
    const width = bodyWidth(doc);
    const y = doc.y;

    doc.font('Helvetica-Bold').fontSize(9).fillColor(FOREST).text(`${index}.`, left, y, { width: 16 });
    doc.font('Helvetica-Bold').fontSize(9).fillColor(INK).text(title, left + 16, y, { width: width - 16 });
    doc.font('Helvetica').fontSize(8.8).fillColor(SOFT)
        .text(body, left + 16, doc.y + 2, { width: width - 16, align: 'justify', lineGap: 1.2 });
    doc.y += 6;
}

// A signature column: whatever proof there is, sitting on a ruled line with the name beneath it.
function signatureColumn(doc, x, width, top, caption, name, note) {
    const lineY = top + 50;

    doc.save().lineWidth(0.75).strokeColor(INK).moveTo(x, lineY).lineTo(x + width, lineY).stroke().restore();
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(INK).text(name, x, lineY + 7, { width });
    doc.font('Helvetica').fontSize(8.5).fillColor(MUTED).text(note, x, doc.y + 1, { width });
    if (caption) {
        doc.font('Helvetica').fontSize(7.5).fillColor(MUTED)
            .text(caption.toUpperCase(), x, top - 12, { width, characterSpacing: 1 });
    }

    return doc.y;
}

// Passing a tenantId renders that tenant's own copy; without one it renders the joint agreement.
function drawAgreement(doc, rental, signatureDataUrl, tenantId) {
    const { listing, landlord, terms, preferences, agreement } = rental;
    const { left } = doc.page.margins;
    const width = bodyWidth(doc);
    const column = (width - 24) / 2;
    const tenants = [rental.user, rental.buddy].filter(Boolean);
    const shown = tenantId ? tenants.filter((tenant) => String(tenant._id) === String(tenantId)) : tenants;
    const isShared = tenants.length > 1;
    const landlordName = landlord.companyName || landlord.name;
    const endDate = new Date(preferences.moveInDate);

    endDate.setMonth(endDate.getMonth() + preferences.durationMonths);

    paginate(doc, `Agreement ${agreement.number}`);
    documentHeader(
        doc,
        'Rental Agreement',
        `${isShared && tenantId ? 'Tenant copy · ' : ''}Executed ${formatDate(agreement.signedAt)}`,
        agreement.number
    );

    sectionTitle(doc, 'The parties');
    const partiesTop = doc.y;

    partyBlock(doc, 'Landlord', landlordName, [
        `${landlord.address}, ${landlord.city}`,
        landlord.email,
        landlord.phone,
    ], left, column);
    const landlordBottom = doc.y;

    doc.y = partiesTop;
    shown.forEach((tenant, position) => {
        const share = paymentFor(rental, tenant._id);

        partyBlock(doc, position > 0 ? '' : (shown.length > 1 ? 'Tenants (BuddyUp)' : 'Tenant'), tenant.name, [
            tenant.email,
            tenant.phone,
            isShared && share ? `Share of charges · ${share.share}% · ${formatMoney(share.amount)}` : null,
        ], left + column + 24, column);
    });

    doc.y = Math.max(landlordBottom, doc.y) - 9;

    sectionTitle(doc, 'The property');
    field(doc, 'Listing', listing.title);
    field(doc, 'Address', `${listing.location.address}, ${listing.location.city}, ${listing.location.state} ${listing.location.postalCode}`);
    field(doc, 'Type', `${listing.propertyType} · ${listing.roomType.replaceAll('-', ' ')} · ${listing.areaSqFt} sq ft`);
    field(doc, 'Occupants', String(preferences.occupants));

    sectionTitle(doc, 'Term and charges');
    field(doc, 'Start date', formatDate(preferences.moveInDate));
    field(doc, 'End date', `${formatDate(endDate)}  (${preferences.durationMonths} months)`);
    doc.y += 6;
    charge(doc, 'Monthly rent', formatMoney(terms.monthlyRent));
    charge(doc, 'Security deposit', formatMoney(terms.securityDeposit));
    charge(doc, 'Brokerage fee', formatMoney(terms.brokerageFee));
    doc.y += 2;
    rule(doc, doc.y, INK, 0.75);
    doc.y += 10;
    charge(doc, 'Amount settled', formatMoney(terms.totalDue), true);

    sectionTitle(doc, 'Terms');
    let index = 0;

    clause(doc, index += 1, 'Letting',
        'The landlord agrees to let the property described above to the tenant for the term stated, on the charges stated.');
    if (isShared) {
        clause(doc, index += 1, 'Joint tenancy',
            'The tenants named on this agreement hold it jointly, each having settled the share of the charges recorded '
            + 'against their name, and are jointly responsible for the property and the rent that falls due.');
    }
    clause(doc, index += 1, 'Acceptance',
        'The tenants accepted these terms electronically on LivSync by settling the amount due.');
    clause(doc, index += 1, 'Scope',
        'This document is a simplified record of that agreement and does not replace statutory obligations of either party.');

    // Keep the signatures whole: start a fresh page rather than split them across the break.
    const signatureHeight = 122 + (shown.length - 1) * 90;

    if (doc.y > doc.page.height - doc.page.margins.bottom - signatureHeight) doc.addPage();

    sectionTitle(doc, 'Signatures');
    doc.y += 6;
    const signedAt = doc.y;

    if (signatureDataUrl) {
        doc.image(Buffer.from(signatureDataUrl.split(',')[1], 'base64'), left, signedAt + 4, { fit: [column - 20, 52] });
    }

    signatureColumn(doc, left, column, signedAt, 'Landlord', landlordName, 'e-signed on LivSync');

    doc.y = signedAt;
    const acceptances = shown.map((tenant) => ({
        name: tenant.name,
        note: `Accepted ${formatDate(paymentFor(rental, tenant._id)?.paidAt)}`,
    }));

    acceptances.forEach((tenant, position) => {
        const top = signedAt + position * 90;

        doc.font('Helvetica-Oblique').fontSize(13).fillColor(SOFT)
            .text(tenant.name, left + column + 24, top + 30, { width: column });
        // The caption heads the group once; repeating it would print over the entry above.
        const caption = position > 0 ? '' : (acceptances.length > 1 ? 'Tenants' : 'Tenant');

        signatureColumn(doc, left + column + 24, column, top, caption, tenant.name, tenant.note);
    });
}

function drawReceipt(doc, rental, payment) {
    const { listing, terms } = rental;
    const payer = [rental.user, rental.buddy].find((tenant) => tenant && String(tenant._id) === String(payment.payer));

    paginate(doc, `Receipt ${payment.receiptNo}`);
    documentHeader(doc, 'Payment Receipt', `Paid ${formatDate(payment.paidAt)}`, payment.receiptNo);

    sectionTitle(doc, 'Received from');
    field(doc, 'Tenant', payer.name);
    field(doc, 'Email', payer.email);
    field(doc, 'Property', `${listing.title}, ${listing.location.city}`);

    sectionTitle(doc, 'Transaction');
    field(doc, 'Payment id', payment.paymentId || '—');
    field(doc, 'Order id', payment.orderId || '—');
    field(doc, 'Method', 'Online · Razorpay');

    sectionTitle(doc, 'Breakdown');
    charge(doc, 'First month rent', formatMoney(terms.monthlyRent));
    charge(doc, 'Security deposit', formatMoney(terms.securityDeposit));
    charge(doc, 'Brokerage fee', formatMoney(terms.brokerageFee));
    charge(doc, 'Total for the property', formatMoney(terms.totalDue));
    if (payment.share < 100) charge(doc, 'Share settled by this tenant', `${payment.share}%`);
    doc.y += 2;
    rule(doc, doc.y, INK, 0.75);
    doc.y += 10;
    charge(doc, 'Total paid', formatMoney(payment.amount), true);

    doc.y += 24;
    doc.font('Helvetica').fontSize(8.5).fillColor(MUTED).text(
        'Paid online through LivSync via Razorpay. This receipt is issued for payments processed on the platform.',
        doc.page.margins.left,
        doc.y,
        { width: bodyWidth(doc) }
    );
}

async function getAgreement(req, res) {
    try {
        const rental = await findRentalFor(req.params.rentalId, req.participant);

        if (!rental || rental.status !== 'paid') {
            return res.status(404).json({
                success: false,
                message: 'The agreement is issued once every tenant has settled their share',
                data: {},
            });
        }

        const landlord = await Landlord.findById(rental.landlord._id).select('+signature.dataUrl');
        // A tenant can pull their own copy; the landlord only ever gets the joint one.
        const tenantId = req.query.scope === 'individual' && req.participant.role === 'user' ? req.participant.id : null;

        return streamPdf(res, `livsync-agreement-${rental.agreement.number}.pdf`, (doc) => {
            drawAgreement(doc, rental, landlord?.signature?.dataUrl, tenantId);
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Unable to generate the agreement',
            data: {},
        });
    }
}

async function getReceipt(req, res) {
    try {
        const rental = await findRentalFor(req.params.rentalId, req.participant);
        const payerId = req.participant.role === 'landlord' ? req.query.payerId : req.participant.id;
        const payment = rental && payerId && paymentFor(rental, payerId);

        if (!payment?.paidAt || payment.mode !== 'online') {
            return res.status(404).json({
                success: false,
                message: 'A receipt is only issued for payments made through LivSync',
                data: {},
            });
        }

        return streamPdf(res, `livsync-receipt-${payment.receiptNo}.pdf`, (doc) => drawReceipt(doc, rental, payment));
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Unable to generate the receipt',
            data: {},
        });
    }
}

module.exports = {
    createRental,
    updateRentalDocuments,
    getRentals,
    decideRental,
    createPaymentOrder,
    verifyPayment,
    chooseOfflinePayment,
    confirmOfflinePayment,
    handleWebhook,
    getAgreement,
    getReceipt,
    buildTerms,
    buildPayments,
    isValidPaymentSignature,
    missingDocumentsFor,
    hasCompleteDocuments,
    drawAgreement,
    drawReceipt,
};
