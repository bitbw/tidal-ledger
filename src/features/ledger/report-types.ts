export type ReportScopeType = "month" | "year" | "all";

export type LedgerReportScope = {
  type: ReportScopeType;
  date?: string;
};

export type ReportBucket = {
  key: string;
  label: string;
  startAt: string;
  endAt: string;
  incomeCents: number;
  expenseCents: number;
  balanceCents: number;
  incomeCount: number;
  expenseCount: number;
};

export type CategoryReportItem = {
  id: string | null;
  name: string;
  icon: string | null;
  color: string;
  amountCents: number;
  transactionCount: number;
  percentage: number;
};

export type LedgerReport = {
  scope: LedgerReportScope;
  range: { startAt: string | null; endAt: string | null };
  summary: {
    incomeCents: number;
    expenseCents: number;
    balanceCents: number;
    incomeCount: number;
    expenseCount: number;
  };
  trends: ReportBucket[];
  categories: {
    major: { expense: CategoryReportItem[]; income: CategoryReportItem[] };
    minor: { expense: CategoryReportItem[]; income: CategoryReportItem[] };
  };
};

export type ReportDetailFilter = {
  title: string;
  startAt: string;
  endAt: string;
  types: ("income" | "expense")[];
  categoryLevel?: "major" | "minor";
  categoryId?: string;
};

export type ReportTransaction = {
  id: string;
  transactionType: "income" | "expense";
  amountCents: number;
  occurredAt: string;
  merchantName: string | null;
  note: string | null;
  accountId: string | null;
  categoryId: string | null;
  categoryName: string | null;
  categoryIcon: string | null;
  categoryColor: string | null;
};
