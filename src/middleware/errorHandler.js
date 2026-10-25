const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const requestedStatus = err.statusCode || err.status || 500;

  const statusCode =
    Number.isInteger(requestedStatus) &&
    requestedStatus >= 400 &&
    requestedStatus <= 599
      ? requestedStatus
      : 500;

  const isDevelopment = process.env.NODE_ENV === "development";

  const message =
    statusCode >= 500 && !isDevelopment
      ? "Internal Server Error"
      : err.message || "Request failed";

  const response = {
    success: false,
    error: {
      message,
    },
  };

  if (isDevelopment) {
    response.error.details = {
      name: err.name,
      stack: err.stack,
    };
  }

  if (statusCode >= 500) {
    console.error(err);
  } else {
    console.warn(
      `${req.method} ${req.originalUrl} - ${statusCode} - ${message}`,
    );
  }

  return res.status(statusCode).json(response);
};

module.exports = errorHandler;
