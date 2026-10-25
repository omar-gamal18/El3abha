const statusToCode = {
  400: "BAD_REQUEST",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  405: "METHOD_NOT_ALLOWED",
  409: "CONFLICT",
  413: "PAYLOAD_TOO_LARGE",
  415: "UNSUPPORTED_MEDIA_TYPE",
  422: "VALIDATION_ERROR",
  429: "TOO_MANY_REQUESTS",
  500: "INTERNAL_SERVER_ERROR",
};

const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.statusCode || err.status || 500;

  const safeStatusCode =
    Number.isInteger(statusCode) && statusCode >= 400 && statusCode <= 599
      ? statusCode
      : 500;

  const code =
    err.errorCode ||
    statusToCode[safeStatusCode] ||
    (safeStatusCode >= 500 ? "INTERNAL_SERVER_ERROR" : "REQUEST_FAILED");

  const isDevelopment = process.env.NODE_ENV === "development";

  const message =
    safeStatusCode >= 500 && !isDevelopment
      ? "Internal Server Error"
      : err.message || "Request failed";

  const errorResponse = {
    success: false,
    error: {
      code,
      message,
    },
  };

  if (isDevelopment) {
    errorResponse.error.details = {
      name: err.name,
      stack: err.stack,
    };
  }

  if (safeStatusCode >= 500) {
    console.error(err);
  } else if (safeStatusCode >= 400) {
    console.warn(`${req.method} ${req.originalUrl}: ${message}`);
  }

  return res.status(safeStatusCode).json(errorResponse);
};

module.exports = errorHandler;
