const moment = require("moment");
const slug = require("slugs"); // Hi there! How are you! --> hi-there-how-are-you

const DB = require("../db/db.js");
const TypesDB = require("./Types.js");
const Sauces_Types = require("./Sauces_Types.js");

exports.SaucesTableStructure = `CREATE TABLE IF NOT EXISTS Sauces (
  SauceID int NOT NULL AUTO_INCREMENT,
  UserID int NOT NULL,
  Name varchar(100) NOT NULL,
  Maker varchar(100) NOT NULL,
  Slug varchar(150) NOT NULL,
  Description varchar(300) NOT NULL,
  Created bigint(20) unsigned DEFAULT NULL,
  Photo varchar(100),
  Country varchar(100),
  State varchar(100),
  City varchar(100),
  SHU varchar(20),
  Ingredients varchar(300),
  IsActive boolean DEFAULT '1',
  IsPrivate boolean DEFAULT '0',
  PRIMARY KEY (SauceID),
  CONSTRAINT Sauces_Users_UserID FOREIGN KEY (UserID) REFERENCES Users(UserID)
  );`;

exports.SaucesDrop = `ALTER TABLE Reviews DROP FOREIGN KEY Reviews_Sauces_SauceID;
  ALTER TABLE Sauces_Types DROP FOREIGN KEY Sauces_Types_Sauces_SauceID; 
  ALTER TABLE Sauces DROP FOREIGN KEY Sauces_Users_UserID;
  DROP TABLE Sauces;`;

exports.Insert = async function({
  UserID,
  Name,
  Maker,
  Description,
  Ingredients,
  SHU,
  State,
  Country,
  City,
  Photo,
  IsPrivate,
  Types
}) {
  // Make every first letter of name upper and rest lower
  const nameToPascalCase = Name.replace(/\b\w+/g, function(s) {
    return s.charAt(0).toUpperCase() + s.substr(1).toLowerCase();
  });

  // Need to first determine what the slug will be by
  // finding how many other sauces share same name
  const rows = await DB.query(
    "SELECT COUNT(*) AS Count FROM Sauces WHERE Name = ?",
    [nameToPascalCase]
  );

  // If no other entires, then we can just slugify the name
  // Otherwise we will concat "-" and add one to count
  // This will make each slug unique
  const Slug =
    rows[0].Count === 0
      ? slug(nameToPascalCase)
      : slug(nameToPascalCase) + "-" + (rows[0].Count + 1);

  // Finally create insert object
  const values = {
    UserID,
    Name: nameToPascalCase,
    Maker,
    Description,
    Ingredients,
    SHU,
    State,
    Country,
    City,
    Photo,
    IsPrivate: IsPrivate === true ? IsPrivate : false,
    Slug,
    Created: moment().unix()
  };

  // Finally insert complete record into DB
  const result = await DB.query("INSERT INTO Sauces SET ?", values);
  const SauceID = result.insertId;

  // Check if we need to insert into Sauces_Types table now too
  if (Types && Types.length > 0) {
    // First need to grab IDs of the TypeIDs
    const TypeIDs = await TypesDB.FindIDByValues({ Values: Types });

    const record = TypeIDs.map(TypeID => {
      return [SauceID, TypeID];
    });
    await Sauces_Types.Insert({ record });
  }

  // return Slug
  return Slug;
};

// Returns Sauce object w/ Users DisplayName
exports.FindSauceBySlug = async function({ Slug }) {
  const rows = await DB.query(
    `SELECT MAX(Sauces.Photo) AS "Sauces.Photo",
    MAX(Sauces.Name) AS "Sauces.Name",
    MAX(Sauces.Maker) AS "Sauces.Maker",
    MAX(Sauces.SHU) AS "Sauces.SHU",
    MAX(Sauces.Country) AS "Sauces.Country",
    MAX(Sauces.City) AS "Sauces.City",
    MAX(Sauces.State) AS "Sauces.State",
    MAX(Sauces.Description) AS "Sauces.Description",
    MAX(Sauces.Created) AS "Sauces.Created",
    MAX(Sauces.Slug) AS "Sauces.Slug",
    MAX(Sauces.Ingredients) AS "Sauces.Ingredients",
    MAX(Users.DisplayName) AS "Users.DisplayName",
    MAX(Users.Created) AS "Users.Created",
    GROUP_CONCAT('', Types.Value) AS "Sauces.Type"
    FROM Sauces
    INNER JOIN Users ON Users.UserID = Sauces.UserID
    LEFT JOIN Sauces_Types ON Sauces_Types.SauceID = Sauces.SauceID
    LEFT JOIN Types ON Sauces_Types.TypeID = Types.TypeID
    WHERE Sauces.Slug = ?
    GROUP BY Slug`,
    [Slug]
  );

  if (!rows || rows.length > 1) {
    throw new Error("Error finding your sauce through it's slug.");
  }

  // Nest returned user in obj to be more JS-like
  const sauce = {
    author: {
      displayName: rows[0]["Users.DisplayName"],
      created: rows[0]["Users.Created"]
    },
    ingredients: rows[0]["Sauces.Ingredients"],
    photo: rows[0]["Sauces.Photo"],
    name: rows[0]["Sauces.Name"],
    maker: rows[0]["Sauces.Maker"],
    shu: rows[0]["Sauces.SHU"],
    country: rows[0]["Sauces.Country"],
    city: rows[0]["Sauces.City"],
    state: rows[0]["Sauces.State"],
    description: rows[0]["Sauces.Description"],
    created: rows[0]["Sauces.Created"],
    slug: rows[0]["Sauces.Slug"],
    type: rows[0]["Sauces.Type"]
  };

  // Return Sauce
  return sauce;
};

// Return single SauceID
exports.FindIDBySlug = async function({ Slug }) {
  const rows = await DB.query(
    "SELECT SauceID from Sauces WHERE Slug = ? AND IsActive = 1",
    [Slug]
  );

  if (!rows) {
    throw new Error(
      "Could not find the appropriate information for this sauce. Please try again"
    );
  }

  return rows[0].SauceID;
};
