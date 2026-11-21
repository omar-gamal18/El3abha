/**
 * Builds the standard success response object.
 * @param {*} data response data
 * @param {string} message success message
 * @param {*} meta optional metadata
 * @returns {{success: boolean, message: string, data: *, meta?: *}} response object
 * @throws {never}
 */
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

/**
 * Sends the standard success response with the selected HTTP status.
 * @param {import('express').Response} res Express response
 * @param {*} data response data
 * @param {string} message success message
 * @param {number} statusCode HTTP status
 * @param {*} meta optional metadata
 * @returns {import('express').Response} Express response
 * @throws {Error} if response serialization fails; no HTTP status is assigned
 */
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
