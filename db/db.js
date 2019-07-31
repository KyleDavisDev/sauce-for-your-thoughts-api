var mysql = require("mysql");
const { promisify } = require("util");
require("dotenv").config({ path: "variables.env" });

class db {
  constructor() {
    // this.pool = null;

    this.connect = this.connect.bind(this);
    this.get = this.get.bind(this);
    this.query = this.query.bind(this);
    this.getConnection = this.getConnection.bind(this);
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
    this.pool = mysql.createPool({
      host,
      user,
      password,
      database
    });

    if (cb !== undefined) cb(); //Callback

    return this;
  }

  getConnection() {
    return new Promise((resolve, reject) => {
      this.pool.getConnection(function(err, connection) {
        if (err) {
          return reject(err);
        }

        // promisify the query method
        connection.query = promisify(connection.query);

        // return connection
        resolve(connection);
      });
    });
  }

  get() {
    return this.pool;
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

const DB = new db();
module.exports = DB;
