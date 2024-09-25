const Offer = require('../models/offerModel');
const catchAsyncErrors = require('../middleware/catchAsyncErrors');
const Product = require('../models/productModel');
const Category = require('../models/categoryModel');

// Controller for displaying all offers
exports.getOffers = catchAsyncErrors(async (req, res, next) => {
  try {
    const offers = await Offer.find().populate('products');

    res.status(200).render('allOffers', { 
      offers,
      message:null
    });
  } catch (error) {
    console.error('Error fetching offers:', error);
    res.status(500).render('allOffers', { 
      offers: [],
      message:null
    });
  }
});

// Controller for displaying the create offer form
exports.getCreateOfferForm = catchAsyncErrors(async (req, res, next) => {
  try {
    const products = await Product.find();
    const categories=await Category.find()

    res.render('createOffer', {
      products,
      formData:{},
      categories

    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.redirect('/offers');
  }
});

// Controller for creating a new offer
exports.createOffer = catchAsyncErrors(async (req, res, next) => {
  try {
    const { name, discountPercentage, startDate, endDate, products, category } = req.body;

    if (discountPercentage < 0 || discountPercentage > 100) {
      throw new Error('Discount percentage must be between 0 and 100');
    }

    if (new Date(startDate) > new Date(endDate)) {
      throw new Error('Start date must be before end date');
    }

    let offer;
    let productIds = [];

    if (products && products.length > 0) {
      productIds = products; // Use the selected products directly
      offer = await Offer.create({ name, discountPercentage, startDate, endDate, products: productIds });
    } else if (category) {
      const categoryDetails = await Category.findById(category);
      if (!categoryDetails) {
        throw new Error('Selected category does not exist');
      }

      const productsInCategory = await Product.find({ categoryId: category });
      productIds = productsInCategory.map(product => product._id);

      offer = await Offer.create({ name, discountPercentage, startDate, endDate, products: productIds, category });
    } else {
      // Create the offer without products or category
      offer = await Offer.create({ name, discountPercentage, startDate, endDate });
    }

    // Update each product's offers field to include the new offer._id
    await Product.updateMany(
      { _id: { $in: productIds } },
      { $push: { offers: offer._id } }
    );

    const message = `${offer.name} has been created successfully`;
    const offers = await Offer.find().populate('products category');

    res.render('allOffers', { message, offers });
  } catch (error) {
    let errorMessage = 'An error occurred';
    if (error.errors) {
      const errorMessages = Object.values(error.errors).map(err => err.message);
      errorMessage = errorMessages.join(', ');
    } else if (error.message) {
      errorMessage = error.message;
    }

    const products = await Product.find();
    const categories = await Category.find();

    res.status(400).render('createOffer', { 
      errorMessage, 
      formData: req.body, 
      products,
      categories
    });
  }
});



exports.getSingleOfferDetails = catchAsyncErrors(async (req, res, next) => {
  try {
    const offerId = req.body.offerId;
    
    // Find the offer by ID and populate products and category
    const offer = await Offer.findById(offerId)
      .populate('products')
      .populate('category');

    if (!offer) {
      return res.status(404).render('error', { message: 'Offer not found' });
    }

    // Retrieve all products and categories
    const products = await Product.find();
    const categories = await Category.find();

    // Render the EJS template with offer details
    res.render('singleOffer', {
      offer,
      products,
      categories,
      formData: null,
      errorMessage: null,
      message: null
    });
  } catch (error) {
    console.error('Error fetching offer details:', error);
    res.status(500).render('error', { message: 'An error occurred while fetching offer details' });
  }
});




exports.updateOffer = catchAsyncErrors(async (req, res, next) => {
  try {
    const { offerId, name, discountPercentage, startDate, endDate, products, category, offerType, removeProducts } = req.body;

    // Validate discount percentage
    if (discountPercentage < 0 || discountPercentage > 100) {
      throw new Error('Discount percentage must be between 0 and 100');
    }

    // Validate date range
    if (new Date(startDate) > new Date(endDate)) {
      throw new Error('Start date must be before end date');
    }

    // Find the offer by ID
    const offer = await Offer.findById(offerId);

    if (!offer) {
      return res.status(404).render('error', { message: 'Offer not found' });
    }

    // Update offer details
    offer.name = name;
    offer.discountPercentage = discountPercentage;
    offer.startDate = startDate;
    offer.endDate = endDate;

    let productIds = []; // Array to track products linked to the offer

    // If the offer type is 'product'
    if (offerType === 'product') {
      // Clear the associated category since we are now dealing with individual products
      offer.category = null;

      // Handle removal of specified products
      if (removeProducts && Array.isArray(removeProducts)) {
        // Remove the old offer from the removed products
        await Product.updateMany(
          { _id: { $in: removeProducts } },
          { $pull: { offers: offer._id } }
        );
        // Update the offer's product list
        removeProducts.forEach(productId => {
          offer.products.pull(productId);
        });
      }

      // Add new products to the offer
      if (products && Array.isArray(products)) {
        products.forEach(productId => {
          if (!offer.products.includes(productId)) {
            offer.products.push(productId);
          }
        });
      }

      productIds = offer.products; // Keep track of current products linked to this offer

    } else if (offerType === 'category' && category) {
      // If the offer type is 'category'
      offer.products = []; // Clear products for category offers
      offer.category = category; // Set new category

      // Fetch all products under the selected category
      const productsInCategory = await Product.find({ categoryId: category });
      productIds = productsInCategory.map(product => product._id);

      // Add all products in the selected category to the offer
      offer.products = productIds;
    }

    // Save the updated offer
    await offer.save();

    // Remove the offer from old products (not in the updated product list)
    await Product.updateMany(
      { offers: offer._id, _id: { $nin: productIds } }, // Products that have this offer but are no longer part of the offer
      { $pull: { offers: offer._id } } // Remove the offer from them
    );

    // Add the offer to the new products
    await Product.updateMany(
      { _id: { $in: productIds } },
      { $addToSet: { offers: offer._id } } // Add the offer to the new products
    );

    // Fetch updated offer, products, and categories
    const updatedOffer = await Offer.findById(offerId).populate('products').populate('category');
    const allProducts = await Product.find();
    const allCategories = await Category.find();

    const message = `${offer.name} has been updated successfully`;
    const offers = await Offer.find();

    // Render the updated offer page
    res.render('allOffers', {
      offer: updatedOffer,
      products: allProducts,
      categories: allCategories,
      formData: null,
      errorMessage: null,
      message,
      offers
    });

  } catch (error) {
    // Handle errors and render the error page
    const offer = await Offer.findById(req.body.offerId)
      .populate('products')
      .populate('category');

    if (!offer) {
      return res.status(404).render('error', { message: 'Offer not found' });
    }

    // Retrieve all products and categories
    const products = await Product.find();
    const categories = await Category.find();
    console.error('Error updating offer:', error);

    res.status(500).render('singleOffer', {
      formData: req.body,
      products,
      categories,
      errorMessage: error.message || 'An error occurred'
    });
  }
});







// Controller for deleting an offer
exports.deleteOffer = catchAsyncErrors(async (req, res, next) => {
  const offer = await Offer.findById(req.params.id);
  if (!offer) {
    return res.redirect('/offers');
  }
  await offer.deleteOne();
  const message=`${offer.name} has been deleted successfully`
  const offers = await Offer.find().populate('products');
  res.render('allOffers',{message,offers});
});
