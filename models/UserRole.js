exports.UserRoleTableStructure = `CREATE TABLE 'UserRole' (
  'UserRoleID' int(11) unsigned NOT NULL AUTO_INCREMENT,
  'RoleID' int(11) NOT NULL,
  PRIMARY KEY ('UserRoleID'),
  KEY 'UserRole_RoleID_Roles_RoleID' ('RoleID'),
  CONSTRAINT 'UserRole_RoleID_Roles_RoleID' FOREIGN KEY ('RoleID') REFERENCES 'Roles' ('RoleID')
) ENGINE=InnoDB DEFAULT CHARSET=utf8;`;
