import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { forkJoin, map, Observable } from 'rxjs';
import { apiConfig } from '../config/api.config';
import { Budget, BudgetProgress, BudgetRequest } from '../models/api.models';
import { normalizeBudget } from '../utils/formatters';

@Injectable({ providedIn: 'root' })
export class BudgetsApiService {
  private readonly http = inject(HttpClient);

  listByUser(userId: number): Observable<Budget[]> {
    return this.http.get<Budget[]>(`${apiConfig.budgets}/user/${userId}`).pipe(
      map(items => items.map(normalizeBudget))
    );
  }

  listActive(userId: number): Observable<Budget[]> {
    return this.http.get<Budget[]>(`${apiConfig.budgets}/user/${userId}/active`).pipe(
      map(items => items.map(normalizeBudget))
    );
  }

  create(payload: BudgetRequest): Observable<Budget> {
    return this.http.post<Budget>(apiConfig.budgets, payload).pipe(map(normalizeBudget));
  }

  update(budgetId: number, payload: BudgetRequest): Observable<Budget> {
    return this.http.put<Budget>(`${apiConfig.budgets}/${budgetId}`, payload).pipe(map(normalizeBudget));
  }

  remove(budgetId: number): Observable<void> {
    return this.http.delete<void>(`${apiConfig.budgets}/${budgetId}`);
  }

  alerts(userId: number): Observable<string[]> {
    return this.http.get<string[]>(`${apiConfig.budgets}/user/${userId}/alerts`);
  }

  progress(budgetId: number): Observable<BudgetProgress> {
    return this.http.get<BudgetProgress>(`${apiConfig.budgets}/${budgetId}/progress`);
  }

  progressForBudgets(budgets: Budget[]): Observable<BudgetProgress[]> {
    if (!budgets.length) {
      return new Observable<BudgetProgress[]>(subscriber => {
        subscriber.next([]);
        subscriber.complete();
      });
    }
    return forkJoin(budgets.map(budget => this.progress(budget.budgetId)));
  }
}
