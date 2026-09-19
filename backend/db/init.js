const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const Landlord = require('../models/landlord.model');
const Listing = require('../models/listing.model');
const User = require('../models/user.model');
const { resolveFolderMedia } = require('../controllers/listing.controller');

// True initialization: validates all supplied Drive folders, then replaces the local data set.
// Run from this folder: ALLOW_DATABASE_RESET=true node init.js
dotenv.config({ path: path.join(__dirname, '..', '.env') });

if (process.env.ALLOW_DATABASE_RESET !== 'true') {
    console.error('Refusing to reset the database. Re-run with ALLOW_DATABASE_RESET=true only for an intentional local seed.');
    process.exit(1);
}

const MEDIA_FOLDER_URLS = [
    'https://drive.google.com/drive/folders/1tMesSLt11wHPpkfyrR-AknlOoKK37BaX?usp=sharing',
    'https://drive.google.com/drive/folders/17Eorid8OIE4ExZOlpwF5_AAf1kLBP3rT?usp=sharing',
    'https://drive.google.com/drive/folders/1zx9aWuIJcy8su4PnvK1R-7ZJ2LPoRgw2?usp=sharing',
    'https://drive.google.com/drive/folders/1W6hq2bGLyqw1gKRMOWf1L7q4MyJuGNAZ?usp=sharing',
    'https://drive.google.com/drive/folders/14F_NG_Np8J4pdxu1zBVpwuD2FB_Mkc-7?usp=sharing',
    'https://drive.google.com/drive/folders/1zx9aWuIJcy8su4PnvK1R-7ZJ2LPoRgw2?usp=sharing',
];

const days = (count) => new Date(Date.now() + count * 86400000);
const date = (value) => new Date(`${value}T00:00:00.000Z`);
const verifiedAt = new Date();

const LISTINGS = [
    {
        title: 'Sunlit 1BHK near Koregaon Park',
        description: 'A bright one-bedroom flat on the third floor with a balcony facing the park. Freshly painted, modular kitchen, and a covered parking slot included.',
        propertyType: 'apartment', roomType: 'entire-place',
        location: { address: '12 Lane 5, Koregaon Park', city: 'Pune', state: 'Maharashtra', postalCode: '411001' },
        bedrooms: 1, bathrooms: 1, areaSqFt: 620, furnished: true,
        rent: { coldRent: 55, utilities: 8, otherMonthlyCharges: 4 }, securityDeposit: 110, brokerageFee: 25,
        amenities: ['Balcony', 'Modular kitchen', 'Covered parking', 'Power backup', 'Lift'], availableFrom: days(7),
    },
    {
        title: 'Quiet private room in Indiranagar',
        description: 'Furnished private room in a shared three-bedroom house with two working professionals. Attached bathroom, study desk, and high speed fibre internet throughout.',
        propertyType: 'room', roomType: 'private-room',
        location: { address: '48 100 Feet Road, Indiranagar', city: 'Bengaluru', state: 'Karnataka', postalCode: '560038' },
        bedrooms: 1, bathrooms: 1, areaSqFt: 210, furnished: true,
        rent: { coldRent: 38, utilities: 6, otherMonthlyCharges: 2 }, securityDeposit: 76, brokerageFee: 0,
        amenities: ['Attached bathroom', 'Wi-Fi', 'Study desk', 'Washing machine', 'Housekeeping'], availableFrom: days(3),
    },
    {
        title: 'Compact studio steps from Bandra station',
        description: 'Self-contained studio with a kitchenette and a full length window. Ideal for a single tenant who wants a five minute walk to the station and the promenade.',
        propertyType: 'studio', roomType: 'entire-place',
        location: { address: '7 Hill Road, Bandra West', city: 'Mumbai', state: 'Maharashtra', postalCode: '400050' },
        bedrooms: 0, bathrooms: 1, areaSqFt: 340, furnished: true,
        rent: { coldRent: 68, utilities: 10, otherMonthlyCharges: 5 }, securityDeposit: 140, brokerageFee: 34,
        amenities: ['Kitchenette', 'Air conditioning', 'Security', 'Water purifier'], availableFrom: days(14),
    },
    {
        title: 'Spacious 3BHK independent house in Jubilee Hills',
        description: 'Independent two storey house with a private garden and space for two cars. Semi furnished with wardrobes and light fittings, ready for a family to move in.',
        propertyType: 'house', roomType: 'entire-place',
        location: { address: '221 Road No. 36, Jubilee Hills', city: 'Hyderabad', state: 'Telangana', postalCode: '500033' },
        bedrooms: 3, bathrooms: 3, areaSqFt: 1850, furnished: false,
        rent: { coldRent: 92, utilities: 5, otherMonthlyCharges: 0 }, securityDeposit: 184, brokerageFee: 46,
        amenities: ['Private garden', 'Two car parking', 'Borewell', 'Solar water heater', 'Pet friendly'], availableFrom: days(21),
    },
    {
        title: 'Shared twin room for students in Kothrud',
        description: 'Bed in a clean twin sharing room five minutes from the university gate. Rent covers electricity, drinking water and weekly cleaning, with a common study area downstairs.',
        propertyType: 'room', roomType: 'shared-room',
        location: { address: '9 Paud Road, Kothrud', city: 'Pune', state: 'Maharashtra', postalCode: '411038' },
        bedrooms: 1, bathrooms: 1, areaSqFt: 180, furnished: true,
        rent: { coldRent: 22, utilities: 4, otherMonthlyCharges: 1 }, securityDeposit: 44, brokerageFee: 0,
        amenities: ['Study area', 'Wi-Fi', 'Weekly cleaning', 'Mess nearby', 'Bicycle stand'], availableFrom: days(1),
    },
    {
        title: 'Garden villa with pool access in Candolim',
        description: 'Two bedroom villa in a gated lane a short ride from the beach. Shared pool, outdoor seating, and a fully equipped kitchen, let on a long stay basis only.',
        propertyType: 'villa', roomType: 'entire-place',
        location: { address: '3 Sequeira Vaddo, Candolim', city: 'Panaji', state: 'Goa', postalCode: '403515' },
        bedrooms: 2, bathrooms: 2, areaSqFt: 1400, furnished: true,
        rent: { coldRent: 79, utilities: 9, otherMonthlyCharges: 6 }, securityDeposit: 158, brokerageFee: 40,
        amenities: ['Shared pool', 'Outdoor seating', 'Air conditioning', 'Parking', 'Caretaker'], availableFrom: days(30),
    },
];

const USERS = [
    {
        name: 'Ananya Rao', phone: '1111111111', email: 'ananya.rao@example.com', dob: date('1998-04-12'), gender: 'female',
        preferences: {
            lookingForBuddy: true, budget: { min: 30000, max: 42000 }, city: 'Pune', moveInDate: days(12),
            sleepSchedule: 'early-bird', workSchedule: 'remote', cleanliness: 5, noiseTolerance: 2,
            foodHabits: 'vegetarian', smoking: 'non-smoker', drinking: 'socially', pets: 'fine-with-pets', guests: 'sometimes', roommateGender: 'female',
            occupation: 'Product designer', interests: ['Illustration', 'Pilates', 'Weekend markets'], bio: 'Remote designer who likes a calm, tidy home and the occasional shared dinner.',
        },
    },
    {
        name: 'Rohan Mehta', phone: '2222222222', email: 'rohan.mehta@example.com', dob: date('1996-09-23'), gender: 'male',
        preferences: {
            lookingForBuddy: true, budget: { min: 22000, max: 32000 }, city: 'Bengaluru', moveInDate: days(20),
            sleepSchedule: 'night-owl', workSchedule: 'day-shift', cleanliness: 3, noiseTolerance: 4,
            foodHabits: 'non-vegetarian', smoking: 'occasional', drinking: 'socially', pets: 'has-pets', guests: 'often', roommateGender: 'any',
            occupation: 'Software engineer', interests: ['Cricket', 'Coffee', 'Board games'], bio: 'Easygoing engineer with a friendly indie dog. Happy to split chores and host a game night now and then.',
        },
    },
    {
        name: 'Isha Patel', phone: '3333333333', email: 'isha.patel@example.com', dob: date('1999-01-30'), gender: 'non-binary',
        preferences: {
            lookingForBuddy: false, budget: { min: 45000, max: 60000 }, city: 'Mumbai', moveInDate: days(35),
            sleepSchedule: 'flexible', workSchedule: 'student', cleanliness: 4, noiseTolerance: 3,
            foodHabits: 'vegan', smoking: 'non-smoker', drinking: 'never', pets: 'fine-with-pets', guests: 'rarely', roommateGender: 'non-binary',
            occupation: 'Architecture student', interests: ['Photography', 'Cinema', 'Ceramics'], bio: 'Looking for a bright, considerate home close to campus. I keep shared spaces clean and quiet.',
        },
    },
    {
        name: 'Kabir Singh', phone: '4444444444', email: 'kabir.singh@example.com', dob: date('1994-07-08'), gender: 'male',
        preferences: {
            lookingForBuddy: true, budget: { min: 50000, max: 75000 }, city: 'Hyderabad', moveInDate: days(8),
            sleepSchedule: 'early-bird', workSchedule: 'night-shift', cleanliness: 2, noiseTolerance: 5,
            foodHabits: 'eggetarian', smoking: 'smoker', drinking: 'regularly', pets: 'no-pets', guests: 'often', roommateGender: 'male',
            occupation: 'Hospitality manager', interests: ['Live music', 'Cycling', 'Cooking'], bio: 'Hospitality professional with an irregular schedule. Sociable, practical, and respectful of different routines.',
        },
    },
    {
        name: 'Meera Nair', phone: '5555555555', email: 'meera.nair@example.com', dob: date('1997-11-19'), gender: 'female',
        preferences: {
            lookingForBuddy: true, budget: { min: 55000, max: 85000 }, city: 'Panaji', moveInDate: days(28),
            sleepSchedule: 'flexible', workSchedule: 'remote', cleanliness: 4, noiseTolerance: 1,
            foodHabits: 'no-preference', smoking: 'non-smoker', drinking: 'never', pets: 'has-pets', guests: 'rarely', roommateGender: 'any',
            occupation: 'Content strategist', interests: ['Swimming', 'Books', 'Yoga'], bio: 'Quiet remote worker with a rescued cat. I value a peaceful home, clear communication, and sun-filled mornings.',
        },
    },
];

async function seedDatabase() {
    try {
        if (!process.env.DB_CONNECT) throw new Error('DB_CONNECT is required to seed the database');
        if (!process.env.GOOGLE_DRIVE_API_KEY) throw new Error('GOOGLE_DRIVE_API_KEY is required to load listing media');

        // Resolve before dropping anything: a private or empty folder must not erase usable data.
        const listingMedia = await Promise.all(MEDIA_FOLDER_URLS.map(resolveFolderMedia));

        await mongoose.connect(process.env.DB_CONNECT);
        await mongoose.connection.dropDatabase();

        // create(), not insertMany(), ensures both password hooks run and passwords are hashed.
        const landlord = await Landlord.create({
            name: 'test', phone: '1234567890', email: 'krishcollegestuff@gmail.com', emailVerified: true, emailVerifiedAt: verifiedAt,
            password: 'jaimataji', businessType: 'individual', address: '14 Model Colony, Shivajinagar', city: 'Pune',
            propertyTypes: ['apartment', 'house', 'room'],
            profileDescription: 'Independent landlord letting a handful of well kept places across India. Quick to reply and happy to arrange a video walkthrough.',
            verificationStatus: 'verified',
        });

        const [listings, users] = await Promise.all([
            Listing.insertMany(LISTINGS.map((listing, index) => ({
                ...listing,
                ...listingMedia[index],
                landlord: landlord._id,
                mediaFolderUrl: MEDIA_FOLDER_URLS[index],
                verificationStatus: 'verified',
            }))),
            Promise.all(USERS.map((user) => User.create({
                ...user,
                emailVerified: true,
                emailVerifiedAt: verifiedAt,
                password: 'jaimataji',
                role: 'tenant',
            }))),
        ]);

        console.log(`database wiped — seeded landlord ${landlord.email}, ${listings.length} listings, and ${users.length} verified tenants`);
    } catch (error) {
        console.error(`Database seed failed: ${error.message}`);
        process.exitCode = 1;
    } finally {
        if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    }
}

seedDatabase();
