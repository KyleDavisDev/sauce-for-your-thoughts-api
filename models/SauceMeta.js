const DB = require("../db/db.js");

exports.SaucesTableStructure = `CREATE TABLE IF NOT EXISTS SauceMeta (
  MetaID int NOT NULL AUTO_INCREMENT,
  SauceID int NOT NULL,
  MetaKey varchar(255) NOT NULL,
  MetaValue varchar(500),
  PRIMARY KEY (SauceID),
  CONSTRAINT SaucesMeta_Sauces_SauceID FOREIGN KEY (SauceID) REFERENCES Sauces(SauceID)
  );`;

exports.SaucesDrop = `ALTER TABLE SauceMeta DROP FOREIGN KEY SauceMeta_Sauces_SauceID;
  DROP TABLE SauceMeta;`;
