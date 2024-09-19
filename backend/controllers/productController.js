const dotenv = require('dotenv');
dotenv.config({path:'backend/config/config.env'})

const fs = require('fs');
const Product=require('../models/productModel')
const ErrorHandler = require('../utils/errorhandler')
const catchAsyncErrors=require('../middleware/catchAsyncErrors')
const ApiFeatures = require('../utils/apiFeatures')
const upload = require('../config/multerConfig')
const Category=require('../models/categoryModel')
const sharp = require('sharp')
const { isAuthenticateUser,authorizeRoles } = require('../middleware/auth')
const Offer=require('../models/offerModel')
const Alert = require('../models/alertModel');
const Cart=require('../models/cartModel')
const Wishlist=require('../models/wishlistModel')





//Render Product Creation Page--Admin
exports.renderCreateProductPage=catchAsyncErrors(async(req,res,next)=>{
  const categories=await Category.find()
  const offers=await Offer.find()
  res.render('productCreation',{categories,formData:null,offers})
})


 
  

  


// Create product -- Admin
exports.createProduct = catchAsyncErrors(async (req, res, next) => {
  try {
    // Add user ID to req.body
    req.body.user = req.user.id;

    

    // Initialize an array to hold the resized image filenames
    const resizedImages = [];
   
    
     
   
    
    if (req.files) {
      try {
          const resizedImages = [];
          for (let file of req.files) {
              const outputFilePath = `backend/public/uploads/resized_${file.filename}`;
              await sharp(file.path)
                  .resize(960, 760) // Resize images
                  .toFile(outputFilePath);
                
              resizedImages.push(`resized_${file.filename}`);
              req.body.images=resizedImages
          }
          // Optionally: delete original files if not needed
      } catch (error) {
          console.error('Error processing images:', error);
      }
  }
  
     
        
    // Fetch category details based on the provided category ID
    const categoryId = req.body.categoryId;
    const category = await Category.findById(categoryId);

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Add category ID and name to req.body
    req.body.categoryId = category._id;
    req.body.categoryName = category.name;

    // Handle offers
    req.body.offers = req.body.offers ? req.body.offers : []; // Ensure offers is an array

    // Set default values for item availability fields if not provided
    req.body.reorderThreshold = req.body.reorderThreshold || 0; // Default to 0 if not provided
    req.body.reorderAmount = req.body.reorderAmount || 0; // Default to 0 if not provided
    req.body.isAvailable = req.body.isAvailable === 'true'; // Convert to boolean

    // Create the new product
    const product = await Product.create(req.body)

    // Success message
    const message = `${product.name} Product Created successfully`;

    const resultPerPage = Number(process.env.RESULT_PER_PAGE) || 8;
    const currentPage = Number(req.query.page) || 1;
    const productCount = await Product.countDocuments();
    const totalPages = Math.ceil(productCount / resultPerPage);

    // Fetch products for the list view
   
  const apiFeature = new ApiFeatures(Product.find(), req.query)
  .search()
  .filter()
  .pagination(resultPerPage); // Use the pagination method to handle skip and limit
    const products = await apiFeature.query;

   

    // Render the product list with success message
    res.status(201).render('allProductList', { product, message, products,currentPage,totalPages,resultPerPage,productCount });
  } catch (error) {
    let errorMessage = 'An error occurred';
    if (error.errors) {
      // Extract and format validation errors
      const errorMessages = Object.values(error.errors).map(err => err.message);
      errorMessage = errorMessages.join(', ');
    }

    // Fetch categories and offers to re-render the form
    const categories = await Category.find();
    const offers = await Offer.find(); // Fetch available offers
    res.status(400).render('productCreation', { categories, offers, errorMessage, formData: req.body });
  }
});








// Get all products
exports.getAllProducts = catchAsyncErrors(async (req, res) => {
  const errorMessage = req.query.errorMessage || null;
  const resultPerPage = Number(process.env.RESULT_PER_PAGE) || 10; // Default to 10 if not set in environment
 
  const parentCategoryId = req.query.parentCategoryId || null;
  const childCategories=await Category.find({parentCategoryId:parentCategoryId})
 // Extract the array of child category IDs
  const childCategoryIds = childCategories.map(cat => cat.id);
  
  
 
  
  // Current page number, default to 1
  const currentPage = Number(req.query.page) || 1;
  
  // Sorting parameters from query
  const sort = req.query.sort || 'newest'; // Default sorting by newest arrivals
  const order = req.query.order === '1' ? 1 : -1; // MongoDB sort order (1 for ascending, -1 for descending)
  const categoryId=req.query.category||null
   // Determine whether to show out-of-stock products
   const showOutOfStock = req.query.showOutOfStock === 'on';

   const searchQuery=req.query.search||''
  
   
  
  // Calculate the number of products to skip for pagination
  const skip = (currentPage - 1) * resultPerPage;
  
  // Define the sorting options with correct application of order
  const sortOptions = {
    popularity: { numOfReviews: order },       // Sort by number of reviews
    price: { price: order },                   // Sort by price
    ratings: { ratings: order },               // Sort by ratings
    newest: { createdAt: order },              // Sort by creation date
    alphabetical: { name: order },             // Sort by product name (A-Z or Z-A)
    featured: { isFeatured: -1, createdAt: order }
  };




 // Build the query filter based on stock availability
 const filter = {...showOutOfStock ? {} : { stock: { $gt: 0 } },
 name:{$regex:searchQuery,$options:'i'}, // Filter by name containing the search query (case-insensitive)
 ...categoryId ? { categoryId } : {},
 ...parentCategoryId ? { categoryId: { $in: childCategoryIds} } : {}

} 

  
  // Apply sorting and pagination
  const productsQuery = Product.find(filter)
    .populate('offers') // Populate the offers field
    .sort(sortOptions[sort] || sortOptions['newest']) // Apply sorting first
    .skip(skip) // Skip documents based on the current page
    .limit(resultPerPage); // Limit the number of documents returned
  
  // Fetch the products
  const products = await productsQuery;
  
  // Fetch the total count of documents
  const productCount = await Product.countDocuments(filter);
  
  // Calculate total pages
  const totalPages = Math.ceil(productCount / resultPerPage);
  
  // Fetch categories without parent categories
  const categoriesWithParents = await Category.find({
    parentCategoryId: { $ne: null }, // Categories that have a parent category
    status: 'active'
  }).distinct('parentCategoryId'); // Get only the parent category IDs
  
  const categoriesWithoutParents = await Category.find({
    parentCategoryId: null, // Categories that do not have a parent category
    status: 'active'
  });
  
  const categories = await Category.find({
    _id: { $in: categoriesWithParents.concat(categoriesWithoutParents.map(cat => cat._id)) },
    status: 'active'
  });
  
  // Fetch the cart if the user is logged in
  const cart = req.user ? await Cart.findOne({ user: req.user._id }) : {};

  // Calculate discount details for each product
const now = new Date();
const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0); // Today at 12:00 AM
const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59); // Today at 11:59 PM

for (let product of products) {
  let discountPercentage = 0;
  let discountAmount = 0;
  let netPrice = product.price;
  let offerName = null;

  for (let offerId of product.offers) {
    const offer = await Offer.findById(offerId);
   
    if (offer) {
      // Ensure the offer is valid (startDate is before now and endDate is in the future or today)
      if (offer.startDate <= now && offer.endDate >= endOfDay) {
        discountPercentage = Math.max(discountPercentage, offer.discountPercentage);
        offerName = offer.name;
      }
    }
  }
    
        // Calculate discount amount and net price
        if (discountPercentage > 0) {
          discountAmount = (product.price * discountPercentage) / 100;
          netPrice = product.price - discountAmount;
        }
    
        // Add these values to the product object
        product.discountPercentage = discountPercentage;
        product.discountAmount = discountAmount;
        product.netPrice = netPrice;
        product.offerName = offerName;
        
        
     
      }
     
      
    
      
      // Render the product list view with all necessary data
      res.status(200).render('product-list', {
        products,
        productCount,
        resultPerPage,
        currentPage,
        totalPages,
        user: req.user,
        categories,
        errorMessage,
        categoriesWithParents: categoriesWithParents.map(id => id.toString()),
        cart,
        sort,
        order: req.query.order || '-1', // Pass the original order value for rendering
        showOutOfStock ,// Pass this value to the view for the checkbox state
        searchQuery,
        selectedCategory:categoryId||parentCategoryId
      
      });
    });
       
      
 
        
        
        
         
    
    
 
 
  
  
  
  
 
 


 
  
  


   



 exports.generateBreadcrumbs = async (parentCategoryId, categoryId = null, productId = null, wishlistId=null, cartId=null,checkout=null) => {
  const breadcrumbs = [];

  const currentParentCategory = parentCategoryId ?await Category.findById(parentCategoryId):null
  const currentCategory = categoryId ? await Category.findById(categoryId) : null;

  

  if (currentParentCategory && !currentCategory) {
    breadcrumbs.unshift({
      name: currentParentCategory.name,
      url: `/parentCategoryProducts/${currentParentCategory._id}`,
    });
  }

  if (currentParentCategory && currentCategory) {
    breadcrumbs.unshift({
      name: currentCategory.name,
      url: `/?category=${currentCategory._id}`,
    });
    breadcrumbs.unshift({
      name: currentParentCategory.name,
      url: `/parentCategoryProducts/${currentParentCategory._id}`,
    });
  }
  if (!currentParentCategory && currentCategory) {
    breadcrumbs.unshift({
      name: currentCategory.name,
      url: `/?category=${currentCategory._id}`,
    });
  }

  
  

  // Add Home link
  breadcrumbs.unshift({
    name: 'Home',
    url: '/',
  });

  // If productId is provided, add the product breadcrumb
  if (productId) {
    const product = await Product.findById(productId);
    if (product) {
      breadcrumbs.push({
        name: product.name,
        url: `/singleProductDetail/${product._id}`,
      });
    }
  }
  if (wishlistId) {
    const wishList = await Wishlist.findById(wishlistId);
    if (wishList) {
      breadcrumbs.push({
        name: 'wishlist',
        url: `/getUserWishlist`,
      });
    }
  }

  if (cartId) {
    const cart = await Cart.findById(cartId);
    if (cart) {
      breadcrumbs.push({
        name: 'cart',
        url: `/myCart`,
      });
    }
  }

  if (checkout) {
    breadcrumbs.push({
      name: 'checkOut',
      url: `/checkOut`,
    });
  }
  
  
   

  return breadcrumbs;
};





  

  



// // Get single Category Products
// exports.getsingleCategoryProducts = catchAsyncErrors(async (req, res,next) => {
//   const resultPerPage = 8;
//   const currentPage = Number(req.query.page) || 1;
//   const categoryId = req.params.categoryId;

  
//   // Sorting parameters from query
//   const sort = req.query.sort || 'newest'; // Default sorting by newest arrivals
//   const order = Number(req.query.order) || -1; // MongoDB sort order (1 for ascending, -1 for descending)

//    // Define the sorting options with correct application of order
//    const sortOptions = {
//     popularity: { numOfReviews: order },       // Sort by number of reviews
//     price: { price: order },                   // Sort by price
//     ratings: { ratings: order },               // Sort by ratings
//     newest: { createdAt: order },              // Sort by creation date
//     alphabetical: { name: order },             // Sort by product name (A-Z or Z-A)
//     featured: { isFeatured: -1, createdAt: order }
//   };
  

//   // Filter products by category ID and handle pagination
//   const productsQuery = Product.find({ categoryId })
//     .populate('offers') // Populate the offers field
//     .sort(sortOptions[sort] || sortOptions['newest']) // Apply sorting first
//     .skip((currentPage - 1) * resultPerPage) // Skip documents for pagination
//     .limit(resultPerPage); // Limit the number of documents returned

//   // Get the total count of products in this category
//   const productCount = await Product.countDocuments({ categoryId });

//   const products = await productsQuery;
//   const totalPages = Math.ceil(productCount / resultPerPage);

 

//   // Get the current category for displaying its name
//   const currentCategory = await Category.findById(categoryId);
//   parentCategoryId=currentCategory.parentCategoryId


//   // Fetch categories without parent categories
//   const categoriesWithParents = await Category.find({
//     parentCategoryId: { $ne: null }, // Categories that have a parent category
//     status: 'active'
//   }).distinct('parentCategoryId'); // Get only the parent category IDs
  
//   const categoriesWithoutParents = await Category.find({
//     parentCategoryId: null, // Categories that do not have a parent category
//     status: 'active'
//   });
  
//   const categories = await Category.find({
//     _id: { $in: categoriesWithParents.concat(categoriesWithoutParents.map(cat => cat._id)) },
//     status: 'active'
//   });

   

//   const breadcrumbs = await exports. generateBreadcrumbs(parentCategoryId,categoryId);

//   res.status(200).render('singleCategoryProducts', {
//     products,
//     productCount,
//     resultPerPage,
//     currentPage,
//     totalPages,
//     user: req.user,
  
//     currentCategory,
//     breadcrumbs,
//     sort,
//     order: req.query.order || '-1', // Pass the original order value for rendering
//     selectedCategory: categoryId ,// Pass the selected category to EJS
//     categories

//   });
// });





// Get all products--admin
exports.listAllProducts = catchAsyncErrors(async (req, res) => {
  const resultPerPage = Number(process.env.RESULT_PER_PAGE) || 8;
   
  const productCount = await Product.countDocuments();
  const currentPage = Number(req.query.page) || 1;
  
  const apiFeature = new ApiFeatures(
    Product.find().sort({ createdAt: -1 }), // Sort by `createdAt` in descending order
    req.query
  )
    .search()
    .filter()
    .pagination(resultPerPage); // Use the pagination method to handle skip and limit
  
    

  const products = await apiFeature.query;
  const totalPages = Math.ceil(productCount / resultPerPage);

  res.status(200).render('allProductList', {
    products,message:null,
    currentPage,
    totalPages,
    productCount
 
  
  });
});



// Get single product details
exports.getProductDetails = catchAsyncErrors(async (req, res, next) => {
  const errorMessage = req.query.errorMessage||null
 
  const product = await Product.findById(req.params.id).populate({
    path: 'offers',
    select: 'discountPercentage startDate endDate',
  }).populate({
    path: 'categoryId', 
  });

  if (!product) {
    return next(new ErrorHandler('Product not found', 404));
  }

 
  let offerName = null;
 // Calculate discount details
  let discountPercentage = 0;
  let discountAmount = 0;
  let netPrice = product.price;

  // Find applicable offers
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0); // Today at 12:00 AM
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59); // Today at 11:59 PM

  for (const offerId of product.offers) {
    const offer = await Offer.findById(offerId);
    if (offer) {
      // Ensure the offer is valid (startDate is before now and endDate is in the future or today)
      if (offer.startDate <= now && offer.endDate >= endOfDay) {
        discountPercentage = Math.max(discountPercentage, offer.discountPercentage);
        offerName = offer.name;
      }
    }
  }

  // Calculate discount amount and net price
  if (discountPercentage > 0) {
    discountAmount = (product.price * discountPercentage) / 100;
    netPrice = product.price - discountAmount;
  }

  // Fetch related products from the same category
  const relatedProducts = await Product.find({
    categoryId: product.categoryId,
    _id: { $ne: product._id }
  }).limit(4).populate('offers')

  const reviews = product.reviews;
  message=req.query.message
 
  
  
  const breadcrumbs = await exports.generateBreadcrumbs(product.categoryId.parentCategoryId,product.categoryId, product._id);
 
  
   
 

  res.status(200).render('product-detail', {
    product,
    reviews,
    discountPercentage,
    discountAmount,
    netPrice,
    message,
    relatedProducts,
    breadcrumbs,
    offerName,
    errorMessage,
    
  });
});






// Get single product details -- Admin
exports.getSingleProduct = catchAsyncErrors(async (req, res, next) => {
  try {
    const product = await Product.findById(req.body.productId).populate('offers');

    if (!product) {
      return res.status(404).render('error', { message: 'Product not found' });
    }

    const offers = await Offer.find();
    const categories=await Category.find()

    res.status(200).render('singleProduct', { product, offers, message: null, errorMessage: null, formData: null,categories, existingIsFeatured: product.isFeatured ? 'true' : 'false',  existingCategoryId: product.categoryId, });
  } catch (error) {
    console.error('Error fetching product details:', error);
    res.status(500).render('error', { message: 'An error occurred while fetching product details' });
  }
});









// Update product -- Admin
exports.updateProduct = catchAsyncErrors(async (req, res, next) => {
  try {
    const { name, description, price, categoryId, stock, deleteImages, offers, deleteOffers, reorderThreshold, reorderAmount, isAvailable,highlights,specifications,isFeatured } = req.body;
    const productId = req.params.id;

    // Find the product by ID
    const product = await Product.findById(productId).populate('offers');

    if (!product) {
      return res.status(404).render('error', { message: 'Product not found' });
    }
     // Fetch category details based on the provided category ID
   
     const category = await Category.findById(categoryId);
 
     if (!category) {
       return res.status(404).json({ message: 'Category not found' });
     }
 
     // Add category ID and name to req.body
     req.body.categoryId = category._id;
     req.body.categoryName = category.name;

    // Update product details
    product.name = name;
    product.description = description;
    product.price = price;
    product.categoryId = categoryId; // Ensure this is updated
    product.categoryName = req.body.categoryName; // If you are not using categoryName, remove this line
    product.stock = stock;
    product.reorderThreshold = reorderThreshold || product.reorderThreshold; // Handle item availability management
    product.reorderAmount = reorderAmount || product.reorderAmount; // Handle item availability management
    product.highlights=highlights
    product.specifications=specifications
    product.isAvailable = isAvailable === 'true'; // Convert to boolean
    product.isFeatured=isFeatured
    // Handle image updates
    if (deleteImages && Array.isArray(deleteImages)) {
      deleteImages.forEach(image => {
        product.images.pull(image);
      });
    }

    if (req.files) {
      const resizedImages = [];
      for (let file of req.files) {
        const outputFilePath = `backend/public/uploads/resized_${file.filename}`;
        await sharp(file.path)
          .resize(960, 480)
          .toFile(outputFilePath);
        
        resizedImages.push(`resized_${file.filename}`);
      }
      product.images = product.images.concat(resizedImages);
    }

    // Handle offer updates
    if (deleteOffers && Array.isArray(deleteOffers)) {
      deleteOffers.forEach(offerId => {
        product.offers.pull(offerId);
      });
    }
    

    if (offers && Array.isArray(offers)) {
      offers.forEach(offerId => {
        if (!product.offers.includes(offerId)) {
          product.offers.push(offerId);
        }
      });
    }

    await product.save();
    const message = `${product.name} Product Updated successfully`;

    const resultPerPage = Number(process.env.RESULT_PER_PAGE) || 8;
    const currentPage = Number(req.query.page) || 1;
    const productCount = await Product.countDocuments();
    const totalPages = Math.ceil(productCount / resultPerPage);

    const products = await Product.find().skip((currentPage - 1) * resultPerPage) // Skip documents for pagination
    .limit(resultPerPage);
    
    res.status(201).render('allProductList', { product, message, products,resultPerPage,currentPage,productCount,totalPages });
  } catch (error) {
    let errorMessage = 'An error occurred';
    if (error.errors) {
      // Extract and format validation errors
      const errorMessages = Object.values(error.errors).map(err => err.message);
      errorMessage = errorMessages.join(', ');
    }

    // Fetch categories and offers to re-render the form
    const categories = await Category.find();
    const offers = await Offer.find(); // Fetch available offers
    const product = await Product.findById(req.params.id).populate('offers');
    
    res.status(400).render('singleProduct', { product, categories, offers, errorMessage, formData: req.body, message: null });
  }
});


  
  
//delete product--Admin

exports.deleteProduct=catchAsyncErrors(async(req,res,next)=>{

    let product=await Product.findById(req.params.id) 
    if(!product){
      return next(new ErrorHandler("product not found",404))
    }
await product.deleteOne()

const { _method, ...queryParams } = req.query;
const resultPerPage = Number(process.env.RESULT_PER_PAGE) || 8;
const currentPage = Number(req.query.page) || 1;
const productCount = await Product.countDocuments();
const totalPages = Math.ceil(productCount / resultPerPage);

const apiFeature = new ApiFeatures(Product.find(), queryParams)
.search()
.filter()
.pagination(resultPerPage)


const products = await apiFeature.query;
const message=`${product.name} product has been deleted successfully.`

res.status(200).render('allProductList',{message,products,currentPage,productCount,totalPages,resultPerPage})



})

// Create new review or update the review
exports.createProductReview = catchAsyncErrors(async (req, res, next) => {
  const { rating, comment, productId } = req.body;
  const review = {
    user: req.user.id,
    name: req.user.name,
    rating: Number(rating),
    comment,
    createdAt: new Date() // Add createdAt timestamp
  };

  const product = await Product.findById(productId);

  const isReviewed = product.reviews.find(rev => rev.user.toString() === req.user.id.toString());

  if (isReviewed) {
    product.reviews.forEach(rev => {
      if (rev.user.toString() === req.user.id.toString()) {
        rev.rating = rating;
        rev.comment = comment;
        rev.createdAt = new Date(); // Update the createdAt timestamp
      }
    });
  } else {
    product.reviews.push(review);
    product.numOfReviews = product.reviews.length;
  }

  let sum = 0;
  product.reviews.forEach(rev => {
    sum += rev.rating;
  });
  product.ratings = sum / product.reviews.length;

  await product.save({ validateBeforeSave: false });
  res.status(200).redirect(`/singleProductDetail/${product._id}`);
});



//Delete review

exports.deleteReview = catchAsyncErrors(async (req, res, next) => {
  try{
  // Find the product by ID
  const product = await Product.findById(req.query.productId);

  if (!product) {
    throw new Error("Product Not Found")
    
  }

  // Check if the user has already reviewed this product
  const reviewIndex = product.reviews.findIndex(rev => rev.user.toString() === req.user.id.toString());

  if (reviewIndex === -1) {
    throw new Error(`No review found created by ${req.user.name} `)
    
  }

  // Remove the review from the array
  product.reviews.splice(reviewIndex, 1);

  // Recalculate ratings and number of reviews
  const sum = product.reviews.reduce((acc, rev) => acc + rev.rating, 0);
  const numOfReviews = product.reviews.length;
  const ratings = numOfReviews > 0 ? (sum / numOfReviews) : 0;

  // Update the product with new reviews, ratings, and number of reviews
  await Product.findByIdAndUpdate(req.query.productId, {
    reviews: product.reviews,
    ratings,
    numOfReviews
  }, {
    new: true,
    runValidators: true,
    useFindAndModify: false
  });

  res.status(200).redirect(`/singleProductDetail/${product._id}`)}
  catch(error){
    let errorMessage = 'An error occurred';
    if (error.errors) {
      // Extract and format validation errors
      const errorMessages = Object.values(error.errors).map(err => err.message);
      errorMessage = errorMessages.join(', ');
    }
    else{
      errorMessage=error.message || errorMessage;
      

    }
    const product = await Product.findById(req.query.productId);

    res.redirect(`/singleProductDetail/${product._id}?errorMessage=${encodeURIComponent(errorMessage)}`);

  }

  })






 


//for creating alert when stock is going below reorder threshold

exports.checkStockLevels = catchAsyncErrors(async (productId) => {

  
  try {
      const product = await Product.findById(productId);
      if (product.stock <= product.reorderThreshold && product.isAvailable) {
          const existingAlert = await Alert.findOne({ product: product._id });
          if (!existingAlert) {
              await Alert.create({
                  product: product._id,
                  message: `Stock for ${product.name} is below reorder threshold. existing stock: ${product.stock} at ${new Date().toLocaleString()}`,
              });
          }
      }
     
      
      
      


      
  } catch (error) {
      console.error('Error checking stock levels:', error);
  }
});

// Render admin pannel with alerts
 catchAsyncErrors(exports.renderAdminPanelForStockAlert=async (req, res) => {
    try {
        // Fetch alerts from the database
        const alerts = await Alert.find();
        res.render('adminPanel', { alerts });
    } catch (error) {
        console.error('Error fetching alerts:', error);
        res.render('adminPanel', { alerts: [] });
    }
})
   
// Delete an alert
exports.deleteAlert = catchAsyncErrors(async (req, res) => {
  try {
      await Alert.findByIdAndDelete(req.params.id);
      res.status(200).json({ success: true, message: 'Alert deleted successfully' });
  } catch (error) {
      console.error('Error deleting alert:', error);
      res.status(500).json({ success: false, message: 'Failed to delete alert' });
  }
});





// Get products by parent category
exports.getProductsByParentCategory = catchAsyncErrors(async (req, res) => {
  const errorMessage = req.query.errorMessage || null;
  const parentCategoryId = req.params.parentCategoryId;
  
  const resultPerPage = 8;
  const currentPage = Number(req.query.page) || 1;
 
  

  // Find the parent category
  const parentCategory = await Category.findById(parentCategoryId);

  if (!parentCategory) {
    return res.status(404).json({ message: 'Parent category not found' });
  }

  // Fetch child categories of the parent category
  const childCategories = await Category.find({
    parentCategoryId: parentCategoryId,
    status: 'active'
  });

  // Initialize an empty array to hold products
  let allProducts = [];
 

  // Loop through each child category to fetch its products
  for (let childCategory of childCategories) {
    const childProductsQuery = Product.find({
      categoryId: childCategory._id
    })
      .populate('offers')
      .skip((currentPage - 1) * resultPerPage)
      .limit(resultPerPage);
    

    const childProducts = await childProductsQuery;
    const totalProducts = await Product.countDocuments({ categoryId: childCategory._id });
    const totalPages = Math.ceil(totalProducts / resultPerPage);

    allProducts.push({
      childCategory,
      products: childProducts,
      totalProducts,
      totalPages
    });
  }


  

  // Generate breadcrumbs for the parent category
  const breadcrumbs = await exports. generateBreadcrumbs(parentCategoryId);

  res.status(200).render('parentCategoryProductList', {
    parentCategory,
    allProducts,
    currentPage,
    resultPerPage,
    user: req.user,
    errorMessage,
    breadcrumbs
  });
});




 









  
  
  
  
  
  
  
  
  
  






























