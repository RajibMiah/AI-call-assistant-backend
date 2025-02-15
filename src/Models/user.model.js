const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    firstName: { type: String },
    lastName: { type: String },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phoneNumber: { type: String, unique: true },
    address: { type: String },
    age: { type: Number },
    role: {
        type: String,
        enum: ['admin', 'dentist', 'staff'],
        default: 'dentist',
    },
    createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model('User', userSchema);

module.exports = User;
