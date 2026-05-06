import { CommonModule, isPlatformBrowser } from '@angular/common';
import { AfterViewInit, Component, PLATFORM_ID, inject } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Category, Expense, Income } from '../../core/models/api.models';
import { CategoriesApiService } from '../../core/services/categories-api.service';
import { ExpensesApiService } from '../../core/services/expenses-api.service';
import { IncomeApiService } from '../../core/services/income-api.service';
import { SessionService } from '../../core/services/session.service';
import { buildCategoryBreakdown, formatCurrency, monthName, parseDate } from '../../core/utils/formatters';

declare const Chart: any;

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './analytics.html',
  styleUrl: './analytics.css'
})
export class AnalyticsComponent implements AfterViewInit {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly session = inject(SessionService);
  private readonly expensesApi = inject(ExpensesApiService);
  private readonly incomeApi = inject(IncomeApiService);
  private readonly categoriesApi = inject(CategoriesApiService);

  loading = true;
  errorMessage = '';
  annualIncome = 0;
  annualExpense = 0;
  annualSavings = 0;
  averageHealth = 0;
  topCategories: Array<{ label: string; amount: number; percentage: number }> = [];

  private savingsTrendChart: any;
  private dailyTrendChart: any;
  private cashflowChart: any;
  private viewReady = false;
  private savingsTrend: Array<{ label: string; value: number }> = [];
  private dailyTrend: Array<{ label: string; value: number }> = [];
  private cashflowTrend: Array<{ label: string; income: number; expense: number }> = [];

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.loadData();
  }

  private loadData(): void {
    const userId = this.session.userId();
    if (!userId) {
      return;
    }

    const now = new Date();
    const monthRequests = Array.from({ length: 12 }, (_, index) => {
      const target = new Date(now.getFullYear(), now.getMonth() - (11 - index), 1);
      return forkJoin({
        income: this.incomeApi.listByMonth(userId, target.getMonth() + 1, target.getFullYear()).pipe(catchError(() => of([] as Income[]))),
        expenses: this.expensesApi.listByMonth(userId, target.getMonth() + 1, target.getFullYear()).pipe(catchError(() => of([] as Expense[])))
      });
    });

    forkJoin({
      months: forkJoin(monthRequests),
      currentExpenses: this.expensesApi.listByMonth(userId, now.getMonth() + 1, now.getFullYear()).pipe(catchError(() => of([] as Expense[]))),
      categories: this.categoriesApi.listByType(userId, 'EXPENSE').pipe(catchError(() => of([] as Category[])))
    }).subscribe({
      next: ({ months, currentExpenses, categories }) => {
        this.cashflowTrend = months.map((entry, index) => {
          const income = entry.income.reduce((sum, item) => sum + item.amount, 0);
          const expense = entry.expenses.reduce((sum, item) => sum + item.amount, 0);
          return {
            label: monthName((now.getMonth() - (11 - index) + 12) % 12),
            income,
            expense
          };
        });
        this.savingsTrend = this.cashflowTrend.map(item => ({
          label: item.label,
          value: item.income ? ((item.income - item.expense) / item.income) * 100 : 0
        }));
        this.annualIncome = this.cashflowTrend.reduce((sum, item) => sum + item.income, 0);
        this.annualExpense = this.cashflowTrend.reduce((sum, item) => sum + item.expense, 0);
        this.annualSavings = this.annualIncome - this.annualExpense;
        this.averageHealth = this.savingsTrend.length ? this.savingsTrend.reduce((sum, item) => sum + Math.max(0, Math.min(100, item.value * 2)), 0) / this.savingsTrend.length : 0;
        this.dailyTrend = this.buildDailyTrend(currentExpenses);
        const breakdown = buildCategoryBreakdown(currentExpenses, categories);
        const total = breakdown.reduce((sum, item) => sum + item.amount, 0) || 1;
        this.topCategories = breakdown.slice(0, 5).map(item => ({
          label: item.label,
          amount: item.amount,
          percentage: (item.amount / total) * 100
        }));
        this.loading = false;
        this.renderCharts();
      },
      error: () => {
        this.errorMessage = 'Unable to load analytics data.';
        this.loading = false;
      }
    });
  }

  private buildDailyTrend(expenses: Expense[]): Array<{ label: string; value: number }> {
    const dayMap = new Map<string, number>();
    for (const expense of expenses) {
      const date = parseDate(expense.date);
      const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dayMap.set(label, (dayMap.get(label) ?? 0) + expense.amount);
    }
    return [...dayMap.entries()].map(([label, value]) => ({ label, value }));
  }

  private renderCharts(): void {
    if (!this.viewReady || !isPlatformBrowser(this.platformId)) {
      return;
    }

    this.savingsTrendChart?.destroy();
    this.dailyTrendChart?.destroy();
    this.cashflowChart?.destroy();

    this.savingsTrendChart = new Chart(document.getElementById('savingsTrendChart'), {
      type: 'line',
      data: {
        labels: this.savingsTrend.map(item => item.label),
        datasets: [{ label: 'Savings Rate %', data: this.savingsTrend.map(item => item.value), borderColor: '#1D9E75', backgroundColor: 'rgba(29,158,117,0.08)', tension: 0.4, fill: true, pointRadius: 3, pointBackgroundColor: '#1D9E75' }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid: { color: '#f1f1f1' } } } }
    });

    this.dailyTrendChart = new Chart(document.getElementById('dailyTrendChart'), {
      type: 'line',
      data: {
        labels: this.dailyTrend.map(item => item.label),
        datasets: [{ label: 'Expenses', data: this.dailyTrend.map(item => item.value), borderColor: '#E24B4A', backgroundColor: 'rgba(226,75,74,0.06)', tension: 0.3, fill: true, pointRadius: 2, pointBackgroundColor: '#E24B4A' }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { maxTicksLimit: 8 } }, y: { grid: { color: '#f1f1f1' } } } }
    });

    this.cashflowChart = new Chart(document.getElementById('cashflowChart'), {
      type: 'bar',
      data: {
        labels: this.cashflowTrend.map(item => item.label),
        datasets: [
          { label: 'Inflow', data: this.cashflowTrend.map(item => item.income), backgroundColor: 'rgba(29,158,117,0.7)', borderRadius: 4 },
          { label: 'Outflow', data: this.cashflowTrend.map(item => item.expense * -1), backgroundColor: 'rgba(226,75,74,0.7)', borderRadius: 4 }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid: { color: '#f1f1f1' } } } }
    });
  }

  formatAmount(amount: number): string {
    return formatCurrency(amount, this.session.profile()?.currency ?? 'INR');
  }
}
