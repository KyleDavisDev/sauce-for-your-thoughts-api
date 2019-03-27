const DB = require("../db/db.js");
const TypesDB = require("./Types.js");
const slug = require("slugs"); // Hi there! How are you! --> hi-there-how-are-you

exports.SaucesTableStructure = `CREATE TABLE IF NOT EXISTS Sauces (
  SauceID int NOT NULL AUTO_INCREMENT,
  UserID int NOT NULL,
  Name varchar(100) NOT NULL,
  Maker varchar(100) NOT NULL,
  Slug varchar(150) NOT NULL,
  Description varchar(300) NOT NULL,
  Created DATETIME DEFAULT CURRENT_TIMESTAMP,
  Photo varchar(100),
  Country varchar(100),
  State varchar(100),
  City varchar(100),
  SHU varchar(20),
  Ingrediants varchar(300),
  IsActive boolean DEFAULT '1',
  IsPrivate boolean DEFAULT '0',
  PRIMARY KEY (SauceID),
  FOREIGN KEY (UserID) REFERENCES Users(UserID)
  );`;

exports.Insert = function(
  {
    UserID,
    Name,
    Maker,
    Description,
    Ingrediants,
    SHU,
    State,
    Country,
    City,
    Photo,
    IsPrivate,
    Types
  },
  cb
) {
  // Make every first letter of name upper and rest lower
  const nameToPascalCase = Name.replace(/\b\w+/g, function(s) {
    return s.charAt(0).toUpperCase() + s.substr(1).toLowerCase();
  });
  // Need to first determine what the slug will be by
  // finding how many other sauces share same name
  DB.query(
    "SELECT COUNT(*) AS Count FROM Sauces WHERE Name = ?",
    [nameToPascalCase],
    function(err, rows) {
      // If no other entires, then we can just slugify the name
      // Otherwise we will concat "-" and add one to count
      const Slug =
        rows[0].Count === 0
          ? slug(nameToPascalCase)
          : slug(nameToPascalCase) + "-" + (rows[0].Count + 1);

      // Create insert object
      const values = {
        UserID,
        Name: nameToPascalCase,
        Maker,
        Description,
        Ingrediants,
        SHU,
        State,
        Country,
        City,
        Photo,
        IsPrivate,
        Slug
      };

      DB.get().query("INSERT INTO Sauces SET ?", values, function(err, res) {
        // If err, get out
        if (err) return cb(err);

        console.log("res: ", res);

        // Need to insert into Sauces_Types table now too
        // First need to grab IDs of the TypeIDs
        TypesDB.FindIDByValues({ Values: Types }, function(err, result) {
          // If err, get out
          if (err) return cb(err);

          console.log("result: ", result);

          // Else return results
          cb(null, result);
        });
      });
    }
  );
};
