var DB = require("../db/db.js");

exports.TypesTableStructure = `CREATE TABLE IF NOT EXISTS Types (
  TypeID int NOT NULL AUTO_INCREMENT,
  Value varchar(50) NOT NULL, 
  IsActive BOOLEAN DEFAULT '1',
  PRIMARY KEY (TypeID)
  );`;

// Returns array of TypeIDs
exports.FindIDByValues = async function({ Values }) {
  const rows = await DB.query(
    "SELECT TypeID FROM Types WHERE Value IN ? AND IsActive=1",
    [[Values]]
  );

  return rows.map(row => {
    return row.TypeID;
  });
};

/** @description Grab all the types of sauces available
 *  @returns {Promise}
 *  @resolves {String[]} array of types
 */
exports.FindTypes = async function() {
  const rows = await DB.query("SELECT Value FROM Types WHERE IsActive = 1");

  if (!rows) {
    throw new Error("Error finding types of sauces.");
  }

  return rows.map(row => {
    return row.Value;
  });
};
