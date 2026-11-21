/**
 * Writes one JSON log record to the matching console stream.
 * @param {'warn'|'error'} level log severity
 * @param {string} message event message
 * @param {object} context structured metadata
 * @returns {void}
 * @throws {TypeError} if context cannot be JSON-serialized; no HTTP status is assigned
 */
const write = (level, message, context = {}) => {
  const entry = JSON.stringify({
    level,
    message,
    ...context,
  });

  if (level === 'error') {
    console.error(entry);
  } else {
    console.warn(entry);
  }
};

/**
 * Writes a structured warning event.
 * @param {string} message event message
 * @param {object} context structured metadata
 * @returns {void}
 * @throws {TypeError} if context cannot be JSON-serialized; no HTTP status is assigned
 */
exports.warn = (message, context) => write('warn', message, context);

/**
 * Writes a structured error event.
 * @param {string} message event message
 * @param {object} context structured metadata
 * @returns {void}
 * @throws {TypeError} if context cannot be JSON-serialized; no HTTP status is assigned
 */
exports.error = (message, context) => write('error', message, context);
