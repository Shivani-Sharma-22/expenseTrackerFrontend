import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { catchError, forkJoin, of, switchMap } from 'rxjs';
import { Budget, BudgetProgress, BudgetRequest, Category } from '../../core/models/api.models';
import { BudgetsApiService } from '../../core/services/budgets-api.service';
import { CategoriesApiService } from '../../core/services/categories-api.service';
import { SessionService } from '../../core/services/session.service';
import { formatCurrency } from '../../core/utils/formatters';
import { ModalService } from '../../shared/modal.service';

@Component({
  selector: 'app-budgets',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './budgets.html',
  styleUrl: './budgets.css'
})
export class BudgetsComponent implements OnInit {
  modal = inject(ModalService);
  private readonly budgetsApi = inject(BudgetsApiService);
  private readonly categoriesApi = inject(CategoriesApiService);
  private readonly session = inject(SessionService);

  budgets: Budget[] = [];
  progressMap = new Map<number, BudgetProgress>();
  categories: Category[] = [];
  alerts: string[] = [];
  loading = true;
  saving = false;
  errorMessage = '';
  editingBudgetId: number | null = null;
  form = this.emptyForm();

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    const userId = this.session.userId();
    if (!userId) {
      this.errorMessage = 'User not logged in';
      this.loading = false;
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.budgetsApi.listByUser(userId).pipe(
      switchMap(budgets => {
        if (!budgets || budgets.length === 0) {
          return forkJoin({
            budgets: of(budgets),
            categories: this.categoriesApi.listByType(userId, 'EXPENSE'),
            alerts: of([] as string[]),
            progress: of([] as BudgetProgress[])
          });
        }
        return forkJoin({
          budgets: of(budgets),
          categories: this.categoriesApi.listByType(userId, 'EXPENSE'),
          alerts: this.budgetsApi.alerts(userId),
          progress: forkJoin(
            budgets.map(budget =>
              this.budgetsApi.progress(budget.budgetId).pipe(
                catchError(() =>
                  of({
                    budgetId: budget.budgetId,
                    limitAmount: budget.limitAmount,
                    spentAmount: budget.spentAmount ?? 0,
                    remainingAmount: budget.limitAmount - (budget.spentAmount ?? 0),
                    percentageUsed: budget.limitAmount > 0 ? ((budget.spentAmount ?? 0) / budget.limitAmount) * 100 : 0,
                    alertTriggered: false,
                    alertMessage: null
                  } as BudgetProgress)
                )
              )
            )
          )
        });
      })
    ).subscribe({
      next: ({ budgets, categories, alerts, progress }) => {
        this.budgets = budgets || [];
        this.categories = categories || [];
        this.alerts = alerts || [];
        this.progressMap = new Map((progress || []).map(item => [item.budgetId, item]));
        console.log('Budgets loaded:', this.budgets.length);
        console.log('Categories:', this.categories.length);
      },
      error: (error) => {
        console.error('Error loading budgets:', error);
        this.errorMessage = 'Unable to load budgets. ' + (error?.error?.message || '');
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

  get totalBudget(): number {
    return this.budgets.reduce((sum, budget) => sum + budget.limitAmount, 0);
  }

  get totalSpent(): number {
    return this.budgets.reduce((sum, budget) => sum + (this.progressMap.get(budget.budgetId)?.spentAmount ?? budget.spentAmount ?? 0), 0);
  }

  get remaining(): number {
    const totalBudget = Number(this.totalBudget) || 0;
    const totalSpent = Number(this.totalSpent) || 0;
    return totalBudget - totalSpent;
  }

  get exceededCount(): number {
    return this.budgets.filter(budget => (this.progressMap.get(budget.budgetId)?.percentageUsed ?? 0) >= 100).length;
  }

  categoryName(categoryId?: number | null): string {
    return this.categories.find(category => category.categoryId === categoryId)?.name ?? 'General';
  }

  progress(budget: Budget): BudgetProgress | undefined {
    return this.progressMap.get(budget.budgetId);
  }

  openCreate(): void {
    this.editingBudgetId = null;
    this.form = this.emptyForm();
    this.errorMessage = '';
    this.modal.open('addBudget');
  }

  openEdit(budget: Budget): void {
    this.editingBudgetId = budget.budgetId;
    this.form = {
      categoryId: budget.categoryId ?? null,
      period: budget.period,
      limitAmount: budget.limitAmount,
      alertThreshold: budget.alertThreshold,
      startDate: budget.startDate,
      endDate: budget.endDate
    };
    this.errorMessage = '';
    this.modal.open('addBudget');
  }

  saveBudget(): void {
    const userId = this.session.userId();
    if (!userId) {
      this.errorMessage = 'User not logged in';
      return;
    }

    if (!this.form.limitAmount || this.form.limitAmount <= 0) {
      this.errorMessage = 'Limit amount must be greater than 0';
      return;
    }

    if (!this.form.categoryId) {
      this.errorMessage = 'Please select a category for this budget';
      return;
    }

    if (!this.form.startDate || !this.form.endDate) {
      this.errorMessage = 'Start and end dates are required';
      return;
    }

    const selectedCategory = this.categories.find(category => category.categoryId === this.form.categoryId);
    const payload: BudgetRequest = {
      userId,
      categoryId: this.form.categoryId,
      name: selectedCategory?.name ?? 'Budget',
      limitAmount: this.form.limitAmount,
      currency: this.session.profile()?.currency ?? 'INR',
      period: this.form.period,
      startDate: this.form.startDate,
      endDate: this.form.endDate,
      spentAmount: 0,
      alertThreshold: this.form.alertThreshold,
      isActive: true,
      active: true
    } as BudgetRequest & { active: boolean };

    console.log('Saving budget:', payload);
    this.saving = true;
    this.errorMessage = '';
    const request = this.editingBudgetId
      ? this.budgetsApi.update(this.editingBudgetId, payload)
      : this.budgetsApi.create(payload);

    request.subscribe({
      next: (response) => {
        console.log('Budget saved successfully:', response);
        this.modal.close();
        this.form = this.emptyForm();
        this.errorMessage = '';
        this.loadData();
      },
      error: (error) => {
        console.error('Error saving budget:', error);
        this.errorMessage = 'Unable to save budget: ' + (error?.error?.message || error?.message || 'Unknown error');
        this.saving = false;
      },
      complete: () => {
        this.saving = false;
      }
    });
  }

  deleteBudget(budget: Budget): void {
    if (!confirm(`Are you sure you want to delete "${budget.name}"?`)) {
      return;
    }
    this.budgetsApi.remove(budget.budgetId).subscribe({
      next: () => {
        console.log('Budget deleted:', budget.budgetId);
        this.loadData();
      },
      error: (error) => {
        console.error('Error deleting budget:', error);
        this.errorMessage = `Unable to delete ${budget.name}: ` + (error?.error?.message || '');
      }
    });
  }

  formatAmount(amount: number): string {
    return formatCurrency(amount, this.session.profile()?.currency ?? 'INR');
  }

  clampPercentage(value: number | undefined): number {
    return Math.min(value ?? 0, 100);
  }

  private emptyForm() {
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
    const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);
    return {
      categoryId: null as number | null,
      period: 'MONTHLY',
      limitAmount: 0,
      alertThreshold: 80,
      startDate,
      endDate
    };
  }
}
