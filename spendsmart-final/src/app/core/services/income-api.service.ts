import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { apiConfig } from '../config/api.config';
import { Income, IncomeRequest } from '../models/api.models';
import { normalizeIncome } from '../utils/formatters';

@Injectable({ providedIn: 'root' })
export class IncomeApiService {
  private readonly http = inject(HttpClient);

  listByUser(userId: number): Observable<Income[]> {
    return this.http.get<Income[]>(`${apiConfig.incomes}/user/${userId}`).pipe(
      map(items => items.map(normalizeIncome))
    );
  }

  listByMonth(userId: number, month: number, year: number): Observable<Income[]> {
    const params = new HttpParams().set('userId', userId).set('month', month).set('year', year);
    return this.http.get<Income[]>(`${apiConfig.incomes}/month`, { params }).pipe(
      map(items => items.map(normalizeIncome))
    );
  }

  listByRange(userId: number, start: string, end: string): Observable<Income[]> {
    const params = new HttpParams().set('userId', userId).set('start', start).set('end', end);
    return this.http.get<Income[]>(`${apiConfig.incomes}/range`, { params }).pipe(
      map(items => items.map(normalizeIncome))
    );
  }

  listRecurring(): Observable<Income[]> {
    return this.http.get<Income[]>(`${apiConfig.incomes}/recurring`).pipe(
      map(items => items.map(normalizeIncome))
    );
  }

  create(payload: IncomeRequest): Observable<Income> {
    return this.http.post<Income>(apiConfig.incomes, payload).pipe(map(normalizeIncome));
  }

  update(incomeId: number, payload: IncomeRequest): Observable<Income> {
    return this.http.put<Income>(`${apiConfig.incomes}/${incomeId}`, payload).pipe(map(normalizeIncome));
  }

  remove(incomeId: number): Observable<string> {
    return this.http.delete(`${apiConfig.incomes}/${incomeId}`, { responseType: 'text' });
  }

  totalByUser(userId: number): Observable<number> {
    return this.http.get<number>(`${apiConfig.incomes}/user/${userId}/total`);
  }

  totalByMonth(userId: number, month: number, year: number): Observable<number> {
    const params = new HttpParams().set('userId', userId).set('month', month).set('year', year);
    return this.http.get<number>(`${apiConfig.incomes}/total/month`, { params });
  }
}
