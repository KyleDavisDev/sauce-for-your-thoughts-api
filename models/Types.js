var db = require("../db/db.js");

exports.TypesTableStructure = `CREATE TABLE IF NOT EXISTS Types (
  TypeID int NOT NULL AUTO_INCREMENT,
  Value varchar(50) NOT NULL, 
  IsActive BOOLEAN DEFAULT '1'
  PRIMARY KEY (TypeID)
  );`;

exports.FindIDByValues = function({ Values }, cb) {
  const returnIDs = [];

  // Values.forEach(val => {
  db.get().query(
    "SELECT TypeID FROM Types WHERE IsActive = 1 AND Value IN ?",
    [Values],
    function(err, results) {
      if (err) return cb(err);

      console.log(results);

      return cb(null, results);
    }
  );
  // });
};
