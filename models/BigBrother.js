const DB = require("../db/db.js");
const moment = require("moment");

exports.ReviewsTableStructure = `CREATE TABLE BigBrother (
  BigBrotherID int(11) NOT NULL AUTO_INCREMENT,
  UserID int(11) NULL,
  SauceID int(11) NULL,
  ReviewID int(11) NULL,
  Action varchar(200) NOT NULL DEFAULT '',
  StartDate bigint(20) NOT NULL,
  IP varchar(30) NOT NULL DEFAULT '',
  EndDate bigint(20) DEFAULT NULL,
  PRIMARY KEY (BigBrotherID),
  CONSTRAINT BigBrother_ReviewID_Reviews_ReviewID FOREIGN KEY (ReviewID) REFERENCES Reviews (ReviewID),
  CONSTRAINT BigBrother_SauceID_Sauces_SauceID FOREIGN KEY (SauceID) REFERENCES Sauces (SauceID),
  CONSTRAINT BigBrother_UserID_Users_UserID FOREIGN KEY (UserID) REFERENCES Users (UserID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;`;

/** @description Insert record into database.
 *  @param {Number?} UserID - user id
 *  @param {Number?} SauceID - sauce id
 *  @param {Number?} ReviewID - review id
 *  @param {String} Action - what is happening
 *  @param {String} IP - IP used to make request
 *  @return {Number} inserted row id
 */
exports.Insert = async function({
  UserID = null,
  SauceID = null,
  ReviewID = null,
  Action,
  IP
}) {
  // Throw error if not all info is available.
  if (!Action || !IP) {
    throw new Error(
      "Could insert action into database. Please make sure all required information is provided."
    );
  }

  const rows = await DB.query(
    `
    INSERT INTO
      BigBrother
    SET 
      Action = ?,
      IP = ?, 
      UserID = ?,
      SauceID = ?,
      ReviewID = ?,
      StartDate = ${moment().unix()};  
      `,
    [Action, IP, UserID, SauceID, ReviewID]
  );

  // Make sure we could save user
  if (!rows) {
    throw new Error("Error trying to save user. Please try again.");
  }

  console.log(rows);

  return rows.insertId;
};
