export type ImportCategory = {
  id: string;
  name: string;
  kind: "expense" | "income";
  parentId: string | null;
};

type ImportRowForSuggestion = {
  direction: "expense" | "income" | "unknown";
  platformCategory?: string;
  merchantName: string;
  productName?: string;
};

export type CategorySuggestion = {
  categoryId: string | null;
  source: "platform" | "keyword" | null;
};

const expensePlatformRules: [string[], string[]][] = [
  [["餐饮美食"], ["午餐"]],
  [["交通出行"], ["交通其他"]],
  [["日用百货"], ["家居百货"]],
  [["医疗健康"], ["医疗药品"]],
  [["充值缴费"], ["水电燃气"]],
  [["服饰装扮"], ["服饰鞋包"]],
  [["文化休闲"], ["娱乐其他"]],
];

const expenseKeywordRules: [string[], string[]][] = [
  [["滴滴", "打车"], ["打车"]],
  [["地铁"], ["地铁"]],
  [["公交"], ["公交"]],
  [["美团", "饿了么", "外卖", "餐饮", "饭店", "餐厅"], ["餐饮其他"]],
  [["盒马", "超市", "便利店", "百货"], ["家居百货"]],
  [["医院", "药店", "药房", "医疗"], ["医疗药品"]],
  [["电费", "水费", "燃气", "话费"], ["水电燃气"]],
  [["迪卡侬", "服饰", "鞋", "衣"], ["服饰鞋包"]],
  [["电影", "游戏", "会员"], ["娱乐其他"]],
];

const incomeKeywordRules: [string[], string[]][] = [
  [["工资", "薪水"], ["工资薪水"]],
  [["奖金"], ["奖金"]],
  [["闲鱼", "转账", "收款"], ["兼职外快", "其他"]],
  [["余额宝"], ["余额宝"]],
  [["利息"], ["利息"]],
  [["红包", "礼金"], ["礼金"]],
  [["退款", "赔付"], ["赔付款"]],
];

export const defaultImportMappings = [
  ...expensePlatformRules.map(([sources, targets]) => ({ type: "platform", direction: "expense", source: sources.join("、"), target: targets.join(" / ") })),
  ...expenseKeywordRules.map(([sources, targets]) => ({ type: "keyword", direction: "expense", source: sources.join("、"), target: targets.join(" / ") })),
  ...incomeKeywordRules.map(([sources, targets]) => ({ type: "keyword", direction: "income", source: sources.join("、"), target: targets.join(" / ") })),
] as const;

function normalized(value: string | undefined) {
  return (value ?? "").toLowerCase().replace(/\s+/g, "");
}

function findCategory(categories: ImportCategory[], direction: "expense" | "income", names: string[]) {
  return categories.find((category) => category.kind === direction && (direction === "income" ? !category.parentId : Boolean(category.parentId)) && names.includes(category.name)) ?? null;
}

function matchRules(categories: ImportCategory[], direction: "expense" | "income", text: string, rules: [string[], string[]][]) {
  for (const [keywords, names] of rules) {
    if (!keywords.some((keyword) => text.includes(normalized(keyword)))) continue;
    const category = findCategory(categories, direction, names);
    if (category) return category;
  }
  return null;
}

export function suggestImportCategory(row: ImportRowForSuggestion, categories: ImportCategory[]): CategorySuggestion {
  if (row.direction === "unknown") return { categoryId: null, source: null };
  const platformCategory = normalized(row.platformCategory);
  const details = normalized(`${row.merchantName} ${row.productName}`);
  if (row.direction === "income") {
    const category = matchRules(categories, "income", `${platformCategory} ${details}`, incomeKeywordRules);
    return { categoryId: category?.id ?? null, source: category ? "keyword" : null };
  }
  const platform = matchRules(categories, "expense", platformCategory, expensePlatformRules);
  if (platform) return { categoryId: platform.id, source: "platform" };
  const keyword = matchRules(categories, "expense", `${platformCategory} ${details}`, expenseKeywordRules);
  return { categoryId: keyword?.id ?? null, source: keyword ? "keyword" : null };
}
