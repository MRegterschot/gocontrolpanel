UPDATE plugins
SET "description" = 'A widget and admin command to notify a server admin. The command is "/admin <message>".'
WHERE plugins.name = 'admin';