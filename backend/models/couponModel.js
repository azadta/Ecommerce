const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Coupon code is required'],
    unique: true,
    minlength: [5, 'Coupon code must be at least 5 characters long'],
    maxlength: [20, 'Coupon code cannot exceed 20 characters'],
    trim: true,
    match: [/^[A-Z0-9 ]+$/, 'Coupon code can only contain uppercase letters and numbers'],
  },
  discountPercentage: {
    type: Number,
    required: [true, 'Discount percentage is required'],
    min: [0, 'Discount percentage cannot be less than 0'],
    max: [100, 'Discount percentage cannot exceed 100'],
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required'],
    validate: {
      validator: function(value) {
        // Ensure start date is today or in the future
        return value >= new Date().setHours(0, 0, 0, 0); // setting time to start of the day
      },
      message: 'Start date cannot be in the past',
    },
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required'],
    validate: {
      validator: function(value) {
        // Ensure end date is after start date
        return value > this.startDate;
      },
      message: 'End date must be after the start date',
    },
  },
  usageLimit: {
    type: Number,
    required: [true, 'Usage limit is required'],
    min: [1, 'Usage limit must be at least 1'],
  },
  usageCount: {
    type: Number,
    default: 0,
    min: [0, 'Usage count cannot be less than 0'],
    validate: {
      validator: function(value) {
        // Ensure usage count does not exceed usage limit
        return value <= this.usageLimit;
      },
      message: 'Usage count cannot exceed usage limit',
    },
  },
  minOrderValue:{
  type:Number,
  required:[true,'Minimum order Value is required'],
  min:[0,'Minimum order value cannot be less than 0'],
},
applicableCategories:[{
  type:mongoose.Schema.Types.ObjectId,
  ref:'Category',
  required:[true,'Applicable categories are required']
  
    }]
  });
 

  
  module.exports = mongoose.model('Coupon', couponSchema);






