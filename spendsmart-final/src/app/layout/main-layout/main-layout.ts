import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthApiService } from '../../core/services/auth-api.service';
import { SessionService } from '../../core/services/session.service';
import { HeaderComponent } from '../header/header';
import { SidebarComponent } from '../sidebar/sidebar';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, HeaderComponent],
  templateUrl: './main-layout.html',
  styleUrls: ['./main-layout.css']
})
export class MainLayoutComponent implements OnInit {
  pageTitle = 'Dashboard';

  private readonly router = inject(Router);
  private readonly authApi = inject(AuthApiService);
  private readonly session = inject(SessionService);

  private readonly titleMap: Record<string, string> = {
    dashboard: 'Dashboard',
    analytics: 'Analytics',
    expenses: 'Expenses',
    income: 'Income',
    recurring: 'Recurring Transactions',
    categories: 'Categories',
    budgets: 'Budgets',
    reports: 'Reports & Exports',
    notifications: 'Notifications',
    profile: 'Profile',
    admin: 'Admin Panel'
  };

  constructor() {
    this.router.events.pipe(filter(event => event instanceof NavigationEnd)).subscribe((event: NavigationEnd) => {
      const parts = event.urlAfterRedirects.split('/');
      const last = parts[parts.length - 1].split('?')[0];
      this.pageTitle = this.titleMap[last] ?? 'Dashboard';
    });
  }

  ngOnInit(): void {
    const userId = this.session.userId();
    if (userId && !this.session.profile()) {
      this.authApi.getProfile(userId).subscribe({
        next: profile => this.session.setProfile(profile)
      });
    }
  }
}
