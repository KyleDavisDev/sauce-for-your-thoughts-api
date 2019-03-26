var db = require("../db/db.js");

exports.SaucesTypesTableStructure = `CREATE TABLE IF NOT EXISTS Sauces_Types (
  SauceID int,
  TypeID int,
  PRIMARY KEY (SauceID, TypeID),
  FOREIGN KEY (SauceID) REFERENCES Sauces(SauceID),
  FOREIGN KEY (TypeID) REFERENCES Types(TypeID)
  );`;

// exports.Insert = function({ Types }, cb) {
//   db.get().query("")
// };
