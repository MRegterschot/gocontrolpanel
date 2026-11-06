-- Enable the extension (only once per database)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Step 1: Insert plugin
INSERT INTO plugins (id, name, description, "updatedAt")
VALUES (
  gen_random_uuid(),
  'ecm',
  'A plugin to integrate with the eCircuitMania API. This plugin will automatically send match data to eCircuitMania.',
  NOW()
);
