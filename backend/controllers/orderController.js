const Order=require('../models/orderModel')
const Product=require('../models/productModel')
const ErrorHandler = require('../utils/errorhandler')
const catchAsyncErrors=require('../middleware/catchAsyncErrors')

const{checkStockLevels, generateBreadcrumbs}=require('./productController')
const Cart=require('../models/cartModel')
const sendEmail=require('../utils/sendEmail')
const User=require('../models/userModel')
const Coupon=require('../models/couponModel')
const ExcelJS=require('exceljs')
const puppeteer = require('puppeteer');
const path = require('path');
const ejs = require('ejs');
const Wishlist=require('../models/wishlistModel')
const ReturnRequest = require('../models/returnRequest');
const { creditWallet } = require('./walletController');
const Wallet=require('../models/walletModel')




exports.renderCancelItemPage=catchAsyncErrors(async(req,res,next)=>{
    const order=await Order.findById(req.params.id).populate("")

res.render('cancelOrder',{order,message:null})

})


exports.renderReturnItemPage=catchAsyncErrors(async(req,res,next)=>{
    const order=await Order.findById(req.params.id).populate("")

res.render('returnOrder',{order,message:null})

})





// Define the exchange rate (INR to USD)
const INR_TO_USD_RATE = 0.012; // Example rate, adjust as needed


// Get Checkout Page Data
exports.getCheckoutPage = catchAsyncErrors(async (req, res, next) => {
  // Fetch the user's cart items and populate product details
  const cart = await Cart.findOne({ user: req.user._id }).populate('items.product'); 
  

  
  
  
  if (!cart) {
    return res.status(400).json({ success: false, message: "Cart is not defined" });
}

  // Fetch the user's addresses from their profile
  const addresses = req.user.addresses || []; // If no addresses, return an empty array

  // List of available payment methods (could be dynamic)
  const paymentMethods = ["COD",  "PayPal","EShop Wallet"];
  const shippingCostINR = parseFloat(req.body.shippingCost) || 0; 
  const couponDiscountINR = parseFloat(req.body.couponDiscount) || 0; 

  const couponCode = req.body.couponCode || null 

 const breadcrumbs = await generateBreadcrumbs(null,null,null,null,cart._id,checkOut=true);


 res.status(200).render('checkout', {
     cart,
     addresses,
     paymentMethods,
     user: req.user, // If needed for additional context,
     shippingCost:shippingCostINR,
     breadcrumbs,
     couponDiscount:couponDiscountINR,
     couponCode,
     amountInUSD:null,
     message:req.query.message
    });
   });
      

  
 
  
  



// Create New Order
exports.newOrder = catchAsyncErrors(async (req, res, next) => {
    try{
    let {
        shippingInfo,
        orderItems,
        paymentInfo,
        itemsPrice,
        taxPrice,
        shippingPrice,
        totalPrice,
        newAddress,
        couponCode=null,
        couponDiscount=0// Default to 0 if couponDiscount is not provided
    } = req.body;

   
    
    

    // Ensure totalPrice is a number
    totalPrice = Number(totalPrice);
    itemsPrice = Number(itemsPrice);
    taxPrice = Number(taxPrice);
    shippingPrice = Number(shippingPrice);

    // If the user selected a new address, use it as the shipping address
    if (shippingInfo === 'new') {
        // Validate new address fields
        if (!newAddress || !newAddress.label || !newAddress.addressLine1 || !newAddress.city || !newAddress.state || !newAddress.country || !newAddress.postalCode || !newAddress.phoneNo) {
         
            throw new Error('Please provide complete new address details');
        }

        // Construct the shippingInfo object from the newAddress fields
        shippingInfo = {
            label: newAddress.label,
            addressLine1: newAddress.addressLine1,
            addressLine2: newAddress.addressLine2 || '',
            city: newAddress.city,
            state: newAddress.state,
            country: newAddress.country,
            postalCode: newAddress.postalCode,
            phoneNo: newAddress.phoneNo
        };

        // Optionally, save the new address to the user's profile
        const user = req.user;
        if(user.addresses.length>=5){
         
            const message = "You cannot enter more than 5 addresses";
            return res.redirect(`/checkout?message=${encodeURIComponent(message)}`);
        }

            
         


        user.addresses.push(shippingInfo);
        await user.save({ validateBeforeSave: false });
    } else {
        // Parse the existing shippingInfo from the selected radio button value
        shippingInfo = JSON.parse(shippingInfo);
    }

    
    
    
    
    

    // Handle paymentInfo; validate based on the payment method (COD or Online)
if (paymentInfo === 'COD') {
    // For Cash on Delivery
    paymentInfo = {
        id: 'COD',      // Default id for COD
        status: 'Pending'  // Default status for COD
    };
}

else if (paymentInfo === 'EShop Wallet') {
    // Handle EShop Wallet Payment
    const wallet = await Wallet.findOne({ user: req.user._id });
  
    

    if (!wallet || wallet.balance < totalPrice) {
        throw new Error('Insufficient balance in your EShop Wallet.');

        // const message = 'Insufficient balance in your EShop Wallet';
        //     return res.redirect(`/checkout?message=${encodeURIComponent(message)}`);
       
    }

    paymentInfo = {
        id: 'EShop Wallet',
        status: 'Completed'
    };


  
}

else {
    // For Online Payments (e.g., PayPal)
    if (!paymentInfo || !paymentInfo.id || !paymentInfo.status) {
        return next(new ErrorHandler('Payment information is incomplete or invalid.', 400));
    }

    // Ensure the correct structure is set
    paymentInfo = {
        id: paymentInfo.id,        // Payment ID from the payment gateway
        status: paymentInfo.status // Payment status from the payment gateway (e.g., 'Completed')
    };
}
    // Parse the orderItems back into an array of objects if they are passed as JSON strings
    orderItems = orderItems.map(item => typeof item === 'string' ? JSON.parse(item) : item);

    // Deduct stock for each ordered item and check stock levels
    for (let item of orderItems) {
        await updateStock(item.product, item.quantity);
        checkStockLevels(item.product); // Check stock levels for each product
    }
    

    // Create the new order
    const order = await Order.create({
        shippingInfo,
        orderItems,
        paymentInfo,
        itemsPrice,
        taxPrice,
        shippingPrice,
        totalPrice,
        couponCode,
        couponDiscount,
        paidAt: Date.now(),
        user: req.user._id
    });
    if (paymentInfo.id === 'EShop Wallet'){
    const wallet = await Wallet.findOne({ user: req.user._id });
      // Deduct the total price from wallet balance
      wallet.balance -= totalPrice;

      // Record the transaction in the wallet history
      wallet.transactions.push({
          type: 'debit',
          amount: totalPrice,
          description: `Order payment for Order ID: ${order._id}`,
      });
  
      await wallet.save({ validateBeforeSave: false });
    }
  
     
     // Increment the usage count and save the coupon

if (couponCode) {
    const coupon = await Coupon.findOne({ code: couponCode });
    if (coupon) {
        coupon.usageCount += 1;
        await coupon.save({ validateBeforeSave: false });
    }
}

    // Send confirmation email
    const emailOptions = {
        email: req.user.email,
        subject: 'Order Confirmation',
        message: `Dear ${req.user.name},\n\nThank you for your order!\n\nOrder ID: ${order._id}\nTotal Amount: Rs ${totalPrice.toFixed(2)}\n\nWe will notify you when your order is shipped.\n\nBest regards,\nEcommerce`
    };

    try {
        await sendEmail(emailOptions);
    } catch (error) {
        console.error('Error sending email:', error);
    }

    // Remove ordered items from the cart
    const cart = await Cart.findOne({ user: req.user._id });
    if (cart) {
        // Filter out the items that were ordered
        cart.items = cart.items.filter(cartItem => {
            return !orderItems.some(orderItem => orderItem.product.toString() === cartItem.product.toString());
        });

        // Recalculate the total quantity and price
        cart.totalQuantity = cart.items.reduce((acc, item) => acc + item.quantity, 0);
        cart.totalPrice = cart.items.reduce((acc, item) => acc + item.total, 0);

        // Save the updated cart
        await cart.save();
    }

    // Respond with the created order
    res.status(201).render('afterOrdering', { order });

    // Function to update stock for ordered items
    async function updateStock(productId, quantity) {
        const product = await Product.findById(productId);
        if (!product) {
            return next(new ErrorHandler(`Product not found with id ${productId}`, 404));
        }

        // Ensure the stock is sufficient
        if (product.stock < quantity) {
            return next(new ErrorHandler('Insufficient stock available', 400));
        }

        // Deduct the quantity from stock
        product.stock -= quantity;

        // Set availability to false if stock is zero
        if (product.stock === 0) {
            product.isAvailable = false;
        }

        // Save the updated product
        await product.save({ validateBeforeSave: false });

        // Trigger reorder alert if needed
        if (product.stock <= product.reorderThreshold) {
            // Example function to handle alerts
            // triggerReorderAlert(product);
        }
    }
}catch(error){
  // Log the error for debugging
  console.error('Order processing error:', error);

  // Redirect to order failure page with the error message
  res.status(400).render('orderFailure', { errorMessage: error.message });


}
})




  
    //Get single order
    exports.getSingleOrder=catchAsyncErrors(async(req,res,next)=>{
    
        const order=await Order.findById(req.params.id).populate("user","name email")


        if(!order){

         return next(new ErrorHandler("Order not found with this id",404))
        }
        res.status(200).json({
            success:true,
            order
        })

    })

     //Get logged in user order
     exports.myOrders=catchAsyncErrors(async(req,res,next)=>{
    
        const orders=await Order.find({user:req.user._id})


      
        res.status(200).json({
            success:true,
            orders
        })

    })


   

    // Controller to get all orders--admin
    exports.getAllOrders = async (req, res, next) => {
      try {
        const orders = await Order.find().populate('user').populate('orderItems.product').sort({ createdAt: -1 }); // Sort by createdAt in descending order
 
    
        res.render('getAllOrders', { orders });
      } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
      }
    };
    

//     // Processing Order/Update Order -- Admin
// exports.updateOrder = catchAsyncErrors(async (req, res, next) => {
//     const order = await Order.findById(req.params.id);
//     if (!order) {
//       return next(new ErrorHandler("Order not found with this id", 404));
//     }
  
//     if (order.orderStatus === "Delivered") {
//       return next(new ErrorHandler("You have already delivered this item", 400));
//     }
  
//     order.orderStatus = req.body.status;
  
//     if (req.body.status === "Delivered") {
//       order.deliveredAt = Date.now();
//     }
  
//     await order.save({ validateBeforeSave: false });
  
//     res.status(200).json({
//       success: true,
//     });
//   });

// Controller to update order status
exports.updateOrderStatus = async (req, res) => {
    try {
        const orderId = req.params.id; // Get the order ID from the URL parameters
        const newStatus = req.body.orderStatus; // Get the new status from the form data

        // Find the order by ID and update its status
        const order = await Order.findById(orderId).populate('orderItems.product');

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

          // If the status is being changed to 'canceled', increase the stock for each product
          if (newStatus === 'canceled' && order.orderStatus !== 'canceled') {
            order.orderItems.forEach(async (item) => {
                item.product.stock += item.quantity; // Increase the stock by the quantity in the order
                await item.product.save(); // Save the updated product
            });

                   // If there's a coupon associated with the order, decrement its usage count
             if (order.couponCode) {
                const coupon = await Coupon.findOne({ code: order.couponCode });
                if (coupon) {
                    coupon.usageCount -= 1;
                    await coupon.save({ validateBeforeSave: false });
                }
            }

        }





        order.orderStatus = newStatus;

        if (newStatus === 'delivered') {
            order.deliveredAt = Date.now(); // Set delivered date if status is 'delivered'
        }

        await order.save();
        const orders = await Order.find().populate('user').populate('orderItems.product');
        const message=`Order status has been updated with orderId: ${order._id}`

        res.render('getAllOrders',{orders,message}); // Redirect to the orders list page after updating
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'An error occurred while updating the order status' });
    }
};
  


    //delete Orders--Admin
    exports.deleteOrder=catchAsyncErrors(async(req,res,next)=>{
    
        const order=await Order.findById(req.params.id).populate('orderItems.product');
        if(!order){

            return next(new ErrorHandler("Order not found with this id",404))
           }

              // Increase the stock for each product if the order status is not 'canceled'
    if (order.orderStatus !== 'canceled') {
        order.orderItems.forEach(async (item) => {
            item.product.stock += item.quantity; // Increase the stock by the quantity in the order
            await item.product.save(); // Save the updated product
        });
    
         // If there's a coupon associated with the order, decrement its usage count
         if (order.couponCode) {
            const coupon = await Coupon.findOne({ code: order.couponCode });
            if (coupon) {
                coupon.usageCount -= 1;
                await coupon.save({ validateBeforeSave: false });
            }
        }
    }
    
    
    
    
          
    
    const message=`Order  has been deleted with orderId: ${order._id}`

        await order.deleteOne()
        const orders = await Order.find().populate('user').populate('orderItems.product');
         

       
        res.status(200).render('getAllOrders',{orders,message})
            
            
   

    })





    
    
    
    
    //Cancel Items

    exports.cancelItem = async (req, res, next) => {
        try {
            const order = await Order.findById(req.params.id).populate('couponCode'); // Populate couponCode to access coupon details
            if (!order) {
                throw new Error('Order not found');
            }
    
            const quantities = req.body.quantities; // quantities object from form
            let canceledItems = []; // To store canceled item names and quantities
            let totalQuantity = 0; // Total quantity after cancellation
            let totalItemPrice = 0; // Total items price after cancellation
    
            // Iterate over each product ID in req.body.quantities
            for (const productId in quantities) {
                if (quantities.hasOwnProperty(productId)) {
                    const cancelQuantity = parseInt(quantities[productId]);
    
                    // Find the item in the order
                    const item = order.orderItems.find(item => item.product._id.toString() === productId);
    
                    if (!item) {
                        throw new Error('Product not found in this order');
                    }
    
                    // Check if item has enough quantity to cancel
                    if (cancelQuantity >= item.quantity) {
                        // Set item status to 'canceled' if all quantities are canceled
                        item.itemStatus = 'canceled';
                        canceledItems.push(`${item.name} (${item.quantity} canceled)`); // Add to the canceled items list
                        item.quantity = 0; // Set quantity to 0 if all items are canceled
                    } else {
                        // Reduce the quantity if canceling only a portion of the order
                        item.quantity -= cancelQuantity;
                        canceledItems.push(`${item.name} (${cancelQuantity} canceled)`); // Add to the canceled items list
                    }
    
                    // Adjust stock for the canceled quantity
                    const product = await Product.findById(item.product);
                    product.stock += cancelQuantity; // Add back the canceled quantity to stock
                    await product.save();
    
                    // Updating order fields
                    let canceledAmount = item.price * cancelQuantity;
                    order.itemsPrice -= canceledAmount; // Adjust items price
                    totalItemPrice += item.price * item.quantity; // Update the total item price after cancellations
                    totalQuantity += item.quantity; // Update total quantity
    
                    if (order.shippingPrice && order.shippingPrice > 0) {
                        order.shippingPrice -= cancelQuantity * 50; // Example of adjusting shipping price (optional)
                        order.totalPrice -= canceledAmount + (cancelQuantity * 50); // Adjust total price
                    } else {
                        order.totalPrice -= canceledAmount; // Adjust total price
                    }
                }
            }
    
            // Recalculate coupon discount proportionally if there's still a coupon applied
            if (order.couponCode) {
                const coupon = order.couponCode;
    
                // Check if the remaining items' price exceeds the minimum order value
                if (order.itemsPrice >= coupon.minOrderValue) {
                    // Proportionally recalculate the coupon discount based on the remaining items price
                    const originalItemsPrice = order.itemsPrice + totalItemPrice; // Assuming totalItemPrice holds original items price before cancellation
                    const discountAmount = (coupon.discountPercentage / 100) * order.itemsPrice;
    
                    // Adjust the discount proportionally to the remaining items
                    const proportionalDiscount = (discountAmount / originalItemsPrice) * order.itemsPrice;
                    order.couponDiscount = proportionalDiscount;
    
                    // Recalculate the total price after applying the new proportional coupon discount
                    order.totalPrice = order.itemsPrice + order.shippingPrice - order.couponDiscount;
                } else {
                    // If the order items price is below the minimum order value, remove the coupon discount
                    order.couponDiscount = 0;
                    order.totalPrice = order.itemsPrice + order.shippingPrice;
                }
            }
    
            // Check if all items in the order are canceled to update the overall order status
            const allItemsCanceled = order.orderItems.every(item => item.itemStatus === 'canceled');
            if (allItemsCanceled) {
                order.orderStatus = 'canceled'; // If all items are canceled, set the order status to 'canceled'
    
                // If there's a coupon associated with the order, decrement its usage count
                if (order.couponCode) {
                    const coupon = await Coupon.findOne({ code: order.couponCode.code });
                    if (coupon) {
                        coupon.usageCount -= 1;
                        await coupon.save({ validateBeforeSave: false });
                    }
                }
            }
    
            // Save the updated order
            await order.save();
    
            // Generate a message with canceled items and their quantities
            const message = `Canceled items: ${canceledItems.join(', ')}`;
            res.status(200).redirect(`/me?message=${encodeURIComponent(message)}`);
    
        } catch (error) {
            const message = error.message;
            const order = await Order.findById(req.params.id);
            res.render('cancelOrder', { message, order });
        }
    };
    
    
    
    
    







    
    // Get Single Order Details
exports.getSingleOrderDetails = async (req, res, next) => {
  
    
    try {
        const order = await Order.findById(req.params.id).populate('orderItems.product');

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

       

        res.render('singleOrderView', { order, user:req.user });
    } catch (error) {
        return next(error);
    }
};



    // for testing stock movement
  
// exports.singleOrder1 = catchAsyncErrors(async (req, res, next) => {

//     const {
//         orderedProductName,
//         orderedProductId,
//         quantity,
//         itemPrice,
//         totalAmount
//     } = req.body;

    
    

//     // Deduct stock for the ordered item
//     await updateStock(orderedProductId, quantity);

//     // Create a new order
//     const order = await Order.create({
//         orderedProductName,
//         orderedProductId,
//         quantity,
//         itemPrice,
//         totalAmount
//     });

//    checkStockLevels(orderedProductId)
   
//     res.redirect(`/singleProductDetail/${orderedProductId}?message=Order created successfully`);

//     async function updateStock(productId, quantity) {
//         const product = await Product.findById(productId);
//         if (!product) {
//             return next(new ErrorHandler(`Product not found with id ${productId}`, 404));
//         }

//         // Ensure the stock is sufficient
//         if (product.stock < quantity) {
//             return next(new ErrorHandler('Insufficient stock available', 400));
//         }

//         // Deduct the quantity from stock
//         product.stock -= quantity;

//         // Set availability to false if stock is zero
//         if (product.stock === 0) {
//             product.isAvailable = false;
//         }

//         // Save the updated product
//         await product.save({ validateBeforeSave: false });

//         // Trigger reorder alert if needed (you can implement a function for this)
//         if (product.stock <= product.reorderThreshold) {
//             // Example function to handle alerts
//             // triggerReorderAlert(product);
//         }
//     }
// });


//Get Sales Report
exports.getSalesReport=catchAsyncErrors(async(req,res,next)=>{
try{
    const {period,startDate,endDate , page = 1,message}=req.query

    const resultsPerPage = 10
      // Define the date range based on the period

      let start,end
      const now=new Date()
      switch(period){

        case 'day':
            start=new Date(now.setHours(0,0,0,0))//today
            end=new Date(now.setHours(23,59,59,999))
            break;
        case 'week':
            start=new Date(now.setDate(now.getDate()-now.getDay())) // Start of the week
            end=new Date(now.setDate(start.getDate()+6)) // End of the week
            break;
        case 'month':
            start=new Date(now.getFullYear(),now.getMonth(),1) // Start of the month
            end=new Date(now.getFullYear(),now.getMonth()+1,0)//End of the month
            break;
        case 'year':
            start=new Date(now.getFullYear(),0,1) // Start of the year
            end=new Date(now.getFullYear(),11,31)//End of the year
            break;
        case 'custom':
            start=new Date(startDate)
            end=new Date(endDate)
            break;
        default:
            start=new Date(0)//Beginning of the time if no filterr applied
            end=new Date()//Now    
        }

        if (period === 'custom') {
            if (!startDate || !endDate) {
                return res.redirect('/salesReport?message=Please provide both start and end dates for custom filtering.');
            }
        
            if (new Date(startDate) > new Date(endDate)) {
                return res.redirect('/salesReport?message=End date must be after start date.');
            }
        }
             

    const orders = await Order.find({
        "paymentInfo.status": "COMPLETED",
        'paidAt':{$gte:start,$lte:end},
        'orderStatus': { $nin: ['canceled', 'returned'] } // Exclude canceled or returned orders
    }).populate('orderItems.product')
    .skip(resultsPerPage * (page - 1))
    .limit(resultsPerPage);
        
       
    //Aggregating the data

    const allOrders = await Order.find({
    
       'paidAt':{$gte:start,$lte:end}
   }).populate('orderItems.product')

   const allOrdersTotalAmount= allOrders.reduce((sum,order)=>sum+order.totalPrice,0)

    const ordersWithoutPagination = await Order.find({
       "paymentInfo.status": "COMPLETED",
       'paidAt':{$gte:start,$lte:end}}).populate('orderItems.product')

    const salesCount=ordersWithoutPagination.length
  
    const totalOrderAmount=ordersWithoutPagination.reduce((sum,order)=>sum+order.totalPrice,0)
    

   
    const totalDiscount= ordersWithoutPagination.reduce((sum,order)=>{

    const totalPriceWithoutDiscount=order.orderItems.reduce((sum,item)=>{
     
        return sum+(item.product.price*item.quantity)
    },0) 

     const totalPriceAfterDiscount=order.itemsPrice   
     
        

      return sum+(totalPriceWithoutDiscount-totalPriceAfterDiscount)
    },0)
      
    const totalCouponDiscount=ordersWithoutPagination.reduce((sum,order)=>sum+order.couponDiscount,0 )
                         
    res.status(200).render('salesReport',{
        salesCount,
        totalOrderAmount,
        totalDiscount,
        totalCouponDiscount,
        orders,
        currentPage:  parseInt(page),
        totalPages: Math.ceil(salesCount / resultsPerPage),
        period,
       startDate,
        endDate,
        message,
        allOrdersTotalAmount
       })
    
    }catch(error) {
       let errorMessage = 'An error occurred';
   
       if (error.errors) {
           // Extract and format validation errors
           const errorMessages = Object.values(error.errors).map(err => err.message);
           errorMessage = errorMessages.join(', ');
       }
   
       // Encode the error message to make it URL-safe
       const encodedErrorMessage = encodeURIComponent(errorMessage);
   
       // Redirect to the sales report page with the error message as a query parameter
       res.redirect(`/salesReport?message=${encodedErrorMessage}`);
   }
   
        
    })

    
    
    
    

  
   
 
   
   
  
    
   
    
  

   


    


    exports.downLoadSalesReport = catchAsyncErrors(async (req, res, next) => {
        try {
            let { format, period, startDate, endDate, page = 1 } = req.query;
            const resultsPerPage = 10;
    
            // Handle dynamic date range based on the period
            const now = new Date();
            let start, end;
    
            switch (period) {
                case 'day':
                    start = new Date(now.setHours(0, 0, 0, 0));
                    end = new Date(now.setHours(23, 59, 59, 999));
                    break;
                case 'week':
                    start = new Date(now.setDate(now.getDate() - now.getDay()));
                    end = new Date(now.setDate(start.getDate() + 6));
                    break;
                case 'month':
                    start = new Date(now.getFullYear(), now.getMonth(), 1);
                    end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                    break;
                case 'year':
                    start = new Date(now.getFullYear(), 0, 1);
                    end = new Date(now.getFullYear(), 11, 31);
                    break;
                case 'custom':
                    start = new Date(startDate);
                    end = new Date(endDate);
                    break;
                default:
                    start = new Date(0);
                    end = new Date();
            }
    
            if (period === 'custom') {
                if (!startDate || !endDate) {
                    return res.redirect('/salesReport?message=Please provide both start and end dates for custom filtering.');
                }
    
                if (new Date(startDate) > new Date(endDate)) {
                    return res.redirect('/salesReport?message=End date must be after start date.');
                }
            }
    
            end.setHours(23, 59, 59, 999);
    
            // Fetch Orders based on date range
            const orders = await Order.find({
                'paymentInfo.status': "COMPLETED",
                'paidAt': { $gte: start, $lte: end }
            }).populate('orderItems.product')
            .skip(resultsPerPage * (page - 1))
            .limit(resultsPerPage);
    
            const ordersWithoutPagination = await Order.find({
                'paymentInfo.status': "COMPLETED",
                'paidAt': { $gte: start, $lte: end }
            }).populate('orderItems.product');
    
            const allOrdersTotalAmount = ordersWithoutPagination.reduce((sum, order) => sum + order.totalPrice, 0);
            const salesCount = ordersWithoutPagination.length;
            const totalOrderAmount = ordersWithoutPagination.reduce((sum, order) => sum + order.totalPrice, 0);
            const totalDiscount = ordersWithoutPagination.reduce((sum, order) => {
                const totalPriceWithoutDiscount = order.orderItems.reduce((sum, item) => {
                    return sum + (item.product.price * item.quantity);
                }, 0);
                const totalPriceAfterDiscount = order.itemsPrice;
                return sum + (totalPriceWithoutDiscount - totalPriceAfterDiscount);
            }, 0);
            const totalCouponDiscount = ordersWithoutPagination.reduce((sum, order) => sum + order.couponDiscount, 0);
    
            if (format === 'excel') {
                // Generate Excel report
                const workbook = new ExcelJS.Workbook();
                const worksheet = workbook.addWorksheet('Orders');
    
                worksheet.columns = [
                    { header: 'Order ID', key: 'orderId', width: 35 },
                    { header: 'Order Date', key: 'orderDate', width: 22 },
                    { header: 'Products', key: 'products', width: 27 },
                    { header: 'Quantity', key: 'quantity', width: 20 },
                    { header: 'Original Price', key: 'originalPrice', width: 25 },
                    { header: 'Discounted Price', key: 'discountedPrice', width: 25 },
                    { header: 'Coupon Discount', key: 'couponDiscount', width: 30 },
                    { header: 'Final Amount', key: 'finalAmount', width: 22 },
                ];
    
                ordersWithoutPagination.forEach(order => {
                    order.orderItems.forEach(item => {
                        worksheet.addRow({
                            orderId: order._id,
                            orderDate: new Date(order.createdAt).toLocaleDateString(),
                            products: item.product.name,
                            quantity: item.quantity,
                            originalPrice: `Rs ${item.product.price.toFixed(2)}`,
                            discountedPrice: `Rs ${item.price.toFixed(2)}`,
                            couponDiscount: order.couponDiscount ? `Rs ${order.couponDiscount.toFixed(2)}` : 'N/A',
                            finalAmount: `Rs ${order.totalPrice.toFixed(2)}`
                        });
                    });
                });
    
                // Apply styles to the Orders sheet
                worksheet.getRow(1).font = { bold: true, size: 18 }; // Increase font size for headers
                worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
                    row.alignment = { vertical: 'middle', horizontal: 'center' };
                    row.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' },
                    };
                    if (rowNumber === 1) {
                        row.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: 'FFFF00' }, // Yellow background for headers
                        };
                    }
                });
    
                // Add summary below the table
                const lastRow = worksheet.lastRow.number + 2;
                const summaryStartRow = lastRow;
    
                worksheet.mergeCells(`A${summaryStartRow}:H${summaryStartRow}`);
                const summaryCell = worksheet.getCell(`A${summaryStartRow}`);
                summaryCell.value = 'Summary';
                summaryCell.font = { bold: true, size: 14 };
                summaryCell.alignment = { horizontal: 'left', vertical: 'middle' };
    
                const summary = [
                    ['Total Sales Count', salesCount],
                    ['Total Order Amount', `Rs ${totalOrderAmount.toFixed(2)}`],
                    ['Total Discounts', `Rs ${totalDiscount.toFixed(2)}`],
                    ['Coupon Deductions', `Rs ${totalCouponDiscount.toFixed(2)}`],
                    ['Overall Total Amount', `Rs ${allOrdersTotalAmount.toFixed(2)}`]
                ];
    
                summary.forEach((item, index) => {
                    const row = worksheet.addRow(item);
                    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                        cell.alignment = { vertical: 'middle', horizontal: 'center' };
                        cell.font = { size: 12 };
                        if (index % 2 === 0) {
                            cell.fill = {
                                type: 'pattern',
                                pattern: 'solid',
                                fgColor: { argb: 'D9EAD3' } // Light green background for summary rows
                            };
                        }
                    });
                });
    
                const buffer = await workbook.xlsx.writeBuffer();
    
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', `attachment; filename=salesReport_${start.toLocaleDateString()}_to_${end.toLocaleDateString()}.xlsx`);
                res.end(buffer);
            } else if (format === 'pdf') {
                // Generate PDF Report using EJS template
                const templatePath = path.join(__dirname, '../views/admin/salesReport.ejs');
    
                const html = await ejs.renderFile(templatePath, {
                    salesCount,
                    totalOrderAmount,
                    totalDiscount,
                    totalCouponDiscount,
                    orders,
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(salesCount / resultsPerPage),
                    period,
                    startDate: start.toLocaleDateString(),
                    endDate: end.toLocaleDateString(),
                    message: "",
                    allOrdersTotalAmount
                });
    
                const browser = await puppeteer.launch({
                    headless: true,
                    args: ['--no-sandbox', '--disable-setuid-sandbox'],
                    timeout: 60000,
                });
    
                const pdfPage = await browser.newPage();
                await pdfPage.setContent(html, { waitUntil: 'domcontentloaded' });
    
                const pdfBuffer = await pdfPage.pdf({
                    format: 'A4',
                    printBackground: true,
                    margin: { top: '20px', right: '30px', bottom: '20px', left: '30px' },
                });
    
                await browser.close();
    
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `attachment; filename=salesReport_${start.toLocaleDateString()}_to_${end.toLocaleDateString()}.pdf`);
                res.end(pdfBuffer);
            }
        } catch (error) {
            return res.redirect('/salesReport?message=An error occurred while downloading the sales report.');
        }
    });







// Submit return request for specific items in the order
exports.submitReturnRequest = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const orderId = req.params.id;
        const { quantities, reasons } = req.body; // Quantities and reasons from the form

        // Find the order for the user and populate the coupon code
        const order = await Order.findOne({ _id: orderId, user: userId }).populate('couponCode');
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // Initialize discount details
        let discountPercentage = 0;

        // Check if there is a coupon applied to the order
        if (order.couponCode) {
            // Find the corresponding coupon from the Coupon model
            const coupon = await Coupon.findOne({ code: order.couponCode });
        
            // Since the coupon was valid when applied, directly get the discount percentage
            discountPercentage = coupon.discountPercentage;
        }

        // Loop through the returned items and create return requests
        const returnRequests = [];
        for (const productId in quantities) {
            const quantityToReturn = parseInt(quantities[productId]);
            const reasonForReturn = reasons[productId];

            // Find the item in the order
            const productIndex = order.orderItems.findIndex(item => item.product._id.toString() === productId);
            if (productIndex === -1 || quantityToReturn <= 0) {
                continue; // Skip if product is not found or invalid quantity
            }

            const returnedItem = order.orderItems[productIndex];

            // Check if there are any pending return requests for this item
            const pendingReturnRequests = await ReturnRequest.find({
                order: orderId,
                product: productId,
                status: { $in: ['pending', 'approved'] } // Only count pending or approved returns
            });

            // Calculate the total quantity already requested for return
            const alreadyRequestedQuantity = pendingReturnRequests.reduce((sum, req) => sum + req.quantity, 0);

            // Calculate the remaining quantity available for return
            const remainingQuantity = returnedItem.quantity - alreadyRequestedQuantity;

            // If no quantity left to return, skip the item
            if (remainingQuantity <= 0) {
                continue;
            }

            // Ensure we don't return more than the remaining quantity
            const actualQuantityToReturn = Math.min(quantityToReturn, remainingQuantity);

            // If actual quantity to return is 0, skip
            if (actualQuantityToReturn <= 0) {
                continue;
            }

            // Calculate the original price for the returned quantity
            const originalRefundAmount = returnedItem.price * actualQuantityToReturn;

            // Apply the coupon discount percentage to the refund amount
            const discountedRefundAmount = originalRefundAmount * (1 - discountPercentage / 100);

            // Create a new return request for the product
            const returnRequest = await ReturnRequest.create({
                user: userId,
                order: orderId,
                product: productId,
                reason: reasonForReturn,
                refundAmount: discountedRefundAmount,
                quantity: actualQuantityToReturn,
                price: returnedItem.price,
            });
            returnRequests.push(returnRequest);
        }

        if (returnRequests.length > 0) {
            const successMessage = `Your return request has been submitted for ${returnRequests.length} item(s).`;
            return res.status(201).redirect(`/me?successMessage=${encodeURIComponent(successMessage)}`);
        } else {
            return res.redirect(`/me?message=${encodeURIComponent('No valid items for return')}`);
        }
    } catch (error) {
        next(error);
    }
};










//Get Return request--admin

exports.getReturnRequests = async (req, res, next) => {
    try {
        const returnRequests = await ReturnRequest.find().populate('user order product');
    
        
        res.render('returnRequests', { returnRequests });
    } catch (error) {
        next(error);
    }
};


//Handle return requist-- Admin

// Utility function to round a value to two decimal places
const roundToTwoDecimals = (value) => Math.round(value * 100) / 100;

exports.handleReturnRequest = async (req, res, next) => {
    try {
        const { requestId, action } = req.body;
        const returnRequest = await ReturnRequest.findById(requestId).populate('order product');

        if (!returnRequest) {
            return res.status(404).json({ success: false, message: 'Return request not found' });
        }

        const order = returnRequest.order;

        if (action === 'approve') {
            // Approve return
            returnRequest.status = 'approved';

            // Credit the refund amount to the user's wallet
            await creditWallet(
                returnRequest.user._id,
                returnRequest.refundAmount,
                `Refund for returned product #${returnRequest.product._id} from order #${returnRequest.order._id}`
            );

            // Restock the returned quantity of the product
            const quantityToRestock = returnRequest.quantity;
            await Product.findByIdAndUpdate(
                returnRequest.product._id,
                { $inc: { stock: quantityToRestock } }
            );

            // Update the corresponding order item and check if it should be fully canceled
            const orderItemIndex = order.orderItems.findIndex(item => item.product._id.toString() === returnRequest.product._id.toString());
            if (orderItemIndex !== -1) {
                const orderItem = order.orderItems[orderItemIndex];

                // Deduct the returned quantity from the order item
                orderItem.quantity -= quantityToRestock;

                const returnedAmount = returnRequest.price * returnRequest.quantity;

                // Adjust prices and ensure they are properly rounded
                order.itemsPrice = roundToTwoDecimals(order.itemsPrice - returnedAmount);

                if (order.shippingPrice && order.shippingPrice > 0) {
                    order.shippingPrice = roundToTwoDecimals(order.shippingPrice - (returnRequest.quantity * 50));
                    order.totalPrice = roundToTwoDecimals(order.totalPrice - (returnRequest.refundAmount + (returnRequest.quantity * 50)));
                } else {
                    order.totalPrice = roundToTwoDecimals(order.totalPrice - returnRequest.refundAmount);
                }

                // Check if the item is fully returned
                if (orderItem.quantity <= 0) {
                    orderItem.itemStatus = 'returned';
                }

                // Check if all items in the order are returned/canceled
                const allItemsReturned = order.orderItems.every(item => item.itemStatus === 'returned');
                if (allItemsReturned) {
                    order.orderStatus = 'returned';
                }
            }

            // Handle coupon discount adjustments
            let discountPercentage = 0;

            // Check if there is a coupon applied to the order
            if (order.couponCode) {
                const coupon = await Coupon.findOne({ code: order.couponCode });
                discountPercentage = coupon.discountPercentage;
            }

            // Calculate the coupon discount for the returned item
            let couponDiscountForReturnedItem = 0;
            const returnedAmount = returnRequest.price * returnRequest.quantity;
            if (discountPercentage > 0) {
                couponDiscountForReturnedItem = roundToTwoDecimals((discountPercentage / 100) * returnedAmount);
            }

            // Subtract the coupon discount for the returned item from the total order's coupon discount
            order.couponDiscount = roundToTwoDecimals(order.couponDiscount - couponDiscountForReturnedItem);

            // Ensure couponDiscount does not go below 0
            if (order.couponDiscount < 0) {
                order.couponDiscount = 0;
            }

            await order.save(); // Save the updated order

            // Send approval confirmation email
            const emailOptions = {
                email: req.user.email,
                subject: 'Return Request Approved',
                message: `Dear ${req.user.name},\n\nYour return request for product ${returnRequest.product.name} from order ID ${returnRequest.order._id} has been approved.\nThe refund amount of Rs ${returnRequest.refundAmount.toFixed(2)} has been credited to your EShop Wallet.\n\nBest regards,\nEcommerce Team`
            };

            await sendEmail(emailOptions);

        } else if (action === 'reject') {
            // Reject return
            returnRequest.status = 'rejected';
            returnRequest.adminResponse = req.body.adminResponse;

            // Send rejection confirmation email
            const emailOptions = {
                email: req.user.email,
                subject: 'Return Request Rejected',
                message: `Dear ${req.user.name},\n\nYour return request for product ${returnRequest.product.name} from order ID ${returnRequest.order._id} has been rejected.\nReason: ${returnRequest.adminResponse}\n\nBest regards,\nEcommerce Team`
            };

            await sendEmail(emailOptions);
        }

        await returnRequest.save(); // Save the return request updates

        // Retrieve all return requests for rendering
        const returnRequests = await ReturnRequest.find().populate('order product');
        res.status(200).render('returnRequests', { returnRequests });

    } catch (error) {
        next(error); // Handle errors
    }
};









    
    
    




    


   

































      

   
    
    
    












        

          
            

                
             
             
            
                   
              
               
                
              















            
            
            
            
            
              
              

              

     











         






















     




      






         


       





      











   






        




