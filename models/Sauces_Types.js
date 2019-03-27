var DB = require("../db/db.js");

exports.SaucesTypesTableStructure = `CREATE TABLE IF NOT EXISTS Sauces_Types (
  SauceID int,
  TypeID int,
  PRIMARY KEY (SauceID, TypeID),
  FOREIGN KEY (SauceID) REFERENCES Sauces(SauceID),
  FOREIGN KEY (TypeID) REFERENCES Types(TypeID)
  ) ENGINE=InnoDB DEFAULT CHARSET=latin1;`;

exports.Insert = async function({ SauceID, TypeID, record }) {
  // If full record is sent, use this
  if (record && record.length > 0) {
    return await DB.query(
      "INSERT INTO Sauces_Types (SauceID, TypeID) VALUES ?",
      [record]
    );
  }

  return DB.query(
    "INSERT INTO Sauces_Types (SauceID, TypeID) VALUES (?, ?)"[
      (SauceID, TypeID)
    ]
  );
};
