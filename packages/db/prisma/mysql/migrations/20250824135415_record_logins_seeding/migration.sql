-- Create missing users for orphaned records.logins
INSERT INTO users (id, login, nickName, path, admin, permissions, authenticated, createdAt, updatedAt)
SELECT UUID(), r.login, r.login, '', 0, "[]", 0, NOW(), NOW()
FROM (
    SELECT DISTINCT r.login
    FROM records r
    LEFT JOIN users u ON r.login = u.login
    WHERE r.login IS NOT NULL
      AND u.login IS NULL
) r;