
const Coupon = require('../models/couponModel');
const Category=require('../models/categoryModel')
const catchAsyncErrors = require('../middleware/catchAsyncErrors');

exports.renderCreateCoupon = catchAsyncErrors(async (req, res, next) => {
  const categories=await Category.find()
 
  res.status(201).render('createCoupon',{message:null,errorMessage:null,FormData:null,categories})
});


//Create Coupon--admin

exports.createCoupon = catchAsyncErrors(async (req, res, next) => {
  try{
  const coupon = await Coupon.create(req.body);
  const coupons = await Coupon.find();
  const message=`coupon with code ${coupon.code} has been created successfully`
  const categories=await Category.find()
  res.status(201).render('allCoupons',{message,coupons,categories})
  }catch(error){
    let errorMessage = 'An error occurred';
    if (error.errors) {
      // Extract and format validation errors
      const errorMessages = Object.values(error.errors).map(err => err.message);
      errorMessage = errorMessages.join(', ');
    }
    const categories=await Category.find()

    res.render('createCoupon',{errorMessage,message:null,FormData:req.body,categories})



  } 
    
});

//Get All Coupons--admin

exports.getCoupons = catchAsyncErrors(async (req, res, next) => {
  const coupons = await Coupon.find();
  res.status(200).render('allCoupons',{coupons,message:null})



});
//Get Single Coupon --Admin

exports.getSingleCoupon =catchAsyncErrors( async (req, res) => {
  try {
      const couponId = req.body.couponId;
      const coupon = await Coupon.findById(couponId);
      
      if (!coupon) {
          return res.status(404).send('Coupon not found');
      }
      const categories = await Category.find();

      res.render('getSingleCoupon', { coupon ,message:null,categories});
  } catch (error) {
      console.error('Error fetching coupon:', error);
      res.status(500).send('Server Error');
  }
});

// Controller function to update a single coupon--admin
exports.updateCoupon = async (req, res) => {

    try {
        const couponId = req.params.id;
      
        
       
        
        const { code, discountPercentage, startDate, endDate, usageLimit,applicableCategories,  minOrderValue } = req.body;

        const coupon = await Coupon.findByIdAndUpdate(couponId, {
            code,
            discountPercentage,
            startDate,
            endDate,
            usageLimit,
            applicableCategories,
            minOrderValue
         
        }, { new: true });

        if (!coupon) {
            return res.status(404).send('Coupon not found');
        }

        const message=`Coupon with code: ${coupon.code} has been updated successfully`
        const categories=await Category.find()

        res.render('getSingleCoupon',{coupon,message,categories});
    } catch (error) {
        console.error('Error updating coupon:', error);
        res.status(500).send('Server Error');
    }
};







//Delete Coupen --Admin

exports.deleteCoupon = catchAsyncErrors(async (req, res, next) => {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) {
    return res.status(404).json({
      success: false,
      message: 'Coupon not found',
    });
  }

  await coupon.deleteOne();
  const message= `Coupon with code: ${coupon.code} has been deleted successfully`
  const coupons = await Coupon.find();

  res.status(200).render('allCoupons',{coupons,message})
 
    
  
});






// Apply Coupon
exports.applyCoupon = catchAsyncErrors(async (req, res, next) => {
  try{
  const { couponCode, orderTotal, productCategories } = req.body;
 
  

  // Parse productCategories into an array if it is a string
  const categoriesArray = typeof productCategories === 'string'
      ? JSON.parse(productCategories)
      : productCategories;

  const coupon = await Coupon.findOne({ code: couponCode });
  if (!coupon) {
    const message=`Invalid coupon code`
    throw new Error(message)
       
  }

  if (new Date() < coupon.startDate || new Date() > coupon.endDate) {
     const message= 'Coupon is expired'
     throw new Error(message)
   
  }

  if (orderTotal < coupon.minOrderValue) {
    const message= `Minimum order value of ${coupon.minOrderValue} is required.`
    throw new Error(message) 
  }

  if (!Array.isArray(categoriesArray)) {
    const message= 'Product categories data is invalid.'
    throw new Error(message)
      
  }

  // Check if the coupon is applicable to any of the product categories
  const isApplicable = categoriesArray.every(categoryId => coupon.applicableCategories.includes(categoryId));
  if (!isApplicable) {
    const message= 'Coupon is not applicable for the selected categories'
    throw new Error(message)
     
  }

  // Check if the usage limit has been reached
  if (coupon.usageCount >= coupon.usageLimit) {
    const message= 'Coupon usage limit has been reached'
    throw new Error(message) 
  }
 

  const couponDiscount = ((orderTotal * coupon.discountPercentage) / 100).toFixed(2);
  const newTotal = orderTotal 

 
 
  

  return res.status(200).redirect(`/myCart?newTotal=${newTotal}&couponDiscount=${couponDiscount}&couponCode=${couponCode}&orderTotal=${orderTotal}&message=Coupon applied successfully&selectedCouponCode=${couponCode}`);

  }catch(error){
    let message = 'An error occurred';
    if (error.errors) {
      // Extract and format validation errors
      const errorMessages = Object.values(error.errors).map(err => err.message);
      message = errorMessages.join(', ');
    }
    else{
    message=error.message


    }
    res.redirect(`/myCart?message=${encodeURIComponent(message)}`);
  }
})

//Cancel Coupon


exports.cancelCoupon = catchAsyncErrors(async (req, res, next) => {
  try {
    const { couponCode, orderTotal } = req.body;

    // Find the coupon by code
    const coupon = await Coupon.findOne({ code: couponCode });
    if (!coupon) {
      const message = `Invalid coupon code`;
      throw new Error(message);
    }

    // Check if the coupon was applied
    if (coupon.usageCount <= 0) {
      const message = 'Coupon was not applied or usage count is invalid';
      throw new Error(message);
    }

    // Revert the discount
   
    const newTotal = parseFloat(orderTotal).toFixed(2);

    // Decrement the usage count and save the coupon
    // coupon.usageCount -= 1;
    // await coupon.save({ validateBeforeSave: false });

    return res.status(200).redirect(`/myCart?newTotal=${newTotal}&message=Coupon canceled successfully`);
  } catch (error) {
    let message = 'An error occurred';
    if (error.errors) {
      // Extract and format validation errors
      const errorMessages = Object.values(error.errors).map(err => err.message);
      message = errorMessages.join(', ');
    } else {
      message = error.message;
    }
    res.redirect(`/myCart?message=${encodeURIComponent(message)}&selectedCouponCode=${req.body.couponCode}`);
  }
});






























