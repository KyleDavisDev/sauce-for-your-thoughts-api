export const UserTable = `CREATE TABLE IF NOT EXISTS Users (
  UserID int NOT NULL AUTO_INCREMENT,
  Email varchar(50) NOT NULL UNIQUE,
  Password varchar(100) NOT NULL,
  DisplayName varchar(50) NOT NULL,
  created DATETIME DEFAULT CURRENT_TIMESTAMP,
  ResetPasswordToken varchar(300),
  ResetPasswordExpires DATETIME,
  LoginAttempts int DEFAULT 0,
  LockedUntil DATETIME,
  PRIMARY KEY (UserID)
  );`;
