import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthApiService } from '../../core/services/auth-api.service';
import { SessionService } from '../../core/services/session.service';
import { initials } from '../../core/utils/formatters';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.css'
})
export class ProfileComponent implements OnInit {
  private readonly authApi = inject(AuthApiService);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);

  profileForm = {
    fullName: '',
    email: '',
    bio: '',
    timezone: 'Asia/Kolkata'
  };

  preferenceForm = {
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    monthlyBudget: 0
  };

  passwordForm = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };

  message = '';
  errorMessage = '';
  avatarText = 'SS';

  ngOnInit(): void {
    const userId = this.session.userId();
    if (!userId) {
      return;
    }

    this.authApi.getProfile(userId).subscribe({
      next: profile => {
        this.session.setProfile(profile);
        this.profileForm = {
          fullName: profile.fullName,
          email: profile.email,
          bio: profile.bio ?? '',
          timezone: profile.timezone ?? 'Asia/Kolkata'
        };
        this.preferenceForm = {
          currency: profile.currency ?? 'INR',
          timezone: profile.timezone ?? 'Asia/Kolkata',
          monthlyBudget: profile.monthlyBudget ?? 0
        };
        this.avatarText = initials(profile.fullName);
      }
    });
  }

  saveProfile(): void {
    const userId = this.session.userId();
    if (!userId) {
      return;
    }

    this.authApi.updateProfile(userId, {
      fullName: this.profileForm.fullName,
      bio: this.profileForm.bio,
      timezone: this.profileForm.timezone
    }).subscribe({
      next: profile => {
        const currentProfile = this.session.profile();
        this.session.setProfile({
          ...(currentProfile ?? {}),
          ...profile
        });
        this.message = 'Profile updated successfully.';
        this.errorMessage = '';
      },
      error: () => {
        this.errorMessage = 'Unable to update profile.';
      }
    });
  }

  savePreferences(): void {
    const userId = this.session.userId();
    if (!userId) {
      return;
    }

    this.authApi.updateCurrency(userId, this.preferenceForm.currency).subscribe({
      next: () => {
        this.authApi.updateBudget(userId, this.preferenceForm.monthlyBudget).subscribe({
          next: () => {
            const profile = this.session.profile();
            if (profile) {
              this.session.setProfile({
                ...profile,
                currency: this.preferenceForm.currency,
                timezone: this.preferenceForm.timezone,
                monthlyBudget: this.preferenceForm.monthlyBudget
              });
            }
            this.message = 'Preferences updated successfully.';
            this.errorMessage = '';
          }
        });
      },
      error: () => {
        this.errorMessage = 'Unable to update preferences.';
      }
    });
  }

  updatePassword(): void {
    const userId = this.session.userId();
    if (!userId || this.passwordForm.newPassword !== this.passwordForm.confirmPassword) {
      this.errorMessage = 'New password and confirm password must match.';
      return;
    }

    this.authApi.changePassword(userId, {
      currentPassword: this.passwordForm.currentPassword,
      newPassword: this.passwordForm.newPassword
    }).subscribe({
      next: () => {
        this.message = 'Password updated successfully.';
        this.errorMessage = '';
        this.passwordForm = { currentPassword: '', newPassword: '', confirmPassword: '' };
      },
      error: () => {
        this.errorMessage = 'Unable to update password.';
      }
    });
  }

  deactivateAccount(): void {
    const userId = this.session.userId();
    if (!userId) {
      return;
    }

    const confirmed = confirm('Are you sure you want to deactivate your account? You will not be able to log in again until it is reactivated.');
    if (!confirmed) {
      return;
    }

    this.authApi.deactivate(userId).subscribe({
      next: () => {
        this.session.clear();
        this.router.navigate(['/']);
      },
      error: () => {
        this.errorMessage = 'Unable to deactivate account.';
      }
    });
  }
}
