import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { Category, CategoryRequest, Expense, Income } from '../../core/models/api.models';
import { CategoriesApiService } from '../../core/services/categories-api.service';
import { ExpensesApiService } from '../../core/services/expenses-api.service';
import { IncomeApiService } from '../../core/services/income-api.service';
import { SessionService } from '../../core/services/session.service';
import { formatCurrency, parseDate } from '../../core/utils/formatters';
import { ModalService } from '../../shared/modal.service';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './categories.html',
  styleUrl: './categories.css'
})
export class CategoriesComponent implements OnInit {
  modal = inject(ModalService);
  private readonly categoriesApi = inject(CategoriesApiService);
  private readonly expensesApi = inject(ExpensesApiService);
  private readonly incomeApi = inject(IncomeApiService);
  private readonly session = inject(SessionService);

  categories: Category[] = [];
  expenses: Expense[] = [];
  incomes: Income[] = [];
  loading = true;
  saving = false;
  errorMessage = '';
  editingCategoryId: number | null = null;
  form = this.emptyForm();

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    const userId = this.session.userId();
    if (!userId) {
      return;
    }

    this.loading = true;
    forkJoin({
      categories: this.categoriesApi.listByUser(userId),
      expenses: this.expensesApi.listByUser(userId),
      incomes: this.incomeApi.listByUser(userId)
    }).subscribe({
      next: ({ categories, expenses, incomes }) => {
        this.categories = categories;
        this.expenses = expenses;
        this.incomes = incomes;
      },
      error: () => {
        this.errorMessage = 'Unable to load categories.';
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

  get expenseCategories(): Category[] {
    return this.categories.filter(category => category.type === 'EXPENSE');
  }

  get incomeCategories(): Category[] {
    return this.categories.filter(category => category.type === 'INCOME');
  }

  transactionCount(category: Category): number {
    return this.transactionsFor(category).length;
  }

  currentMonthTotal(category: Category): number {
    const currentMonth = new Date();
    return this.transactionsFor(category)
      .filter(item => {
        const date = parseDate(item.date);
        return date.getMonth() === currentMonth.getMonth() && date.getFullYear() === currentMonth.getFullYear();
      })
      .reduce((sum, item) => sum + item.amount, 0);
  }

  transactionsFor(category: Category): Array<Expense | Income> {
    const source = category.type === 'EXPENSE' ? this.expenses : this.incomes;
    return source.filter(item => item.categoryId === category.categoryId);
  }

  openCreate(): void {
    this.editingCategoryId = null;
    this.form = this.emptyForm();
    this.modal.open('addCategory');
  }

  openEdit(category: Category): void {
    this.editingCategoryId = category.categoryId;
    this.form = {
      name: category.name,
      type: category.type,
      icon: category.icon ?? '',
      colorCode: category.colorCode ?? '#1D9E75',
      budgetLimit: category.budgetLimit || 0
    };
    this.modal.open('addCategory');
  }

  saveCategory(): void {
    const userId = this.session.userId();
    if (!userId || !this.form.name) {
      return;
    }

    this.saving = true;
    const payload: CategoryRequest = {
      userId,
      name: this.form.name,
      type: this.form.type,
      icon: this.form.icon,
      colorCode: this.form.colorCode,
      budgetLimit: this.form.budgetLimit || 0,
      isDefault: false,
      'default': false
    } as CategoryRequest & { default: boolean };

    const request = this.editingCategoryId
      ? this.categoriesApi.update(this.editingCategoryId, payload)
      : this.categoriesApi.create(payload);

    request.subscribe({
      next: category => {
        if (payload.type === 'EXPENSE') {
          this.categoriesApi.updateBudget(category.categoryId, payload.budgetLimit).subscribe({ next: () => this.loadData(), error: () => this.loadData() });
        } else {
          this.loadData();
        }
        this.modal.close();
      },
      error: () => {
        this.errorMessage = 'Unable to save category.';
      },
      complete: () => {
        this.saving = false;
      }
    });
  }

  removeCategory(category: Category): void {
    this.categoriesApi.remove(category.categoryId).subscribe({
      next: () => this.loadData(),
      error: () => {
        this.errorMessage = `Unable to delete ${category.name}.`;
      }
    });
  }

  formatAmount(amount: number): string {
    return formatCurrency(amount, this.session.profile()?.currency ?? 'INR');
  }

  private emptyForm() {
    return {
      name: '',
      type: 'EXPENSE',
      icon: '',
      colorCode: '#1D9E75',
      budgetLimit: 0
    };
  }
}
