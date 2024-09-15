// routes/couponRoutes.js

const express = require('express');
const router = express.Router();
const { isAuthenticateUser} = require('../../middleware/auth');
const {

  applyCoupon,
  cancelCoupon,
} = require('../../controllers/couponController');

 

  
router.route('/applyCoupon').post(isAuthenticateUser,applyCoupon)
router.route('/cancelCoupon').post(isAuthenticateUser,cancelCoupon)

module.exports = router;




  
  
