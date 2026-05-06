import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SessionService } from '../../core/services/session.service';
import { AuthApiService } from '../../core/services/auth-api.service';

@Component({
  selector: 'app-google-callback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:var(--bg)">
      <div style="text-align:center">
        <div style="font-size:24px;font-weight:600;color:var(--text);margin-bottom:12px">
          {{ message }}
        </div>
        @if (error) {
          <div style="color:var(--danger);font-size:14px;margin-bottom:20px">{{ error }}</div>
          <button class="btn btn-primary" (click)="goBack()">Back to Login</button>
        }
      </div>
    </div>
  `,
  styles: [`
    .btn { padding: 10px 20px; border-radius: 8px; border: none; cursor: pointer; font-weight: 500; }
    .btn-primary { background: var(--primary); color: white; }
  `]
})
export class GoogleCallbackComponent implements OnInit {
  message = 'Signing in with Google...';
  error = '';

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authApi = inject(AuthApiService);
  private readonly session = inject(SessionService);

  ngOnInit(): void {
    this.handleGoogleCallback();
  }

  handleGoogleCallback(): void {
    // Get authorization code from URL
    this.route.queryParams.subscribe(params => {
      const code = params['code'];
      const state = params['state'];
      const error = params['error'];

      if (error) {
        this.error = `Google OAuth error: ${error}`;
        this.message = 'Authentication Failed';
        return;
      }

      if (!code) {
        this.error = 'No authorization code received from Google';
        this.message = 'Authentication Failed';
        return;
      }

      // Verify state matches
      const storedState = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('oauth_state') : null;
      if (state !== storedState) {
        this.error = 'State mismatch - possible security issue';
        this.message = 'Authentication Failed';
        return;
      }

      // Get code verifier for PKCE
      const codeVerifier = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('oauth_code_verifier') : null;
      if (!codeVerifier) {
        this.error = 'Code verifier not found';
        this.message = 'Authentication Failed';
        return;
      }

      // Send code to backend to exchange for token
      const payload = {
        code,
        codeVerifier,
        redirectUri: `${window.location.origin}/auth/google/callback`
      };

      this.authApi.loginWithGoogle(payload).subscribe({
        next: (response) => {
          // Get profile
          this.authApi.getProfile(response.userId).subscribe({
            next: (profile) => {
              this.session.setProfile(profile);
              if (typeof sessionStorage !== 'undefined') {
                sessionStorage.removeItem('oauth_state');
                sessionStorage.removeItem('oauth_code_verifier');
              }
              this.router.navigate(['/app/dashboard']);
            },
            error: () => {
              if (typeof sessionStorage !== 'undefined') {
                sessionStorage.removeItem('oauth_state');
                sessionStorage.removeItem('oauth_code_verifier');
              }
              this.router.navigate(['/app/dashboard']);
            }
          });
        },
        error: (error) => {
          console.error('Google login failed:', error);
          this.error = this.extractErrorMessage(error);
          this.message = 'Authentication Failed';
        }
      });
    });
  }

  private extractErrorMessage(error: unknown): string {
    const httpError = error as {
      error?: string | { message?: string; error?: string };
      message?: string;
    };

    if (typeof httpError?.error === 'string' && httpError.error.trim()) {
      try {
        const parsed = JSON.parse(httpError.error) as { message?: string; error?: string };
        return parsed.message || parsed.error || httpError.error;
      } catch {
        return httpError.error;
      }
    }

    if (httpError?.error && typeof httpError.error === 'object') {
      return httpError.error.message || httpError.error.error || 'Failed to sign in with Google';
    }

    return httpError?.message || 'Failed to sign in with Google';
  }

  goBack(): void {
    this.router.navigate(['/']);
  }
}
