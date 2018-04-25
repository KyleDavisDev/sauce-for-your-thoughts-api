const express = require("express");
const router = express.Router();

// grab controllers
const sauceController = require("../controllers/sauceController.js");
const userController = require("../controllers/userController.js");
const authController = require("../controllers/authController.js");
const reviewController = require("../controllers/reviewController.js");

// APIs here -----

// Sauce(s)
// upload must be called first for post that are "multipart/form-data"
// multer will put data object onto req.body like normal

// 1. Check mimetype of image and set req.body
// 2. Verify if user is valid
// 3. Resize image and write to server
// 4. Convert req.body data to be proper format for DB
// 5. Write to DB
router.post(
  "/api/sauce/add",
  sauceController.upload,
  authController.isLoggedIn,
  sauceController.resize,
  sauceController.stringToProperType,
  sauceController.addSauce,
  reviewController.addReview
);

// 1. Use :slug param to find and return sauce
// 2. Add reviews to sauce that was found
router.get(
  "/api/sauce/get/:slug",
  sauceController.getSauceBySlug,
  reviewController.findReviewsBySauceID,
  authController.encodeID
);

// 1. Verify if user is valid
// 2. Find and return ID-specific sauce.
router.post(
  "/api/sauce/get/id",
  authController.isLoggedIn,
  sauceController.getSauceById,
  reviewController.findReviewsBySauceID,
  authController.encodeID
);

// 1. Check mimetype of image and set req.body
// 2. Verify if user is valid
// 3. Resize image and write to server
// 4. Conver req.body data to be proper format for DB
// 5. Write to DB
router.post(
  "/api/sauce/update",
  sauceController.upload,
  authController.isLoggedIn,
  sauceController.resize,
  sauceController.stringToProperType,
  sauceController.editSauce
);

// 1. Return array of sauce objects
// (Note: will likely change from method get to method post soon)
router.get(
  "/api/sauces/get",
  sauceController.getSauces,
  reviewController.findReviewsBySauceID,
  authController.encodeID
);

// 1. Check if user is legit
// 2. return sauces by specific tag
router.post("/api/sauces/get/by/tag/", sauceController.getSauceByTag);

// TODO: Add comment
router.get("/api/sauces/search/:q", sauceController.searchSauces);

// 1. Return array of tags
router.get("/api/tags/get", sauceController.getTagsList);

// User(s)
// 1. Validate the data
// 2. register the user
// 3. Log user in via JWT
router.post(
  "/api/user/register",
  userController.validateRegister,
  userController.register,
  authController.login
);

// 1. Generate JWT
router.post("/api/user/login", authController.login);

// 1. Validate user
// 2. Return modifiable user info
router.post(
  "/api/user/getInfo",
  authController.isLoggedIn,
  userController.getUser
);

// 1. Validate user
// 2. Update user info
router.post(
  "/api/user/update",
  authController.isLoggedIn,
  userController.updateUser
);

// 1. Check if token relates to a user
router.post(
  "/api/user/isloggedin",
  authController.isLoggedIn,
  authController.validateToken
);

// 1. Validate user
// 2. Find user hearts
// 3. Encode _id's
router.post(
  "/api/user/getHearts",
  authController.isLoggedIn,
  userController.getHearts,
  authController.encodeID
);

// 1. Check is token is legit
// 2. Toggle sauce.ID in user.hearts
router.post(
  "/api/user/toggleSauce",
  authController.isLoggedIn,
  userController.toggleHeart
);

router.post(
  "/api/review/add",
  authController.isLoggedIn,
  reviewController.addReview
);

// 1. Find user by email, send email if email is legit or not otherwise, set key and timer for person in DB
router.post("/account/forgot", authController.forgot);

// 1. Determines if reset token is legit or not
router.post("/account/validateResetToken", authController.validateResetToken);

// 1. Check passwords for equality
// 2. Hash and update password
// 3. Log user in via JWT
router.post(
  "/account/reset",
  authController.confirmPasswords,
  authController.updatePassword,
  authController.login
);

// END API ---

// let react handle rest
router.get("*", (req, res) => {
  // Temp removed since this is just API
  // res.sendFile(`${process.cwd()}/dist/index.html`);
});

module.exports = router;
