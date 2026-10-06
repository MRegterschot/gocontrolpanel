CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO commands (id, name, description, command, parameters, "updatedAt")
VALUES (
  gen_random_uuid(),
  'admin',
  'Notify a server admin.',
  '/admin',
  '[
    {
      "name": "message",
      "type": "text",
      "description": "The message to send to the server admin."
    }
  ]'::jsonb,
  NOW()
);