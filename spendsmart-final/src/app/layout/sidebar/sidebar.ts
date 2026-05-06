import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NotificationsApiService } from '../../core/services/notifications-api.service';
import { SessionService } from '../../core/services/session.service';
import { initials } from '../../core/utils/formatters';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrls: ['./sidebar.css']
})
export class SidebarComponent implements OnInit {
  protected readonly session = inject(SessionService);
  private readonly notificationsApi = inject(NotificationsApiService);

  unreadCount = 0;
  userInitials = computed(() => initials(this.session.profile()?.fullName ?? this.session.session()?.fullName));
  userName = computed(() => this.session.profile()?.fullName ?? this.session.session()?.fullName ?? 'Your Account');
  userMeta = computed(() => `Personal ? ${this.session.profile()?.currency ?? 'INR'}`);

  ngOnInit(): void {
    const userId = this.session.userId();
    if (!userId) {
      return;
    }

    this.notificationsApi.unreadCount(userId).subscribe({
      next: count => (this.unreadCount = count)
    });
  }
}
