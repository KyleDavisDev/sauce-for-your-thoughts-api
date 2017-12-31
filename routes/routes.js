const express = require("express");
const router = express.Router();

//grab controllers
const storeController = require("../controllers/storeController.js");
const userController = require("../controllers/userController.js");
const authController = require("../controllers/authController.js");

//APIs here -----

//Store(s)
//upload must be called first for post that are "multipart/form-data"
//multer will put data object onto req.body like normal

//1. Check mimetype of image and set req.body
//2. Verify if user is valid
//3. Resize image and write to server
//4. Convert req.body data to be proper format for DB
//5. Write to DB
router.post(
  "/api/store/add",
  storeController.upload,
  authController.isLoggedIn,
  storeController.resize,
  storeController.stringToProperType,
  storeController.addStore
);

//1. Use :slug param to find and return store
//(Note: will likely change from method get to method post soon)
router.get("/api/store/get/:slug", storeController.getStoreBySlug);

//1. Verify if user is valid
//2. Find and return ID-specific store.
router.post(
  "/api/store/get/id",
  authController.isLoggedIn,
  storeController.getStoreById
);

//1. Check mimetype of image and set req.body
//2. Verify if user is valid
//3. Resize image and write to server
//4. Conver req.body data to be proper format for DB
//5. Write to DB
router.post(
  "/api/store/update",
  storeController.upload,
  authController.isLoggedIn,
  storeController.resize,
  storeController.stringToProperType,
  storeController.editStore
);

//1. Return array of store objects
//(Note: will likely change from method get to method post soon)
router.get("/api/stores/get", storeController.getStores);

router.get("/api/stores/search/:q", storeController.searchStores);

//Tag(s)
//1. Use :tag param to return array of store objects
router.get("/api/tags/:tag/get", storeController.getStoreByTag);

//User(s)
//1. Validate the data
//2. register the user
//3. Log user in via JWT
router.post(
  "/api/user/register",
  userController.validateRegister,
  userController.register,
  authController.login
);

//1. Generate JWT
router.post("/api/user/login", authController.login);

//1. Validate user
//2. Return modifiable user info
router.post(
  "/api/user/getInfo",
  authController.isLoggedIn,
  userController.getUser
);

//1. Validate user
//2. Update user info
router.post(
  "/api/user/update",
  authController.isLoggedIn,
  userController.updateUser
);

//1. Check if token relates to a user
router.post(
  "/api/user/isloggedin",
  authController.isLoggedIn,
  authController.validateToken
);

//1. Find user by email, send email if email is legit or not otherwise, set key and timer for person in DB
router.post("/account/forgot", authController.forgot);

//1. Determines if reset token is legit or not
router.post("/account/validateResetToken", authController.validateResetToken);

//1. Check passwords for equality
//2. Hash and update password
//3. Log user in via JWT
router.post(
  "/account/reset",
  authController.confirmPasswords,
  authController.updatePassword,
  authController.login
);

//END API ---

//let react handle rest
router.get("*", (req, res) => {
  // Temp removed since this is just API
  // res.sendFile(`${process.cwd()}/dist/index.html`);
});

module.exports = router;
