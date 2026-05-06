import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { AppNotification } from '../../core/models/api.models';
import { NotificationsApiService } from '../../core/services/notifications-api.service';
import { SessionService } from '../../core/services/session.service';
import { daysAgoLabel, severityClass } from '../../core/utils/formatters';
import { interval, startWith } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications.html',
  styleUrl: './notifications.css'
})
export class NotificationsComponent implements OnInit {
  private readonly notificationsApi = inject(NotificationsApiService);
  private readonly session = inject(SessionService);
  private readonly destroyRef = inject(DestroyRef);

  notifications: AppNotification[] = [];
  loading = true;
  errorMessage = '';

  ngOnInit(): void {
    interval(10000).pipe(
      startWith(0),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => this.loadNotifications());
  }

  loadNotifications(): void {
    const userId = this.session.userId();
    if (!userId) {
      return;
    }

    this.loading = true;
    this.notificationsApi.listByRecipient(userId).subscribe({
      next: items => {
        this.notifications = items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      },
      error: () => {
        this.errorMessage = 'Unable to load notifications.';
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

  markAllRead(): void {
    const userId = this.session.userId();
    if (!userId) {
      return;
    }

    this.notificationsApi.markAllRead(userId).subscribe({
      next: () => this.loadNotifications()
    });
  }

  markRead(notification: AppNotification): void {
    this.notificationsApi.markAsRead(notification.notificationId).subscribe({
      next: () => this.loadNotifications()
    });
  }

  dismiss(notification: AppNotification): void {
    this.notificationsApi.remove(notification.notificationId).subscribe({
      next: () => this.loadNotifications()
    });
  }

  notifClass(notification: AppNotification): string {
    return severityClass(notification.severity);
  }

  notifTime(notification: AppNotification): string {
    return daysAgoLabel(notification.createdAt);
  }
}
