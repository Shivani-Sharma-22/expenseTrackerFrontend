import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { apiConfig } from '../config/api.config';
import { AuthResponse, SessionUser, UserProfile } from '../models/api.models';
import { SessionService } from './session.service';

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);
  private readonly session = inject(SessionService);

  login(payload: { email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${apiConfig.auth}/login`, payload).pipe(
      tap(response => this.storeAuth(response))
    );
  }

  register(payload: { fullName: string; email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${apiConfig.auth}/register`, payload).pipe(
      tap(response => this.storeAuth(response))
    );
  }

  googleConfig(): Observable<{ clientId: string }> {
    return this.http.get<{ clientId: string }>(`${apiConfig.auth}/google/config`);
  }

  loginWithGoogle(payload: { code: string; codeVerifier: string; redirectUri: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${apiConfig.auth}/login/google`, payload).pipe(
      tap(response => this.storeAuth(response))
    );
  }

  logout(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${apiConfig.auth}/logout`, {});
  }

  getProfile(userId: number): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${apiConfig.auth}/profile/${userId}`);
  }

  updateProfile(userId: number, payload: Partial<UserProfile>): Observable<UserProfile> {
    return this.http.put<UserProfile>(`${apiConfig.auth}/profile/${userId}`, payload);
  }

  updateCurrency(userId: number, currency: string): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${apiConfig.auth}/currency/${userId}?currency=${encodeURIComponent(currency)}`, {});
  }

  updateBudget(userId: number, budget: number): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${apiConfig.auth}/budget/${userId}?budget=${budget}`, {});
  }

  changePassword(userId: number, payload: { currentPassword: string; newPassword: string }): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${apiConfig.auth}/password/${userId}`, payload);
  }

  deactivate(userId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${apiConfig.auth}/deactivate/${userId}`);
  }

  getUsers(): Observable<UserProfile[]> {
    return this.http.get<UserProfile[]>(`${apiConfig.auth}/users`);
  }

  private storeAuth(response: AuthResponse): void {
    const session: SessionUser = {
      userId: response.userId,
      email: response.email,
      fullName: response.fullName,
      token: response.token
    };
    this.session.setSession(session);
  }
}
