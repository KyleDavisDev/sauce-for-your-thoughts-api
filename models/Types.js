var DB = require("../db/db.js");

exports.TypesTableStructure = `CREATE TABLE IF NOT EXISTS Types (
  TypeID int NOT NULL AUTO_INCREMENT,
  Value varchar(50) NOT NULL, 
  IsActive BOOLEAN DEFAULT '1'
  PRIMARY KEY (TypeID)
  );`;

// Returns array of TypeIDs
exports.FindIDByValues = async function({ Values }) {
  const rows = await DB.query("SELECT TypeID FROM Types WHERE Value IN ?", [
    [Values]
  ]);

  return rows.map(row => row.TypeID);
};
