exports.UserRoleTableStructure = `CREATE TABLE 'UserRole' (
  'UserRoleID' int(11) unsigned NOT NULL AUTO_INCREMENT,
  'RoleID' int(11) NOT NULL,
  'UserID' int(11) NOT NULL,
  PRIMARY KEY ('UserRoleID'),
  KEY 'UserRole_RoleID_Roles_RoleID' ('RoleID'),
  KEY 'UserRole_UserID_Users_UserID' ('UserID'),
  CONSTRAINT 'UserRole_RoleID_Roles_RoleID' FOREIGN KEY ('RoleID') REFERENCES 'Roles' ('RoleID'),
  CONSTRAINT 'UserRole_UserID_Users_UserID' FOREIGN KEY ('UserID') REFERENCES 'Users' ('UserID')
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8;`;
