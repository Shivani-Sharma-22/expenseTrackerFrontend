import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { apiConfig } from '../config/api.config';
import { Expense, ExpenseRequest } from '../models/api.models';
import { normalizeExpense } from '../utils/formatters';

@Injectable({ providedIn: 'root' })
export class ExpensesApiService {
  private readonly http = inject(HttpClient);

  listByUser(userId: number): Observable<Expense[]> {
    return this.http.get<Expense[]>(`${apiConfig.expenses}/user/${userId}`).pipe(
      map(items => items.map(normalizeExpense))
    );
  }

  listByMonth(userId: number, month: number, year: number): Observable<Expense[]> {
    const params = new HttpParams().set('month', month).set('year', year);
    return this.http.get<Expense[]>(`${apiConfig.expenses}/user/${userId}/month`, { params }).pipe(
      map(items => items.map(normalizeExpense))
    );
  }

  listByRange(userId: number, start: string, end: string): Observable<Expense[]> {
    const params = new HttpParams().set('start', start).set('end', end);
    return this.http.get<Expense[]>(`${apiConfig.expenses}/user/${userId}/range`, { params }).pipe(
      map(items => items.map(normalizeExpense))
    );
  }

  search(userId: number, keyword: string): Observable<Expense[]> {
    const params = new HttpParams().set('keyword', keyword);
    return this.http.get<Expense[]>(`${apiConfig.expenses}/user/${userId}/search`, { params }).pipe(
      map(items => items.map(normalizeExpense))
    );
  }

  create(payload: ExpenseRequest): Observable<Expense> {
    return this.http.post<Expense>(apiConfig.expenses, payload).pipe(map(normalizeExpense));
  }

  update(expenseId: number, payload: ExpenseRequest): Observable<Expense> {
    return this.http.put<Expense>(`${apiConfig.expenses}/${expenseId}`, payload).pipe(map(normalizeExpense));
  }

  remove(expenseId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${apiConfig.expenses}/${expenseId}`);
  }

  totalByUser(userId: number): Observable<number> {
    return this.http.get<number>(`${apiConfig.expenses}/user/${userId}/total`);
  }
}
