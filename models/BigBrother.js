const DB = require("../db/db.js");

exports.ReviewsTableStructure = `CREATE TABLE BigBrother (
  BigBrotherID int(11) NOT NULL AUTO_INCREMENT,
  UserID int(11) DEFAULT NULL,
  SauceID int(11) DEFAULT NULL,
  ReviewID int(11) NOT NULL,
  Action varchar(200) NOT NULL DEFAULT '',
  Duration int(11) DEFAULT NULL,
  IP varchar(30) NOT NULL DEFAULT '',
  PRIMARY KEY (BigBrotherID),
  CONSTRAINT BigBrother_ReviewID_Reviews_ReviewID FOREIGN KEY (BigBrotherID) REFERENCES Reviews (ReviewID),
  CONSTRAINT BigBrother_SauceID_Sauces_SauceID FOREIGN KEY (BigBrotherID) REFERENCES Sauces (SauceID),
  CONSTRAINT BigBrother_UserID_Users_UserID FOREIGN KEY (BigBrotherID) REFERENCES Users (UserID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;`;
