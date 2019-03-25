exports.TypesTableStructure = `CREATE TABLE IF NOT EXISTS Types (
  TypeID int NOT NULL AUTO_INCREMENT,
  Value varchar(50) NOT NULL, 
  IsActive BOOLEAN DEFAULT '1'
  PRIMARY KEY (TypeID)
  );`;
