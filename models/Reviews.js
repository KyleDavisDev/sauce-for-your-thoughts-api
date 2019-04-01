const moment = require("moment");
const Hashids = require("hashids");

const DB = require("../db/db.js");

// constants
const HASH_LENGTH = 10;

exports.ReviewsTableStructure = `CREATE TABLE IF NOT EXISTS Reviews (
  ReviewID int NOT NULL AUTO_INCREMENT,
  SauceID int NOT NULL,
  UserID int NOT NULL,
  Created bigint(20) unsigned DEFAULT NULL,
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
  Note varchar(300),
  IsActive boolean DEFAULT '1',
  HashID varchar(10),
  PRIMARY KEY (ReviewID),
  CONSTRAINT Reviews_Sauces_SauceID FOREIGN KEY (SauceID) REFERENCES Sauces(SauceID),
  CONSTRAINT Reviews_Users_UserID FOREIGN KEY (USERID) REFERENCES Users(UserID)
  );`;

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

  // Need to set a HashID to help obfuscate the ReviewID and for better front-end managment (use HashID in URLs)
  // Will use just-inserted review to get properties to create a unique salt
  const rows = await DB.query(
    "SELECT Created, ReviewID FROM Reviews Where ReviewID = ?",
    [res.insertId]
  );

  // Make sure we can find the review
  if (!rows[0]) {
    throw new Error("Error trying to save review. Please try again.");
  }

  // Grab review
  const review = rows[0];

  // Create unique salt
  const salt = "" + review.Created + "." + review.ReviewID + "." + UserID;
  // Generate algo w/ salt and set min length
  const hashids = new Hashids(salt, HASH_LENGTH);
  // Generate hash
  const HashID = hashids.encode(review.ReviewID);

  // Update record
  const results = await DB.query(
    "UPDATE Reviews Set HashID = ? WHERE ReviewID = ?",
    [HashID, review.ReviewID]
  );

  if (!results) {
    throw new Error("Error saving review. Please try again.");
  }

  return results;
};

// Returns array of reviews w/ Users DisplayName
exports.FindReviewsBySauceID = async function({ SauceID }) {
  const rows = await DB.query(
    `SELECT Reviews.HashID
      Reviews.LabelRating, Reviews.LabelDescription,
      Reviews.AromaRating, Reviews.AromaDescription,
      Reviews.TasteRating, Reviews.TasteDescription,
      Reviews.HeatRating, Reviews.HeatDescription,
      Reviews.OverallRating, Reviews.OverallDescription,
      Reviews.Note, Reviews.Created,
      Users.DisplayName
      FROM Reviews
      JOIN Users ON Reviews.UserID = Users.UserID
      WHERE Reviews.IsActive = 1 AND Reviews.SauceID = ?`,
    [SauceID]
  );

  if (!rows) {
    throw new Error(
      "Could not find any reviews for this sauce. Be the first to submit one!"
    );
  }

  return rows;
};
