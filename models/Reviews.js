const DB = require("../db/db.js");

exports.ReviewsTableStructure = `CREATE TABLE IF NOT EXISTS Reviews (
  ReviewID int NOT NULL AUTO_INCREMENT,
  SauceID int NOT NULL,
  UserID int NOT NULL,
  Created DATETIME DEFAULT CURRENT_TIMESTAMP,
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
  PRIMARY KEY (ReviewID),
  FOREIGN KEY (SauceID) REFERENCES Sauces(SauceID),
  FOREIGN KEY (USERID) REFERENCES Users(UserID)
  );`;

exports.Insert = async function({
  ReviewID,
  SauceID,
  UserID,
  Created,
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
  console.log("I am arguemnets: ", arguments);
  return null;
};
