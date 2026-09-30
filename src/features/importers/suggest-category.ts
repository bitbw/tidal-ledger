export type ImportCategory = {
  id: string;
  name: string;
  kind: "expense" | "income";
  parentId: string | null;
};

type ImportRowForSuggestion = {
  direction: "expense" | "income" | "unknown";
  occurredAt?: string;
  platformCategory?: string;
  merchantName: string;
  productName?: string;
};

export type CategorySuggestion = {
  categoryId: string | null;
  source: "platform" | "keyword" | null;
};

type MappingRule = [string[], string[]];

const diningKeywords = ["美团", "饿了么", "外卖", "淘宝闪购", "餐饮", "饭店", "饭馆", "餐厅", "餐馆", "食堂", "饭堂", "快餐", "小吃", "面馆", "手擀面", "板面", "熟食", "拉面", "麻辣烫", "拌粉", "锅盔", "foodpark", "美团收银"];

// Specific product and merchant clues run before broad statement-platform labels.
const expenseKeywordRules: MappingRule[] = [
  [["早餐", "早饭", "早点"], ["早餐"]],
  [["午餐", "午饭"], ["午餐"]],
  [["晚餐", "晚饭"], ["晚餐"]],
  [["夜宵", "宵夜"], ["夜宵"]],
  [["零食", "赵一鸣", "良品铺子", "三只松鼠", "洽洽"], ["零食"]],
  [["果切", "水果", "鲜果", "果汁", "饮料", "矿泉水", "汽水", "酸奶"], ["饮料水果"]],
  [["蔬菜", "鲜肉", "水产", "海鲜", "豆制品", "豆浆", "买菜", "生鲜", "农贸", "盒马鲜生", "超市"], ["买菜原料"]],
  [["便利店", "便利蜂", "7-eleven", "7-11"], ["零食"]],
  [["酱油", "食用油", "调味料", "油盐酱醋"], ["油盐酱醋"]],
  [["洗洁精", "洗衣液", "清洁剂", "清洁用品"], ["家居百货"]],
  [["宽带", "家庭网络"], ["电脑宽带"]],
  [["话费", "手机充值", "流量充值", "中国移动", "中国联通", "中国电信"], ["交话费"]],
  [["电费", "水费", "燃气费", "缴电费", "缴水费", "国网", "电力公司"], ["水电燃气"]],
  [["停车场", "停车缴费", "停车费"], ["停车费"]],
  [["高速费", "高速缴费", "过路费", "过桥费", "ETC"], ["过路过桥"]],
  [["滴滴", "打车", "网约车", "出租车"], ["打车"]],
  [["地铁", "轨道交通"], ["地铁"]],
  [["公交", "公共汽车"], ["公交"]],
  [["火车票", "铁路", "高铁"], ["火车"]],
  [["机票", "航空", "航班"], ["飞机"]],
  [["顺丰", "快递", "邮政", "运费", "闪送"], ["快递邮政"]],
  [["游戏充值", "游戏点券", "游戏道具"], ["APP充值"]],
  [["爱奇艺", "腾讯视频", "优酷", "芒果TV", "网易云音乐", "QQ音乐", "视频会员", "音乐会员", "会员续费", "自动续费", "会员"], ["APP会员"]],
  [["电影票", "电影", "影院"], ["电影"]],
  [["网游", "电玩", "游戏", "点券"], ["网游电玩"]],
  [["咖啡", "瑞幸", "luckin", "星巴克", "奶茶"], ["茶酒咖啡"]],
  [["迪卡侬", "运动服", "运动鞋", "跑步鞋", "健身器材"], ["运动用品"]],
  [["服饰", "衣服", "衣物", "鞋包", "速干T恤", "速干衣"], ["服饰鞋包"]],
  [["药店", "药房", "快药", "药品", "药费"], ["医疗药品"]],
  [["挂号", "门诊", "医院", "诊疗"], ["挂号门诊"]],
  [["美发", "理发", "美容", "护肤"], ["美发美容"]],
  [["房租", "租金"], ["住宿房租"]],
];

const expensePlatformRules: MappingRule[] = [
  [["交通出行"], ["交通其他"]],
  [["日用百货"], ["家居百货"]],
  [["医疗健康"], ["医疗药品"]],
  [["服饰装扮"], ["服饰鞋包"]],
  [["文化休闲"], ["休闲玩乐"]],
];

const incomeKeywordRules: MappingRule[] = [
  [["工资", "薪水"], ["工资薪水"]],
  [["奖金"], ["奖金"]],
  [["闲鱼", "转账", "收款"], ["兼职外快", "其他"]],
  [["余额宝"], ["余额宝"]],
  [["利息"], ["利息"]],
  [["红包", "礼金"], ["礼金"]],
  [["退款", "赔付"], ["赔付款"]],
];

export const defaultImportMappings = [
  ...expenseKeywordRules.map(([sources, targets]) => ({ type: "keyword", direction: "expense", source: sources.join("、"), target: targets.join(" / ") })),
  { type: "time", direction: "expense", source: `餐饮美食、${diningKeywords.join("、")}`, target: "05:00–10:00 早餐 · 10:00–16:00 午餐 · 16:00–21:00 晚餐 · 21:00–05:00 夜宵" },
  ...expensePlatformRules.map(([sources, targets]) => ({ type: "platform", direction: "expense", source: sources.join("、"), target: targets.join(" / ") })),
  ...incomeKeywordRules.map(([sources, targets]) => ({ type: "keyword", direction: "income", source: sources.join("、"), target: targets.join(" / ") })),
] as const;

function normalized(value: string | undefined) {
  return (value ?? "").toLowerCase().replace(/\s+/g, "");
}

function findCategory(categories: ImportCategory[], direction: "expense" | "income", names: string[]) {
  return categories.find((category) => category.kind === direction && (direction === "income" ? !category.parentId : Boolean(category.parentId)) && names.includes(category.name)) ?? null;
}

function matchRules(categories: ImportCategory[], direction: "expense" | "income", text: string, rules: MappingRule[]) {
  for (const [keywords, names] of rules) {
    if (!keywords.some((keyword) => text.includes(normalized(keyword)))) continue;
    const category = findCategory(categories, direction, names);
    if (category) return category;
  }
  return null;
}

function shanghaiHour(value: string | undefined) {
  if (!value) return null;
  const hasTimezone = /(?:z|[+-]\d{2}:?\d{2})$/i.test(value);
  const wallClock = !hasTimezone ? value.match(/(?:T|\s)(\d{1,2}):(\d{2})/) : null;
  if (wallClock) return Number(wallClock[1]);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const hour = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Shanghai", hour: "2-digit", hourCycle: "h23" }).format(date);
  return Number(hour);
}

function mealCategory(hour: number) {
  if (hour >= 5 && hour < 10) return "早餐";
  if (hour >= 10 && hour < 16) return "午餐";
  if (hour >= 16 && hour < 21) return "晚餐";
  return "夜宵";
}

export function suggestImportCategory(row: ImportRowForSuggestion, categories: ImportCategory[]): CategorySuggestion {
  if (row.direction === "unknown") return { categoryId: null, source: null };
  const platformCategory = normalized(row.platformCategory);
  const details = normalized(`${row.merchantName} ${row.productName}`);
  if (row.direction === "income") {
    const category = matchRules(categories, "income", `${platformCategory} ${details}`, incomeKeywordRules);
    return { categoryId: category?.id ?? null, source: category ? "keyword" : null };
  }

  const keyword = matchRules(categories, "expense", `${platformCategory} ${details}`, expenseKeywordRules);
  if (keyword) return { categoryId: keyword.id, source: "keyword" };

  if (diningKeywords.some((item) => details.includes(normalized(item))) || platformCategory.includes("餐饮美食")) {
    const hour = shanghaiHour(row.occurredAt);
    const category = hour === null ? null : findCategory(categories, "expense", [mealCategory(hour)]);
    return { categoryId: category?.id ?? null, source: category ? platformCategory.includes("餐饮美食") ? "platform" : "keyword" : null };
  }

  const platform = matchRules(categories, "expense", platformCategory, expensePlatformRules);
  return { categoryId: platform?.id ?? null, source: platform ? "platform" : null };
}
