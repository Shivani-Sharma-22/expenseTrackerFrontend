import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Category, Expense, ExpenseRequest } from '../../core/models/api.models';
import { CategoriesApiService } from '../../core/services/categories-api.service';
import { ExpensesApiService } from '../../core/services/expenses-api.service';
import { SessionService } from '../../core/services/session.service';
import { formatCurrency, parseDate } from '../../core/utils/formatters';
import { ModalService } from '../../shared/modal.service';

@Component({
  selector: 'app-expenses',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './expenses.html',
  styleUrl: './expenses.css'
})
export class ExpensesComponent implements OnInit {
  modal = inject(ModalService);
  private readonly expensesApi = inject(ExpensesApiService);
  private readonly categoriesApi = inject(CategoriesApiService);
  private readonly session = inject(SessionService);
  private readonly route = inject(ActivatedRoute);

  expenses: Expense[] = [];
  categories: Category[] = [];
  loading = true;
  saving = false;
  errorMessage = '';
  editingExpenseId: number | null = null;

  searchTerm = '';
  categoryFilter = 'ALL';
  methodFilter = 'ALL';
  timeFilter = 'THIS_MONTH';

  readonly paymentMethods = ['CASH', 'CARD', 'UPI', 'BANK', 'WALLET'];

  form: {
    title: string;
    amount: number | null;
    date: string;
    categoryId: number | null;
    paymentMethod: string;
    notes: string;
    receiptUrl: string;
    isRecurring: boolean;
  } = this.emptyForm();

  ngOnInit(): void {
    this.loadData();
    this.route.queryParamMap.subscribe(params => {
      if (params.get('openAdd') === '1') {
        this.openCreate();
      }
    });
  }

  loadData(): void {
    const userId = this.session.userId();
    if (!userId) {
      return;
    }

    this.loading = true;
    forkJoin({
      expenses: this.expensesApi.listByUser(userId),
      categories: this.categoriesApi.listByType(userId, 'EXPENSE')
    }).subscribe({
      next: ({ expenses, categories }) => {
        this.expenses = expenses.sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime());
        this.categories = categories;
      },
      error: () => {
        this.errorMessage = 'Unable to load expenses right now.';
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

  get filteredExpenses(): Expense[] {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    return this.expenses.filter(expense => {
      const category = this.categoryName(expense.categoryId);
      const matchesSearch = !this.searchTerm || [expense.title, expense.notes ?? '', category]
        .join(' ')
        .toLowerCase()
        .includes(this.searchTerm.toLowerCase());
      const matchesCategory = this.categoryFilter === 'ALL' || `${expense.categoryId}` === this.categoryFilter;
      const matchesMethod = this.methodFilter === 'ALL' || (expense.paymentMethod ?? 'UNKNOWN') === this.methodFilter;
      const expenseDate = parseDate(expense.date);
      const matchesTime = this.timeFilter === 'ALL'
        || (this.timeFilter === 'THIS_MONTH' && expenseDate.getMonth() === now.getMonth() && expenseDate.getFullYear() === now.getFullYear())
        || (this.timeFilter === 'LAST_MONTH' && expenseDate.getMonth() === lastMonth.getMonth() && expenseDate.getFullYear() === lastMonth.getFullYear());
      return matchesSearch && matchesCategory && matchesMethod && matchesTime;
    });
  }

  get totalAmount(): number {
    return this.filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  }

  openCreate(): void {
    this.editingExpenseId = null;
    this.form = this.emptyForm();
    this.modal.open('addExpense');
  }

  openEdit(expense: Expense): void {
    this.editingExpenseId = expense.expenseId;
    this.form = {
      title: expense.title,
      amount: expense.amount,
      date: expense.date,
      categoryId: expense.categoryId ?? null,
      paymentMethod: expense.paymentMethod ?? 'CARD',
      notes: expense.notes ?? '',
      receiptUrl: expense.receiptUrl ?? '',
      isRecurring: expense.recurring
    };
    this.modal.open('addExpense');
  }

  saveExpense(): void {
    const userId = this.session.userId();
    const profile = this.session.profile();
    if (!userId || !this.form.title || !this.form.amount || !this.form.date) {
      return;
    }

    if (!this.form.categoryId) {
      this.errorMessage = 'Please select a category for this expense.';
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    const payload: ExpenseRequest = {
      userId,
      categoryId: this.form.categoryId,
      title: this.form.title,
      amount: this.form.amount,
      currency: profile?.currency ?? 'INR',
      type: 'EXPENSE',
      paymentMethod: this.form.paymentMethod,
      date: this.form.date,
      notes: this.form.notes,
      receiptUrl: this.form.receiptUrl,
      isRecurring: this.form.isRecurring,
      recurring: this.form.isRecurring
    } as ExpenseRequest & { recurring: boolean };

    const request = this.editingExpenseId
      ? this.expensesApi.update(this.editingExpenseId, payload)
      : this.expensesApi.create(payload);

    request.subscribe({
      next: () => {
        this.modal.close();
        this.loadData();
      },
      error: () => {
        this.errorMessage = 'Unable to save expense.';
      },
      complete: () => {
        this.saving = false;
      }
    });
  }

  deleteExpense(expense: Expense): void {
    this.expensesApi.remove(expense.expenseId).subscribe({
      next: () => this.loadData(),
      error: () => {
        this.errorMessage = `Unable to delete ${expense.title}.`;
      }
    });
  }

  categoryName(categoryId?: number | null): string {
    return this.categories.find(category => category.categoryId === categoryId)?.name ?? 'Uncategorized';
  }

  formatAmount(amount: number): string {
    return formatCurrency(amount, this.session.profile()?.currency ?? 'INR');
  }

  private emptyForm() {
    return {
      title: '',
      amount: null,
      date: new Date().toISOString().slice(0, 10),
      categoryId: null,
      paymentMethod: 'CARD',
      notes: '',
      receiptUrl: '',
      isRecurring: false
    };
  }
}
