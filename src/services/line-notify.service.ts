import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class LineNotifyService {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);
  
  // NOTE: The LINE Notify API is not designed for direct client-side (browser) calls.
  // A direct call from the browser will likely be blocked by CORS (Cross-Origin Resource Sharing) policy.
  // For this feature to work reliably, a backend proxy server is required to forward the request to the LINE API.
  // This implementation makes the direct call for demonstration purposes.
  private readonly NOTIFY_API_URL = 'https://notify-api.line.me/api/notify';
  private readonly LOCAL_STORAGE_KEY = 'lineNotifyToken';

  token = signal<string>('');

  constructor() {
    this.loadToken();
  }

  private loadToken(): void {
    if (isPlatformBrowser(this.platformId)) {
      const savedToken = localStorage.getItem(this.LOCAL_STORAGE_KEY);
      if (savedToken) {
        this.token.set(savedToken);
      }
    }
  }

  saveToken(token: string): void {
    this.token.set(token);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.LOCAL_STORAGE_KEY, token);
    }
  }

  sendNotification(message: string, tokenOverride?: string): Observable<any> {
    const tokenToSend = tokenOverride ?? this.token();
    if (!tokenToSend) {
      throw new Error('LINE Notify token is not set.');
    }

    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Bearer ${tokenToSend}`,
    });

    const body = new HttpParams().set('message', message);

    return this.http.post(this.NOTIFY_API_URL, body, { headers });
  }
}
