const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please enter offer name'],
    trim: true,
    maxlength: [100, 'Offer name cannot exceed 100 characters']
  },
  discountPercentage: {
    type: Number,
    required: [true, 'Please enter discount percentage'],
    min: [0, 'Discount percentage must be at least 0'],
    max: [100, 'Discount percentage cannot exceed 100']
  },
  startDate: {
    type: Date,
    required: [true, 'Please enter start date']
  },
  endDate: {
    type: Date,
    required: [true, 'Please enter end date']
  },
  products: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
  
  }],
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: false // Not all offers might be linked to a category
  }
});

const Offer = mongoose.model('Offer', offerSchema);

module.exports = Offer;
