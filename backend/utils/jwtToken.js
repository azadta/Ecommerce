//create token and saving in cookie
const sendToken=(user,statusCode,res)=>{

    const token =user.getJWTToken()
    //options for cookie
    const options={   
        expires:new Date(
         Date.now()+ process.env.COOKIE_EXPIRE*24*60*60*1000

        ),
        httpOnly:true
       }
         // Conditional redirection based on user role
    let redirectRoute = '/byLogin'; // Default redirect route
    if (user.role === 'admin') {
        redirectRoute = '/admin/adminPanel';
    }

     res.status(statusCode).cookie('token',token,options).redirect(redirectRoute)
    
}

module.exports=sendToken