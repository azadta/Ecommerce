const express=require('express')
const { getAllProducts,updateProduct, deleteProduct, getProductDetails, createProductReview, getProductReviews, deleteReview, createProduct, renderCreateProductPage, getSingleProduct, listAllProducts, renderAdminPanelForStockAlert, deleteAlert, getsingleCategoryProducts, getProductsByParentCategory } = require('../../controllers/productController')
const { isAuthenticateUser,authorizeRoles } = require('../../middleware/auth')
const router=express.Router()
const upload = require('../../config/multerConfig')
const {User}=require('../../models/userModel')
const jwt= require('jsonwebtoken')
const ErrorHandler = require('../../utils/errorhandler')
const catchAsyncErrors = require('../../middleware/catchAsyncErrors')




router.route('/').get(catchAsyncErrors(async (req, res, next) => {
  try {
    let user;
    const { token } = req.cookies;
    
    if (token) {
      const decodedData = jwt.verify(token, process.env.JWT_SECRET);
      user = await User.findById(decodedData.id);

      if (!user) {
        res.clearCookie('token');
   
        throw new Error('User not found');
      }

      if (user.isBlocked) {
        res.clearCookie('token');
 
        throw new Error('Your account is blocked. Please contact support.');
      }

      req.user = user;
    }

    next();
  } catch (error) {
    let errorMessage = 'An error occurred';
    
    if (error.errors) {
      const errorMessages = Object.values(error.errors).map(err => err.message);
      errorMessage = errorMessages.join(', ');
    } else {
      errorMessage = error.message || errorMessage;
    }

    res.redirect(`/?errorMessage=${encodeURIComponent(errorMessage)}`);
  }
}), getAllProducts);



   
router.route('/byLogin').get(isAuthenticateUser,getAllProducts)

router.route('/singleProductDetail/:id').get(getProductDetails)

router.route('/reviews').put(isAuthenticateUser,createProductReview)

router.route('/reviews').delete(isAuthenticateUser,deleteReview)


// router.route('/singleCategoryProducts/:categoryId').get(getsingleCategoryProducts);
router.route('/parentCategoryProducts/:parentCategoryId').get(getProductsByParentCategory);











module.exports=router
