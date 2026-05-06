import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { Category, Income, IncomeRequest } from '../../core/models/api.models';
import { CategoriesApiService } from '../../core/services/categories-api.service';
import { IncomeApiService } from '../../core/services/income-api.service';
import { SessionService } from '../../core/services/session.service';
import { formatCurrency, parseDate } from '../../core/utils/formatters';
import { ModalService } from '../../shared/modal.service';

@Component({
  selector: 'app-income',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './income.html',
  styleUrl: './income.css'
})
export class IncomeComponent implements OnInit {
  modal = inject(ModalService);
  private readonly incomeApi = inject(IncomeApiService);
  private readonly categoriesApi = inject(CategoriesApiService);
  private readonly session = inject(SessionService);

  incomes: Income[] = [];
  categories: Category[] = [];
  loading = true;
  saving = false;
  errorMessage = '';
  editingIncomeId: number | null = null;

  searchTerm = '';
  sourceFilter = 'ALL';
  timeFilter = 'THIS_MONTH';
  readonly sourceOptions = ['SALARY', 'FREELANCE', 'BUSINESS', 'INVESTMENT', 'GIFT', 'OTHER'];
  readonly recurrenceOptions = ['MONTHLY', 'WEEKLY', 'QUARTERLY', 'YEARLY'];

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
      incomes: this.incomeApi.listByUser(userId),
      categories: this.categoriesApi.listByType(userId, 'INCOME')
    }).subscribe({
      next: ({ incomes, categories }) => {
        this.incomes = incomes.sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime());
        this.categories = categories;
      },
      error: () => {
        this.errorMessage = 'Unable to load income records.';
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

  get filteredIncomes(): Income[] {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return this.incomes.filter(income => {
      const matchesSearch = !this.searchTerm || [income.title, income.source, income.notes ?? '']
        .join(' ')
        .toLowerCase()
        .includes(this.searchTerm.toLowerCase());
      const matchesSource = this.sourceFilter === 'ALL' || income.source === this.sourceFilter;
      const incomeDate = parseDate(income.date);
      const matchesTime = this.timeFilter === 'ALL'
        || (this.timeFilter === 'THIS_MONTH' && incomeDate.getMonth() === now.getMonth() && incomeDate.getFullYear() === now.getFullYear())
        || (this.timeFilter === 'LAST_MONTH' && incomeDate.getMonth() === lastMonth.getMonth() && incomeDate.getFullYear() === lastMonth.getFullYear());
      return matchesSearch && matchesSource && matchesTime;
    });
  }

  get totalAmount(): number {
    return this.filteredIncomes.reduce((sum, income) => sum + income.amount, 0);
  }

  openCreate(): void {
    this.editingIncomeId = null;
    this.form = this.emptyForm();
    this.modal.open('addIncome');
  }

  openEdit(income: Income): void {
    this.editingIncomeId = income.incomeId;
    this.form = {
      title: income.title,
      amount: income.amount,
      date: income.date,
      categoryId: income.categoryId ?? null,
      source: income.source,
      notes: income.notes ?? '',
      isRecurring: income.recurring,
      recurrencePeriod: income.recurrencePeriod ?? 'MONTHLY'
    };
    this.modal.open('addIncome');
  }

  saveIncome(): void {
    const userId = this.session.userId();
    if (!userId || !this.form.title || !this.form.amount || !this.form.date) {
      return;
    }

    this.saving = true;
    const payload: IncomeRequest = {
      userId,
      categoryId: this.form.categoryId,
      title: this.form.title,
      amount: this.form.amount,
      currency: this.session.profile()?.currency ?? 'INR',
      source: this.form.source,
      date: this.form.date,
      notes: this.form.notes,
      isRecurring: this.form.isRecurring,
      recurring: this.form.isRecurring,
      recurrencePeriod: this.form.isRecurring ? this.form.recurrencePeriod : null
    } as IncomeRequest & { recurring: boolean };

    const request = this.editingIncomeId
      ? this.incomeApi.update(this.editingIncomeId, payload)
      : this.incomeApi.create(payload);

    request.subscribe({
      next: () => {
        this.modal.close();
        this.loadData();
      },
      error: () => {
        this.errorMessage = 'Unable to save income.';
      },
      complete: () => {
        this.saving = false;
      }
    });
  }

  deleteIncome(income: Income): void {
    this.incomeApi.remove(income.incomeId).subscribe({
      next: () => this.loadData(),
      error: () => {
        this.errorMessage = `Unable to delete ${income.title}.`;
      }
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
      amount: null as number | null,
      date: new Date().toISOString().slice(0, 10),
      categoryId: null as number | null,
      source: 'SALARY',
      notes: '',
      isRecurring: false,
      recurrencePeriod: 'MONTHLY'
    };
  }
}
