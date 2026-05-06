import {
  AppNotification,
  Budget,
  Category,
  Expense,
  Income,
  RecurringTransaction
} from '../models/api.models';

export type TimelineTransaction = {
  id: string;
  title: string;
  amount: number;
  categoryLabel: string;
  transactionType: 'expense' | 'income';
  date: string;
  notes?: string | null;
  paymentMethod?: string | null;
};

export function parseDate(value?: string | null): Date {
  if (!value) {
    return new Date();
  }
  return new Date(value);
}

export function monthName(monthIndex: number, short = true): string {
  return new Intl.DateTimeFormat('en-US', {
    month: short ? 'short' : 'long'
  }).format(new Date(2026, monthIndex, 1));
}

export function formatCurrency(value: number, currency = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: value % 1 === 0 ? 0 : 2
  }).format(value);
}

export function initials(name?: string | null): string {
  if (!name) {
    return 'SS';
  }
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function daysAgoLabel(value: string): string {
  const createdAt = parseDate(value).getTime();
  const now = Date.now();
  const diffHours = Math.max(1, Math.round((now - createdAt) / (1000 * 60 * 60)));
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  }
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  }
  return parseDate(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

export function severityClass(severity?: string | null): string {
  switch ((severity ?? '').toUpperCase()) {
    case 'CRITICAL':
      return 'danger';
    case 'WARNING':
      return 'warn';
    default:
      return 'info';
  }
}

export function normalizeExpense(raw: Expense): Expense {
  return {
    ...raw,
    recurring: (raw as Expense & { isRecurring?: boolean }).recurring ?? (raw as Expense & { isRecurring?: boolean }).isRecurring ?? false
  };
}

export function normalizeIncome(raw: Income): Income {
  return {
    ...raw,
    recurring: (raw as Income & { isRecurring?: boolean }).recurring ?? (raw as Income & { isRecurring?: boolean }).isRecurring ?? false
  };
}

export function normalizeCategory(raw: Category): Category {
  return {
    ...raw,
    default: (raw as Category & { isDefault?: boolean }).default ?? (raw as Category & { isDefault?: boolean }).isDefault ?? false
  };
}

export function normalizeBudget(raw: Budget): Budget {
  return {
    ...raw,
    active: (raw as Budget & { isActive?: boolean }).active ?? (raw as Budget & { isActive?: boolean }).isActive ?? false
  };
}

export function normalizeRecurring(raw: RecurringTransaction): RecurringTransaction {
  return {
    ...raw,
    active: (raw as RecurringTransaction & { isActive?: boolean }).active ?? (raw as RecurringTransaction & { isActive?: boolean }).isActive ?? false
  };
}

export function normalizeNotification(raw: AppNotification): AppNotification {
  return {
    ...raw,
    read: (raw as AppNotification & { isRead?: boolean }).read ?? (raw as AppNotification & { isRead?: boolean }).isRead ?? false,
    acknowledged: (raw as AppNotification & { isAcknowledged?: boolean }).acknowledged ?? (raw as AppNotification & { isAcknowledged?: boolean }).isAcknowledged ?? false
  };
}

export function toTimelineTransactions(
  expenses: Expense[],
  incomes: Income[],
  categories: Category[]
): TimelineTransaction[] {
  const categoryMap = new Map(categories.map(category => [category.categoryId, category.name]));
  const expenseItems = expenses.map(expense => ({
    id: `expense-${expense.expenseId}`,
    title: expense.title,
    amount: expense.amount,
    categoryLabel: categoryMap.get(expense.categoryId ?? -1) ?? 'Expense',
    transactionType: 'expense' as const,
    date: expense.date,
    notes: expense.notes,
    paymentMethod: expense.paymentMethod
  }));
  const incomeItems = incomes.map(income => ({
    id: `income-${income.incomeId}`,
    title: income.title,
    amount: income.amount,
    categoryLabel: categoryMap.get(income.categoryId ?? -1) ?? income.source ?? 'Income',
    transactionType: 'income' as const,
    date: income.date,
    notes: income.notes,
    paymentMethod: income.source
  }));

  return [...expenseItems, ...incomeItems].sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime());
}

export function buildCategoryBreakdown(expenses: Expense[], categories: Category[]): Array<{ label: string; amount: number; color: string }> {
  const totals = new Map<number, number>();
  for (const expense of expenses) {
    const key = expense.categoryId ?? -1;
    totals.set(key, (totals.get(key) ?? 0) + expense.amount);
  }

  return [...totals.entries()]
    .map(([categoryId, amount]) => {
      const category = categories.find(item => item.categoryId === categoryId);
      return {
        label: category?.name ?? 'Other',
        amount,
        color: category?.colorCode ?? '#888780'
      };
    })
    .sort((a, b) => b.amount - a.amount);
}

export function monthRange(year: number, month: number): { start: string; end: string } {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return {
    start: toIsoDate(start),
    end: toIsoDate(end)
  };
}

export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function sameMonth(dateString: string, date: Date): boolean {
  const parsed = parseDate(dateString);
  return parsed.getFullYear() == date.getFullYear() && parsed.getMonth() == date.getMonth();
}
