const CrossOriginMiddleware = function(req, res, next) {
  const allowedOrigins = [
    "http://localhost:3000",
    "https://sauceforyourthoughts.com"
  ];
  const origin = req.headers.origin;
  if (allowedOrigins.indexOf(origin) > -1) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.header("Access-Control-Allow-Credentials", true);
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, Content-Type, Accept, Authorization, X-Request-With"
  );
  next();
};

module.exports = CrossOriginMiddleware;
