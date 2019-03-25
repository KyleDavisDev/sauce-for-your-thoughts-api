exports.SaucesTableStructure = `CREATE TABLE IF NOT EXISTS Sauces (
  SauceID int NOT NULL AUTO_INCREMENT,
  UserID int NOT NULL,
  Name varchar(100) NOT NULL,
  Maker varchar(100) NOT NULL,
  Slug varchar(150) NOT NULL,
  Description varchar(300) NOT NULL,
  Created DATETIME DEFAULT CURRENT_TIMESTAMP,
  Photo varchar(100),
  Country varchar(100),
  State varchar(100),
  City varchar(100),
  SHU int,
  Ingrediants varchar(300),
  IsActive boolean,
  IsPrivate boolean,
  PRIMARY KEY (SauceID),
  FOREIGN KEY (UserID) REFERENCES Users(UserID)
  );`;
