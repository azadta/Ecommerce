const express = require('express');
const router = express.Router();
const { 
  getCreateOfferForm, 
  getOffers, 
  updateOffer, 
  deleteOffer, 
  createOffer,
  getSingleOfferDetails

} = require('../../controllers/offerController');
const { isAuthenticateUser,authorizeRoles } = require('../../middleware/auth')

router.route('/offers')  .get(isAuthenticateUser,authorizeRoles('admin'),getOffers)

router.route('/createOffer').get(isAuthenticateUser,authorizeRoles('admin'),getCreateOfferForm).post(isAuthenticateUser,authorizeRoles('admin'),createOffer)
router.route('/getSingleOffer').post(isAuthenticateUser,authorizeRoles('admin'),getSingleOfferDetails)
  

router.route('/updateOffer').put(isAuthenticateUser,authorizeRoles('admin'),updateOffer)
  

  router.route('/deleteOffer/:id').delete(isAuthenticateUser,authorizeRoles('admin'),deleteOffer)

module.exports = router;
