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
) ENGINE=InnoDB DEFAULT CHARSET=latin1;`;

exports.UserMetaDrop = "DROP TABLE UserMeta;";
