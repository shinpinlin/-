import { Injectable, signal, computed, effect, PLATFORM_ID, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Student, StudentStatus, LeaveType } from '../models/student.model';
import { firstValueFrom, map } from 'rxjs';

// <====== 這是標準資料格式（完全正確 TypeScript Array of Objects）======
const MASTER_ROSTER: { id: string, name: string }[] = [
  { id: '1123003', name: '謝昀臻' },
  { id: '1123025', name: '陳靖' },
  { id: '1123047', name: '吳昀軒' },
  { id: '1123065', name: '吳玟璇' },
  { id: '1123066', name: '黃建岷' },
  { id: '1123090', name: '歐陽佑昌' },
  { id: '1123098', name: '簡聖修' },
  { id: '1123113', name: '林彥君' },
  { id: '1133080', name: '蘇筠媗' },
  { id: '1133081', name: '廖曉慧' },
  { id: '1133082', name: '黃子銘' },
  { id: '1133084', name: '張仕學' },
  { id: '1133085', name: '黃奕誠' },
  { id: '1133086', name: '林冠宏' },
  { id: '1133091', name: '曾映竹' },
  { id: '1133092', name: '陳俊宇' },
  { id: '1133093', name: '劉兆軒' },
  { id: '1133094', name: '黃威程' },
  { id: '1133095', name: '李潛昕' },
  { id: '1133101', name: '薩滿' },
  { id: '1133102', name: '張昕程' },
  { id: '1133103', name: '王瑞亞' },
  { id: '1133104', name: '毛仁笛' },
  { id: '1133105', name: '雷漢森' },
  { id: '1133106', name: '哈志豪' },
  { id: '1133107', name: '凃明' },
  { id: '1133108', name: '高以理' },
  { id: '1133001', name: '陳儒頡' },
  { id: '1133002', name: '邱浴鈞' },
  { id: '1133003', name: '張羨茿' },
  { id: '1133013', name: '許淞棓' },
  { id: '1133014', name: '張晴媗' },
  { id: '1133026', name: '安祐萱' },
  { id: '1133027', name: '潘玟菱' },
  { id: '1133032', name: '施韋吉' },
  { id: '1133033', name: '葉冠愷' },
  { id: '1133035', name: '李柏諠' },
  { id: '1133036', name: '翁達翰' },
  { id: '1133037', name: '高爾義' },
  { id: '1133038', name: '高睿宏' },
  { id: '1133044', name: '吳育鑫' },
  { id: '1133048', name: '鄭偉民' },
  { id: '1133057', name: '李旻晃' },
  { id: '1133058', name: '潘啟文' },
  { id: '1133064', name: '林書瑋' },
  { id: '1133065', name: '林子琦' },
  { id: '1133068', name: '曾資淵' },
  { id: '1133069', name: '黃宇賢' },
  { id: '1133071', name: '林士欽' },
  { id: '1133072', name: '張家瑋' },
  { id: '1133073', name: '陳志豪' },
  { id: '1143001', name: '楊梓邑' },
  { id: '1143002', name: '楊仁瑋' },
  { id: '1143003', name: '黃映潔' },
  { id: '1143021', name: '張雅珺' },
  { id: '1143022', name: '曹孝弘' },
  { id: '1143023', name: '呂欣澤' },
  { id: '1143035', name: '李思賢' },
  { id: '1143036', name: '張家銓' },
  { id: '1143037', name: '陳嘉瑜' },
  { id: '1143042', name: '林訓平' },
  { id: '1143043', name: '范姜群傑' },
  { id: '1143044', name: '陳梅齡' },
  { id: '1143045', name: '劉宇傑' },
  { id: '1143046', name: '黃冠博' },
  { id: '1143048', name: '張育梓' },
  { id: '1143049', name: '林文澤' },
  { id: '1143050', name: '唐晏鐸' },
  { id: '1143051', name: '柯宜欣' },
  { id: '1143055', name: '陳毅言' },
  { id: '1143056', name: '鄭睦羽' },
  { id: '1143057', name: '彭軒' },
  { id: '1143063', name: '李柏亨' },
  { id: '1143064', name: '歐宜勛' },
  { id: '1143065', name: '林冠甫' },
  { id: '1143066', name: '楊子嫻' },
  { id: '1143077', name: '蔡承恩' },
  { id: '1143078', name: '廖右安' },
  { id: '1143085', name: '王冠中' },
  { id: '1143089', name: '朱婉容' },
  { id: '1143090', name: '張郁閔' },
  { id: '1143091', name: '廖正豪' },
  { id: '1143096', name: '洪德諭' },
  { id: '1143097', name: '王寅兒' },
  { id: '1143098', name: '林品瑜' },
  { id: '1143102', name: '黃端陽' },
  { id: '1143103', name: '朱曜東' },
  { id: '1143104', name: '魏茂屹' },
  { id: '1143114', name: '謝豐安' },
  { id: '1143115', name: '吳東翰' },
  { id: '1143119', name: '張雅筑' },
  { id: '1143125', name: '卜謙學' },
  { id: '1143126', name: '利輝煌' },
  { id: '1143127', name: '涂俊偉' },
  { id: '1143128', name: '李童發' },
  { id: '1143129', name: '洪明翰' },
  { id: '1143130', name: '羅文傑' },
  { id: '1143131', name: '吳曉天' },
  { id: '1143132', name: '楊佳玲' },
  { id: '1143133', name: '李珮安' }
];// ... 其餘名單照原始資料繼續寫下去 ...
];
const LOCAL_STORAGE_KEY = 'studentAttendanceApp_students';

// <===== 以下為核心服務邏輯 =====>
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
    // 清除有 Date 物件殘留的本地資料（第一次部署建議先清掉一次）
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
            // 只存字串
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

  private setInitialList(): void {
    const initialStudents: Student[] = MASTER_ROSTER.map(s => ({
      id: s.id,
      name: s.name,
      status: '出席',
      lastUpdatedAt: null
    }));
    this._students.set(initialStudents);
  }

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

    if (nowInTaipei >= morningCutoff && nowInTaipei < eveningCutoff) {
      isCurrentlyEvening = true;
      nextTransitionTime = eveningCutoff;
    } else {
      isCurrentlyEvening = false;
      if (nowInTaipei < morningCutoff) {
        nextTransitionTime = morningCutoff;
      } else {
        nextTransitionTime = new Date(nowInTaipei);
        nextTransitionTime.setDate(nextTransitionTime.getDate() + 1);
        nextTransitionTime.setHours(9, 30, 0, 0);
      }
    }
    this._isEvening.set(isCurrentlyEvening);

    const timeDifference = nextTransitionTime.getTime() - nowInTaipei.getTime();
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
      this.http.post<Student>(`${this.API_BASE_URL}/login`, { studentId }).pipe(
        map(student => ({
          ...student,
          lastUpdatedAt: typeof student.lastUpdatedAt === 'string' ? student.lastUpdatedAt : null
        }))
      )
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

