var DB = require("../db/db.js");

exports.SaucesTypesTableStructure = `CREATE TABLE IF NOT EXISTS Sauces_Types (
  SauceID int,
  TypeID int,
  PRIMARY KEY (SauceID, TypeID),
  CONSTRAINT Sauces_Types_Sauces_SauceID FOREIGN KEY (SauceID) REFERENCES Sauces(SauceID),
  CONSTRAINT Sauces_Types_Users_UserID FOREIGN KEY (TypeID) REFERENCES Types(TypeID)
  ) ENGINE=InnoDB DEFAULT CHARSET=latin1;`;

exports.SaucesTypesDrop = `ALTER TABLE Sauces_Types DROP FOREIGN KEY Sauces_Types_Sauces_SauceID;
  ALTER TABLE Sauces_Types DROP FOREIGN KEY Sauces_Types_Users_UserID;
  DROP TABLE Sauces_Types`;

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
