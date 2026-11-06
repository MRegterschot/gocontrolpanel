-- Enable the extension (only once per database)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO plugins (id, name, description, "updatedAt")
VALUES (
  gen_random_uuid(),
  'match',
  'A plugin to manage a match on the server, including starting and stopping the match, a pick and ban system, and player and team management.',
  NOW()
);