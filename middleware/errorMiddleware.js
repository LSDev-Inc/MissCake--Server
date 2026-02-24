const notFound = (req, res, next) => {
  res.status(404);
  next(new Error(`Route not found: ${req.originalUrl}`));
};

const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  const isProd = process.env.NODE_ENV === "production";
  const response = {
    message: isProd && statusCode >= 500 ? "Internal Server Error" : err.message || "Internal Server Error",
  };

  if (!isProd) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

module.exports = {
  notFound,
  errorHandler,
};
