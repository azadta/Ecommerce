const express=require('express')
const router=express.Router()
const { isAuthenticateUser,authorizeRoles } = require('../../middleware/auth')
const { addItemToWishlist, getUserWishlist, removeItemFromWishlist } = require('../../controllers/wishlistController')








router.route('/addItemsToWishlist').post(isAuthenticateUser,addItemToWishlist)

router.route('/getUserWishlist').get(isAuthenticateUser,getUserWishlist)
router.route('/removeWishlistItem/:productId').delete(isAuthenticateUser,removeItemFromWishlist)













module.exports=router


