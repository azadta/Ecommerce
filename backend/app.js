const dotenv = require('dotenv');
dotenv.config({path:'./config/config.env'})



const express = require('express');
const app = express();
const errorMiddleware = require('./middleware/error');
const cookieParser = require('cookie-parser');
const path = require('path');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const session = require('express-session');
const passport = require('./config/passport');
require('./utils/cronJobs');






// Middleware
app.use(express.json());
app.use(cookieParser());
app.set('view engine', 'ejs');
app.set('views', [path.join(__dirname, 'views/user'), path.join(__dirname, 'views/admin')]);
app.use(express.static(path.join(__dirname, 'public')));
app.use(methodOverride('_method'));




// Parse application-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));


// Parse application/json
app.use(bodyParser.json());


app.use(session({
    secret:process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: true } // Change to true if using HTTPS
}));

app.use(passport.initialize());
app.use(passport.session());





// Route Imports
const userProduct = require('./routes/user/userProductRoute');
const adminProduct = require('./routes/admin/adminProductRoute');
const user = require('./routes/user/userRoute');
const admin = require('./routes/admin/adminRoute');
const userOrder = require('./routes/user/userOrderRoute');
const adminOrder = require('./routes/admin/adminOrderRoute');
const adminCategory = require('./routes/admin/adminCategoryRoute');
const adminOffer = require('./routes/admin/adminOfferRoute');
const userCoupon = require('./routes/user/userCouponRoute');
const adminCoupon = require('./routes/admin/adminCouponRoute');
const userCart = require('./routes/user/userCartRoute');
const userWishlist =require('./routes/user/userWishlistRoute')
const userWallet =require('./routes/user/userWalletRoute')


app.use('/admin',  adminProduct);
app.use('/admin',  admin);
app.use('/admin',  adminOrder);
app.use('/admin',  adminCategory);
app.use('/admin',  adminOffer);
app.use('/admin',  adminCoupon);


app.use( userCart);
app.use( userWishlist);
app.use( userWallet);
app.use( userProduct);
app.use( user);
app.use( userOrder);
app.use( userCoupon);

// 404 Error Handler for routes not found
app.use((req, res, next) => {
    res.status(404).render('error', { statusCode: 404, message: 'Page Not Found!' });
});

// 500 Error Handler for server errors
app.use((err, req, res, next) => {
    console.error(err.stack);  // Logs the error to the server console
    res.status(500).render('error', { statusCode: 500, message: 'Something went wrong!' });
});



// Middleware for errors
app.use(errorMiddleware);

module.exports = app;
