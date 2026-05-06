import { environment } from '../../../environments/environment';

const baseUrl = environment.apiBaseUrl;

export const apiConfig = {
  baseUrl,
  auth: `${baseUrl}/api/auth`,
  expenses: `${baseUrl}/api/expenses`,
  incomes: `${baseUrl}/api/incomes`,
  categories: `${baseUrl}/api/categories`,
  budgets: `${baseUrl}/api/budgets`,
  analytics: `${baseUrl}/api/analytics`,
  recurring: `${baseUrl}/api/recurring`,
  notifications: `${baseUrl}/api/notifications`
} as const;
