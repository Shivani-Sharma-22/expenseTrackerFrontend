import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthApiService } from '../../core/services/auth-api.service';
import { SessionService } from '../../core/services/session.service';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auth.html',
  styleUrls: ['./auth.css']
})
export class AuthComponent implements OnInit {
  activeTab: 'login' | 'register' = 'login';
  loading = false;
  errorMessage = '';

  loginForm = {
    email: '',
    password: ''
  };

  registerForm = {
    firstName: '',
    lastName: '',
    email: '',
    password: ''
  };

  private readonly router = inject(Router);
  private readonly authApi = inject(AuthApiService);
  private readonly session = inject(SessionService);

  ngOnInit(): void {
    if (this.session.isLoggedIn()) {
      this.router.navigate(['/app/dashboard']);
    }
  }

  switchTab(tab: 'login' | 'register'): void {
    this.activeTab = tab;
    this.errorMessage = '';
  }

  doLogin(): void {
    this.loading = true;
    this.errorMessage = '';

    this.authApi.login(this.loginForm).subscribe({
      next: response => {
        this.authApi.getProfile(response.userId).subscribe({
          next: profile => {
            this.session.setProfile(profile);
            this.router.navigate(['/app/dashboard']);
          },
          error: () => this.router.navigate(['/app/dashboard'])
        });
      },
      error: error => {
        this.errorMessage = error?.error?.message ?? 'Login failed. Please check your credentials.';
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

  doRegister(): void {
    this.loading = true;
    this.errorMessage = '';
    const fullName = `${this.registerForm.firstName} ${this.registerForm.lastName}`.trim();

    this.authApi.register({
      fullName,
      email: this.registerForm.email,
      password: this.registerForm.password
    }).subscribe({
      next: response => {
        this.authApi.getProfile(response.userId).subscribe({
          next: profile => {
            this.session.setProfile(profile);
            this.router.navigate(['/app/dashboard']);
          },
          error: () => this.router.navigate(['/app/dashboard'])
        });
      },
      error: error => {
        this.errorMessage = error?.error?.message ?? 'Registration failed. Please try again.';
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

  loginWithGoogle(): void {
    this.loading = true;
    this.errorMessage = '';

    this.authApi.googleConfig().subscribe({
      next: async config => {
        try {
          const redirectUri = `${window.location.origin}/auth/google/callback`;
          const scope = 'openid profile email';
          const responseType = 'code';
          const state = this.generateNonce();
          const codeVerifier = this.generateCodeVerifier();
          const codeChallenge = await this.generateCodeChallenge(codeVerifier);

          if (typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem('oauth_state', state);
            sessionStorage.setItem('oauth_code_verifier', codeVerifier);
          }

          const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
            `client_id=${encodeURIComponent(config.clientId)}&` +
            `redirect_uri=${encodeURIComponent(redirectUri)}&` +
            `response_type=${encodeURIComponent(responseType)}&` +
            `scope=${encodeURIComponent(scope)}&` +
            `state=${encodeURIComponent(state)}&` +
            `code_challenge=${encodeURIComponent(codeChallenge)}&` +
            `code_challenge_method=S256&` +
            `access_type=offline&` +
            `prompt=consent`;

          this.loading = false;
          window.location.href = googleAuthUrl;
        } catch {
          this.errorMessage = 'Unable to start Google sign-in.';
          this.loading = false;
        }
      },
      error: () => {
        this.errorMessage = 'Unable to load Google sign-in configuration.';
        this.loading = false;
      }
    });
  }

  private generateNonce(): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    let nonce = '';
    for (let i = 0; i < 32; i++) {
      nonce += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return nonce;
  }

  private generateCodeVerifier(): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_.~';
    let verifier = '';
    for (let i = 0; i < 128; i++) {
      verifier += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return verifier;
  }

  private async generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    const bytes = new Uint8Array(digest);
    let binary = '';
    for (const value of bytes) {
      binary += String.fromCharCode(value);
    }
    return btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }
}
