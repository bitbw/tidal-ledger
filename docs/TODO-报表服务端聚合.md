# TODO：将报表改为 Neon 服务端聚合

## 当前状态

报表页面已经接入真实账本流水，但数据来源是 `GET /api/ledger` 返回的最近 300 笔交易，再由浏览器按月份、日期和分类聚合。

这适合当前 Preview 阶段的小数据量验证，但不适合作为长期方案。

## 问题

- 当某个账本超过 300 笔流水时，较早的数据不会进入客户端，报表可能少算；
- 浏览器承担按日、按分类的聚合，数据量增长后会增加网络传输和渲染负担；
- 首页、报表和后续导出可能各自计算，容易出现统计口径不一致；
- 未来增加账户、分类、日期范围、成员等筛选条件后，客户端聚合会越来越复杂。

## 目标

提供受 Better Auth Session 保护的报表 API，让 Neon/PostgreSQL 只返回指定月份需要的聚合结果，而不是把全部流水传给浏览器。

建议新增：

```text
GET /api/ledger/reports?month=YYYY-MM
```

返回内容：

```ts
{
  month: "2026-08",
  summary: {
    incomeCents: number,
    expenseCents: number,
    balanceCents: number,
    incomeCount: number,
    expenseCount: number,
  },
  daily: Array<{
    day: string,
    incomeCents: number,
    expenseCents: number,
    incomeCount: number,
    expenseCount: number,
  }>,
  categories: Array<{
    categoryId: string | null,
    categoryName: string,
    expenseCents: number,
    transactionCount: number,
  }>,
}
```

## 实现步骤

1. 在 `src/features/ledger/server.ts` 新增报表查询函数。
2. 根据登录用户取得其默认账本；共享账本完成后改为显式传入并校验 `bookId`。
3. 校验 `month` 格式为 `YYYY-MM`，计算该月起止时间。
4. 在 Neon 查询时统一过滤：

   ```text
   book_id = 当前账本
   deleted_at IS NULL
   occurred_at 位于所选月份
   ```

5. 使用 PostgreSQL/Drizzle 聚合生成：

   - 总收入、总支出、结余、笔数；
   - 按日收入/支出和笔数；
   - 按分类支出金额和笔数；
   - 转账不计入收入、支出和分类消费统计。

6. 在 `src/app/api/ledger/reports/route.ts` 中读取 Better Auth Session，未登录返回 `401`。
7. 新建 `useLedgerReport(month)` 客户端 hook，改报表页只请求聚合结果。
8. 保留首页最近流水接口的 300 笔限制；报表不再依赖这个限制。

## 数据与安全要求

- 所有查询必须在服务端使用当前 Session 的用户 ID 限定账本范围；
- 不能让客户端直接传任意 `bookId` 后无权限读取；
- 金额在数据库/API 中使用整数分（`*_cents`），仅在 UI 层格式化为元；
- 日期边界必须统一时区策略；当前产品面向中国用户，可明确使用 `Asia/Shanghai`；
- 为空的月份也要返回完整结构和空数组，避免前端自行补逻辑；
- 报表查询不能包含原始导入文件或敏感凭据。

## 验收标准

- 账本超过 300 笔流水时，任意月份的报表仍统计完整；
- 收入、支出、结余与该月流水明细的加总一致；
- 转账不会计入收入或支出；
- 已软删除流水不会进入报表；
- 未登录请求返回 `401`；
- 用户不能读取其他用户账本的聚合结果；
- `npm run build` 通过，并在 Neon `preview1` 完成回归验证。

## 后续优化

- 增加账户、分类、日期区间和账本筛选；
- 数据量继续增长后评估每日汇总表或物化视图；
- 为导出和首页统计复用同一套服务端聚合口径。
