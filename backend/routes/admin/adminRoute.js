const express=require('express')
const { registerUser, loginUser, logout, forgotPassword, resetPassword, getUserDetails, updatePassword, updateProfile, getAllUser, getSingleUser, updateUserRole, deleteUser, renderRegisterPage, renderHomePage, renderForgotPasswordPage, renderResetPasswordPage, renderUpdatePasswordPage, otpCreation, otpVerification, resendOTP, renderAdminPanel, updateUserProfile, renderEditUserDetails, renderGoogleLoginrPage, blockUser, unblockUser, getAllAddresses, addAddress, updateAddress, deleteAddress, renderAdminLoginPage, loginAdmin,  } = require('../../controllers/userController')
const { isAuthenticateUser,authorizeRoles } = require('../../middleware/auth')

const router=express.Router()
const passport = require('passport');
const sendToken = require('../../utils/jwtToken');


router.route('/getAllUsers').get(isAuthenticateUser,authorizeRoles('admin'),getAllUser)
router.route('/editUser/:id').get(isAuthenticateUser,authorizeRoles('admin'),renderEditUserDetails).put(isAuthenticateUser,authorizeRoles('admin'),updateUserProfile)
router.route('/deleteUser/:id').delete(isAuthenticateUser,authorizeRoles('admin'),deleteUser)
router.route('/singleUser').post(isAuthenticateUser,authorizeRoles('admin'),getSingleUser)


router.route('/getAllUsers').get(isAuthenticateUser,authorizeRoles('admin'),getAllUser)
router.route('/blockUser/:id').put(isAuthenticateUser,authorizeRoles('admin'),blockUser)
router.route('/unblockUser/:id').put(isAuthenticateUser,authorizeRoles('admin'),unblockUser)
router.route('/login').get(renderAdminLoginPage)
router.route("/adminLogin").post(loginAdmin)

module.exports=router