var DB = require("../db/db.js");

exports.SaucesTypesTableStructure = `CREATE TABLE IF NOT EXISTS Sauces_Types (
  SauceID int,
  TypeID int,
  PRIMARY KEY (SauceID, TypeID),
  CONSTRAINT Sauces_Types_Sauces_SauceID FOREIGN KEY (SauceID) REFERENCES Sauces(SauceID),
  CONSTRAINT Sauces_Types_Types_TypeID FOREIGN KEY (TypeID) REFERENCES Types(TypeID)
  ) ENGINE=InnoDB DEFAULT CHARSET=latin1;`;

exports.SaucesTypesDrop = `ALTER TABLE Sauces_Types DROP FOREIGN KEY Sauces_Types_Sauces_SauceID;
  ALTER TABLE Sauces_Types DROP FOREIGN KEY Sauces_Types_Users_UserID;
  DROP TABLE Sauces_Types`;

/** @description Insert record(s) into table
 *  @param {Array[]} Record - array of arrays
 *  @param {Number} Record[][0] - unique sauce id
 *  @param {Number} Record[][1] - unique type id
 *  @returns {Object} returns inserted record
 */
exports.Insert = async function({ Record }) {
  if (!Record && Record.length === 0) {
    throw new Error(
      "Must provide required parameters to Sauces_Types.Insert method"
    );
  }

  const rows = await DB.query(
    "INSERT INTO Sauces_Types (SauceID, TypeID) VALUES ?",
    [Record]
  );

  if (!rows) {
    throw new Error("Could not insert records into Sauces_Types.");
  }

  return rows;
};

/** @description Update relationship between sauces and types of sauces
 *  @param {Array[]} Record - array of arrays
 *  @param {Number} Record[][0] - unique sauce id
 *  @param {Number} Record[][1] - unique type id
 *  @returns {Boolean} Whether update was successfull or not
 */
exports.Update = async function({ Record }) {
  if (!Record || Record.length === 0) {
    throw new Error(
      "Must provide required parameters to Sauces_Types.Update method"
    );
  }

  // Grab user ID
  const SauceID = Record[0][0];
  if (!SauceID) {
    throw new Error(
      "Must provide required parameters to Sauces_Types.Update method"
    );
  }

  // will first remove all existing records
  await exports.RemoveAll({ SauceID });

  // Add all records
  const rows = await exports.Insert({ Record });

  return !!rows;
};

/** @description Drop all records for a user
 *  @param {Number} SauceID - unique user id
 *  @returns {Boolean} Was able to remove all or not
 */
exports.RemoveAll = async function({ SauceID }) {
  if (!SauceID) {
    throw new Error(
      "Must provide required parameters to Sauces_Types.Update method"
    );
  }

  const rows = await DB.query(
    `
      DELETE FROM
        Sauces_Types
      WHERE
        SauceID = ?
    `,
    [SauceID]
  );

  if (!rows) {
    throw new Error("Could not delete user records in Sauces_Types.");
  }

  return !!rows;
};
