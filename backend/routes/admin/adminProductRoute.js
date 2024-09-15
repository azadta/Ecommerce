const express=require('express')
const { getAllProducts,updateProduct, deleteProduct, getProductDetails, createProductReview, getProductReviews, deleteReview, createProduct, renderCreateProductPage, getSingleProduct, listAllProducts, renderAdminPanelForStockAlert, deleteAlert, getsingleCategoryProducts, getProductsByParentCategory } = require('../../controllers/productController')
const { isAuthenticateUser,authorizeRoles } = require('../../middleware/auth')
const router=express.Router()
const upload = require('../../config/multerConfig')
const {User}=require('../../models/userModel')
const jwt= require('jsonwebtoken')
const ErrorHandler = require('../../utils/errorhandler')
const catchAsyncErrors = require('../../middleware/catchAsyncErrors')




router.route('/listAllProducts').get(isAuthenticateUser,authorizeRoles('admin'),listAllProducts)
router.route('/singleProductDetails').post(isAuthenticateUser,authorizeRoles('admin'),getSingleProduct)

router.route('/createProduct').get(isAuthenticateUser,authorizeRoles("admin"),renderCreateProductPage).post(isAuthenticateUser,authorizeRoles("admin"),upload.array('images', 10),createProduct)

router.route('/updateProduct/:id').put(isAuthenticateUser,authorizeRoles("admin"),upload.array('images'),updateProduct)
router.route('/deleteProduct/:id').delete(isAuthenticateUser,authorizeRoles("admin"),deleteProduct)

router.route('/adminPanel').get(isAuthenticateUser,authorizeRoles('admin'),renderAdminPanelForStockAlert)
// Route for deleting an alert
router.route('/alerts/:id').delete(isAuthenticateUser,authorizeRoles('admin'),deleteAlert);











module.exports=router
























