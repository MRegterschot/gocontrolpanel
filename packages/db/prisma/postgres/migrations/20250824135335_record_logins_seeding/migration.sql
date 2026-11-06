-- Create missing users for orphaned records.logins
INSERT INTO users (id, login, "nickName", path, admin, authenticated, "createdAt", "updatedAt")
SELECT gen_random_uuid(), r.login, r.login, '', false, false, now(), now()
FROM (
    SELECT DISTINCT r.login
    FROM records r
    LEFT JOIN users u ON r.login = u.login
    WHERE r.login IS NOT NULL
      AND u.login IS NULL
) r;