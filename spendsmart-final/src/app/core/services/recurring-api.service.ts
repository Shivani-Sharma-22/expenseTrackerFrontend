import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { apiConfig } from '../config/api.config';
import { RecurringRequest, RecurringTransaction } from '../models/api.models';
import { normalizeRecurring } from '../utils/formatters';

@Injectable({ providedIn: 'root' })
export class RecurringApiService {
  private readonly http = inject(HttpClient);

  listByUser(userId: number): Observable<RecurringTransaction[]> {
    return this.http.get<RecurringTransaction[]>(`${apiConfig.recurring}/user/${userId}`).pipe(
      map(items => items.map(normalizeRecurring))
    );
  }

  listActive(userId: number): Observable<RecurringTransaction[]> {
    return this.http.get<RecurringTransaction[]>(`${apiConfig.recurring}/active/${userId}`).pipe(
      map(items => items.map(normalizeRecurring))
    );
  }

  create(payload: RecurringRequest): Observable<RecurringTransaction> {
    return this.http.post<RecurringTransaction>(apiConfig.recurring, payload).pipe(map(normalizeRecurring));
  }

  update(recurringId: number, payload: RecurringRequest): Observable<RecurringTransaction> {
    return this.http.put<RecurringTransaction>(`${apiConfig.recurring}/${recurringId}`, payload).pipe(map(normalizeRecurring));
  }

  remove(recurringId: number): Observable<string> {
    return this.http.delete(`${apiConfig.recurring}/${recurringId}`, { responseType: 'text' });
  }
}
