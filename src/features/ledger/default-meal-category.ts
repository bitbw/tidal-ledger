export type MealCategoryName = "早餐" | "午餐" | "晚餐";

export function defaultMealCategoryName(date: Date): MealCategoryName {
  const hour = Number(new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date).find((part) => part.type === "hour")?.value);

  if (hour < 5 || hour >= 17) return "晚餐";
  if (hour < 11) return "早餐";
  return "午餐";
}
