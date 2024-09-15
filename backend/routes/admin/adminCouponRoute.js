const express = require('express');
const router = express.Router();
const { isAuthenticateUser, authorizeRoles } = require('../../middleware/auth')
const {
  createCoupon,
  getCoupons,
  updateCoupon,
  deleteCoupon,
  renderCreateCoupon,

  getSingleCoupon,
  applyCoupon,
  cancelCoupon,
} = require('../../controllers/couponController');






router.route('/allCoupons')
  .get(isAuthenticateUser, authorizeRoles('admin'), getCoupons)
  router.route('/createCoupon').get(isAuthenticateUser, authorizeRoles('admin'),renderCreateCoupon)
  .post(isAuthenticateUser, authorizeRoles('admin'), createCoupon);

router.route('/updateCoupon/:id')
  .put(isAuthenticateUser, authorizeRoles('admin'), updateCoupon)
  router.route('/deleteCoupon/:id').delete(isAuthenticateUser, authorizeRoles('admin'), deleteCoupon);

  router.route('/getSingleCoupon').post(isAuthenticateUser,authorizeRoles('admin'),getSingleCoupon);



  module.exports = router;



