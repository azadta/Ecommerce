module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.message = err.message || 'Internal Server Error';

  const context = {
    errorMessage: err.message,
    ...req.errorContext // Include any additional context if available
  };
   // If there is form data to be sent, include it in the context
   if (req.body) {
    context.formData = req.body;
  }

  if (err.template) {
    res.status(err.statusCode).render(err.template, context);
  } else {
    // Handle the error without rendering a template
    res.status(err.statusCode).json({
      success: false,
      message: err.message
    });
  }
};



