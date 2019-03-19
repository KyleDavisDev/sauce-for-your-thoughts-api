var mysql = require("mysql");
require("dotenv").config({ path: "variables.env" });

var PRODUCTION_DB = "app_prod_database",
  TEST_DB = "app_test_database";

exports.MODE_TEST = "mode_test";
exports.MODE_PRODUCTION = "mode_production";

var state = {
  pool: null
};

exports.connect = function(cb) {
  // Set var
  const ENV = process.env.ENV;
  let host, user, password, database;

  if (ENV === "prod") {
    host = process.env.DB_HOST_PROD;
    user = process.env.DB_USER_PROD;
    password = process.env.DB_PASS_PROD;
    database = process.env.DB_DATABASE_PROD;
  } else {
    host = process.env.DB_HOST_TEST;
    user = process.env.DB_USER_TEST;
    password = process.env.DB_PASS_TEST;
    database = process.env.DB_DATABASE_TEST;
  }

  // Create pool so don't have to reinitialize connection each time
  state.pool = mysql.createPool({
    host,
    user,
    password,
    database
  });

  cb(); // Callback
};

// Return pool
exports.get = function() {
  return state.pool;
};
