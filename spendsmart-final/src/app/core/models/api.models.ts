export interface SessionUser {
  userId: number;
  email: string;
  fullName: string;
  token: string;
}

export interface AuthResponse {
  token: string;
  userId: number;
  email: string;
  fullName: string;
  refreshToken?: string | null;
}

export interface UserProfile {
  userId: number;
  fullName: string;
  email: string;
  currency: string;
  timezone: string;
  avatarUrl?: string | null;
  monthlyBudget?: number | null;
  bio?: string | null;
  isActive?: boolean;
}

export interface Expense {
  expenseId: number;
  userId: number;
  categoryId?: number | null;
  title: string;
  amount: number;
  currency: string;
  type: string;
  paymentMethod?: string | null;
  date: string;
  notes?: string | null;
  receiptUrl?: string | null;
  recurring: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ExpenseRequest {
  userId: number;
  categoryId?: number | null;
  title: string;
  amount: number;
  currency: string;
  type: string;
  paymentMethod?: string | null;
  date: string;
  notes?: string | null;
  receiptUrl?: string | null;
  isRecurring: boolean;
}

export interface Income {
  incomeId: number;
  userId: number;
  categoryId?: number | null;
  title: string;
  amount: number;
  currency: string;
  source: string;
  date: string;
  notes?: string | null;
  recurring: boolean;
  recurrencePeriod?: string | null;
  createdAt?: string;
}

export interface IncomeRequest {
  userId: number;
  categoryId?: number | null;
  title: string;
  amount: number;
  currency: string;
  source: string;
  date: string;
  notes?: string | null;
  isRecurring: boolean;
  recurrencePeriod?: string | null;
}

export interface Category {
  categoryId: number;
  userId: number;
  name: string;
  type: 'EXPENSE' | 'INCOME' | string;
  icon?: string | null;
  colorCode?: string | null;
  budgetLimit: number;
  default: boolean;
  createdAt?: string;
}

export interface CategoryRequest {
  userId: number;
  name: string;
  type: string;
  icon?: string | null;
  colorCode?: string | null;
  budgetLimit: number;
  isDefault: boolean;
}

export interface Budget {
  budgetId: number;
  userId: number;
  categoryId?: number | null;
  name: string;
  limitAmount: number;
  currency: string;
  period: 'MONTHLY' | 'WEEKLY' | 'CUSTOM' | string;
  startDate: string;
  endDate: string;
  spentAmount: number;
  alertThreshold: number;
  active: boolean;
}

export interface BudgetRequest {
  userId: number;
  categoryId?: number | null;
  name: string;
  limitAmount: number;
  currency: string;
  period: string;
  startDate: string;
  endDate: string;
  spentAmount: number;
  alertThreshold: number;
  isActive: boolean;
}

export interface BudgetProgress {
  budgetId: number;
  limitAmount: number;
  spentAmount: number;
  remainingAmount: number;
  percentageUsed: number;
  alertTriggered: boolean;
  alertMessage?: string | null;
}

export interface RecurringTransaction {
  recurringId: number;
  userId: number;
  categoryId?: number | null;
  title: string;
  amount: number;
  type: 'EXPENSE' | 'INCOME' | string;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | string;
  startDate: string;
  endDate?: string | null;
  nextDueDate?: string | null;
  active: boolean;
  description?: string | null;
  paymentMethod?: string | null;
}

export interface RecurringRequest {
  userId: number;
  categoryId?: number | null;
  title: string;
  amount: number;
  type: string;
  frequency: string;
  startDate: string;
  endDate?: string | null;
  nextDueDate?: string | null;
  isActive: boolean;
  description?: string | null;
  paymentMethod?: string | null;
}

export interface AppNotification {
  notificationId: number;
  recipientId: number;
  type: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL' | string;
  title: string;
  message: string;
  relatedId?: number | null;
  relatedType?: string | null;
  read: boolean;
  acknowledged: boolean;
  createdAt: string;
}

export interface MonthlySummary {
  income: number;
  expense: number;
  savings: number;
}

export interface YearlySummary {
  income: number;
  expense: number;
}
