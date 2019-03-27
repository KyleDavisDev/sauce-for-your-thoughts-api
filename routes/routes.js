const express = require("express");
const router = express.Router();

// grab controllers
const sauceController = require("../controllers/sauceController.js");
const userController = require("../controllers/userController.js");
const authController = require("../controllers/authController.js");
// const reviewController = require("../controllers/reviewController.js");
// const pepperController = require("../controllers/pepperController.js");
// const typeController = require("../controllers/typeController.js");
const imageController = require("../controllers/imageController.js");

// APIs here -----

// Sauce(s)
// upload must be called first for post that are "multipart/form-data"
// multer will put data object onto req.body like normal

// 1. Check mimetype of image and set req.body
// 2. Verify user.token, attach _id to user
// 3. Decode all _id's if applicable
// 4. Resize image and save to server
// 5. Convert req.body data to be proper format for DB
// 6. Save sauce to DB
// 7. Save review to DB
// 8. Encode _id's
router.post(
  "/api/sauce/add",
  imageController.upload,
  authController.isLoggedIn,
  imageController.resize,
  sauceController.stringToProperType,
  sauceController.addSauce
);

// // 1. Look up a sauce by unique slug
// // 2. Add reviews to sauce that was found
// router.post(
//   "/api/sauce/get/by/slug",
//   sauceController.getSauceBySlug,
//   reviewController.getReviewsBySauceID
//   // authController.encodeID
// );

// // 1. Check mimetype of image and set req.body
// // 2. Verify if user is valid
// // 3. Resize image and write to server
// // 4. Convert req.body data to be proper format for DB
// // 5. Write to DB
// router.post(
//   "/api/sauce/update",
//   imageController.upload,
//   authController.isLoggedIn,
//   imageController.resize,
//   sauceController.stringToProperType,
//   sauceController.editSauce
// );

// // 1. Return array of sauce objects
// // (Note: will likely change from method get to method post soon)
// router.get(
//   "/api/sauces/get?",
//   sauceController.getSauces,
//   reviewController.getOnlyReviewIDsBySauceID,
//   authController.encodeID
// );

// // 1. return sauces by specific tag
// router.post("/api/sauces/get/by/tag/", sauceController.getSauceByTag);

// // TODO: Add comment
// router.get("/api/sauces/search/:q", sauceController.searchSauces);

// // 1. Return array of tags
// router.get("/api/tags/get", sauceController.getTagsList);

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

// // 1. Generate JWT
router.post("/api/user/login", authController.login);

// // 1. Validate user
// // 2. Return modifiable user info
// router.post(
//   "/api/user/getInfo",
//   authController.isLoggedIn,
//   userController.getUser
// );

// // 1. Validate user
// // 2. Update user info
// router.post(
//   "/api/user/update",
//   authController.isLoggedIn,
//   userController.updateUser
// );

// // 1. Check is user.token is legit, place user's _id onto user
// router.post(
//   "/api/user/isloggedin",
//   authController.isLoggedIn,
//   authController.validateToken
// );

// // 1. Validate user
// // 2. Find user hearts
// // 3. Encode _id's
// router.post(
//   "/api/user/getHearts",
//   authController.isLoggedIn,
//   userController.getHearts,
//   authController.encodeID
// );

// // 1. Check is user.token is legit, place user's _id onto user
// // 2. Decode all ._id's if applicable
// // 3. Toggle sauce._id in user.hearts
// // 4. Encode all ._id's
// router.post(
//   "/api/user/toggleSauce",
//   authController.isLoggedIn,
//   authController.decodeID,
//   userController.toggleHeart,
//   authController.encodeID
// );

// // 1. Check if user.token is legit, place user's _id onto user
// // 2. Decode all .id's if applicable
// // 3. Add review to DB
// // 4. Encode all .id's
// router.post(
//   "/api/review/add",
//   authController.isLoggedIn,
//   // authController.decodeID,
//   reviewController.validateReview,
//   sauceController.getSauceBySlug,
//   reviewController.addReview
//   // authController.encodeID
// );

// // 1. Find user by email, send email if email is legit or not otherwise, set key and timer for person in DB
// router.post("/account/forgot", authController.forgot);

// // 1. Determines if reset token is legit or not
// router.post("/account/validateResetToken", authController.validateResetToken);

// // 1. Check passwords for equality
// // 2. Hash and update password
// // 3. Log user in via JWT
// router.post(
//   "/account/reset",
//   authController.confirmPasswords,
//   authController.updatePassword,
//   authController.login
// );

// // Peppers
// router.get(
//   "/api/peppers/get",
//   pepperController.getPeppers,
//   authController.encodeID
// );

// // Types
// router.get("/api/types/get", typeController.getTypes, authController.encodeID);

// END API ---

module.exports = router;
