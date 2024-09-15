const express=require('express')
const router=express.Router()
const { isAuthenticateUser,authorizeRoles } = require('../../middleware/auth')
const { addItemToCart, updateCart, deleteProductFromCart, getCartItems } = require('../../controllers/cartController')




router.route('/addToCart').post(isAuthenticateUser,addItemToCart)
router.route('/updateCart/:productId').put(isAuthenticateUser,updateCart)
router.route('/deleteProductFromCart/:productId').delete(isAuthenticateUser,deleteProductFromCart)
router.route('/myCart').get(isAuthenticateUser,getCartItems)

    
    
    
    















module.exports=router