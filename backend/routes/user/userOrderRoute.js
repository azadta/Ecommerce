const express=require('express')
const router=express.Router()

const { isAuthenticateUser,authorizeRoles } = require('../../middleware/auth')
const { newOrder, getAllOrders, deleteOrder, getCheckoutPage, cancelOrder, getSingleOrderDetails, updateOrderStatus, getSalesReport, downLoadSalesReport, createReturnRequest, getReturnRequests, handleReturnRequest } = require('../../controllers/orderController')



router.route('/createNewOrder').post(isAuthenticateUser,newOrder)




router.route('/checkout').post(isAuthenticateUser,getCheckoutPage).get(isAuthenticateUser,getCheckoutPage)
router.route('/cancelOrder/:id').delete(isAuthenticateUser,cancelOrder)
router.route('/viewSingleOrder/:id').get(isAuthenticateUser,getSingleOrderDetails)
router.route('/returnRequest').post(isAuthenticateUser,createReturnRequest)




module.exports=router

   
