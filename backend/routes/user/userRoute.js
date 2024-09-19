const express=require('express')
const { registerUser, loginUser, logout, forgotPassword, resetPassword, getUserDetails, updatePassword, updateProfile, getAllUser, getSingleUser, updateUserRole, deleteUser, renderRegisterPage, renderHomePage, renderForgotPasswordPage, renderResetPasswordPage, renderUpdatePasswordPage, otpCreation, otpVerification, resendOTP, renderAdminPanel, updateUserProfile, renderEditUserDetails, renderGoogleLoginrPage, blockUser, unblockUser, getAllAddresses, addAddress, updateAddress, deleteAddress, renderLoginPage } = require('../../controllers/userController')
const { isAuthenticateUser,authorizeRoles } = require('../../middleware/auth')

const router=express.Router()
const passport = require('passport');
const sendToken = require('../../utils/jwtToken');

const Wallet = require('../../models/walletModel');
const Cart = require('../../models/categoryModel');
const Wishlist = require('../../models/wishlistModel');


router.route('/otpCreation').post(otpCreation)
router.route('/otpVerification/:email').post(otpVerification)
router.route('/resendOtp/:email').get(resendOTP)

router.route('/renderSignupPage').get(renderRegisterPage)
router.route('/renderLoginPage').get(renderLoginPage)

router.route("/login").post(loginUser)

router.route('/googleLogin').get(renderGoogleLoginrPage)

router.route('/forgot').post(forgotPassword).get(renderForgotPasswordPage)


router.route('/resetPassword/:token').put(resetPassword).get(renderResetPasswordPage)

router.route('/logout').get(isAuthenticateUser,logout)

router.route('/me').get(isAuthenticateUser,getUserDetails)

router.route('/updatePassword').put(isAuthenticateUser,updatePassword)
router.route('/updateProfile').put(isAuthenticateUser,updateProfile)



// Google OAuth routes
router.get('/auth/google', passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account' // This ensures the consent screen is shown
}));

router.get('/auth/google/ecommerce', 
    passport.authenticate('google', { failureRedirect: '/register' }),
   async (req, res) => {
  
  // Check if a wallet already exists for the user
  let wallet = await Wallet.findOne({ user: req.user._id });
  if (!wallet) {
      // If no wallet exists, create a new one
      wallet = new Wallet({ user: req.user._id });
      await wallet.save({ validateBeforeSave: false });
  }



  // Check if a wishlist already exists for the user
  let wishlist = await Wishlist.findOne({ user: req.user._id });
  if (!wishlist) {
      // If no wishlist exists, create a new one
      wishlist = new Wishlist({ user: req.user._id });
      await wishlist.save({ validateBeforeSave: false });
  }
        // Successful authentication, redirect home.
        sendToken(req.user,200,res)
    }
);

router.route('/getAllAddresses').get(isAuthenticateUser,getAllAddresses)

router.route('/AddAddress').post(isAuthenticateUser,addAddress)
router.route('/updateAddress/:addressId').put(isAuthenticateUser,updateAddress)
router.route('/deleteAddress/:addressId').delete(isAuthenticateUser,deleteAddress)





module.exports=router

    