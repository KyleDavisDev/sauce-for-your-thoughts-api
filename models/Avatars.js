const DB = require("../db/db.js");

exports.ReviewsTableStructure = `CREATE TABLE 'Avatars' (
  'AvatarID' int(11) unsigned NOT NULL AUTO_INCREMENT,
  'URL' tinytext CHARACTER SET utf8 NOT NULL,
  'IsActive' tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY ('AvatarID')
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=latin1;`;

/** @description Get all Avatar URLs from DB
 *  @return {Promise}
 *  @resolves {string[]} array of strings
 *  @reject {String} error message
 */
exports.getAll = async () => {
  const res = await DB.query(`
  SELECT
    URL
  FROM
    Avatars
  WHERE
    IsActive = 1`);

  // Make sure could find avatars
  if (!res) {
    throw new Error("Error retrieving avatars. Please try again.");
  }

  const urls = [];
  for (let i = 0, len = res.length; i < len; i++) {
    urls.push(res[i].URL);
  }

  return urls;
};

/** @description Get a random ID from table
 *  @return {Promise}
 *  @resolves {Number} single AvatarID
 *  @reject {String} error message
 */
exports.getRandomID = async () => {
  const res = await DB.query(`
  SELECT
    AvatarID
  FROM
    Avatars
  WHERE
    IsActive = 1
  ORDER BY
    RAND()
  LIMIT 
    1`);

  // Make sure could find and ID
  if (!res) {
    throw new Error("Error retrieving single avatar. Please try again.");
  }

  return res[0].AvatarID;
};

/** @description Get the ID related to the URL
 *  @param {string} URL - URL to look up
 *  @return {Promise}
 *  @resolves {Number} single AvatarID
 *  @reject {String} error message
 */
exports.getIDFromURL = async ({ URL }) => {
  if (!URL) {
    throw new Error("Must provide required parameters to getIDFromURL method");
  }

  const res = await DB.query(
    `
  SELECT
    AvatarID
  FROM
    Avatars
  WHERE
    IsActive = 1
    AND URL = ?
  `,
    [URL]
  );

  // Make sure could find and ID
  if (!res) {
    throw new Error("Error retrieving single avatar. Please try again.");
  }

  return res[0].AvatarID;
};
