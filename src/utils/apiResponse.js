const successResponse = (data, message = "Success", meta) => {
  const response = {
    success: true,
    message,
    data,
  };

  if (meta !== undefined) {
    response.meta = meta;
  }

  return response;
};

const sendSuccess = (
  res,
  data,
  message = "Success",
  statusCode = 200,
  meta,
) => {
  return res.status(statusCode).json(successResponse(data, message, meta));
};

module.exports = {
  successResponse,
  sendSuccess,
};
