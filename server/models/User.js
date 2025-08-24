// models/User.js

const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    auth0Id: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    planStatus: {
        type: String,
        enum: ['trial', 'premium', 'expired', 'free'],
        default: 'trial',
        required: true
    },
    trialEndsAt: {
        type: Date,
        default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    },
    subscriptionId: {
        type: String,
        unique: true,
        sparse: true
    },
    threadCount: { 
        type: Number, 
        default: 0 
    },
}, {
    timestamps: true
});

module.exports = mongoose.model('User', UserSchema);