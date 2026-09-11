-- 清理指定用户拥有的全部账本数据（保留登录账号）
-- 使用前替换 TARGET_USER_ID。
-- 执行前确认 DATABASE_URL 指向 Preview/测试库，而不是生产库。

BEGIN;

CREATE TEMP TABLE _target_books ON COMMIT DROP AS
SELECT DISTINCT bm.book_id
FROM book_members bm
WHERE bm.user_id = 'uSo2Yr8bG8wAhw7yDLlmagfJ1flxgGy8'
  AND bm.role = 'owner';

DELETE FROM import_rows
WHERE batch_id IN (
  SELECT ib.id
  FROM import_batches ib
  JOIN _target_books tb ON tb.book_id = ib.book_id
);

DELETE FROM transactions
WHERE book_id IN (SELECT book_id FROM _target_books);

DELETE FROM recurring_entries
WHERE book_id IN (SELECT book_id FROM _target_books);

DELETE FROM import_category_rules
WHERE book_id IN (SELECT book_id FROM _target_books);

DELETE FROM budgets
WHERE book_id IN (SELECT book_id FROM _target_books);

DELETE FROM import_batches
WHERE book_id IN (SELECT book_id FROM _target_books);

DELETE FROM accounts
WHERE book_id IN (SELECT book_id FROM _target_books);

-- categories 有父子关系，先删小类，再删大类。
DELETE FROM categories
WHERE book_id IN (SELECT book_id FROM _target_books)
  AND parent_id IS NOT NULL;

DELETE FROM categories
WHERE book_id IN (SELECT book_id FROM _target_books)
  AND parent_id IS NULL;

DELETE FROM book_members
WHERE book_id IN (SELECT book_id FROM _target_books);

DELETE FROM books
WHERE id IN (SELECT book_id FROM _target_books);

COMMIT;