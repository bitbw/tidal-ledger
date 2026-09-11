-- 按邮箱查询用户 ID
-- 将下面的邮箱替换成目标用户邮箱。

SELECT id, name, email
FROM "user"
WHERE email = 'your-email@example.com';