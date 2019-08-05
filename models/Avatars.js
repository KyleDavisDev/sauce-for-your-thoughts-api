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
