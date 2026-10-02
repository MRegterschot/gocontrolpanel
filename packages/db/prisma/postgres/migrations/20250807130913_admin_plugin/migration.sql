-- Enable the extension (only once per database)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Step 1: Insert plugin
INSERT INTO plugins (id, name, description, "updatedAt")
VALUES (
  gen_random_uuid(),
  'admin',
  'Notify a server admin.',
  NOW()
);

-- Step 2 & 3: Update command using a CTE to fetch pluginId
WITH plugin_ref AS (
  SELECT id FROM plugins WHERE name = 'admin' LIMIT 1
)
UPDATE commands
SET "pluginId" = plugin_ref.id
FROM plugin_ref
WHERE commands.name = 'admin';
