// models/ReturnRequest.js
const mongoose = require('mongoose');

const returnRequestSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    reason: { type: String },
    quantity: { type: Number,required: true },
    price: { type: Number,required: true },

    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    refundAmount: { type: Number, required: true },
    adminResponse: { type: String },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('ReturnRequest', returnRequestSchema);
