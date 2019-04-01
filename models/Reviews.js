const moment = require("moment");

const DB = require("../db/db.js");

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

  const results = await DB.query("INSERT INTO Reviews Set ?", values);

  if (!results) {
    throw new Error("Error saving review. Please try again.");
  }

  return results;
};

// Returns array of reviews w/ Users DisplayName
exports.FindReviewsBySauceID = async function({ SauceID }) {
  const rows = await DB.query(
    `SELECT Reviews.LabelRating, Reviews.LabelDescription,
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
