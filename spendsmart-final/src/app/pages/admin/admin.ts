import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AppNotification, UserProfile } from '../../core/models/api.models';
import { AuthApiService } from '../../core/services/auth-api.service';
import { ExpensesApiService } from '../../core/services/expenses-api.service';
import { IncomeApiService } from '../../core/services/income-api.service';
import { NotificationsApiService } from '../../core/services/notifications-api.service';
import { SessionService } from '../../core/services/session.service';
import { formatCurrency } from '../../core/utils/formatters';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.html',
  styleUrl: './admin.css'
})
export class AdminComponent implements OnInit {
  private readonly authApi = inject(AuthApiService);
  private readonly expensesApi = inject(ExpensesApiService);
  private readonly incomeApi = inject(IncomeApiService);
  private readonly notificationsApi = inject(NotificationsApiService);
  private readonly session = inject(SessionService);

  users: UserProfile[] = [];
  notifications: AppNotification[] = [];
  userSpendMap = new Map<number, number>();
  loading = true;
  sending = false;
  errorMessage = '';
  message = '';

  broadcastForm = {
    title: '',
    message: ''
  };

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    forkJoin({
      users: this.authApi.getUsers().pipe(catchError(() => of([]))),
      notifications: this.notificationsApi.listAll().pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ users, notifications }) => {
        this.users = users;
        this.notifications = notifications;
        this.loadSpendForUsers();
      },
      error: () => {
        this.errorMessage = 'Unable to load admin dashboard.';
        this.loading = false;
      }
    });
  }

  private loadSpendForUsers(): void {
    const now = new Date();
    const requests = this.users.map(user =>
      this.expensesApi.listByMonth(user.userId, now.getMonth() + 1, now.getFullYear()).pipe(
        catchError(() => of([]))
      )
    );

    if (!requests.length) {
      this.loading = false;
      return;
    }

    forkJoin(requests).subscribe({
      next: results => {
        results.forEach((expenses, index) => {
          const total = expenses.reduce((sum, item) => sum + item.amount, 0);
          this.userSpendMap.set(this.users[index].userId, total);
        });
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

  get totalUsers(): number {
    return this.users.length;
  }

  get totalTransactions(): number {
    return this.notifications.length;
  }

  get averageSpend(): number {
    if (!this.users.length) {
      return 0;
    }
    const total = [...this.userSpendMap.values()].reduce((sum, value) => sum + value, 0);
    return total / this.users.length;
  }

  get alertsToday(): number {
    const today = new Date().toDateString();
    return this.notifications.filter(item => new Date(item.createdAt).toDateString() === today).length;
  }

  monthlySpend(user: UserProfile): number {
    return this.userSpendMap.get(user.userId) ?? 0;
  }

  deactivate(user: UserProfile): void {
    this.authApi.deactivate(user.userId).subscribe({
      next: () => {
        this.message = `${user.email} deactivated.`;
        this.loadData();
      }
    });
  }

  sendBroadcast(): void {
    if (!this.broadcastForm.title || !this.broadcastForm.message) {
      return;
    }

    this.sending = true;
    const userIds = this.users.map(user => user.userId);
    this.notificationsApi.sendBulk(userIds, this.broadcastForm.title, this.broadcastForm.message).subscribe({
      next: () => {
        this.message = 'Broadcast sent successfully.';
        this.broadcastForm = { title: '', message: '' };
        this.loadData();
      },
      error: () => {
        this.errorMessage = 'Unable to send broadcast.';
      },
      complete: () => {
        this.sending = false;
      }
    });
  }

  formatAmount(amount: number): string {
    return formatCurrency(amount, this.session.profile()?.currency ?? 'INR');
  }
}
