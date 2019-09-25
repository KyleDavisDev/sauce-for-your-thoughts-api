const express = require("express");
const router = express.Router();

// grab controllers
const sauceController = require("../controllers/sauceController.js");
const userController = require("../controllers/userController.js");
const authController = require("../controllers/authController.js");
const reviewController = require("../controllers/reviewController.js");
// const pepperController = require("../controllers/pepperController.js");
// const typeController = require("../controllers/typeController.js");
const imageController = require("../controllers/imageController.js");

// APIs here -----

// Sauce(s)

// upload must be called first for post that are "multipart/form-data"
// multer will put data object onto req.body like normal
// 1. Check mimetype of image and set req.body
// 2. Save image
// 3. Verify user.token, attach UserID to user
// 4. Convert req.body data to be proper format for DB
// 5. Save sauce to DB
router.post(
  "/api/sauce/add",
  imageController.upload,
  authController.isLoggedIn,
  imageController.saveImage,
  sauceController.stringToProperType,
  sauceController.addSauce
);

// upload must be called first for post that are "multipart/form-data"
// multer will put data object onto req.body like normal
// 1. Check mimetype of image and set req.body
// 2. Verify user.token, attach UserID to user
// 3. Save image
// 4. Convert req.body data to be proper format for DB
// 5. Save sauce to DB
router.post(
  "/api/sauce/update",
  imageController.upload,
  authController.isLoggedIn,
  imageController.saveImage,
  sauceController.stringToProperType,
  sauceController.canUserEdit,
  sauceController.updateSauce
);

// 1. Check if user.token is legit, place user's _id onto user
// 2. Check if user can submit a sauce or not
router.post(
  "/api/sauce/canusersubmit",
  authController.isLoggedIn,
  authController.isEmailVerified
);

// 1. Check if user.token is legit, place user's _id onto user
// 2. Check if user can submit a sauce or not
router.post(
  "/api/sauce/canuseredit",
  authController.isLoggedIn,
  sauceController.canUserEdit
);

// 1. Check if user.token is legit, place user's _id onto user
// 2. Check if user can submit a sauce or not
router.post(
  "/api/sauce/edit",
  authController.isLoggedIn,
  authController.isAdmin,
  sauceController.getSauceBySlug
);

// 1. Make sure slug param is legit
// 2. Find sauce by unique slug
// 3. Find reviews related to sauce
// 4. Find related sauces
// 5. Find sauces w/ recently-added reviews
router.get(
  "/api/sauce/get/by/slug/?",
  sauceController.validateSlugParam,
  sauceController.getSauceBySlug,
  reviewController.getReviewsBySauceSlug,
  sauceController.getRelatedSauces,
  sauceController.getSaucesWithNewestReviews
);

// 1. Find newly-added sauces
router.get("/api/sauces/get/by/newest", sauceController.getSaucesByNewest);

// 1. Find featured sauces
router.get("/api/sauces/get/by/featured", sauceController.getSaucesByFeatured);

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

// 1. Validate passed params
// 2. Return array of sauce objects
// (Note: will likely change from method get to method post soon)
router.get(
  "/api/sauces/getByQuery/?",
  sauceController.validateQueryParams,
  sauceController.getByQuery,
  sauceController.getTotal
);

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
router.post("/api/user/login", authController.login, authController.isAdmin);

// 1. Validate user
// 2. Return modifiable user info
router.post(
  "/api/user/getInfo",
  authController.isLoggedIn,
  userController.getInfo
);

// 1. Check if user.token is legit, place user's _id onto user
// 2. Check if user can submit a sauce or not
router.post(
  "/api/user/check/email/",
  authController.isLoggedIn,
  authController.isEmailVerified
);

// 1. Validate user
// 2. Validate info
// 3. Update email
// 4. Relogin
router.post(
  "/api/user/update/email",
  authController.isLoggedIn,
  userController.validateEmailUpdate,
  userController.updateEmail
);

// 1. Validate user
// 2. Validate info
// 3. Update password
router.post(
  "/api/user/update/password",
  authController.isLoggedIn,
  userController.validatePasswordUpdate,
  userController.updatePassword
);

// 1. Validate user
// 2. Validate info
// 3. Update display name
router.post(
  "/api/user/update/displayname",
  authController.isLoggedIn,
  userController.validateDisplayNameUpdate,
  userController.updateDisplayName
);

// 1. Validate user
// 2. Validate info
// 3. Update avatar url
router.post(
  "/api/user/update/avatar",
  authController.isLoggedIn,
  userController.validateAvatarUpdate,
  userController.updateAvatarURL
);

// 1. Confirm email
router.post("/api/user/confirm/email", authController.confirmEmail);

// 1. Check is user.token is legit, place user's _id onto user
router.post("/api/user/isloggedin", authController.isLoggedIn);

// 1. Check if user.token is legit, place user's _id onto user
// 2. See if user is eligible to submit review for sauce
// 3. Make sure review has legit data
// 4. Add review to DB
router.post(
  "/api/review/add",
  authController.isLoggedIn,
  reviewController.canUserSubmit,
  reviewController.validateReview,
  reviewController.addReview
);

// 1. Check if user.token is legit, place user's _id onto user
// 2. Make sure review has legit data
// 3. Add review to DB
router.post(
  "/api/review/get",
  authController.isLoggedIn,
  reviewController.canUserSubmit,
  reviewController.getReviewsBySauceSlug
);

// 1. Check if user.token is legit, place user's _id onto user
// 2. Make sure review has legit data
// 3. Edit an existing review
router.post(
  "/api/review/edit",
  authController.isLoggedIn,
  reviewController.canUserSubmit,
  reviewController.editReview
);

// 1. Check if user.token is legit, place user's _id onto user
// 2. Check if email is verified
// 3. Check if user can submit a specific review
router.post(
  "/api/review/canusersubmit",
  authController.isLoggedIn,
  authController.isEmailVerified,
  reviewController.canUserSubmit
);

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

// // Types
// router.get("/api/types/get", typeController.getTypes, authController.encodeID);

// Images
router.post(
  "/api/images/getAvatars",
  authController.isLoggedIn,
  imageController.getAvatarURLs
);

// Admin
// 1. Make sure user is logged in
// 2. Make sure user is admin
// 3. Get all unapproved sauces
router.post(
  "/api/admin/sauces/unapproved",
  authController.isLoggedIn,
  authController.isAdmin,
  sauceController.getUnapproved
);

// 1. Make sure user is logged in
// 2. Make sure user is admin
// 3. Approve single sauce
router.post(
  "/api/admin/sauces/aprove",
  authController.isLoggedIn,
  authController.isAdmin,
  sauceController.approveSauce
);
// END API ---

module.exports = router;
