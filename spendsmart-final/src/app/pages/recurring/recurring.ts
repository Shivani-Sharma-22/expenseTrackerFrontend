import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { Category, RecurringRequest, RecurringTransaction } from '../../core/models/api.models';
import { CategoriesApiService } from '../../core/services/categories-api.service';
import { RecurringApiService } from '../../core/services/recurring-api.service';
import { SessionService } from '../../core/services/session.service';
import { formatCurrency, parseDate } from '../../core/utils/formatters';
import { ModalService } from '../../shared/modal.service';

@Component({
  selector: 'app-recurring',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './recurring.html',
  styleUrl: './recurring.css'
})
export class RecurringComponent implements OnInit {
  modal = inject(ModalService);
  private readonly recurringApi = inject(RecurringApiService);
  private readonly categoriesApi = inject(CategoriesApiService);
  private readonly session = inject(SessionService);

  transactions: RecurringTransaction[] = [];
  categories: Category[] = [];
  loading = true;
  saving = false;
  errorMessage = '';
  editingRecurringId: number | null = null;
  readonly frequencies = ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'];
  readonly types = ['EXPENSE', 'INCOME'];
  readonly paymentMethods = ['CASH', 'CARD', 'UPI', 'BANK', 'WALLET'];
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
      transactions: this.recurringApi.listByUser(userId),
      categories: this.categoriesApi.listByUser(userId)
    }).subscribe({
      next: ({ transactions, categories }) => {
        this.transactions = transactions.sort((a, b) => parseDate(a.nextDueDate ?? a.startDate).getTime() - parseDate(b.nextDueDate ?? b.startDate).getTime());
        this.categories = categories;
      },
      error: () => {
        this.errorMessage = 'Unable to load recurring transactions.';
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

  get expenseRules(): RecurringTransaction[] {
    return this.transactions.filter(transaction => transaction.type === 'EXPENSE');
  }

  get incomeRules(): RecurringTransaction[] {
    return this.transactions.filter(transaction => transaction.type === 'INCOME');
  }

  openCreate(): void {
    this.editingRecurringId = null;
    this.form = this.emptyForm();
    this.modal.open('addRecurring');
  }

  openEdit(transaction: RecurringTransaction): void {
    this.editingRecurringId = transaction.recurringId;
    this.form = {
      title: transaction.title,
      amount: transaction.amount,
      type: transaction.type,
      frequency: transaction.frequency,
      categoryId: transaction.categoryId ?? null,
      startDate: transaction.startDate,
      endDate: transaction.endDate ?? '',
      description: transaction.description ?? '',
      paymentMethod: transaction.paymentMethod ?? 'CARD',
      isActive: transaction.active
    };
    this.modal.open('addRecurring');
  }

  saveRecurring(): void {
    const userId = this.session.userId();
    if (!userId || !this.form.title || !this.form.amount) {
      return;
    }

    this.saving = true;
    const payload: RecurringRequest = {
      userId,
      categoryId: this.form.categoryId,
      title: this.form.title,
      amount: this.form.amount,
      type: this.form.type,
      frequency: this.form.frequency,
      startDate: this.form.startDate,
      endDate: this.form.endDate || null,
      nextDueDate: this.form.startDate,
      isActive: this.form.isActive,
      active: this.form.isActive,
      description: this.form.description,
      paymentMethod: this.form.paymentMethod
    } as RecurringRequest & { active: boolean };

    const request = this.editingRecurringId
      ? this.recurringApi.update(this.editingRecurringId, payload)
      : this.recurringApi.create(payload);

    request.subscribe({
      next: () => {
        this.modal.close();
        this.loadData();
      },
      error: () => {
        this.errorMessage = 'Unable to save recurring transaction.';
      },
      complete: () => {
        this.saving = false;
      }
    });
  }

  toggleActive(transaction: RecurringTransaction): void {
    const payload: RecurringRequest = {
      userId: transaction.userId,
      categoryId: transaction.categoryId,
      title: transaction.title,
      amount: transaction.amount,
      type: transaction.type,
      frequency: transaction.frequency,
      startDate: transaction.startDate,
      endDate: transaction.endDate ?? null,
      nextDueDate: transaction.nextDueDate ?? transaction.startDate,
      isActive: !transaction.active,
      active: !transaction.active,
      description: transaction.description ?? null,
      paymentMethod: transaction.paymentMethod ?? null
    } as RecurringRequest & { active: boolean };

    this.recurringApi.update(transaction.recurringId, payload).subscribe({
      next: () => this.loadData()
    });
  }

  remove(transaction: RecurringTransaction): void {
    this.recurringApi.remove(transaction.recurringId).subscribe({
      next: () => this.loadData()
    });
  }

  categoryName(categoryId?: number | null): string {
    return this.categories.find(category => category.categoryId === categoryId)?.name ?? 'General';
  }

  formatAmount(amount: number): string {
    return formatCurrency(amount, this.session.profile()?.currency ?? 'INR');
  }

  private emptyForm() {
    return {
      title: '',
      amount: 0,
      type: 'EXPENSE',
      frequency: 'MONTHLY',
      categoryId: null as number | null,
      startDate: new Date().toISOString().slice(0, 10),
      endDate: '',
      description: '',
      paymentMethod: 'CARD',
      isActive: true
    };
  }
}
