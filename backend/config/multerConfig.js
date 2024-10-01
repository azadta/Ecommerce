const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

// Configure storage for multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './public/uploads/');
  },
  filename: (req, file, cb) => {
    // Generate a unique filename using a combination of timestamp and random bytes
    const uniqueSuffix = crypto.randomBytes(8).toString('hex');
    const fileExtension = path.extname(file.originalname);
    const uniqueFileName = `${Date.now()}-${uniqueSuffix}${fileExtension}`;
    cb(null, uniqueFileName);
  }
});


const upload = multer({ storage});


module.exports = upload;
