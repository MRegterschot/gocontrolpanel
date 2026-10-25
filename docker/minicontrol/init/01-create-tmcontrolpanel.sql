CREATE DATABASE IF NOT EXISTS `tmcontrolpanel`;

CREATE USER IF NOT EXISTS 'tmcontrolpanel'@'%' IDENTIFIED BY 'VettePanel123';
GRANT ALL PRIVILEGES ON `tmcontrolpanel`.* TO 'tmcontrolpanel'@'%';
FLUSH PRIVILEGES;