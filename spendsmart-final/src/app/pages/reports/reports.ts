import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, PLATFORM_ID, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { Expense, Income } from '../../core/models/api.models';
import { ExpensesApiService } from '../../core/services/expenses-api.service';
import { IncomeApiService } from '../../core/services/income-api.service';
import { SessionService } from '../../core/services/session.service';
import { formatCurrency, toTimelineTransactions } from '../../core/utils/formatters';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reports.html',
  styleUrl: './reports.css'
})
export class ReportsComponent {
  private readonly expensesApi = inject(ExpensesApiService);
  private readonly incomeApi = inject(IncomeApiService);
  private readonly session = inject(SessionService);
  private readonly platformId = inject(PLATFORM_ID);

  filters = {
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
    end: new Date().toISOString().slice(0, 10),
    reportType: 'ALL'
  };

  expenses: Expense[] = [];
  incomes: Income[] = [];
  loading = false;
  message = '';
  errorMessage = '';

  fetchReport(): void {
    const userId = this.session.userId();
    if (!userId) {
      return;
    }

    this.loading = true;
    forkJoin({
      expenses: this.expensesApi.listByRange(userId, this.filters.start, this.filters.end),
      incomes: this.incomeApi.listByRange(userId, this.filters.start, this.filters.end)
    }).subscribe({
      next: ({ expenses, incomes }) => {
        this.expenses = expenses;
        this.incomes = incomes;
        this.message = 'Report data is ready.';
        this.errorMessage = '';
      },
      error: () => {
        this.errorMessage = 'Unable to generate report data.';
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

  exportCsv(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const rows: string[][] = [['date', 'type', 'title', 'category', 'amount']];
    const transactions = toTimelineTransactions(this.filteredExpenses(), this.filteredIncomes(), []);
    for (const item of transactions) {
      rows.push([item.date, item.transactionType, item.title, item.categoryLabel, String(item.amount)]);
    }

    const csv = rows
      .map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `spendsmart-report-${this.filters.start}-to-${this.filters.end}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  exportPdf(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const reportWindow = window.open('', '_blank');
    if (!reportWindow) {
      return;
    }

    const income = this.filteredIncomes().reduce((sum, item) => sum + item.amount, 0);
    const expense = this.filteredExpenses().reduce((sum, item) => sum + item.amount, 0);
    reportWindow.document.write(`
      <html>
        <head><title>SpendSmart Report</title></head>
        <body style="font-family: Arial, sans-serif; padding: 24px;">
          <h1>SpendSmart Report</h1>
          <p>Range: ${this.filters.start} to ${this.filters.end}</p>
          <p>Total Income: ${this.formatAmount(income)}</p>
          <p>Total Expense: ${this.formatAmount(expense)}</p>
          <p>Net Savings: ${this.formatAmount(income - expense)}</p>
        </body>
      </html>
    `);
    reportWindow.document.close();
    reportWindow.print();
  }

  filteredExpenses(): Expense[] {
    return this.filters.reportType === 'INCOME_ONLY' ? [] : this.expenses;
  }

  filteredIncomes(): Income[] {
    return this.filters.reportType === 'EXPENSES_ONLY' ? [] : this.incomes;
  }

  get totalIncome(): number {
    return this.filteredIncomes().reduce((sum, item) => sum + item.amount, 0);
  }

  get totalExpense(): number {
    return this.filteredExpenses().reduce((sum, item) => sum + item.amount, 0);
  }

  formatAmount(amount: number): string {
    return formatCurrency(amount, this.session.profile()?.currency ?? 'INR');
  }
}
