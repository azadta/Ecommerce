const Category=require('../models/categoryModel')
const ErrorHandler = require('../utils/errorhandler')
const catchAsyncErrors=require('../middleware/catchAsyncErrors')
const path = require('path');
const fs = require('fs');
const Cart = require('../models/cartModel');
const Product = require('../models/productModel');
const{generateBreadcrumbs}=require('./productController')
const Coupon=require('../models/couponModel')
const Wishlist=require('../models/wishlistModel')


exports.addItemToWishlist = catchAsyncErrors(async (req, res, next) => {
    try {
      const { productId } = req.body;
      const userId = req.user._id;
  
      // Ensure productId is a single value, not an array
      if (Array.isArray(productId)) {
        return res.status(400).json({ success: false, message: 'Invalid product ID format' });
      }
  
      // Check if the product exists
      const product = await Product.findById(productId);
      if (!product) {
        const message=`'Product not found'`
       throw new Error (message)
        
      }
  
      // Find or create the wishlist
      let wishlist = await Wishlist.findOne({ user: userId }).populate('items.product');
  
      if (wishlist) {
        // Check if the product is already in the wishlist
        const itemIndex = wishlist.items.findIndex(item => item.product._id.toString() === productId);
  
        if (itemIndex > -1) {
          const message= 'Product already in wishlist'
          throw new Error (message)
       
        } else {
          // Add new item to wishlist
          wishlist.items.push({ product: productId });
        }
      } else {
        // Create new wishlist
        wishlist = new Wishlist({
          user: userId,
          items: [{ product: productId }]
        });
      }
  
      // Save the wishlist
      await wishlist.save();
  
      // Populate the wishlist items again to ensure complete data
      wishlist = await Wishlist.findOne({ user: userId }).populate('items.product');
      const breadcrumbs = await generateBreadcrumbs(product.categoryId.parentCategoryId,product.categoryId, product._id,wishlist._id);
  
      // Render the wishlist page with the updated wishlist data
      res.status(200).render('wishlist', { wishlist: wishlist.items,breadcrumbs});
    } catch (error) {
      let errorMessage = 'An error occurred';
    if (error.errors) {
      // Extract and format validation errors
      const errorMessages = Object.values(error.errors).map(err => err.message);
      errorMessage = errorMessages.join(', ');
    }
    else{
      errorMessage=error.message

    }
     // Encode the error message to include it in the query string
     const encodedErrorMessage = encodeURIComponent(errorMessage);

     const productId = req.body.productId;
      const product = await Product.findById(req.body.productId);
      console.log(encodedErrorMessage);
      

      res.status(500).redirect(`/singleProductDetail/${productId}?message=${encodedErrorMessage}`)
    }
  
  });


  
  //remove Items from wish List

  exports.removeItemFromWishlist = catchAsyncErrors(async (req, res, next) => {
    const { productId } = req.params;
    const userId = req.user._id;
    const product=await Product.findById(productId)

    let wishlist = await Wishlist.findOne({ user: userId }).populate('items.product');

    if (wishlist) {
        wishlist.items = wishlist.items.filter(item => item.product._id.toString() !== productId);
        await wishlist.save();
        const message =`${product.name} has been removed from your Wishlist`

        res.status(200).render('wishlist', { wishlist: wishlist.items,message });
    } else {
        return res.status(404).json({ message: 'Wishlist not found' });
    }
});




//Get Wishlist
exports.getUserWishlist = catchAsyncErrors(async (req, res, next) => {
  const userId = req.user._id;

  const wishlist = await Wishlist.findOne({ user: userId }).populate('items.product');

  if (!wishlist) {
      return res.status(404).json({ message: 'Wishlist not found' });
  }

  res.status(200).render('wishlist', { wishlist: wishlist.items });
});

















