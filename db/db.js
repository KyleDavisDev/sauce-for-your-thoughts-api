var mysql = require("mysql");
require("dotenv").config({ path: "variables.env" });

var state = {
  pool: null
};

class db {
  constructor() {
    // this.pool = null;

    this.connect = this.connect.bind(this);
    this.get = this.get.bind(this);
    this.query = this.query.bind(this);
  }

  connect(cb) {
    // Set variables
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

    if (cb !== undefined) cb(); //Callback

    return this;
  }

  get() {
    return state.pool;
  }

  query(sql, args) {
    return new Promise((resolve, reject) => {
      this.get().query(sql, args, (err, rows) => {
        // If error, reject w/ err
        if (err) return reject(err);

        // Else resolt w/ rows
        resolve(rows);
      });
    });
  }

  close() {
    return new Promise((resolve, reject) => {
      this.connection.end(err => {
        if (err) return reject(err);
        resolve();
      });
    });
  }
}

module.exports = db;

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
