// utils/errorHandler.js
class ErrorHandler extends Error {
  constructor(message, statusCode, template = null, context = {}) {
    super(message);
    this.statusCode = statusCode;
    this.template = template;
    this.context = context; // Additional context for rendering templates

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ErrorHandler;

  