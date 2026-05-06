import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, map, Observable, tap } from 'rxjs';
import { apiConfig } from '../config/api.config';
import { AppNotification } from '../models/api.models';
import { normalizeNotification } from '../utils/formatters';

@Injectable({ providedIn: 'root' })
export class NotificationsApiService {
  private readonly http = inject(HttpClient);
  private readonly unreadCountSubject = new BehaviorSubject<number>(0);
  readonly unreadCount$ = this.unreadCountSubject.asObservable();

  listByRecipient(userId: number): Observable<AppNotification[]> {
    return this.http.get<AppNotification[]>(`${apiConfig.notifications}/${userId}`).pipe(
      map(items => items.map(normalizeNotification)),
      tap(items => this.unreadCountSubject.next(items.filter(item => !item.read).length))
    );
  }

  unreadCount(userId: number): Observable<number> {
    return this.http.get<number>(`${apiConfig.notifications}/unread-count/${userId}`).pipe(
      tap(count => this.unreadCountSubject.next(count))
    );
  }

  markAsRead(notificationId: number): Observable<string> {
    return this.http.put(`${apiConfig.notifications}/read/${notificationId}`, {}, { responseType: 'text' });
  }

  markAllRead(userId: number): Observable<string> {
    return this.http.put(`${apiConfig.notifications}/read/all/${userId}`, {}, { responseType: 'text' });
  }

  acknowledge(notificationId: number): Observable<string> {
    return this.http.put(`${apiConfig.notifications}/ack/${notificationId}`, {}, { responseType: 'text' });
  }

  remove(notificationId: number): Observable<string> {
    return this.http.delete(`${apiConfig.notifications}/${notificationId}`, { responseType: 'text' });
  }

  sendBulk(userIds: number[], title: string, message: string): Observable<string> {
    const params = new HttpParams().set('title', title).set('message', message);
    return this.http.post(`${apiConfig.notifications}/bulk`, userIds, { params, responseType: 'text' });
  }

  listAll(): Observable<AppNotification[]> {
    return this.http.get<AppNotification[]>(`${apiConfig.notifications}/all`).pipe(
      map(items => items.map(normalizeNotification))
    );
  }
}
