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
    const NODE_ENV = process.env.NODE_ENV;
    let host, port, user, password, database;

    if (NODE_ENV === "prod") {
      host = process.env.DB_HOST_PROD;
      port = process.env.DB_PORT_PROD;
      user = process.env.DB_USER_PROD;
      password = process.env.DB_PASS_PROD;
      database = process.env.DB_DATABASE_PROD;
    } else {
      host = process.env.DB_HOST_DEV;
      port = process.env.DB_PORT_DEV;
      user = process.env.DB_USER_DEV;
      password = process.env.DB_PASS_DEV;
      database = process.env.DB_DATABASE_DEV;
    }

    // Create pool so don't have to reinitialize connection each time
    this.pool = mysql.createPool({
      host,
      port,
      user,
      password,
      database,
      connectionLimit: 1000,
      connectTimeout: 60 * 60 * 1000,
      acquireTimeout: 60 * 60 * 1000,
      timeout: 60 * 60 * 1000
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

        // promisify the query method - can now use async/await
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
