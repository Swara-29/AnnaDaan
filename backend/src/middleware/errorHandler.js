export const errorHandler = (error, _req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error(error);
  res.status(error.status || 500).json({
    message: error.message || "Internal server error"
  });
};
