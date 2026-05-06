import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { apiConfig } from '../config/api.config';
import { Category, CategoryRequest } from '../models/api.models';
import { normalizeCategory } from '../utils/formatters';

@Injectable({ providedIn: 'root' })
export class CategoriesApiService {
  private readonly http = inject(HttpClient);

  listByUser(userId: number): Observable<Category[]> {
    return this.http.get<Category[]>(`${apiConfig.categories}/user/${userId}`).pipe(
      map(items => items.map(normalizeCategory))
    );
  }

  listByType(userId: number, type: string): Observable<Category[]> {
    return this.http.get<Category[]>(`${apiConfig.categories}/user/${userId}/type/${type}`).pipe(
      map(items => items.map(normalizeCategory))
    );
  }

  create(payload: CategoryRequest): Observable<Category> {
    return this.http.post<Category>(apiConfig.categories, payload).pipe(map(normalizeCategory));
  }

  update(categoryId: number, payload: CategoryRequest): Observable<Category> {
    return this.http.put<Category>(`${apiConfig.categories}/${categoryId}`, payload).pipe(map(normalizeCategory));
  }

  updateBudget(categoryId: number, amount: number): Observable<void> {
    return this.http.put<void>(`${apiConfig.categories}/${categoryId}/budget?amount=${amount}`, {});
  }

  remove(categoryId: number): Observable<void> {
    return this.http.delete<void>(`${apiConfig.categories}/${categoryId}`);
  }
}
