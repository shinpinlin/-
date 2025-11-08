import { Injectable, signal, computed, effect, PLATFORM_ID, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Student, StudentStatus, LeaveType } from '../models/student.model';
import { firstValueFrom } from 'rxjs';

// A pre-defined master list of all students in the class.
const MASTER_ROSTER: { id: string, name: string }[] = [
  // ...原始同學名單略...
];

const LOCAL_STORAGE_KEY = 'studentAttendanceApp_students';
// 👇 這是取得台灣時間的 function
function nowInTaipei(): Date {
  // To string in Asia/Taipei, then parse back to Date
  const now = new Date();
  const tzString = now.toLocaleString('en-US', { timeZone: 'Asia/Taipei' });
  return new Date(tzString);
}

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
        this.http.get<Student[]>(`${this.API_BASE_URL}/students`)
      );
      const studentsWithDates = studentsData.map(s => ({
        ...s,
        // 👇 這裡把 server 回傳時間以台灣時區轉換
        lastUpdatedAt: new Date(new Date(s.lastUpdatedAt).toLocaleString('en-US',{timeZone:'Asia/Taipei'})),
      }));
      this._students.set(studentsWithDates);
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
            lastUpdatedAt: new Date(new Date(s.lastUpdatedAt).toLocaleString('en-US', { timeZone: 'Asia/Taipei' })),
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
      lastUpdatedAt: nowInTaipei(), // 👈 這裡直接用台灣時間
    }));
    this._students.set(initialStudents);
  }  
  private updateCountdown(): void {
    // 👇 都改成台灣時間
    const now = nowInTaipei();
    
    const morningCutoff = new Date(now);
    morningCutoff.setHours(9, 30, 0, 0);

    const eveningCutoff = new Date(now);
    eveningCutoff.setHours(21, 30, 0, 0);

    let isCurrentlyEvening: boolean;
    let nextTransitionTime: Date;

    if (now >= morningCutoff && now < eveningCutoff) {
      isCurrentlyEvening = true; 
      nextTransitionTime = eveningCutoff;
    } else {
      isCurrentlyEvening = false; 
      if (now < morningCutoff) {
        nextTransitionTime = morningCutoff;
      } else {
        nextTransitionTime = new Date(now);
        nextTransitionTime.setDate(nextTransitionTime.getDate() + 1);
        nextTransitionTime.setHours(9, 30, 0, 0);
      }
    }

    this._isEvening.set(isCurrentlyEvening);

    const timeDifference = nextTransitionTime.getTime() - now.getTime();

    const hours = Math.max(0, Math.floor(timeDifference / (1000 * 60 * 60)));
    const minutes = Math.max(0, Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60)));
    const seconds = Math.max(0, Math.floor((timeDifference % (1000 * 60)) / 1000));

    const formattedCountdown = 
      `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    
    this._countdown.set(formattedCountdown);
  }

  // ***************************************************************
  // 核心操作
  // ***************************************************************

  public async login(studentId: string): Promise<Student> {
    const loggedInStudent = await firstValueFrom(
      this.http.post<Student>(`${this.API_BASE_URL}/login`, { studentId })
    );
    this.fetchStudents(); 
    return loggedInStudent;
  }

  public async applyForLeave(studentId: string, leaveType: LeaveType, remarks: string): Promise<void> {
    const body = { studentId, leaveType, remarks };
    await firstValueFrom(this.http.post<void>(`${this.API_BASE_URL}/leave`, body));
    this.fetchStudents(); 
  }

  public async deleteStudent(studentId: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${this.API_BASE_URL}/students/${studentId}`));
    this.fetchStudents(); 
  }
  
  public async resetToInitialList(adminPassword?: string): Promise<void> {
    const body = { password: adminPassword }; 
    await firstValueFrom(this.http.post<void>(`${this.API_BASE_URL}/admin/reset`, body));
    this.fetchStudents(); 
  }
}
