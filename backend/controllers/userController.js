const ErrorHandler = require('../utils/errorhandler')
const catchAsyncErrors=require('../middleware/catchAsyncErrors')
const {User,TempUser}=require('../models/userModel')
const sendToken = require('../utils/jwtToken')
const sendEmail=require('../utils/sendEmail')
const crypto=require('crypto')
const passport = require('passport');
const Coupon=require('../models/couponModel') 
const Category= require('../models/categoryModel')

const Order=require('../models/orderModel')

const Wallet = require('../models/walletModel');
const Cart = require('../models/categoryModel');
const Wishlist = require('../models/wishlistModel');










//Render registration Page
exports.renderRegisterPage=catchAsyncErrors(async(req,res,next)=>{
  res.render('signup',{message:null,errorMessage:null,successMessage:null,formData:{}})
})

//Render Login Page
exports.renderLoginPage=catchAsyncErrors(async(req,res,next)=>{
  res.render('login',{message:null,errorMessage:null,successMessage:null,formData:{}})
})

//Render Admin registration Page
exports.renderAdminLoginPage=catchAsyncErrors(async(req,res,next)=>{
  res.render('adminLogin',{message:null,errorMessage:null,successMessage:null,formData:{}})
})


//Render Forgot Password Page
exports.renderForgotPasswordPage=catchAsyncErrors(async(req,res,next)=>{
  res.render('forgotPassword',{message1:null})
})

//Render Reset Password Page
exports.renderResetPasswordPage=catchAsyncErrors(async(req,res,next)=>{
  const {token}=req.params
  res.render('resetPassword',{token})
 })



  //Render Edit User Details Page
exports.renderEditUserDetails=catchAsyncErrors(async(req,res,next)=>{

  const user=await User.findById(req.params.id)


  res.render('editUserDetails',{user})
 })

 //Render Google Log In Page
exports.renderGoogleLoginrPage=catchAsyncErrors(async(req,res,next)=>{
  res.render('googleLogin')
})






 
 
 
 
 
 
 // OTP creation and sending

 exports.otpCreation = catchAsyncErrors(async (req, res, next) => {
  try {
    const { name, email, password, mobile } = req.body;
    let user = await User.findOne({ email }).select('+password');

    if (user) {
      if (user.password) {
        // Throwing an error for existing user with password
        throw { message: `User already exists with the email: ${email}`, statusCode: 400, template: 'login', data: { name, email, mobile } };
      } else {
        user.name = name;
        user.password = password;
        user.mobile = mobile;

        await user.save();
        return sendToken(user, 201, res);
      }
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpires = Date.now() +   60 * 1000; // OTP expires in 1 minutes
    otpCreatedAt = Date.now(); // Set new OTP creation time

    const tempUser = await TempUser.create({
      name,
      email,
      password,
      mobile,
      otp,
      otpExpires,
      otpCreatedAt,
      avatar: {
        public_id: "This is a sample id",
        url: "profilepicUrl"
      }
    });

    await sendEmail({
      email: tempUser.email,
      subject: 'OTP Verification',
      message: `Your OTP for registering on the Ecommerce Website is ${otp}`
    });
   
    

    res.status(200).render('otpVerification', {
      tempUser,
      errorMessage: null,
      successMessage: 'OTP sent successfully to your email.',
 
    });
  } catch (error) {
    let errorMessage = 'An error occurred';
    if (error.errors) {
      // Extract and format validation errors
      const errorMessages = Object.values(error.errors).map(err => err.message);
      errorMessage = errorMessages.join(', ');
    } else {
      errorMessage = error.message || errorMessage;
    }

  

    // If the error does not already have a statusCode, template, or data, provide default values
    const statusCode = error.statusCode || 500;
    const template = error.template || 'login';
    const formData = error.data || req.body;

    // Render the appropriate view with the error message and form data
    res.status(statusCode).render(template, {
      errorMessage,
      successMessage: null,
      formData
    });
  }
});


       

     
       
       

    
     
       
     //OTP verification
 exports.otpVerification=catchAsyncErrors(async(req,res,next)=>{
  try{
  
 
 
     const  {email}  = req.params;
     
     const{otp}=req.body
 
     const tempUser = await TempUser.findOne({ email }).select('+password');
 
     if (!tempUser) {
      throw new Error('User not found')

         
     }
 
     if (tempUser.otp !== otp) {
      throw new Error( 'Invalid OTP')
      
        
     }
 
     if (tempUser.otpExpires < Date.now()) {
      throw new Error( 'Your  OTP has expired')
         
     }
    
 
     const user = new User({
         name: tempUser.name,
         email: tempUser.email,
         password:tempUser.password,
         mobile: tempUser.mobile,
         avatar:tempUser.avatar,
 
         isVerified: true
     });
 
     await user.save();
      await TempUser.deleteOne({ email });

      


const wallet = new Wallet({ user: user._id });
await wallet.save({ validateBeforeSave: false });



const wishlist = new Wishlist({ user: user._id });
await wishlist.save({ validateBeforeSave: false });



      sendToken(user,201,res)}
      catch(error){
        let errorMessage = 'An error occurred';
        if (error.errors) {
          // Extract and format validation errors
          const errorMessages = Object.values(error.errors).map(err => err.message);
          errorMessage = errorMessages.join(', ');
        } else {
          errorMessage = error.message || errorMessage;
        }
        const  {email}  = req.params
        const tempUser = await TempUser.findOne({ email }).select('+password');

       res.render('otpVerification',{errorMessage,successMessage:null,tempUser})


      }
    })
 
    
 
 
 
 
 //Resend OTP
 
 
 
 
 exports.resendOTP = catchAsyncErrors(async (req, res, next) => {
  const { email } = req.params;

  // Find the user by email
  const tempUser = await TempUser.findOne({ email });

  // If user doesn't exist
  if (!tempUser) {
    return res.status(400).send('User not found');
  }

  // Check if 30 seconds have passed since the last OTP was created
  const currentTime = Date.now();
  const thirtySeconds = 30 *  1000; // 30 seconds in milliseconds

  // If less than 30 minutes have passed since OTP creation
  if (currentTime - tempUser.otpCreatedAt < thirtySeconds) {
    return res.status(400).render('otpVerification', {
      tempUser,
      successMessage: null,
      errorMessage: 'You can only resend OTP after 30 seconds.'
    });
  }

  // If 30 minutes have passed, generate a new OTP
  const otp = crypto.randomInt(100000, 999999).toString();
  tempUser.otp = otp;
  tempUser.otpExpires = Date.now() + 60 * 1000; // New OTP expires in 1 minute
  tempUser.otpCreatedAt = Date.now(); // Set new OTP creation time

  await tempUser.save();

  // Send OTP email
  try {
    await sendEmail({
      email: tempUser.email,
      subject: 'Resend OTP Verification',
      message: `Your new OTP for registering on the Ecommerce Website is ${otp}`
    });

    // Render the success message
    res.status(200).render('otpVerification', {
      tempUser,
      successMessage: 'A new OTP has been sent to the email you entered.',
      errorMessage: null
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
});


 
 
 
 
       
  
            //Login User
  
            exports.loginUser = catchAsyncErrors(async (req, res, next) => {
              try {
                const { email, password } = req.body;
            
                if (!email || !password) {
                  return res.status(400).render('login', {
                    errorMessage: 'Please Enter Email And Password',
                    successMessage: null,
                    formData: req.body
                  });
                }
            
                const user = await User.findOne({ email }).select('+password');
            
                if (!user) {
                  return res.status(400).render('login', {
                    errorMessage: 'Invalid user or password',
                    successMessage: null,
                    formData: req.body
                  });
                }
            
                const isPasswordMatched = await user.comparePassword(password);
            
                if (!isPasswordMatched) {
                  return res.status(400).render('login', {
                    errorMessage: 'Invalid User Or Password',
                    successMessage: null,
                    formData: req.body
                  });
                }
            
                sendToken(user, 200, res);
              } catch (error) {
                let errorMessage = 'An error occurred';
                if (error.errors) {
                  // Extract and format validation errors
                  const errorMessages = Object.values(error.errors).map(err => err.message);
                  errorMessage = errorMessages.join(', ');
                } else {
                  errorMessage = error.message || errorMessage;
                }
            
                // Render the appropriate view with the error message and form data
                res.status(500).render('login', {
                  errorMessage,
                  successMessage: null,
                  formData: req.body
                });
              }
            });

             //Login Admin
  
             exports.loginAdmin = catchAsyncErrors(async (req, res, next) => {
              try {
                const { email, password } = req.body;
            
                if (!email || !password) {
                  return res.status(400).render('adminLogin', {
                    errorMessage: 'Please Enter Email And Password',
                    successMessage: null,
                    formData: req.body
                  });
                }
            
                const user = await User.findOne({ email }).select('+password');
            
                if (!user) {
                  return res.status(400).render('adminLogin', {
                    errorMessage: 'Invalid user or password',
                    successMessage: null,
                    formData: req.body
                  });
                }

                
            
                const isPasswordMatched = await user.comparePassword(password);
            
                if (!isPasswordMatched) {
                  return res.status(400).render('adminLogin', {
                    errorMessage: 'Invalid User Or Password',
                    successMessage: null,
                    formData: req.body
                  });
                }
                if (user.role!=='admin') {
                  return res.status(400).render('adminLogin', {
                    errorMessage: 'Your role is not admin',
                    successMessage: null,
                    formData: req.body
                  });
                }
            
                sendToken(user, 200, res);
              } catch (error) {
                let errorMessage = 'An error occurred';
                if (error.errors) {
                  // Extract and format validation errors
                  const errorMessages = Object.values(error.errors).map(err => err.message);
                  errorMessage = errorMessages.join(', ');
                } else {
                  errorMessage = error.message || errorMessage;
                }
            
                // Render the appropriate view with the error message and form data
                res.status(500).render('adminLogin', {
                  errorMessage,
                  successMessage: null,
                  formData: req.body
                });
              }
            });



                    
               
  
  
      
          // Logout User
        exports.logout = catchAsyncErrors(async (req, res, next) => {
         
          
            // Conditional redirection based on user role
    let redirectRoute = '/'; // Default redirect route
    if (req.user.role === 'admin') {
        redirectRoute = '/admin/login';
    } 
     
        req.logout((err) => {
        if (err) { 
           return next(err); 
       }
       res.cookie("token", null, {
           expires: new Date(Date.now()),
           httpOnly: true
       });
       res.status(200).redirect(redirectRoute);
       });
     });
          
             
         
  
  
          //Forgot Password
          exports.forgotPassword=catchAsyncErrors(async(req,res,next)=>{
  
            const user=await User.findOne({email:req.body.email})
            if(!user){
              const message="User not found with entered email"

              return res.status(404).render('login',{message})
           
           
            }
             //Get resetPassword token
          const resetToken=user.getResetPasswordToken()
          await user.save({validateBeforeSave:false})
  
          const resetPasswordUrl=`${req.protocol}://${req.get(
            'host'
          )}/resetPassword/${resetToken}`
            const message=`Your password reset token is:-\n\n ${resetPasswordUrl} \n\nIf you have not requested this email , then please ignore it`
          try {
            await sendEmail({
              email:user.email,
              subject:`Ecommerce password recovery`,
              message
              
  
            })
            const message1=`Password Resetting email sent to ${user.email} successfully`
            res.status(200).render('forgotPassword',{message1})
          
           
  
        
             
  
            
          } catch (error) {
            user.resetPasswordToken=undefined
            user.resetPasswordExpire=undefined
            await user.save({validateBeforeSave:false})
            return next(new ErrorHandler(error.message,500))
  
            
          } 
         })
          
         //Reset password 
         exports.resetPassword=catchAsyncErrors(async(req,res,next)=>{
          try{
          
          
          //creating token hash
          const resetPasswordToken=crypto
          .createHash("sha256")
          .update(req.params.token)
          .digest('hex')
  
          const user=await User.findOne({
           resetPasswordToken,
           resetPasswordExpire:{$gt:Date.now()}
          })
  
          if(!user){
            throw new Error("Reset password token is invalid or has been expired")
            
          }
  
          if(req.body.password!==req.body.confirmPassword){
            throw new Error("conformed password doesnot match")
            
            
          }
          user.password=req.body.password
          user.resetPasswordToken=undefined
          user.resetPasswordExpire=undefined
          await user.save()
          sendToken(user,200,res)}
          catch(error){

            let message = 'An error occurred';
  if (error.errors) {
    // Extract and format validation errors
    const errorMessages = Object.values(error.errors).map(err => err.message);
    message = errorMessages.join(', ');
  } else {
    message = error.message;
  }
  const {token}=req.params
  res.render('resetPassword',{message,token});


          }
  
  
        }) 
  
        //Get User details
        exports.getUserDetails=catchAsyncErrors(async(req,res,next)=>{
         
  
             const user=await User.findById(req.user.id)
             const orders = await Order.find({ user: req.user._id }).populate('orderItems.product').sort({createdAt:-1})

             const currentDate = new Date();
             // Fetch active coupons
             const coupons = await Coupon.find({ 
              startDate: { $lte: currentDate }, 
              endDate: { $gte: currentDate }, 
              $expr: { $lt: ["$usageCount", "$usageLimit"] }  // Compare usageCount and usageLimit within the document
          }).populate('applicableCategories', 'name');
          const successMessage=req.query.successMessage
          errorMessage=req.query.errorMessage
          message=req.query.message
          
          
  
             res.status(200).render('my-account',{user,formData:null,address:null,successMessage,orders,orderCancelMessage:null,coupons,errorMessage,message})
            })
             
          
         
  // Update User Password
exports.updatePassword = catchAsyncErrors(async (req, res, next) => {
  try{
  const user = await User.findById(req.user.id).select("+password");

  if (!user) {
    req.errorContext = { user: req.user }
    return next(new ErrorHandler("User not found", 404, 'my-account'));
  }

  const isPasswordMatched = await user.comparePassword(req.body.oldPassword);

  if (!isPasswordMatched) {
    req.errorContext = { user: req.user }
    throw new Error("Old password is incorrect")
    
  }

  if (req.body.newPassword !== req.body.confirmPassword) {
    req.errorContext = { user: req.user }
    throw new Error("Please ensure the confirmation password matches your first new password entry.")
    
  }

  user.password = req.body.newPassword;

  // Validate user data before saving

  // Save user if validation passes
  await user.save();
  const successMessage=`User password has been updated success fully`
 res.render('my-account',{user,successMessage,formData:{}})}
 catch(error){
  let message = 'An error occurred';
  if (error.errors) {
    // Extract and format validation errors
    const errorMessages = Object.values(error.errors).map(err => err.message);
    message = errorMessages.join(', ');
  } else {
    message = error.message;
  }
  res.redirect(`/me?message=${encodeURIComponent(message)}`);

  


 }
 
});

  
         //Update User profile
  
         exports.updateProfile = catchAsyncErrors(async (req, res, next) => {
          try {
            // Define new user data from request body
            const newUserData = {
              name: req.body.name,
              email: req.body.email,
              mobile: req.body.mobile,
              // Add other fields as needed
            };
        
            // Update user and run validation
            const user = await User.findByIdAndUpdate(req.user.id, newUserData, {
              new: true,
              runValidators: true,
              useFindAndModify: false
            });
        
            // If user is not found
            if (!user) {
              return next(new ErrorHandler("User not found", 404, 'my-account'));
            }
        
            // Set success message
            const successMessage = 'User details have been updated successfully';
        
            // Render the template with updated user and success message
            res.status(200).render('my-account', {
              user,
              successMessage,
              formData:{}
            });
        
          } catch (error) {
            // Handle validation errors and other errors
            if (error.name === 'ValidationError') {
              const messages = Object.values(error.errors).map(val => val.message).join('. ');
              req.errorContext = { user: req.user };
              return next(new ErrorHandler(messages, 400, 'my-account'));
            } else {
              // Handle other potential errors
              return next(new ErrorHandler("Failed to update user details", 500, 'my-account',{formData:req.body}));
            }
          }
        });
    //Get all Users(admin)
  
    exports.getAllUser=catchAsyncErrors(async(req,res,next)=>{
      const resultPerPage=8
      const userCount = await User.countDocuments();
      const currentPage = Number(req.query.page) || 1;
      const users = await User.find()
      .skip((currentPage - 1) * resultPerPage) // Skip documents for pagination
      .limit(resultPerPage); // Limit the number of documents returned
      const totalPages = Math.ceil(userCount / resultPerPage);
  
      res.status(200).render('allUsers',{users,message:null,
      currentPage,
      totalPages,
      userCount
    })
  })



    
     
 
  
  
    //Get single User(admin)
  
    exports.getSingleUser=catchAsyncErrors(async(req,res,next)=>{
      const user=await User.findById(req.body.userId)
   
      if(!user){
        return next(new ErrorHandler(`user does not exist with id: ${req.body.userId}`))
  
  
  
      }
  
      res.status(200).render('singleUser',{user,message:null})
    
     
  
  
  })
  
  //Update User profile--admin
  
  exports.updateUserProfile=catchAsyncErrors(async(req,res,next)=>{
    const newUserData= {
    name:req.body.name,
    email:req.body.email,
    mobile:req.body.mobile,
    role:req.body.role
  
   }
  
  const user=await User.findByIdAndUpdate(req.params.id,newUserData,{
    new:true,
    runValidators:true,
    useFindAndModify:false
  }) 
  if(!user){
    return next(new ErrorHandler(`User does not exist with id: ${req.params.id}`))
   }  
   const message="User Details Updated Successfully"
   
  res.status(200).render('singleUser',{user,message})
    
 
  
  })
  
  //Delete User--admin
  
  exports.deleteUser=catchAsyncErrors(async(req,res,next)=>{
  
   const user= await User.findById(req.params.id)
   
  
  
  //we will remove cloudinary later
  if(!user){
    return next(new ErrorHandler(`User does not exist with id: ${req.params.id}`))
   }
  
   await user.deleteOne()
   const resultPerPage=8
      const userCount = await User.countDocuments();
      const currentPage = Number(req.query.page) || 1;
      const users = await User.find()
      .skip((currentPage - 1) * resultPerPage) // Skip documents for pagination
      .limit(resultPerPage); // Limit the number of documents returned
      const totalPages = Math.ceil(userCount / resultPerPage);
   const message=`User with id: ${req.params.id} has been Deleted Successfully `
  
   
   res.status(200).render('allUsers',{message,users,totalPages,currentPage,userCount})
 
 })
 
  //Block User
  
  exports.blockUser=catchAsyncErrors(async(req,res,next)=>{
  
   const user= await User.findById(req.params.id)
   
  
  
 
  if(!user){
    return next(new ErrorHandler(`User does not exist with id: ${req.params.id}`))
   }
  
    user.isBlocked=true
    await user.save()
  
   const message=`User with id: ${req.params.id} has been blocked Successfully `
  
   
   res.status(200).render('singleUser',{message,user})
 
 })
 
 //Unblock User
  
 exports.unblockUser=catchAsyncErrors(async(req,res,next)=>{
  
   const user= await User.findById(req.params.id)
   
  
  
 
  if(!user){
    return next(new ErrorHandler(`User does not exist with id: ${req.params.id}`))
   }
  
    user.isBlocked=false
    await user.save()
  
   const message=`User with id: ${req.params.id} has been unblocked Successfully `
  
   
   res.status(200).render('singleUser',{message,user})
 
 })

 //Add User Address

 exports.addAddress=catchAsyncErrors(async(req,res,next)=>{

const userId=req.user._id
const newAddress=req.body
const user=await User.findById(userId)
if(user.addresses.length>5){
return res.status(400).json({message:`You can only save up to five addresses.`})}
user.addresses.push(newAddress)
await user.save()
const successMessage=`Your address has been added successfully`
res.status(200).render('my-account',{successMessage,user,formData:null,orderCancelMessage:null,orders:{}})
})



 //Update User Address

 exports.updateAddress=catchAsyncErrors(async(req,res,next)=>{
  const userId=req.user._id
  const {addressId}=req.params
  const updatedAddress=req.body
 
  
 
  

  const user=await User.findById(userId)

  const addressIndex = user.addresses.findIndex(address => {
    return address._id.toString() ==addressId // Ensure both are strings
});
   if(addressIndex===-1){
    return res.status(404).json({message:`Address not Found.`})
  }

  user.addresses[addressIndex]={...user.addresses[addressIndex]._doc,...updatedAddress}
  await user.save()
  const successMessage=`Your address has been updated successfully`
  res.status(200).render('my-account',{successMessage,user,formData:null,orderCancelMessage:null,orders:{}})
})


//delete Address

exports.deleteAddress=catchAsyncErrors(async(req,res,next)=>{

  const userId=req.user._id
  const {addressId}=req.params
  const user=await User.findById(userId)
  const addressIndex=user.addresses.findIndex(addr=>addr._id.toString()===addressId)
  if(addressIndex===-1){
return res.status(404).json({message:`Address not found`})
}

user.addresses.splice(addressIndex,1)
await user.save()
const successMessage=`Your address has been deleted successfully`
res.status(200).render('my-account',{successMessage,user,formData:null,orderCancelMessage:null,orders:{}})
})


//Get All Addresses

exports.getAllAddresses=catchAsyncErrors(async(req,res,next)=>{
const userId=req.user._id
const user=await User.findById(userId).select('addresses')
res.status(200).render('my-account',{successMessage:null,user,addresses:user.addresses,orderCancelMessage:null,orders:{}})
})

















 















 
  

          
      

    


    







   

  
 
 
 
 
   








    
      


  
   

    


     

 









 
 
 
 
 
 
 
 
 
 
 
 
 
 
         
      
 
 
 
  
 
 
 
          
 
 
 
 
 
 
 
 
 
 
      
         
 
       
 
 
 
 
 
 
 
 
 

 
 




 
