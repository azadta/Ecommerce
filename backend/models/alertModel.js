const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Alert = mongoose.model('Alert', alertSchema);

module.exports = Alert;
