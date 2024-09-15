const express=require('express')
const router=express.Router()
const upload = require('../../config/multerConfig')

const { isAuthenticateUser, authorizeRoles } = require('../../middleware/auth')
const { getAllCategories, renderCreateCategoryPage, createCategory, getSingleCategory, updateCategory, deleteCategory } = require('../../controllers/categoryController')


router.route('/getAllCategories').get(isAuthenticateUser,authorizeRoles('admin'),getAllCategories)
router.route('/createNewCategory').get(isAuthenticateUser,authorizeRoles('admin'),renderCreateCategoryPage).post(isAuthenticateUser,authorizeRoles('admin'),upload.single('image'),createCategory)
router.route('/getSingleCategory').post(isAuthenticateUser,authorizeRoles('admin'),getSingleCategory)
router.route('/updateCategory/:id').put(isAuthenticateUser, authorizeRoles('admin'), upload.single('image'), updateCategory)
router.route('/deleteCategory/:id').delete(isAuthenticateUser,authorizeRoles('admin'),deleteCategory)

module.exports=router