const express=require('express')
const router=express.Router()
const { isAuthenticateUser,authorizeRoles } = require('../../middleware/auth')
const { getWallet, creditWallet, debitWallet } = require('../../controllers/walletController')


router.route('/getWallet').get(isAuthenticateUser,getWallet)
router.route('/creditWallet').post(isAuthenticateUser,creditWallet)
router.route('/debitWallet').post(isAuthenticateUser,debitWallet)






module.exports = router;