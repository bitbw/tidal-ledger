import Papa from "papaparse";
import { readSheet } from "read-excel-file/browser";
import { unzipSync } from "fflate";

export type StatementSource = "wechat" | "alipay" | "generic";

export type ParsedStatementRow = {
  rowNumber: number;
  occurredAt: string;
  merchantName: string;
  amountCents: number;
  direction: "expense" | "income" | "unknown";
  externalTransactionId: string | null;
  category: string;
  platformCategory: string;
  productName: string;
};

export type ParsedStatement = {
  source: StatementSource;
  filename: string;
  rows: ParsedStatementRow[];
  skipped: number;
  detectedHeaders: string[];
};

const aliases = {
  occurredAt: ["交易时间", "交易创建时间", "交易日期", "时间", "日期", "交易创建时间(北京时间)"],
  merchantName: ["商户名称", "交易对方", "商品", "商品名称", "对方", "交易描述", "对方账户", "交易对方名称"],
  amount: ["金额(元)", "金额", "交易金额", "收/支金额", "金额（元）"],
  direction: ["收/支", "收支", "收/付款方式", "交易类型", "资金状态", "收支类型"],
  platformCategory: ["交易分类", "商品类型", "交易类型", "消费分类"],
  productName: ["商品说明", "商品", "商品名称", "交易描述", "备注"],
  externalTransactionId: ["交易单号", "交易订单号", "商户订单号", "流水号", "微信支付订单号", "支付宝交易号"],
};

function normalizeHeader(value: unknown) {
  return String(value ?? "").trim().replace(/\s/g, "");
}

function readCell(record: Record<string, unknown>, keys: string[]) {
  const entries = Object.entries(record);
  for (const key of keys) {
    const match = entries.find(([header]) => normalizeHeader(header) === normalizeHeader(key));
    if (match) return String(match[1] ?? "").trim();
  }
  return "";
}

function parseAmount(value: string) {
  const normalized = value.replace(/[￥¥,\s]/g, "").replace(/[^0-9.-]/g, "");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? Math.round(Math.abs(parsed) * 100) : 0;
}

function classifyDirection(value: string, amount: string): ParsedStatementRow["direction"] {
  if (/-/.test(amount) || /支出|付款|支付|扣款|消费/.test(value)) return "expense";
  if (/收入|收款|退款|入账|转入/.test(value)) return "income";
  return "unknown";
}

function detectSource(headers: string[]): StatementSource {
  const joined = headers.join("|");
  if (/微信支付订单号|交易单号|收\/支金额|支付方式/.test(joined) && /交易时间|交易创建时间/.test(joined)) return "wechat";
  if (/支付宝交易号|交易分类|收\/支|对方账户/.test(joined)) return "alipay";
  return "generic";
}

function findHeaderRow(rows: unknown[][]) {
  return rows.findIndex((row) => {
    const line = row.map(normalizeHeader).join("|");
    return /交易时间|交易创建时间|日期/.test(line) && /金额|收\/支/.test(line);
  });
}

function rowsToRecords(rows: unknown[][]) {
  const headerIndex = findHeaderRow(rows);
  if (headerIndex < 0) throw new Error("未找到可识别的表头。请确认选择的是交易账单文件。");
  const headers = rows[headerIndex].map(normalizeHeader);
  const records = rows.slice(headerIndex + 1)
    .filter((row) => row.some((value) => String(value ?? "").trim()))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])));
  return { headers, records, headerIndex };
}

function normalizeRecords(records: Record<string, unknown>[], headers: string[], headerIndex: number): ParsedStatementRow[] {
  return records.map((record, index) => {
    const amount = readCell(record, aliases.amount);
    const directionLabel = readCell(record, aliases.direction);
    return {
      rowNumber: headerIndex + index + 2,
      occurredAt: readCell(record, aliases.occurredAt),
      merchantName: readCell(record, aliases.merchantName) || "未识别商户",
      amountCents: parseAmount(amount),
      direction: classifyDirection(directionLabel, amount),
      externalTransactionId: readCell(record, aliases.externalTransactionId) || null,
      category: readCell(record, aliases.platformCategory) || "待分类",
      platformCategory: readCell(record, aliases.platformCategory),
      productName: readCell(record, aliases.productName),
    };
  }).filter((row) => row.amountCents > 0 && row.occurredAt);
}

function decodeCsv(bytes: Uint8Array) {
  for (const encoding of ["utf-8", "gb18030"]) {
    try {
      const text = new TextDecoder(encoding, { fatal: false }).decode(bytes);
      if (text.includes("交易") || text.includes("金额") || encoding === "gb18030") return text;
    } catch { /* try the next encoding */ }
  }
  return new TextDecoder().decode(bytes);
}

function parseCsv(bytes: Uint8Array) {
  // Alipay exports use CRLF in the preamble but LF for transaction rows.
  const text = decodeCsv(bytes).replace(/\r\n?/g, "\n");
  const parsed = Papa.parse<string[]>(text, { skipEmptyLines: true, newline: "\n" });
  return parsed.data as unknown[][];
}

async function parseXlsx(bytes: Uint8Array) {
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return readSheet(new Blob([buffer])) as Promise<unknown[][]>;
}

async function parseBytes(bytes: Uint8Array, filename: string): Promise<unknown[][]> {
  const extension = filename.toLowerCase().split(".").pop();
  if (extension === "xlsx" || extension === "xls") return parseXlsx(bytes);
  if (extension === "zip") {
    const files = unzipSync(bytes);
    const statementFile = Object.entries(files).find(([name]) => /\.(csv|xlsx?|xls)$/i.test(name));
    if (!statementFile) throw new Error("压缩包中没有找到 CSV 或 Excel 账单文件。");
    return parseBytes(statementFile[1], statementFile[0]);
  }
  return parseCsv(bytes);
}

export async function parseStatementFile(file: File): Promise<ParsedStatement> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const rows = await parseBytes(bytes, file.name);
  const { headers, records, headerIndex } = rowsToRecords(rows);
  const normalized = normalizeRecords(records, headers, headerIndex);
  return {
    source: detectSource(headers),
    filename: file.name,
    rows: normalized,
    skipped: records.length - normalized.length,
    detectedHeaders: headers,
  };
}
