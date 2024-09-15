const express=require('express')
const router=express.Router()

const { isAuthenticateUser,authorizeRoles } = require('../../middleware/auth')
const { newOrder, getAllOrders, deleteOrder, getCheckoutPage, cancelOrder, getSingleOrderDetails, updateOrderStatus, getSalesReport, downLoadSalesReport, createReturnRequest, getReturnRequests, handleReturnRequest } = require('../../controllers/orderController')







router.route('/getAllOrders').get(isAuthenticateUser,authorizeRoles('admin'),getAllOrders)
router.route('/updateOrderStatus/:id').put(isAuthenticateUser,authorizeRoles('admin'),updateOrderStatus)
router.route('/deleteOrder/:id').delete(isAuthenticateUser,authorizeRoles('admin'),deleteOrder)
router.route('/salesReport').get(isAuthenticateUser,authorizeRoles('admin'),getSalesReport)
router.route('/downloadSalesReport').get(isAuthenticateUser,authorizeRoles('admin'),downLoadSalesReport)
router.route('/getReturnRequest').get(isAuthenticateUser,authorizeRoles('admin'),getReturnRequests)
router.route('/handleReturnRequest').post(isAuthenticateUser,authorizeRoles('admin'),handleReturnRequest)





module.exports=router

