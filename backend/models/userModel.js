const mongoose =require('mongoose')
const validator=require ('validator')
const bcrypt= require('bcryptjs')
const jwt= require('jsonwebtoken') 
const crypto= require('crypto')



const addressSchema=new mongoose.Schema({
    label:{
        type:String,
        enum:['Home','Work','Other'],
        default:'Other'
    },
    addressLine1:{
        type:String,
        required:true
    },
    addressLine2:{
        type:String,
    },
    city:{
        type:String,
        required:true
    },
    State:String,
    postalCode:{
    type:String,
    required:true
   },
   country:{
    type:String,
    required:true
   },
   phoneNo:{
    type:Number,
    required:true
   }}
   )




   const userSchema=new mongoose.Schema({
   name:{
   type:String,
   required:[true,"Please enter your Name"],
   maxLength:[30,"Name cannot exceed 30 characters"],
   
   },
   email:{
   type:String,
   required:[true,"Please enter your email"],
   unique:true,
   validate:[validator.isEmail,"Please enter a valid email"]},
   password:{
   type:String,
   required:false,//Required only for traditional Login
   minLength:[8,"password should have mininmum 8 characters"],
   select:false 
   },
   mobile:{
   type:String,
   
   },
   isBlocked: {
       type: Boolean,
       default: false
     },
   
   avatar:{
   
    public_id:{
    type:String,
          
       },
    url:{
       type:String,
      
        }
          
   },
   googleId: {
       type: String,
       unique: true,
       sparse: true  // Allows for the field to be optional
     },
   role:{
   type:String,
   default:"user"
   },
   
   isVerified: { 
       type: Boolean,
       default: false },
   resetPasswordToken:String,
   resetPasswordExpire:Date,
   addresses:{
       type:[addressSchema],
      
    }
    })

   
   

   function arrayLimit(val){
 return val.length<=5


   }
   
   
   
   
   const tempUserSchema = new mongoose.Schema({
       name:{
       type:String,
       required:[true,"Please enter your Name"],
       maxLength:[30,"Name cannot exceed 30 characters"],
      
       },
       email:{
       type:String,
       required:[true,"Please enter your email"],
       unique:true,
       validate:[validator.isEmail,"please enter a valid email"]},
       password:{
       type:String,
       required:[true,"please enter your password"],
       minLength:[8,"password should have mininmum 8 characters"],
       select:false 
       },
       mobile:{
       type:String,
       
       },
       isVerified: { 
           type: Boolean,
           default: false },
       
       avatar:{
       
               public_id:{
               type:String,
               required:true,
               },
               url:{
                   type:String,
                   required:true,
                   }
              
       },
       role:{
       type:String,
       default:"user"
       },
       otp: String,
       otpExpires:{
        type:Date,
        required: true,
        index: { expires: '10m' } // TTL index
       } ,
       otpCreatedAt: {
        type: Date,
        default: Date.now
      },
      
      
       })
       
   
   
       
   
   
   
   userSchema.pre("save",async function(next){
       if(!this.isModified('password')){
      next()
   
   }
    // Check if the password is already hashed
    if (this.password.length === 60) { // bcrypt hashed passwords are 60 characters long
       return next();
   }
   
   this.password=await bcrypt.hash(this.password,10)
    
   })
   tempUserSchema.pre("save",async function(next){
       if(!this.isModified('password')){
      next()
   
   }
   
   this.password=await bcrypt.hash(this.password,10)
    
   })
   //JWT Token
   userSchema.methods.getJWTToken=function(){
       return jwt.sign({id:this._id},process.env.JWT_SECRET,{
      expiresIn:process.env.JWT_EXPIRE,
   
   
   
       })
   
   }
   
   //Compare password
   
   userSchema.methods.comparePassword= async function(enteredPassword){
     
   
   return await bcrypt.compare(enteredPassword,this.password)
   
   }
   
   //Generating password reset token
   userSchema.methods.getResetPasswordToken=function(){
   //Generating Token
   const resetToken=crypto.randomBytes(20).toString("hex")
   
   //Hashing and add to user schema
   this.resetPasswordToken=crypto
   .createHash("sha256")
   .update(resetToken)
   .digest('hex')
   this.resetPasswordExpire=Date.now()+15*60*1000
   
   
   return resetToken
   
   }
   
   
   const User=mongoose.model("User",userSchema)  
   const TempUser = mongoose.model('TempUser', tempUserSchema);
   module.exports={User,TempUser}






        








    
















