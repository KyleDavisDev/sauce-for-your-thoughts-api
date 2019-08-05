exports.ReviewsTableStructure = `CREATE TABLE 'Avatars' (
  'AvatarID' int(11) unsigned NOT NULL AUTO_INCREMENT,
  'Name' tinytext CHARACTER SET utf8 NOT NULL,
  'IsActive' tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY ('AvatarID')
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=latin1;`;
