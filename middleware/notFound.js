const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.status = 404;
  next(error); // 👈 Forwards the 404 error directly to your errorHandler!
};
export default notFound;
