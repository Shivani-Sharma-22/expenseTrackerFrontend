import { CommonModule, isPlatformBrowser } from '@angular/common';
import { AfterViewInit, Component, PLATFORM_ID, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Budget, BudgetProgress, Category, Expense, Income, RecurringTransaction } from '../../core/models/api.models';
import { BudgetsApiService } from '../../core/services/budgets-api.service';
import { CategoriesApiService } from '../../core/services/categories-api.service';
import { ExpensesApiService } from '../../core/services/expenses-api.service';
import { IncomeApiService } from '../../core/services/income-api.service';
import { NotificationsApiService } from '../../core/services/notifications-api.service';
import { RecurringApiService } from '../../core/services/recurring-api.service';
import { SessionService } from '../../core/services/session.service';
import { buildCategoryBreakdown, formatCurrency, monthName, parseDate, toTimelineTransactions } from '../../core/utils/formatters';
import { ModalService } from '../../shared/modal.service';

declare const Chart: any;

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent implements AfterViewInit {
  modal = inject(ModalService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly session = inject(SessionService);
  private readonly expensesApi = inject(ExpensesApiService);
  private readonly incomeApi = inject(IncomeApiService);
  private readonly categoriesApi = inject(CategoriesApiService);
  private readonly budgetsApi = inject(BudgetsApiService);
  private readonly recurringApi = inject(RecurringApiService);
  private readonly notificationsApi = inject(NotificationsApiService);

  loading = true;
  errorMessage = '';
  totalIncome = 0;
  totalExpense = 0;
  netSavings = 0;
  savingsRate = 0;
  healthScore = 0;
  budgetAdherence = 0;
  expenseIncomeRatio = 0;
  forecast = 0;
  recentTransactions: ReturnType<typeof toTimelineTransactions> = [];
  budgetSummary: Array<{ name: string; spent: number; limit: number; progress: number }> = [];
  categoryBreakdown: Array<{ label: string; amount: number; color: string }> = [];
  recurringItems: RecurringTransaction[] = [];
  monthlyTrend: Array<{ label: string; income: number; expense: number }> = [];

  private incomeExpenseChart: any;
  private pieChart: any;
  private viewReady = false;

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.loadData();
  }

  private loadData(): void {
    const userId = this.session.userId();
    if (!userId) {
      return;
    }

    this.loading = true;
    const now = new Date();
    const monthRequests = Array.from({ length: 6 }, (_, index) => {
      const target = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      return forkJoin({
        income: this.incomeApi.listByMonth(userId, target.getMonth() + 1, target.getFullYear()).pipe(catchError(() => of([]))),
        expense: this.expensesApi.listByMonth(userId, target.getMonth() + 1, target.getFullYear()).pipe(catchError(() => of([])))
      }).pipe(catchError(() => of({ income: [], expense: [] })));
    });

    forkJoin({
      currentIncome: this.incomeApi.listByMonth(userId, now.getMonth() + 1, now.getFullYear()).pipe(catchError(() => of([] as Income[]))),
      currentExpense: this.expensesApi.listByMonth(userId, now.getMonth() + 1, now.getFullYear()).pipe(catchError(() => of([] as Expense[]))),
      categories: this.categoriesApi.listByUser(userId).pipe(catchError(() => of([] as Category[]))),
      budgets: this.budgetsApi.listActive(userId).pipe(catchError(() => of([] as Budget[]))),
      recurring: this.recurringApi.listActive(userId).pipe(catchError(() => of([] as RecurringTransaction[]))),
      notifications: this.notificationsApi.listByRecipient(userId).pipe(catchError(() => of([]))),
      trends: forkJoin(monthRequests),
    }).subscribe({
      next: ({ currentIncome, currentExpense, categories, budgets, recurring, trends }) => {
        this.totalIncome = currentIncome.reduce((sum, item) => sum + item.amount, 0);
        this.totalExpense = currentExpense.reduce((sum, item) => sum + item.amount, 0);
        this.netSavings = this.totalIncome - this.totalExpense;
        this.savingsRate = this.totalIncome ? (this.netSavings / this.totalIncome) * 100 : 0;
        this.expenseIncomeRatio = this.totalIncome ? this.totalExpense / this.totalIncome : 0;
        this.recentTransactions = toTimelineTransactions(currentExpense, currentIncome, categories).slice(0, 5);
        this.categoryBreakdown = buildCategoryBreakdown(currentExpense, categories).slice(0, 6);
        this.recurringItems = recurring.slice(0, 5);
        this.monthlyTrend = trends.map((entry, index) => ({
          label: monthName((now.getMonth() - (5 - index) + 12) % 12),
          income: entry.income.reduce((sum, item) => sum + item.amount, 0),
          expense: entry.expense.reduce((sum, item) => sum + item.amount, 0)
        }));
        this.forecast = this.monthlyTrend.slice(-3).reduce((sum, item) => sum + item.expense, 0) / Math.max(1, this.monthlyTrend.slice(-3).length);
        this.loadBudgetProgress(budgets, categories);
      },
      error: () => {
        this.errorMessage = 'Unable to load dashboard data.';
        this.loading = false;
      }
    });
  }

  private loadBudgetProgress(budgets: Budget[], categories: Category[]): void {
    if (!budgets.length) {
      this.budgetSummary = [];
      this.budgetAdherence = 100;
      this.healthScore = this.computeHealthScore();
      this.loading = false;
      this.renderCharts();
      return;
    }

    forkJoin(budgets.map(budget => this.budgetsApi.progress(budget.budgetId).pipe(catchError(() => of({ budgetId: budget.budgetId, limitAmount: budget.limitAmount, spentAmount: budget.spentAmount, remainingAmount: budget.limitAmount - budget.spentAmount, percentageUsed: budget.limitAmount ? (budget.spentAmount / budget.limitAmount) * 100 : 0, alertTriggered: false } as BudgetProgress))))).subscribe({
      next: progress => {
        this.budgetSummary = budgets.map(budget => {
          const item = progress.find(entry => entry.budgetId === budget.budgetId);
          return {
            name: categories.find(category => category.categoryId === budget.categoryId)?.name ?? budget.name,
            spent: item?.spentAmount ?? budget.spentAmount,
            limit: budget.limitAmount,
            progress: Math.min(item?.percentageUsed ?? 0, 100)
          };
        });
        this.budgetAdherence = progress.length
          ? progress.reduce((sum, item) => sum + Math.max(0, 100 - Math.max(0, item.percentageUsed - 100)), 0) / progress.length
          : 100;
        this.healthScore = this.computeHealthScore();
      },
      complete: () => {
        this.loading = false;
        this.renderCharts();
      }
    });
  }

  private renderCharts(): void {
    if (!this.viewReady || !isPlatformBrowser(this.platformId)) {
      return;
    }

    this.incomeExpenseChart?.destroy();
    this.pieChart?.destroy();

    this.incomeExpenseChart = new Chart(document.getElementById('incomeExpenseChart'), {
      type: 'bar',
      data: {
        labels: this.monthlyTrend.map(item => item.label),
        datasets: [
          { label: 'Income', data: this.monthlyTrend.map(item => item.income), backgroundColor: '#1D9E75', borderRadius: 4 },
          { label: 'Expenses', data: this.monthlyTrend.map(item => item.expense), backgroundColor: '#E24B4A', borderRadius: 4 }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid: { color: '#f1f1f1' } } } }
    });

    this.pieChart = new Chart(document.getElementById('pieChart'), {
      type: 'doughnut',
      data: {
        labels: this.categoryBreakdown.map(item => item.label),
        datasets: [{ data: this.categoryBreakdown.map(item => item.amount), backgroundColor: this.categoryBreakdown.map(item => item.color), borderWidth: 0, hoverOffset: 6 }]
      },
      options: { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { display: false } } }
    });
  }

  private computeHealthScore(): number {
    if (!this.totalIncome && !this.totalExpense) {
      return 0;
    }

    const savingsScore = Math.max(0, Math.min(100, this.savingsRate * 2));
    const budgetScore = Math.max(0, Math.min(100, this.budgetAdherence));
    const ratioScore = Math.max(0, Math.min(100, 100 - this.expenseIncomeRatio * 100));
    return Math.round(savingsScore * 0.4 + budgetScore * 0.4 + ratioScore * 0.2);
  }

  formatAmount(amount: number): string {
    return formatCurrency(amount, this.session.profile()?.currency ?? 'INR');
  }
}
