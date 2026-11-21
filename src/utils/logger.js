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

exports.warn = (message, context) => write('warn', message, context);
exports.error = (message, context) => write('error', message, context);
