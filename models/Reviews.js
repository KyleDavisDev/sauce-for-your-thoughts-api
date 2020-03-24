const moment = require("moment");
const Hashids = require("hashids");
require("dotenv").config({ path: "variables.env" });

const DB = require("../db/db.js");
const Sauces = require("../models/Sauces");

// constants
const HASH_LENGTH = 10;

exports.ReviewsTableStructure = `CREATE TABLE Reviews (
  ReviewID int(11) NOT NULL AUTO_INCREMENT,
  SauceID int(11) NOT NULL,
  UserID int(11) NOT NULL,
  HashID varchar(10) DEFAULT NULL,
  Created bigint(20) unsigned DEFAULT NULL,
  Updated bigint(20) unsigned DEFAULT NULL,
  LabelRating int NOT NULL CHECK (LabelRating > -1 AND LabelRating < 6),
  LabelDescription varchar(300),
  AromaRating int NOT NULL CHECK (AromaRating > -1 AND AromaRating < 6),
  AromaDescription varchar(300),
  TasteRating int NOT NULL CHECK (TasteRating > -1 AND TasteRating < 6),
  TasteDescription varchar(300),
  HeatRating int NOT NULL CHECK (HeatRating > -1 AND HeatRating < 6),
  HeatDescription varchar(300),
  OverallRating int NOT NULL CHECK (OverallRating > -1 AND OverallRating < 6),
  OverallDescription varchar(300) NOT NULL,
  Note varchar(300) DEFAULT NULL,
  IsActive tinyint(1) DEFAULT '1',
  PRIMARY KEY (SauceID,UserID),
  KEY Reviews_Users_UserID (UserID),
  KEY ReviewID (ReviewID),
  CONSTRAINT Reviews_Sauces_SauceID FOREIGN KEY (SauceID) REFERENCES Sauces (SauceID),
  CONSTRAINT Reviews_Users_UserID FOREIGN KEY (UserID) REFERENCES Users (UserID)
) ENGINE=InnoDB AUTO_INCREMENT=38 DEFAULT CHARSET=latin1;`;

// Returns insert results
exports.Insert = async function({
  UserID,
  SauceID,
  LabelRating,
  LabelDescription,
  AromaRating,
  AromaDescription,
  TasteRating,
  TasteDescription,
  HeatRating,
  HeatDescription,
  OverallRating,
  OverallDescription,
  Note
}) {
  // Finally create insert object
  const values = {
    UserID,
    SauceID,
    LabelRating,
    LabelDescription,
    AromaRating,
    AromaDescription,
    TasteRating,
    TasteDescription,
    HeatRating,
    HeatDescription,
    OverallRating,
    OverallDescription,
    Note,
    Created: moment().unix()
  };

  const res = await DB.query("INSERT INTO Reviews Set ?", values);

  // Make sure review inserted
  if (!res) {
    throw new Error("Error saving review. Please try again.");
  }

  // Need to set a HashID to create SEO/URL friendly string
  // Will use just-inserted record for properties to create a unique salt
  const salt = values.SauceID + "." + values.UserID + "." + process.env.SECRET;
  // Generate algo w/ salt and set min length
  const hashids = new Hashids(salt, HASH_LENGTH);
  // Generate hash
  const HashID = hashids.encode(values.SauceID, values.UserID);

  // Update record
  const results = await DB.query(
    "UPDATE Reviews Set HashID = ? WHERE SauceID = ? && UserID = ?",
    [HashID, values.SauceID, values.UserID]
  );

  if (!results) {
    throw new Error("Error saving review. Please try again.");
  }

  // Increase sauce review count
  const Slug = await Sauces.FindSlugByID({ SauceID });
  await Sauces.ToggleReviewCount({ Slug, inc: true });

  return res;
};

// Returns insert results
exports.Update = async function({
  UserID,
  SauceID,
  LabelRating,
  LabelDescription,
  AromaRating,
  AromaDescription,
  TasteRating,
  TasteDescription,
  HeatRating,
  HeatDescription,
  OverallRating,
  OverallDescription,
  Note
}) {
  const Updated = moment().unix();
  const res = await DB.query(
    `UPDATE Reviews
      SET
        LabelRating = ?,
        LabelDescription = ?,
        AromaRating = ?,
        AromaDescription = ?,
        TasteRating = ?,
        TasteDescription = ?,
        HeatRating = ?,
        HeatDescription = ?,
        OverallRating = ?,
        OverallDescription = ?,
        Note = ?,
        Updated = ?
      WHERE
        SauceID = ? AND UserID = ?`,
    [
      LabelRating,
      LabelDescription,
      AromaRating,
      AromaDescription,
      TasteRating,
      TasteDescription,
      HeatRating,
      HeatDescription,
      OverallRating,
      OverallDescription,
      Note,
      Updated,
      SauceID,
      UserID
    ]
  );

  // Make sure review inserted
  if (!res) {
    throw new Error("Error saving review. Please try again.");
  }

  return res;
};

// Returns array of reviews w/ Users DisplayName
exports.FindReviewsBySauceID = async function({ SauceID, UserID }) {
  var matchUserID = UserID ? `User.UserID = ${UserID}` : "1=1";

  const rows = await DB.query(
    `SELECT Reviews.HashID AS "Reviews.ReviewID",
      Reviews.LabelRating AS "Reviews.LabelRating",
      Reviews.LabelDescription AS "Reviews.LabelDescription",
      Reviews.AromaRating AS "Reviews.AromaRating",
      Reviews.AromaDescription AS "Reviews.AromaDescription",
      Reviews.TasteRating AS "Reviews.TasteRating",
      Reviews.TasteDescription AS "Reviews.TasteDescription",
      Reviews.HeatRating AS "Reviews.HeatRating",
      Reviews.HeatDescription AS "Reviews.HeatDescription",
      Reviews.OverallRating AS "Reviews.OverallRating",
      Reviews.OverallDescription AS "Reviews.OverallDescription",
      Reviews.Note AS "Reviews.Note",
      ( CASE
        WHEN Reviews.Updated IS NULL THEN Reviews.Created 
        ELSE Reviews.Updated
      END ) AS "Reviews.Created",
      Users.DisplayName AS "Users.DisplayName",
      Users.Created AS "Users.Created",
      Avatars.URL AS "Users.AvatarURL"
    FROM
      Reviews
    JOIN
      Users ON Reviews.UserID = Users.UserID
    JOIN 
      Avatars ON Users.AvatarID = Avatars.AvatarID
    WHERE
      Reviews.IsActive = 1
      AND Avatars.IsActive = 1
      AND Reviews.SauceID = ?
      AND ?`,
    [SauceID, matchUserID]
  );

  if (!rows) {
    throw new Error(
      "Could not find any reviews for this sauce. Be the first to submit one!"
    );
  }

  // Turn the flat rows into a rows w/ nesting
  const JSFriendlyArr = rows.map(row => {
    return {
      reviewID: row["Reviews.ReviewID"],
      created: row["Reviews.Created"],
      author: {
        displayName: row["Users.DisplayName"],
        created: row["Users.Created"],
        avatarURL: row["Users.AvatarURL"]
      },
      label: {
        rating: row["Reviews.LabelRating"],
        txt: row["Reviews.LabelDescription"]
      },
      aroma: {
        rating: row["Reviews.AromaRating"],
        txt: row["Reviews.AromaDescription"]
      },
      taste: {
        rating: row["Reviews.TasteRating"],
        txt: row["Reviews.TasteDescription"]
      },
      heat: {
        rating: row["Reviews.HeatRating"],
        txt: row["Reviews.HeatDescription"]
      },
      overall: {
        rating: row["Reviews.OverallRating"],
        txt: row["Reviews.OverallDescription"]
      },
      note: { txt: row["Reviews.Note"] }
    };
  });

  return JSFriendlyArr;
};

/** @description Find a single review from DB
 *  @param {Number?} SauceID - unique sauce id
 *  @param {Number?} UserID - unique user id
 *  @param {ReviewID?} ReviewID - unique Review id
 *  @return {Object} review
 */
exports.FindSingleReview = async function({ SauceID, UserID, ReviewID }) {
  try {
    // Sanity check. Must have either (SauceID AND UserID) OR ReviewID
    if (!(!!SauceID && !!UserID) && !ReviewID) {
      throw new Error(
        "Must provide required parameters to FindSingleReview method"
      );
    }

    const row = await DB.query(
      `
    SELECT
      Reviews.HashID AS "Reviews.ReviewID",
      Reviews.LabelRating AS "Reviews.LabelRating",
      Reviews.LabelDescription AS "Reviews.LabelDescription",
      Reviews.AromaRating AS "Reviews.AromaRating",
      Reviews.AromaDescription AS "Reviews.AromaDescription",
      Reviews.TasteRating AS "Reviews.TasteRating",
      Reviews.TasteDescription AS "Reviews.TasteDescription",
      Reviews.HeatRating AS "Reviews.HeatRating",
      Reviews.HeatDescription AS "Reviews.HeatDescription",
      Reviews.OverallRating AS "Reviews.OverallRating",
      Reviews.OverallDescription AS "Reviews.OverallDescription",
      Reviews.Note AS "Reviews.Note",
      ( CASE
        WHEN Reviews.Updated IS NULL THEN Reviews.Created 
        ELSE Reviews.Updated
      END ) AS "Reviews.Created",
      Users.DisplayName AS "Users.DisplayName",
      Users.Created AS "Users.Created"
    FROM
      Reviews
    LEFT JOIN
      Users ON Reviews.UserID = Users.UserID
    LEFT JOIN
      Sauces ON Reviews.SauceID = Sauces.SauceID
    WHERE
      Reviews.IsActive = 1
      AND Sauces.IsActive = 1
      AND (
            (Reviews.SauceID = ? AND Reviews.UserID = ?)
            OR Reviews.ReviewID = ?
          )`,
      [SauceID, UserID, ReviewID]
    );

    if (!row) {
      throw new Error(
        "Could not find any reviews for this sauce. Be the first to submit one!"
      );
    }

    return {
      reviewID: row[0]["Reviews.ReviewID"],
      created: row[0]["Reviews.Created"],
      author: {
        displayName: row[0]["Users.DisplayName"],
        created: row[0]["Users.Created"],
        avatarURL: row[0]["Users.AvatarURL"]
      },
      label: {
        rating: row[0]["Reviews.LabelRating"],
        txt: row[0]["Reviews.LabelDescription"]
      },
      aroma: {
        rating: row[0]["Reviews.AromaRating"],
        txt: row[0]["Reviews.AromaDescription"]
      },
      taste: {
        rating: row[0]["Reviews.TasteRating"],
        txt: row[0]["Reviews.TasteDescription"]
      },
      heat: {
        rating: row[0]["Reviews.HeatRating"],
        txt: row[0]["Reviews.HeatDescription"]
      },
      overall: {
        rating: row[0]["Reviews.OverallRating"],
        txt: row[0]["Reviews.OverallDescription"]
      },
      note: { txt: row[0]["Reviews.Note"] }
    };
  } catch (err) {
    // relay error message to previous catch
    throw new Error(err.message);
  }
};

/** @description Check to see if user has submitted a review for specific sauce
 *  @param {Number} SauceID - unique sauce id
 *  @param {Number} UserID - unique user id
 *
 *  @return {Boolean}
 */
exports.HasUserSubmittedReview = async function({ SauceID, UserID }) {
  // Sanity check
  if (!SauceID || !UserID) {
    throw new Error(
      "Must provide required parameters to HasUserSubmittedReview method"
    );
  }

  const row = await DB.query(
    `
    SELECT
      COUNT(*) AS COUNT
    FROM
      Reviews
    WHERE
      Reviews.SauceID = ?
      AND Reviews.UserID = ?
      `,
    [SauceID, UserID]
  );

  return row && row[0] && row[0].COUNT === 1;
};

/** @description Get ReviewID based on unique values
 *  @param {String?} HashID - unique hashid
 *  @param {String?} SauceID - unique sauce id
 *  @param {String?} UserID - unique user id
 *  @return {Number} ReviewID = unique review id
 */
exports.FindReviewIDFromUniques = async function({ HashID, SauceID, UserID }) {
  // Sanity check
  if (!HashID && !(SauceID || UserID)) {
    throw new Error(
      "Must provide required parameters to FindReviewIDFromUniques method"
    );
  }

  const row = await DB.query(
    `
    SELECT
      ReviewID
    FROM
      Reviews
    WHERE
      HashID = ?
      OR (
        SauceID = ? AND UserID = ?
      )
      `,
    [HashID, SauceID, UserID]
  );

  if (!row || !row[0] || !row[0].ReviewID) {
    throw new Error("Could not find a review that matched your hashed id");
  }

  return row[0].ReviewID;
};
