const mongoose=require("mongoose")



const orderSchema = new mongoose.Schema({
  shippingInfo: {
    
      label: {
        type: String,
        enum: ['Home', 'Work', 'Other'],
        default: 'Other'
      },
      addressLine1: {
        type: String,
        required: true
      },
      addressLine2: String,
      city: {
        type: String,
        required: true
      },
      state: String,
      postalCode: {
        type: String,
        required: true
      },
      country: {
        type: String,
        required: true
      }
    ,
    phoneNo: {
      type: String, // Changed to String for better compatibility with different phone formats
      required: true
    }
  },
  orderItems: [{
    name: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    quantity: {
      type: Number,
      required: true
    },
    image: {
      type: String,
      required:true
      
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    itemStatus: {
      type: String,
      enum: ['processing', 'canceled', 'delivered','returned'],
      default: 'processing' // Default to 'processing' when the order is created
    }
  }],
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  paymentInfo: {
    id: {
      type: String,
      required: true
    },
    status: {
      type: String,
      required: true
    }
  },
  paidAt: {
    type: Date,
    required: true
  },
  itemsPrice: {
    type: Number,
    default: 0,
    required: true
  },
  taxPrice: {
    type: Number,
    default: 0,
    required: true
  },
  shippingPrice: {
    type: Number,
    default: 0,
    required: true
  },
  totalPrice: {
    type: Number,
    default: 0,
    required: true
  },
  orderStatus: {
    type: String,
    required: true,
    default: 'processing'
  },
  couponCode: {
    type: String, // New field for storing the applied coupon code
    default: null
  },
  couponDiscount: {
    type: Number,
    default: 0
},
  deliveredAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Order', orderSchema);




// //order model for test stock movement 
// const orderSchema = new mongoose.Schema({
//     orderedProductName: {
//         type: String,
//         required: true
//     },
//     orderedProductId: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'Product',
//         required: true
//     },
//     quantity: {
//         type: Number,
//         required: true
//     },
//     itemPrice: {
//         type: Number,
//         required: true
//     },
//     totalAmount: {
//         type: Number,
//         required: true
//     }
// }, {
//     timestamps: true // Optional: Adds createdAt and updatedAt fields
// });

module.exports=mongoose.model('Order',orderSchema)









    





  












       
















































