const Category=require('../models/categoryModel')
const ErrorHandler = require('../utils/errorhandler')
const catchAsyncErrors=require('../middleware/catchAsyncErrors')
const upload = require('../config/multerConfig')
const path = require('path');
const fs = require('fs');
 

//Get all category(admin)
  
 exports.getAllCategories=catchAsyncErrors(async(req,res,next)=>{
      const resultPerPage=8
      const categoryCount = await Category.countDocuments();
      const currentPage = Number(req.query.page) || 1;
     const categories=await Category.find()
     .skip((currentPage - 1) * resultPerPage) // Skip documents for pagination
      .limit(resultPerPage); // Limit the number of documents returned
      const totalPages = Math.ceil(categoryCount / resultPerPage);


    res.status(200).render('allCategories',{categories,message:null,
    currentPage,
    categoryCount,
    totalPages


    })
  
  })


  //Render Create Category Page(admin)
  
 exports.renderCreateCategoryPage=catchAsyncErrors(async(req,res,next)=>{
    const categories = await Category.find();
   res.status(200).render('createNewCategory',{categories})
  })
  
  // Create Category -- Admin
exports.createCategory = catchAsyncErrors(async (req, res, next) => {
    const { name, description, parentCategoryId, status } = req.body;
    const categoryImage = req.file ? `${req.file.filename}` : null;
  
    try {
      // Fetch the parent category name if a parent category is selected
      let parentCategoryName = null;
      if (parentCategoryId) {
        const parentCategory = await Category.findById(parentCategoryId);
        if (parentCategory) {
          parentCategoryName = parentCategory.name;
        }
      }
  
      const category = new Category({
        name: name,
        description: description,
        parentCategoryId: parentCategoryId || null,
        parentCategoryName: parentCategoryName,
        image: categoryImage,
        status: status || 'active'
      });
  
      await category.save();
      const message=`${category.name} has been created successfully`
      const resultPerPage=8
      const categoryCount = await Category.countDocuments();
      const currentPage = Number(req.query.page) || 1;
     const categories=await Category.find()
     .skip((currentPage - 1) * resultPerPage) // Skip documents for pagination
      .limit(resultPerPage); // Limit the number of documents returned
      const totalPages = Math.ceil(categoryCount / resultPerPage);

      res.status(201).render('allCategories',{message,categories,totalPages,categoryCount,currentPage});
    } catch (error) {
      res.status(400).send(error);
    }
  });
  


// Get Single Category
exports.getSingleCategory = catchAsyncErrors(async (req, res, next) => {
    try {
      const category = await Category.findById(req.body.categoryId);
  
      if (!category) {
        return res.status(404).send({ message: 'Category not found' });
      }
      const categories = await Category.find();
  
      res.status(200).render('singleCategory',{category,categories,message:null})
    } catch (error) {
      res.status(400).send(error);
    }
  });

  // Update Category -- Admin
exports.updateCategory = catchAsyncErrors(async (req, res, next) => {
    const { name, description, parentCategoryId, status } = req.body;
    let category = await Category.findById(req.params.id);

    if (!category) {
        return res.status(404).send({ message: 'Category not found' });
    }

    // Check if existing image should be deleted
    if (req.body.deleteImage && category.image) {
        const imagePath = path.join(__dirname, '..', 'uploads', category.image);
        fs.unlink(imagePath, (err) => {
            if (err) {
                console.error(err);
            }
        });
        category.image = null;
    }

    // Handle new image upload
    const categoryImage = req.file ? `${req.file.filename}` : category.image;

    // Update category fields
    category.name = name;
    category.description = description;
    category.parentCategoryId = parentCategoryId || null;
    category.image = categoryImage;
    category.status = status || category.status;

    await category.save();
    const categories = await Category.find();
    const message=` ${category.name} category has been updated successfully`

    res.status(200).render('singleCategory',{category,categories,message});
});


// Delete category controller
exports.deleteCategory = async (req, res, next) => {
    try {
        const categoryId = req.params.id;
        const category = await Category.findById(categoryId);

        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        // If the category has an associated image, delete the image file
        if (category.image) {
            const imagePath = path.join(__dirname, '..', 'uploads', category.image);
            fs.unlink(imagePath, (err) => {
                if (err) {
                    console.error('Error deleting image:', err);
                }
            });
        }

        await category.deleteOne()
        const message=`${category.name} Category has been deleted successfully`
        const resultPerPage=8
        const categoryCount = await Category.countDocuments();
        const currentPage = Number(req.query.page) || 1;
       const categories=await Category.find()
       .skip((currentPage - 1) * resultPerPage) // Skip documents for pagination
        .limit(resultPerPage); // Limit the number of documents returned
        const totalPages = Math.ceil(categoryCount / resultPerPage);

        res.status(200).render('allCategories',{message,categories,resultPerPage,categoryCount,totalPages,currentPage})
    } catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
  

   



  