const moment = require("moment");
const slug = require("slugs"); // Hi there! How are you! --> hi-there-how-are-you

const DB = require("../db/db.js");
const TypesDB = require("./Types.js");
const Sauces_Types = require("./Sauces_Types.js");

// Constants
const MAX_RELATED_COUNT = 5; // Number of 'related' sauces to return
const MAX_NEW_REVIEW_COUNT = 6; // Number of sauces to return that have recently been reviewed

exports.SaucesTableStructure = `CREATE TABLE Sauces (
  SauceID int(11) NOT NULL AUTO_INCREMENT,
  UserID int(11) NOT NULL,
  Name varchar(100) NOT NULL,
  Maker varchar(100) NOT NULL,
  Slug varchar(150) NOT NULL,
  Description varchar(300) NOT NULL,
  Created bigint(20) unsigned DEFAULT NULL,
  Photo varchar(100) DEFAULT NULL,
  Country varchar(100) DEFAULT NULL,
  State varchar(100) DEFAULT NULL,
  City varchar(100) DEFAULT NULL,
  SHU varchar(20) DEFAULT NULL,
  Ingredients varchar(300) DEFAULT NULL,
  IsActive tinyint(1) DEFAULT '1',
  IsPrivate tinyint(1) NOT NULL DEFAULT '0',
  ReviewCount int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (SauceID),
  KEY Sauces_Users_UserID (UserID)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=latin1;`;

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
    GROUP_CONCAT('', Types.Value) AS "Sauces.Types"
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
    types: rows[0]["Sauces.Types"] ? rows[0]["Sauces.Types"].split(",") : null
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

  return rows[0] ? rows[0].SauceID : undefined;
};

// Return single Slug
exports.FindSlugByID = async function({ SauceID }) {
  const rows = await DB.query(
    "SELECT Slug from Sauces WHERE SauceID = ? AND IsActive = 1",
    [SauceID]
  );

  if (!rows) {
    throw new Error(
      "Could not find the appropriate information for this sauce. Please try again"
    );
  }

  return rows[0].Slug;
};

// Return related sauce names and slugs
exports.FindRelated = async function({ Slug }) {
  // TODO: Get related to slug but for now choose randomly
  const rows = await DB.query(
    `SELECT Name AS name,
     Slug AS slug
      FROM Sauces
      WHERE IsActive = 1 AND IsPrivate = 0
      ORDER BY RAND()
      LIMIT ?`,
    [MAX_RELATED_COUNT]
  );

  if (!rows) {
    throw new Error(
      "Could not find the appropriate information for this sauce. Please try again"
    );
  }

  return rows;
};

// Returns array of sauces that have had reviews recently added to them
exports.getSaucesWithNewestReviews = async function() {
  const rows = await DB.query(
    `SELECT Sauces.Name AS name,
     Sauces.Slug AS slug 
    FROM Reviews 
    LEFT JOIN Sauces ON Reviews.SauceID = Sauces.SauceID
    ORDER BY Reviews.Created DESC
    LIMIT ?`,
    [MAX_NEW_REVIEW_COUNT]
  );

  if (!rows) {
    throw new Error(
      "Could not find any reviews for this sauce. Be the first to submit one!"
    );
  }

  return rows;
};

/** @description Grab set of sauces from DB
 *  @param {Object} [params] - Object of possible params
 *  @param {String} [params.type] - type of sauce to filter by
 *  @param {String} [params.order] - How to order the returned array
 *  @param {Number?} [params.limit] - Number per page
 *  @param {Number?} [params.page] - Which page
 *  @returns {Promise} Promise object that returns array of sauces
 *  @resolves {Object[]} sauce - array of sauce objects w/ basic info
 *
 *  @reject {String} error message
 */
exports.FindSaucesByQuery = async function({ params }) {
  // Init query obj
  const query = {};
  if (params.type === "all") {
    query.where = "1=1";
  } else {
    query.where = `Types.Value LIKE '${params.type}'`;
  }

  switch (params.order) {
    case "name":
      query.order += "Sauces.Name ASC";
      break;
    case "times_reviewed":
      query.order += "NumberOfReviews DESC";
      break;
    case "newest":

    default:
      query.order += "Sauces.Created DESC";
      break;
  }

  // set page if one wasn't passed
  if (!params.page) {
    params.page = 1;
  }

  // Set limit if one wasn't passed
  if (!params.limit) {
    params.limit = 8;
  }

  // Number of records per page
  query.limit = params.limit > 0 ? params.limit : 8;

  // Find the number of Sauce records
  const numRecords = await DB.query("Select COUNT(*) FROM Sauces").then(res => {
    return res.length;
  });

  // Get offset
  query.offset = (Math.ceil(numRecords / params.limit) - 1) * params.page;

  // Abstract query out since we may need to use it a second time
  query.query = `SELECT DISTINCT 
  Sauces.Name as name,
  COUNT(Sauces.SauceID) as numberOfReviews,
  Sauces.Description as description,
  Sauces.Maker as maker,  
  Sauces.Slug as slug,
  Sauces.Photo as photo
  FROM Sauces 
  LEFT JOIN Sauces_Types ON Sauces_Types.SauceID = Sauces.SauceID
  LEFT JOIN Types ON Sauces_Types.TypeID = Types.TypeID
  LEFT JOIN Reviews ON Reviews.SauceID = Sauces.SauceID
  WHERE ? AND Sauces.IsActive = 1
  GROUP BY Sauces.SauceID, Sauces.Name, Sauces.Description, Sauces.Maker, Sauces.Slug
  ORDER BY ?
  LIMIT ?
  OFFSET ?`;

  let rows = await DB.query(query.query, [
    query.where,
    query.order,
    query.limit,
    query.offset
  ]);

  // If nothing found, we will simply not offset and return from the 'beginning'
  if (rows.length === 0) {
    rows = await DB.query(query.query, [
      query.where,
      query.order,
      query.limit,
      0
    ]);
  }

  if (!rows) {
    throw new Error(
      "Could not find the appropriate information for this sauce. Please try again"
    );
  }

  return rows;
};

// Returns array of sauces that have had reviews recently added to them
exports.FindTotal = async function() {
  const rows = await DB.query(
    `SELECT COUNT(*) AS Count
   FROM Sauces
   WHERE IsActive=1 && IsPrivate = 0`,
    [MAX_NEW_REVIEW_COUNT]
  );

  if (!rows) {
    throw new Error(
      "Could not find any sauce to count or something went wrong!"
    );
  }

  // Return count or zero
  return rows[0].Count ? rows[0].Count : 0;
};

// Inc or Dec review count
exports.ToggleReviewCount = async function({ Slug, inc }) {
  let rows;
  if (inc) {
    rows = await DB.query(
      `UPDATE Sauces 
     SET ReviewCount = ReviewCount + 1
     WHERE Slug = ?`,
      [Slug]
    );
  } else {
    rows = await DB.query(
      `UPDATE Sauces 
     SET ReviewCount = ReviewCount - 1
     WHERE Slug = ?`,
      [Slug]
    );
  }

  if (!rows) {
    throw new Error(
      "Could not find any sauce to count or something went wrong!"
    );
  }

  // Return success
  return true;
};
