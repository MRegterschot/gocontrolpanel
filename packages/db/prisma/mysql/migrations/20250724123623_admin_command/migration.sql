INSERT INTO commands (id, name, description, command, parameters, updatedAt)
VALUES (
  UUID(),
  'admin',
  'Notify a server admin.',
  '/admin',
  JSON_ARRAY(
    JSON_OBJECT(
      'name', 'message',
      'type', 'text',
      'description', 'The message to send to the server admin.'
    )
  ),
  NOW()
);