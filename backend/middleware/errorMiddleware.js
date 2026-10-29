import ApiError from '../utils/ApiError.js';

export const notFound = (req, res, next) => {
  next(ApiError.notFound(`Route ${req.originalUrl} not found`));
};

export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';

  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', err);
    res.status(statusCode).json({
      message,
      stack: err.stack,
    });
  } else {
    if (err.isOperational) {
      res.status(statusCode).json({ message });
    } else {
      console.error('Unexpected error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
};
