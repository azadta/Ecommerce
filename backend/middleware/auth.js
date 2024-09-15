const ErrorHandler = require("../utils/errorhandler");
const catchAsyncErrors = require("./catchAsyncErrors");
const jwt= require('jsonwebtoken') 
const {User}=require('../models/userModel')


exports.isAuthenticateUser = catchAsyncErrors(async (req, res, next) => {
  try {
    const { token } = req.cookies;

    if (!token) {
      throw new Error('Please login to access this resource');
    }

    const decodedData = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decodedData.id);

    if (!user) {
      throw new Error('User not found');
    }

    if (user.isBlocked) {
      throw new Error('Your account is blocked. Please contact support.');
    }

    req.user = user;
    next();
  } catch (error) {
    let errorMessage = 'An error occurred';
    
    if (error.errors) {
      const errorMessages = Object.values(error.errors).map(err => err.message);
      errorMessage = errorMessages.join(', ');
    } else {
      errorMessage = error.message || errorMessage;
    }

    res.redirect(`/?errorMessage=${encodeURIComponent(errorMessage)}`);
  }
});




exports.authorizeRoles=(...roles)=>{
 return (req,res,next)=>{
if(!roles.includes(req.user.role)){

   return next( new ErrorHandler(`Role:${req.user.role} is not allowed to access this resource`,403)
)}
next()
 

 }


}