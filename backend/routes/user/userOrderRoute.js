const express=require('express')
const router=express.Router()

const { isAuthenticateUser,authorizeRoles } = require('../../middleware/auth')
const { newOrder, getAllOrders, deleteOrder, getCheckoutPage, cancelOrder, getSingleOrderDetails, updateOrderStatus, getSalesReport, downLoadSalesReport, createReturnRequest, getReturnRequests, handleReturnRequest, cancelItem, renderCancelItemPage, submitReturnRequest, renderReturnItemPage } = require('../../controllers/orderController')



router.route('/createNewOrder').post(isAuthenticateUser,newOrder)




router.route('/checkout').post(isAuthenticateUser,getCheckoutPage).get(isAuthenticateUser,getCheckoutPage)
router.route('/renderCancelItemPage/:id').get(isAuthenticateUser,renderCancelItemPage)
router.route('/cancelOrder/:id').delete(isAuthenticateUser,cancelItem)
router.route('/renderReturnItemPage/:id').get(isAuthenticateUser,renderReturnItemPage)
router.route('/viewSingleOrder/:id').get(isAuthenticateUser,getSingleOrderDetails)
router.route('/returnRequest/:id').post(isAuthenticateUser,submitReturnRequest)




module.exports=router

   
