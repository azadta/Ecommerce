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



//Add Item to cart

exports.addItemToCart = catchAsyncErrors(async (req, res, next) => {
  try {
    const { productId, quantity } = req.body;
    
   

    const userId = req.user._id;

    // Validate quantity
    const parsedQuantity = parseInt(quantity, 10);
    if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
      return res.status(400).json({ message: 'Invalid quantity value' });
    }

    const product = await Product.findById(productId).populate('offers');
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    if (quantity > product.stock) {
      return res.redirect(`/singleProductDetail/${productId}?message=${encodeURIComponent('Cannot add more items than available in stock')}`);
    }

    if(quantity>5){
      const message='Maximum allowed quantity per customer is 5'
      return res.redirect(`/singleProductDetail/${productId}?message=${encodeURIComponent(message)}`);

    }
    else if(quantity>3&&product.stock<10){
      const message='Maximum 3 units allowed due to low stock.'
      return res.redirect(`/singleProductDetail/${productId}?message=${encodeURIComponent(message)}`);

    }

    // Calculate discounted price
    let discountedPrice = product.price;
    if (product.offers.length > 0) {
      const currentDate = new Date();
      const validOffer = product.offers.find(offer =>
        offer.startDate <= currentDate && offer.endDate >= currentDate
      );
      if (validOffer) {
        discountedPrice = product.price - (product.price * (validOffer.discountPercentage / 100));
      }
    }


    

    let cart = await Cart.findOne({ user: userId }).populate('items.product');
    
    
    

    if (cart) {
     
      
      const itemIndex = cart.items.findIndex(item => item.product._id.toString() === productId);

      if (itemIndex > -1) {
        // Update existing item
        const existingItem = cart.items[itemIndex];
        existingItem.quantity += parsedQuantity;
        existingItem.total = existingItem.quantity * discountedPrice;
      } else {
        // Add new item
        cart.items.push({
          product: productId,
          quantity: parsedQuantity,
          price: discountedPrice,
          total: parsedQuantity * discountedPrice
        });
      }
    } else {
      // Create new cart
      cart = new Cart({
        user: userId,
        items: [{
          product: productId,
          quantity: parsedQuantity,
          price: discountedPrice,
          total: parsedQuantity * discountedPrice
        }]
      });
    }
      // Remove the item from the wishlist after adding it to the cart
      let wishlist = await Wishlist.findOne({ user: userId });
 
      if (wishlist && wishlist.items && wishlist.items.length > 0) {
        wishlist.items = wishlist.items.filter(item => item.product.toString() !== productId);
        await wishlist.save();
      }

    // Update cart totals
    cart.totalQuantity = cart.items.reduce((acc, item) => acc + Number(item.quantity), 0);
    cart.totalPrice = cart.items.reduce((acc, item) => acc + Number(item.total), 0);

    await cart.save();
    await cart.populate('items.product'); // Ensure items are populated

    // Pagination logic
    const page = parseInt(req.query.page, 10) || 1;
    const itemsPerPage = parseInt(req.query.limit, 10) || 5;
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedItems = cart.items.slice(startIndex, endIndex);
    const totalPages = Math.ceil(cart.items.length / itemsPerPage);
    const category= await Category.findById(product.categoryId)
    const breadcrumbs = await generateBreadcrumbs(category.parentCategoryId,product.categoryId,product._id,wishlist._id,cart._id);
    const coupons=await Coupon.find()

    res.status(200).render('cart', {
      cart,
      items: paginatedItems,
      currentPage: page,
      totalPages,
      itemsPerPage,
      breadcrumbs,
      coupons,
      selectedCouponCode:null,
      message:null 
    });
  } catch (error) {
    next(error);
  }
});



  
  
  
  
  

    // Update Cart with Ajax
exports.updateCart = catchAsyncErrors(async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { quantityChange } = req.body; // Change in quantity (can be +1 or -1)
    const product = await Product.findById(productId);
   
   
    

    const userId = req.user._id;
    const cart = await Cart.findOne({ user: userId }).populate('items.product');

    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    // Find the item in the cart
    const itemIndex = cart.items.findIndex(item => item.product._id.toString() === productId);
    if (itemIndex === -1) {
      return res.status(404).json({ message: 'Product not found in cart' });
    }

    const item = cart.items[itemIndex];
    const newQuantity = item.quantity + parseInt(quantityChange, 10);

    if (newQuantity > product.stock) {
      return res.status(400).json({ message: 'Cannot add more items than available in stock' });
    }

    if (newQuantity > 5) {
      return res.status(400).json({ message: 'Maximum allowed quantity per customer is 5' });
    }

    if (newQuantity > 3 && product.stock < 10) {
      return res.status(400).json({ message: 'Maximum 3 units allowed due to low stock.' });
    }

    if (newQuantity < 1) {
      return res.status(400).json({ message: 'Quantity must be at least 1' });
    }

    // Update item quantity and total
    item.quantity = newQuantity;
    item.total = item.quantity * item.price;

    // Update cart totals
    cart.totalQuantity = cart.items.reduce((acc, item) => acc + item.quantity, 0);
    cart.totalPrice = cart.items.reduce((acc, item) => acc + item.total, 0);


    const couponCode = req.query.couponCode;
    let couponDiscount = 0;
    let newTotal = cart.totalPrice;
    
    if (couponCode) {
        const coupon = await Coupon.findOne({ code: couponCode });
     
      
        if (coupon) {
            // Calculate the discount if a valid coupon is found
            couponDiscount = ((cart.totalPrice * coupon.discountPercentage) / 100).toFixed(2);
            newTotal = (cart.totalPrice - couponDiscount)
        } else {
            // Handle the case where the coupon is not valid
            couponDiscount = 0;
            newTotal = cart.totalPrice;
        }
    } else {
        // Handle the case where no coupon code is provided
        couponDiscount = 0;
        newTotal = cart.totalPrice;
    }
    
  
    

    await cart.save();
    await cart.populate('items.product'); // Ensure items are populated

    // Respond with updated cart and message
    const successMessage = `Quantity of ${product.name} in the cart has been updated to ${newQuantity} successfully`;

    res.status(200).json({
      success: true,
      cart,
      successMessage,
      updatedItem: {
        quantity: item.quantity,
        total: item.total,
      },
      totalQuantity: cart.totalQuantity,
      totalPrice: cart.totalPrice.toFixed(2),
      couponDiscount,
      newTotal
    });
  } catch (error) {
    next(error);
  }
});

   
  


//Delete Cart Products

  exports.deleteProductFromCart = catchAsyncErrors(async (req, res, next) => {
    try {
      const userId = req.user._id;
      const productId = req.params.productId;
  
      // Find the user's cart
      const cart = await Cart.findOne({ user: userId }).populate('items.product');
      if (!cart) {
        return res.status(404).json({ success: false, message: 'Cart not found' });
      }
  
      // Find and remove the product from the cart
      const productIndex = cart.items.findIndex(item => item.product._id.toString() === productId);
      if (productIndex === -1) {
        return res.status(404).json({ success: false, message: 'Product not found in cart' });
      }
  
      // Remove the product from the cart
      cart.items.splice(productIndex, 1);
  
      // Update cart totals
      cart.totalQuantity = cart.items.reduce((total, item) => total + (Number(item.quantity) || 0), 0);
      cart.totalPrice = cart.items.reduce((total, item) => total + (Number(item.total) || 0), 0);
  
      await cart.save();
  
      // Pagination logic
      const page = parseInt(req.query.page, 10) || 1;
      const itemsPerPage = parseInt(req.query.limit, 10) || 5;
      const startIndex = (page - 1) * itemsPerPage;
      const paginatedItems = cart.items.slice(startIndex, startIndex + itemsPerPage);
      const totalPages = Math.ceil(cart.items.length / itemsPerPage);
  
      // Fetch product details for success message
      const product = await Product.findById(productId);
      const message = product ? `${product.name} has been deleted from the cart successfully` : 'Product has been deleted from the cart successfully';
  
      const coupons = await Coupon.find();
  
      res.status(200).render('cart', {
        cart,
        items: paginatedItems,
        currentPage: page,
        totalPages,
        itemsPerPage,
        message,
        selectedCouponCode:null ,
        coupons
      });
    } catch (error) {
      next(error);
    }
  });

  
  
  
  //get All Cart Products
  
  exports.getCartItems = catchAsyncErrors(async (req, res, next) => {
    try {
        const userId = req.user._id;

        // Find the user's cart and populate product details
        const cart = await Cart.findOne({ user: userId }).populate('items.product');
        
        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found',
            });
        }

        // Pagination logic
        const page = parseInt(req.query.page, 10) || 1;
        const itemsPerPage = parseInt(req.query.limit, 10) || 5; // Set default items per page
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;

        const paginatedItems = cart.items.slice(startIndex, endIndex);
        const totalPages = Math.ceil(cart.items.length / itemsPerPage);
      
        const message=req.query.message
        const newTotal=req.query.newTotal|| cart.totalPrice;
        const couponDiscount=req.query.couponDiscount||null
        const couponCode=req.query.couponCode||null
        const orderTotal=req.query.orderTotal||null



        const coupons = await Coupon.find({});

        res.status(200).render('cart', {
            cart,
            items: paginatedItems, // Only render the items for the current page
            currentPage: page,
            totalPages,
            itemsPerPage,
            success: true,
        
            message,
            newTotal,
            couponDiscount,
            coupons,
            couponCode,
            orderTotal,
            selectedCouponCode: req.query.selectedCouponCode || ''

        });
    } catch (error) {
        next(error); // Pass the error to your error handling middleware
    }
});
  
  
