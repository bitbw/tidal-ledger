# 账单自动分类：用户规则与 Vercel AI Gateway 省 Token 实现方案

> 版本：v1.0｜日期：2026-09-01
> 目标：在现有支付宝/微信账单导入基础上，增加用户自定义商户规则和 LLM 分类兜底，并尽量减少请求次数、输入 token 和输出 token。

## 1. 总体策略

分类顺序固定为：

```text
用户自定义规则
  ↓ 未命中
本地平台分类/关键词规则
  ↓ 未命中
Vercel AI Gateway 批量判断
  ↓ 低置信度或失败
待分类，由用户确认
```

LLM 只能从当前账本已有的可记账分类中选择，不能创建分类、修改金额、日期、收支方向或账户。最终导入以前端用户选择和服务端校验结果为准。

## 2. Vercel AI Gateway 接入方式

参考 `D:\bowen\git-project\english-read` 的环境变量约定，记账项目新增：

```env
AI_GATEWAY_API_KEY=
```

Key 只配置在本地 `.env.local`、Preview/Production 的服务端环境变量中，不能使用 `NEXT_PUBLIC_` 前缀，也不能从浏览器直接调用。

推荐使用 AI SDK 的 Gateway provider：

```ts
import { createGateway } from "@ai-sdk/gateway";
import { generateObject } from "ai";

const gateway = createGateway({
  apiKey: process.env.AI_GATEWAY_API_KEY,
});

const result = await generateObject({
  model: gateway("openai/gpt-4o-mini"),
  schema: classificationSchema,
  prompt,
  maxOutputTokens: 500,
});
```

实际模型 ID 以 Vercel AI Gateway 可用模型为准，先选便宜、支持结构化输出的模型。Key 必须在服务端使用。AI Gateway 支持通过统一 API 访问不同模型，并使用同一个 `AI_GATEWAY_API_KEY` 鉴权。citeturn0search0turn0search2turn0search4

## 3. 用户自定义规则

### 3.1 数据表

新增 `import_category_rules`：

```ts
importCategoryRules {
  id: uuid,
  bookId: uuid,
  pattern: text,
  matchType: text,       // exact | contains
  direction: text,       // expense | income | any
  categoryId: uuid,
  priority: integer,
  enabled: boolean,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

约束：

- `bookId + pattern + matchType + direction` 建唯一索引，避免重复规则。
- `categoryId` 必须属于同一账本；支出必须指向小类，收入必须指向收入单级分类。
- `pattern` 只保存用户输入的商户关键词，不保存订单号、金额、完整原始账单。
- 规则按 `priority desc` 匹配；同优先级按最长 pattern 优先。

示例：

```text
商户包含：一支小红花
收支：支出
分类：购物 → 饮料水果

商户包含：盒马
收支：支出
分类：购物 → 买菜原料
```

### 3.2 管理界面

在“分类管理”或“导入设置”中增加“自动分类规则”：

- 新增规则：输入商户/关键词、选择包含或完全匹配、选择收入/支出、选择分类。
- 编辑、启用/停用、删除规则。
- 账单预览中用户手动修改分类后显示“保存为商户规则”，默认使用当前商户名作为 `contains` 规则。
- 导入成功后不自动保存规则，避免一次误操作污染长期规则；只有用户明确点击保存才写入。

## 4. 本地匹配层

扩展现有 `suggestImportCategory`：

1. 使用账单的 `merchantName + productName + platformCategory` 组成匹配文本。
2. 先使用服务端返回的用户规则；命中后直接得到 `categoryId`，不调用 LLM。
3. 再使用现有平台分类和关键词规则。
4. 仅把未命中的唯一商户送入 LLM。

同一批中出现 30 次“滴滴出行”，只发送一次商户候选，返回结果后回填这 30 行。

## 5. LLM 请求设计（省 Token）

### 5.1 不发送的字段

不向 LLM 发送完整账单、订单号、交易时间、金额、账户、备注、用户姓名或账号。分类通常只需要：

- `merchant`：商户名；
- `description`：商品说明，截断到 80 个字符；
- `platformCategory`：支付宝/微信交易分类；
- `direction`：收入或支出。

### 5.2 候选分类压缩

只发送当前账本可用分类，并用短 ID：

```json
{
  "expense": [
    ["e17", "购物/饮料水果"],
    ["e18", "购物/买菜原料"],
    ["e19", "交通/打车"]
  ],
  "income": [["i03", "工资薪水"]]
}
```

不发送图标、颜色、排序、创建时间和分类 UUID；服务端维护短 ID 到真实 `categoryId` 的映射。

### 5.3 批量与结构化输出

每次只发送 10～30 个未命中的唯一商户，使用一个短提示词和结构化 JSON：

```json
{
  "items": [
    { "key": "m1", "category": "e17", "confidence": 0.93 },
    { "key": "m2", "category": null, "confidence": 0.42 }
  ]
}
```

规则：

- `confidence >= 0.85`：预览中显示 AI 推荐，可直接作为默认分类；
- `0.60 <= confidence < 0.85`：显示 AI 建议，但仍标记待确认；
- `< 0.60` 或 `category=null`：保持待分类；
- LLM 超时、格式错误、余额不足时，整个 AI 层降级为待分类，不影响规则匹配和手动导入。

## 6. 缓存与调用次数控制

- 按 `bookId + direction + normalizedMerchant + platformCategory + descriptionPrefix` 生成哈希。
- 同一批次先去重，再调用 LLM。
- 服务端缓存高置信度结果 30～90 天；用户规则变化时只使相关商户缓存失效。
- 不缓存完整账单和敏感字段，只缓存商户文本摘要、分类 ID、模型版本和结果时间。
- 单次导入最多调用 1～3 次 LLM；超过上限的记录保留待分类。
- 可增加环境变量：

```env
AI_GATEWAY_API_KEY=
IMPORT_AI_ENABLED=true
IMPORT_AI_MODEL=openai/gpt-4o-mini
IMPORT_AI_MAX_UNIQUE_MERCHANTS=60
IMPORT_AI_BATCH_SIZE=20
```

如果 `AI_GATEWAY_API_KEY` 未配置或 `IMPORT_AI_ENABLED` 不是 `true`，自动退化为用户规则 + 本地规则。

## 7. API 与服务端流程

### `POST /api/imports/check`

保留现有重复预检，并增加：

1. 根据当前用户账本读取启用的分类规则；
2. 对唯一商户先执行用户规则和本地规则；
3. 仅对未命中的商户调用 LLM；
4. 返回每行的 `categoryId`、`suggestionSource`、`confidence`。

不把 `bookId` 交给客户端决定，由当前登录用户的账本权限推导。

### `POST /api/imports/confirm`

继续执行服务端分类、账户、金额、时间和去重校验。客户端传入的 AI 结果只能作为普通分类 ID 处理，不能绕过分类归属检查。

## 8. 实施顺序

1. 增加 `import_category_rules` schema、migration 和服务端 CRUD。
2. 增加规则管理界面及预览中的“保存为商户规则”。
3. 把用户规则接入现有 `suggestImportCategory`，先完成零 token 的自动分类。
4. 增加 `ai`、`@ai-sdk/gateway` 和 `zod`，实现服务端批量结构化分类接口。
5. 在 `/api/imports/check` 中接入唯一商户去重、分类候选压缩、缓存和调用上限。
6. 使用真实支付宝/微信账单验证命中率、低置信度降级和请求成本。

## 9. 验收标准

- 用户定义“一支小红花 → 购物/饮料水果”后，同账本后续导入优先命中该规则，且不调用 LLM。
- 同一批次相同商户只产生一次 AI 判断。
- 平台规则已命中的记录不调用 LLM。
- LLM 只收到必要文本和短分类候选，不包含订单号、金额、账户和个人身份信息。
- AI 返回低置信度、超时或格式错误时，记录仍可手动分类并正常导入。
- 所有分类结果均经过当前账本和分类层级校验。
- `AI_GATEWAY_API_KEY` 只存在服务端环境变量，不能进入客户端打包产物。

## 10. 推荐的第一期边界

先实现“用户规则 + 本地规则 + AI 批量兜底 + 预览人工确认”。暂不做向量数据库、复杂机器学习训练和自动创建分类；这些对当前个人账本的 token、维护成本和收益都不划算。
