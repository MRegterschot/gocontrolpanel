-- Enable the extension (only once per database)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO plugins (id, name, description, "updatedAt")
VALUES (
  gen_random_uuid(),
  'player-info',
  'A widget that shows information about the spectated player. This includes their name, personal best and optionally device and camera.',
  NOW()
);