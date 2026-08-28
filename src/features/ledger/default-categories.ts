export type DefaultCategoryGroup = {
  name: string;
  icon: string;
  children: { name: string; icon: string }[];
};

export const defaultExpenseCategories: DefaultCategoryGroup[] = [
  { name: "餐饮", icon: "utensils", children: ["交家伙食费", "跟朋友吃饭", "街边小吃", "上班带吃的", "早餐", "午餐", "晚餐", "夜宵", "零食", "饮料水果", "买菜原料", "油盐酱醋", "餐饮其他"].map((name) => ({ name, icon: name === "早餐" ? "coffee" : "utensils" })) },
  { name: "交通", icon: "car", children: ["共享单车", "洗车", "购置税", "检车", "电动车及配件", "打车", "公交", "加油", "停车费", "地铁", "火车", "长途汽车", "飞机", "自行车", "船舶", "保养维修", "过路过桥", "罚款赔偿", "车款车贷", "车险", "驾照费用", "交通其他"].map((name) => ({ name, icon: name === "飞机" ? "plane" : name === "自行车" || name === "共享单车" ? "bike" : "car" })) },
  { name: "购物", icon: "shopping-bag", children: ["运动用品", "服饰鞋包", "家居百货", "宝宝用品", "化妆护肤", "烟酒", "电子数码", "文具玩具", "报刊书籍", "珠宝首饰", "家具家纺", "保健用品", "电器", "摄影文印", "购物其他"].map((name) => ({ name, icon: name === "服饰鞋包" ? "shirt" : name === "电子数码" || name === "电器" ? "zap" : "shopping-bag" })) },
  { name: "娱乐", icon: "sparkles", children: ["APP会员", "APP充值", "小赌怡情", "打彩票玩", "上网", "腐败聚会", "跟朋友喝酒", "休闲玩乐", "旅游度假", "电影", "网游电玩", "麻将棋牌", "洗浴足浴", "运动健身", "花鸟宠物", "聚会玩乐", "茶酒咖啡", "卡拉OK", "歌舞演出", "电视", "娱乐其他"].map((name) => ({ name, icon: name === "旅游度假" ? "landmark" : name === "运动健身" ? "trending-up" : "sparkles" })) },
  { name: "医教", icon: "circle-dollar-sign", children: ["洗牙补牙", "医疗药品", "挂号门诊", "养生保健", "住院费", "养老院", "学杂教材", "培训考试", "幼儿教育", "学费", "家教补习", "出国留学", "助学贷款", "医教其他"].map((name) => ({ name, icon: name === "学杂教材" || name === "培训考试" ? "receipt" : "circle-dollar-sign" })) },
  { name: "居家", icon: "home", children: ["搬家搬运", "交话费", "还信用卡", "意外丢失", "手机电话", "水电燃气", "生活费", "美发美容", "住宿房租", "材料建材", "房款房贷", "快递邮政", "电脑宽带", "家政服务", "物业", "税费手续费", "保险费", "消费贷款", "婚庆摄影", "漏记款", "生活其他"].map((name) => ({ name, icon: name === "水电燃气" ? "zap" : "home" })) },
  { name: "投资", icon: "trending-up", children: ["移民相关", "会员", "打彩票", "利息支出", "保险", "出资", "基金", "股票", "P2P", "余额宝", "理财产品", "投资贷款", "银行存款", "证券期货", "外汇", "贵金属", "收藏品", "投资其他"].map((name) => ({ name, icon: "trending-up" })) },
  { name: "人情", icon: "heart", children: ["借出钱", "丧葬", "孝敬家长", "随礼", "礼金红包", "物品", "孝敬", "请客", "给予", "代付款", "慈善捐款", "人情其他"].map((name) => ({ name, icon: "heart" })) },
  { name: "生意", icon: "landmark", children: ["闲鱼服务", "进货采购", "人工支出", "材料辅料", "办公费用", "交通运输", "工程付款", "运营费", "会务费", "营销广告", "店面租金", "注册登记", "生意其他"].map((name) => ({ name, icon: "landmark" })) },
];

export const defaultIncomeCategories = [
  "生小孩随礼", "理财", "债券", "医保余额", "社保", "结婚随礼", "滴滴", "家人给的", "中奖钱", "房租", "工资薪水", "利息", "兼职外快", "营业收入", "余额宝", "应收款", "生活费", "奖金", "基金", "礼金", "分红", "租金", "股票", "公积金", "工程款", "赔付款", "漏记款", "其他",
].map((name) => ({ name, icon: name === "工资薪水" || name === "奖金" ? "wallet" : "badge-plus" }));
