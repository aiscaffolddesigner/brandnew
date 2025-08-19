const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    auth0Id: {
        type: String,
        required: true,
        unique: true, // Ensures no duplicate Auth0 IDs
        index: true // Improves lookup performance
    },
    planStatus: {
        type: String,
        enum: ['trial', 'premium', 'expired', 'free'], // Define allowed plan types
        default: 'trial', // New users start on trial
        required: true
    },
    trialEndsAt: {
        type: Date,
        // Set default to 7 days from now (creation time)
        default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    },
    subscriptionId: { // To store ID from payment gateway (e.g., Stripe)
        type: String,
        unique: true,
        sparse: true // Allows multiple documents to have null for this field
    },
    // You might add other fields as your application grows, e.g.:
    // lastLogin: { type: Date, default: Date.now },
    // messageCount: { type: Number, default: 0 }, // If trial is based on messages
    // totalCredits: { type: Number, default: 0 }
}, {
    timestamps: true // Adds `createdAt` and `updatedAt` fields automatically
});

module.exports = mongoose.model('User', UserSchema);