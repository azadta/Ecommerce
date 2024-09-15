const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Please enter product Name"],
        trim: true
    },
    description: {
        type: String,
        required: [true, "Please enter product description"],
    },
    price: {
        type: Number,
        required: [true, "Please enter product price"],
        maxlength: [8, "Price cannot exceed 8 characters"],
        min: [1, "Price must be a Positive number"],
    },
    ratings: {
        type: Number,
        default: 0
    },
    images: {
        type: [String], // Array of strings for image URLs or paths
        validate: {
            validator: function (array) {
                return array.length >= 3;
            },
            message: 'A product must have at least 3 images.'
        },
        required: true,
    },
    categoryName: {
        type: String,
        required: [true, "Please enter product category"]
    },
    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },
    stock: {
        type: Number,
        max: [999, "Stock cannot exceed 4 characters"],
        min: [1, 'Stock must be at least 1'],
        default: 1
    },
    reorderThreshold: {
        type: Number,
        default: 5 // Default value for reorder threshold
    },
    reorderAmount: {
        type: Number,
        default: 10 // Default value for reorder amount
    },
    isAvailable: {
        type: Boolean,
        default: true // Default value for availability
    },
    numOfReviews: {
        type: Number,
        default: 0
    },
    offers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Offer',
    }],
    reviews: [
        {
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                required: true
            },
            name: {
                type: String,
                required: true
            },
            rating: {
                type: Number,
                required: true
            },
            comment: {
                type: String,
                required: true
            },
            createdAt: {
                type: Date
            }
        }
    ],
    highlights: {
        type: String, // Array of highlights as strings
        required: true
    },
    specifications: {
        type: String, // Array of specifications as strings
        required: true
    },
    status: {
        type: String,
        
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    isFeatured: { type: Boolean, default: false },
});

module.exports = mongoose.model('Product', productSchema);
