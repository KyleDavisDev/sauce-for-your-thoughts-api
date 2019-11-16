const moment = require("moment");
const slug = require("slugs"); // Hi there! How are you! --> hi-there-how-are-you
const Hashids = require("hashids");
require("dotenv").config({ path: "variables.env" });

const DB = require("../db/db.js");
const TypesDB = require("./Types.js");
const Users = require("./Users.js");
const Sauces_Types = require("./Sauces_Types.js");

// Constants
const MAX_RELATED_COUNT = 5; // Number of 'related' sauces to return
const MAX_NEW_REVIEW_COUNT = 6; // Number of sauces to return that have recently been reviewed
const MAX_FEATURED_COUNT = 10; // Number of 'featured' sauces
const HASH_LENGTH = 10;

exports.SaucesTableStructure = `CREATE TABLE Sauces (
  SauceID int(11) NOT NULL AUTO_INCREMENT,
  UserID int(11) NOT NULL,
  Name varchar(100) NOT NULL,
  Maker varchar(100) NOT NULL,
  Slug varchar(150) NOT NULL,
  Description varchar(1000) NOT NULL,
  Created bigint(20) unsigned DEFAULT NULL,
  Photo varchar(100) DEFAULT NULL,
  Country varchar(100) DEFAULT NULL,
  State varchar(100) DEFAULT NULL,
  City varchar(100) DEFAULT NULL,
  SHU varchar(20) DEFAULT NULL,
  Ingredients varchar(1000) DEFAULT NULL,
  IsActive tinyint(1) DEFAULT '1',
  AdminApproved tinyint(1) DEFAULT '0',
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
  // Going to figure out what our slug is first
  const Created = moment().unix();
  // Create unique salt
  const salt = UserID + "." + process.env.SECRET + "." + Created;
  // Generate algo w/ salt and set min length
  const hashids = new Hashids(salt, HASH_LENGTH);
  // Generate unique hash
  const hash = hashids.encode(UserID);
  // Use unique hash as slug
  const Slug = hash;

  // Finally create insert object
  const values = {
    UserID,
    Name: Name.trim(),
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
    Created
  };

  // Finally insert complete record into DB
  const result = await DB.query("INSERT INTO Sauces SET ?", values);
  const SauceID = result.insertId;

  // Check if we need to insert into Sauces_Types table now too
  if (Types && Types.length > 0) {
    // First need to grab IDs of the TypeIDs
    const TypeIDs = await TypesDB.FindIDByValues({ Values: Types });

    const Record = TypeIDs.map(TypeID => {
      return [SauceID, TypeID];
    });
    await Sauces_Types.Insert({ Record });
  }

  // return Slug
  return Slug;
};

/** @description Returns Sauce object w/ Users DisplayName
 */
exports.FindSauceBySlug = async function({ Slug }) {
  const rows = await DB.query(
    `
    SELECT
      MAX(Sauces.Photo) AS "Sauces.Photo",
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
      MAX(Sauces.AdminApproved) AS "Sauces.AdminApproved",
      MAX(Users.DisplayName) AS "Users.DisplayName",
      MAX(Users.Created) AS "Users.Created",
      GROUP_CONCAT('', Types.Value) AS "Sauces.Types"
    FROM
      Sauces
    INNER JOIN
      Users ON Users.UserID = Sauces.UserID
    LEFT JOIN
      Sauces_Types ON Sauces_Types.SauceID = Sauces.SauceID
    LEFT JOIN
      Types ON Sauces_Types.TypeID = Types.TypeID
    WHERE
      Sauces.Slug = ?
      AND Sauces.IsActive = 1
      AND Users.IsActive = 1
    GROUP BY Slug
    `,
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
    types: rows[0]["Sauces.Types"] ? rows[0]["Sauces.Types"].split(",") : null,
    isAdminApproved: rows[0]["Sauces.AdminApproved"]
  };

  // Return Sauce
  return sauce;
};

/** @description Return single SauceID */
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

/** @description Return single Slug
 */
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

/** @description Return related sauce names and slugs
 */
exports.FindRelated = async function({ Slug }) {
  // TODO: Get related to slug but for now choose randomly
  const rows = await DB.query(
    `SELECT Name AS name,
     Slug AS slug
      FROM Sauces
      WHERE IsActive = 1 AND AdminApproved = 1 AND IsPrivate = 0
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

/** @description Returns array of sauces that have had reviews recently added to them
 */
exports.getSaucesWithNewestReviews = async function() {
  const rows = await DB.query(
    `SELECT DISTINCT Sauces.Name AS name,
     Sauces.Slug AS slug 
    FROM Reviews 
    LEFT JOIN Sauces ON Reviews.SauceID = Sauces.SauceID
    ORDER BY Reviews.Updated DESC, Reviews.Created DESC
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
 *  @param {Object=} params - Object of possible params
 *  @param {String=} params.type - type of sauce to filter by
 *  @param {String} params.order - How to order the returned array
 *  @param {Number=} params.limit - Number per page
 *  @param {Number=} params.page - Which page
 *  @param {Boolean=} includeTotal - determines whether or not to include total amount
 *  @returns {Promise} Promise object that returns array of sauces
 *  @resolves {Object[]} sauce - array of sauce objects w/ basic info
 *  @resolves {Number=} total - how many possible sauces match the specific query
 *
 *  @reject {String} error message
 */
exports.FindSaucesByQuery = async function({ params, includeTotal = false }) {
  // set page if one wasn't passed
  if (!params.page) {
    params.page = 1;
  }

  // Set limit if one wasn't passed
  if (!params.limit) {
    params.limit = 8;
  }

  // Init query obj
  const query = {};
  if (params.type === "all") {
    query.where = "1=1";
  } else {
    query.where = `Types.Value LIKE '${params.type}'`;
  }

  if (params.srch) {
    query.where += ` && Sauces.Name LIKE '%${params.srch}%'`;
  }

  switch (params.order) {
    case "name":
      query.order = "Sauces.Name ASC";
      break;
    case "times reviewed":
      query.order = "NumberOfReviews DESC";
      break;
    case "newest":

    default:
      query.order = "Sauces.Created DESC";
      break;
  }

  // Number of records per page
  query.limit = params.limit > 0 ? params.limit : 8;

  query.offset = (params.page - 1) * params.limit;

  // Abstract query out since we may need to use it a second time
  query.query = `SELECT DISTINCT SQL_CALC_FOUND_ROWS
  Sauces.Name as name,
  Sauces.ReviewCount as numberOfReviews,
  Sauces.Description as description,
  Sauces.Maker as maker,  
  Sauces.Slug as slug,
  Sauces.Photo as photo,
  Sauces.Created as created
  FROM Sauces 
  LEFT JOIN Sauces_Types ON Sauces_Types.SauceID = Sauces.SauceID
  LEFT JOIN Types ON Sauces_Types.TypeID = Types.TypeID
  LEFT JOIN Reviews ON Reviews.SauceID = Sauces.SauceID
  WHERE ${query.where} AND Sauces.IsActive = 1 AND Sauces.AdminApproved = 1
  ORDER BY ${query.order}
  LIMIT ${query.limit}
  OFFSET ?`;

  // Create connection -- Need to be sure to release connection
  let conn = await DB.getConnection();
  // Get sauces
  let sauces = await conn.query(query.query, [query.offset]);

  // If nothing found, we will simply not offset and return from the 'beginning'
  if (sauces.length === 0) {
    sauces = await DB.query(query.query, [0]);
  }

  if (!sauces) {
    throw new Error(
      "Could not find the appropriate information for the sauces. Please try again"
    );
  }

  if (includeTotal) {
    // Find out how many rows total were eligible to be found (Before LIMIT was applied)
    const total = await conn.query("SELECT FOUND_ROWS() as total").then(res => {
      return res[0].total;
    });

    // Release connection
    conn.release();

    return { sauces, total };
  } else {
    // Release connection
    conn.release();
    return { sauces };
  }
};

/** @description Returns array of sauces that have had reviews recently added to them
 */
exports.FindTotal = async function() {
  const rows = await DB.query(
    `SELECT
      COUNT(*) AS Count
    FROM
      Sauces
    WHERE
      IsActive=1 && IsPrivate = 0 && AdminApproved = 1`
  );

  if (!rows) {
    throw new Error(
      "Could not find any sauce to count or something went wrong!"
    );
  }

  // Return count or zero
  return rows[0].Count ? rows[0].Count : 0;
};

/** @description Inc or Dec review count
 */
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

/** @description Find all unapproved sauces
 *  @returns array of sauce objects
 */
exports.GetUnappoved = async function() {
  const rows = await DB.query(
    `SELECT
      MAX(Sauces.Photo) AS "Photo",
      MAX(Sauces.SauceID) AS "SauceID",
      MAX(Sauces.Name) AS "Name",
      MAX(Sauces.Maker) AS "Maker",
      MAX(Sauces.SHU) AS "SHU",
      MAX(Sauces.Country) AS "Country",
      MAX(Sauces.City) AS "City",
      MAX(Sauces.State) AS "State",
      MAX(Sauces.Description) AS "Description",
      MAX(Sauces.Created) AS "Created",
      MAX(Sauces.Slug) AS "Slug",
      MAX(Sauces.Ingredients) AS "Ingredients",
      MAX(Users.DisplayName) AS "DisplayName",
      GROUP_CONCAT(' ', Types.Value) AS "Types"
    FROM
      Sauces
    INNER JOIN
      Users ON Users.UserID = Sauces.UserID
    LEFT JOIN
      Sauces_Types ON Sauces_Types.SauceID = Sauces.SauceID
    LEFT JOIN
      Types ON Sauces_Types.TypeID = Types.TypeID
    WHERE
      Sauces.IsActive = 1
      && Sauces.AdminApproved = 0
    GROUP BY
      Slug`
  );

  if (!rows) {
    throw new Error("Could not execute query. Try again.");
  }

  return rows;
};

/** @description Find featured sauces
 */
exports.FindFeatured = async function() {
  const rows = await DB.query(
    `SELECT DISTINCT 
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
  WHERE Sauces.IsActive = 1 AND AdminApproved = 1
  GROUP BY Sauces.SauceID, Sauces.Name, Sauces.Description, Sauces.Maker, Sauces.Slug
  ORDER BY RAND()
  LIMIT ?`,
    [MAX_FEATURED_COUNT]
  );

  if (!rows) {
    throw new Error(
      "Could not find the appropriate information for this sauce. Please try again"
    );
  }

  return rows;
};

/** @description Toggle a sauce's approval
 *  @param {String} SauceID - unique sauce id
 *  @param {Boolean} Toggle - whether sauce should be enabled or disabled
 *  @returns {Boolean} Whether update worked or not
 */
exports.ToggleSauceApproval = async function({ SauceID, Toggle }) {
  // Sanity check
  if (!SauceID || Toggle === undefined || Toggle === null) {
    throw new Error(
      "Must provide required parameters to ToggleSauceApproval method"
    );
  }

  let query;

  if (Toggle) {
    query = `
      UPDATE
        Sauces
      SET
        AdminApproved = 1
      WHERE 
        SauceID = ?
        AND IsActive = 1
      `;
  } else {
    query = `
      UPDATE
        Sauces
      SET
        AdminApproved = 0,
        IsActive = 0
      WHERE 
        SauceID = ?
    `;
  }

  const rows = await DB.query(query, [SauceID]);

  if (!rows) {
    throw new Error(
      "Could not find the appropriate information for this sauce. Please try again"
    );
  }

  console.log(rows);

  return rows && rows.affectedRows === 1;
};

/** @description Check to see if a sauce is editable by user.
 *  @param {String} UserID - unique user id
 *  @param {String} Slug - unique sauce id
 *  @returns {Boolean} Whether user is eligible to edit or not.
 */
exports.CanUserEditSauce = async function({ UserID, Slug }) {
  // Sanity check
  if (!UserID || !Slug) {
    throw new Error(
      "Must provide required parameters to CanUserEditSauce method"
    );
  }

  const row = await DB.query(
    `
      SELECT
        COUNT(*) AS COUNT
      FROM
        Sauces
      WHERE
        UserID = ?
        AND Slug = ?
        AND IsPrivate = 1
        AND IsActive = 1
    `,
    [UserID, Slug]
  );

  if (!row) {
    throw new Error(
      "Could not find the appropriate information for this sauce. Please try again"
    );
  }

  return row && row[0] && row[0].COUNT === 1;
};

/** @description Update sauce
 *  @param {String} UserID - unique user id
 *  @param {String} Slug - unique sauce slug
 *  @param {String} Name - name of the sauce
 *  @param {String} Maker - who made the sauce
 *  @param {String} Description - description of sauce
 *  @param {String} Ingredients - list of ingredients
 *  @param {String} SHU - spiciness of sauce
 *  @param {String} State - state where sauce is created
 *  @param {String} Country - country where sauce is created
 *  @param {String} City - city where sauce is created
 *  @param {String} Photo - URL for sauce photo
 *  @param {String[]} Types - what type of sauce it is
 *  @returns {Boolean} Whether user is eligible to edit or not.
 */
exports.UpdateSauce = async function({
  UserID,
  Slug,
  Name,
  Maker,
  Description,
  Ingredients,
  SHU,
  State,
  Country,
  City,
  Photo,
  Types
}) {
  // Sanity check
  if (!Slug || !Name || !Maker || !Description || !Ingredients) {
    throw new Error("Must provide required parameters to UpdateSauce method");
  }

  // IF user is an admin, they will also be able to update the sauce
  const isAdmin = await Users.IsAdmin({ UserID });

  const row = await DB.query(
    `
      UPDATE
        Sauces
      LEFT JOIN 
        Users on Users.UserID = Sauces.UserID
      LEFT JOIN
        UserRole on UserRole.UserID = Users.UserID
      LEFT JOIN
        Roles on Roles.RoleID = UserRole.RoleID
      SET
        Sauces.Name = ?,
        Sauces.Maker = ?,
        Sauces.Description = ?,
        Sauces.Ingredients = ?,
        Sauces.SHU = ?,
        Sauces.State = ?,
        Sauces.Country = ?,
        Sauces.City = ?,
        Sauces.Photo = ?
      WHERE
        (Sauces.UserID = ?
           OR 1=${isAdmin ? 1 : 0})
        AND Slug = ?
        AND Sauces.IsPrivate = 0
        AND Sauces.IsActive = 1
        AND Users.IsActive = 1;
    `,
    [
      Name,
      Maker,
      Description,
      Ingredients,
      SHU,
      State,
      Country,
      City,
      Photo,
      UserID,
      Slug
    ]
  );

  // Check if we need to insert into Sauces_Types table now too
  if (Types && Types.length > 0) {
    // First need to grab IDs of the TypeIDs
    const TypeIDs = await TypesDB.FindIDByValues({ Values: Types });

    // Get sauceID from slug
    const SauceID = await exports.FindIDBySlug({ Slug });

    const Record = TypeIDs.map(TypeID => {
      return [SauceID, TypeID];
    });

    await Sauces_Types.Update({ Record });
  }

  if (!row) {
    throw new Error(
      "Could not find the appropriate information for this sauce. Please try again"
    );
  }

  return row && row.affectedRows === 1;
};

/** @description Get SauceID based on uniques
 *  @param {String?} Slug - unique string
 *  @return {Number} SauceID = unique review id
 */
exports.FindSauceIDFromUniques = async function({ Slug }) {
  // Sanity check
  if (!Slug) {
    throw new Error(
      "Must provide required parameters to FindSauceIDFromUniques method"
    );
  }

  const row = await DB.query(
    `
    SELECT
      SauceID
    FROM
      Sauces
    WHERE
      Slug = ?
      `,
    [Slug]
  );

  if (!row || !row[0] || !row[0].SauceID) {
    throw new Error("Could not find a review that matched your hashed id");
  }

  return row[0].SauceID;
};
