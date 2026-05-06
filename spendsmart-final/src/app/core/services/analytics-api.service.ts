import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { apiConfig } from '../config/api.config';
import { MonthlySummary, YearlySummary } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class AnalyticsApiService {
  private readonly http = inject(HttpClient);

  monthly(userId: number, year: number, month: number): Observable<MonthlySummary> {
    const params = new HttpParams().set('year', year).set('month', month);
    return this.http.get<MonthlySummary>(`${apiConfig.analytics}/monthly/${userId}`, { params });
  }

  yearly(userId: number, year: number): Observable<YearlySummary> {
    const params = new HttpParams().set('year', year);
    return this.http.get<YearlySummary>(`${apiConfig.analytics}/yearly/${userId}`, { params });
  }

  categoryBreakdown(userId: number): Observable<Record<string, number>> {
    return this.http.get<Record<string, number>>(`${apiConfig.analytics}/categories/${userId}`);
  }

  health(userId: number): Observable<number> {
    return this.http.get<number>(`${apiConfig.analytics}/health/${userId}`);
  }
}
