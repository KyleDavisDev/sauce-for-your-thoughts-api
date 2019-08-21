const DB = require("../db/db.js");

exports.UserMetaTableStructure = `CREATE TABLE UserMeta (
  UserMetaID int(11) unsigned NOT NULL AUTO_INCREMENT,
  Attribute tinytext CHARACTER SET utf8 NOT NULL,
  AttributeValue tinytext CHARACTER SET utf8 NOT NULL,
  AttributeKey tinytext CHARACTER SET utf8,
  InsertDate datetime NOT NULL,
  ExpireDate datetime DEFAULT NULL,
  IsActive tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (UserMetaID)
  KEY UserID (UserID),
  CONSTRAINT UserMeta_UserID_Users_UserID FOREIGN KEY (UserID) REFERENCES Users (UserID)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;`;

exports.UserMetaDrop = `ALTER TABLE UserMeta DROP FOREIGN KEY UserMeta_UserID_Users_UserID;
  DROP TABLE UserMeta;`;
