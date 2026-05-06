import { computed, Injectable, signal } from '@angular/core';
import { SessionUser, UserProfile } from '../models/api.models';

const SESSION_KEY = 'spendsmart.session';
const PROFILE_KEY = 'spendsmart.profile';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly sessionSignal = signal<SessionUser | null>(this.readSession());
  private readonly profileSignal = signal<UserProfile | null>(this.readProfile());

  readonly session = computed(() => this.sessionSignal());
  readonly profile = computed(() => this.profileSignal());
  readonly token = computed(() => this.sessionSignal()?.token ?? '');
  readonly userId = computed(() => this.sessionSignal()?.userId ?? null);
  readonly isLoggedIn = computed(() => !!this.sessionSignal()?.token);

  setSession(session: SessionUser): void {
    this.sessionSignal.set(session);
    this.writeStorage(SESSION_KEY, session);
  }

  setProfile(profile: UserProfile): void {
    this.profileSignal.set(profile);
    this.writeStorage(PROFILE_KEY, profile);
  }

  clear(): void {
    this.sessionSignal.set(null);
    this.profileSignal.set(null);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(PROFILE_KEY);
    }
  }

  private readSession(): SessionUser | null {
    return this.readStorage<SessionUser>(SESSION_KEY);
  }

  private readProfile(): UserProfile | null {
    return this.readStorage<UserProfile>(PROFILE_KEY);
  }

  private readStorage<T>(key: string): T | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : null;
  }

  private writeStorage(key: string, value: unknown): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    localStorage.setItem(key, JSON.stringify(value));
  }
}
