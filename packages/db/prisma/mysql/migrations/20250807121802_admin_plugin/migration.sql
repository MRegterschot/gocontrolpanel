INSERT INTO plugins (id, name, description, updatedAt)
VALUES (
  UUID(),
  'admin',
  'Notify a server admin.',
  NOW()
);

SET @pluginId := (
  SELECT id FROM plugins WHERE name = 'admin' LIMIT 1
);

UPDATE commands
SET pluginId = @pluginId
WHERE name = 'admin';