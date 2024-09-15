const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
  
    parentCategoryId:{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
            default: null
        },
    parentCategoryName:{
            type:String,
            default:null
       
    },
    image: {
        type: String,
        default: null
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    offers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Offer'
    }]
    }, {
    timestamps: true
    });





    

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;






       
