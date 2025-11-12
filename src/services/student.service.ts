import { Injectable, signal, computed, effect, PLATFORM_ID, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Student, StudentStatus, LeaveType } from '../models/student.model';
import { firstValueFrom, map } from 'rxjs';

// 您的學生名單保持不變
const MASTER_ROSTER: { id: string, name: string }[] = [ ... ]; // 此處省略名單，直接沿用你的原始內容

const LOCAL_STORAGE_KEY = 'studentAttendanceApp_students';

@Injectable({
  providedIn: 'root',
})
export class StudentService {
  private readonly API_BASE_URL = 'https://rocallsystem-backend.onrender.com/api/v1';

  private _students = signal<Student[]>([]);
  private platformId = inject(PLATFORM_ID);
  private http = inject(HttpClient);

  private readonly _isEvening = signal(false);
  private readonly _countdown = signal('');
  private isInitialEffectRun = true;
  private countdownInterval?: number;

  public readonly masterRoster = MASTER_ROSTER;

  public students = this._students.asReadonly();
  public isEvening = this._isEvening.asReadonly();
  public countdown = this._countdown.asReadonly();

  public totalStudents = computed(() => this._students().length);
  public presentStudents = computed(() => this._students().filter(s => s.status === '出席').length);
  public absentStudents = computed(() => this._students().filter(s => s.status !== '出席').length);

  constructor() {
    // 清除有 Date 物件殘留的本地資料（建議只第一次手動呼叫）
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }

    this.loadState();

    effect(() => {
      const students = this._students();
      this.saveState(students);
    });

    effect(() => {
      this.isEvening();

      if (this.isInitialEffectRun) {
        this.isInitialEffectRun = false;
        this.fetchStudents();
        return;
      }
      this.resetToInitialList();
    });

    if (isPlatformBrowser(this.platformId)) {
      this.updateCountdown();
      this.countdownInterval = setInterval(() => this.updateCountdown(), 1000) as unknown as number;
    }
  }

  // ***************************************************************
  // 狀態管理
  // ***************************************************************

  public async fetchStudents(): Promise<void> {
    try {
      const studentsData = await firstValueFrom(
        this.http.get<Student[]>(`${this.API_BASE_URL}/students`).pipe(
          map(students => students.map(student => ({
            ...student,
            // 🚨 關鍵修正：只保存字串，不 new Date！
            lastUpdatedAt: typeof student.lastUpdatedAt === 'string' ? student.lastUpdatedAt : null
          })))
        )
      );
      this._students.set(studentsData);
    } catch (e) {
      console.error('Failed to fetch student status from backend', e);
    }
  }

  private loadState(): void {
    if (isPlatformBrowser(this.platformId)) {
      try {
        const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedData) {
          const parsedStudents: Student[] = JSON.parse(savedData);
          const studentsWithDates = parsedStudents.map(s => ({
            ...s,
            // 🚨 關鍵修正：只保存字串 (可能是 ISO 或 null)
            lastUpdatedAt: typeof s.lastUpdatedAt === 'string' ? s.lastUpdatedAt : null
          }));
          this._students.set(studentsWithDates);
          return;
        }
      } catch (e) {
        console.error('Failed to load or parse state from localStorage', e);
      }
    }
    this.setInitialList();
  }

  private saveState(students: Student[]): void {
    if (isPlatformBrowser(this.platformId)) {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(students));
      } catch (e) {
        console.error('Failed to save state to localStorage', e);
      }
    }
  }

  /**
   * 建立本機學生列表的初始狀態 (用於重置或首次載入)
   */
  private setInitialList(): void {
    const initialStudents: Student[] = MASTER_ROSTER.map(s => ({
      id: s.id,
      name: s.name,
      status: '出席',
      // 🚨 關鍵修正：只保存空值或字串，不要 Date
      lastUpdatedAt: null
    }));
    this._students.set(initialStudents);
  }

  // 🚨 updateCountdown 僅計算用，不影響資料型態
  private updateCountdown(): void {
    const now = new Date();
    const str = now.toLocaleString('en-US', { timeZone: 'Asia/Taipei' });
    const nowInTaipei = new Date(str);

    const morningCutoff = new Date(nowInTaipei);
    morningCutoff.setHours(9, 30, 0, 0);
    const eveningCutoff = new Date(nowInTaipei);
    eveningCutoff.setHours(21, 30, 0, 0);

    let isCurrentlyEvening: boolean;
    let nextTransitionTime: Date;

    if (nowInTaipei >= morningCutoff && nowInTaipei < evening
