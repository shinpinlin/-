import { Injectable, signal, computed, effect, PLATFORM_ID, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http'; // 👈 新增：引入 HttpClient
import { isPlatformBrowser } from '@angular/common';
import { Student, StudentStatus, LeaveType } from '../models/student.model';
import { firstValueFrom } from 'rxjs'; // 👈 新增：用於將 Observable 轉換為 Promise

// Helper to simulate network latency (保留但未使用)
const fakeApiCall = (delay: number = 500): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, delay));
};

// A pre-defined master list of all students in the class. (保留原始資料)
const MASTER_ROSTER: { id: string, name: string }[] = [
  { id: '1123003', name: '謝時臻' },
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
  { id:id: '1143045', name: '劉宇傑' },
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
  { id: '1all' },
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
];

const LOCAL_STORAGE_KEY = 'studentAttendanceApp_students';

@Injectable({
  providedIn: 'root',
})
export class StudentService {
  // 👈 定義後端 API 網址，假設所有 API 端點都在 /api/v1/ 下
  private readonly API_BASE_URL = 'https://rocallsystem-backend.onrender.com/api/v1';

  private _students = signal<Student[]>([]);
  private platformId = inject(PLATFORM_ID);
  private http = inject(HttpClient); // 注入 HttpClient 服務

  // Time-related signals for roll call period
  private readonly _isEvening = signal(false);
  private readonly _countdown = signal('');
  private isInitialEffectRun = true;
  private countdownInterval?: number; // 修正 TS2322 錯誤

  // Expose master roster for hints/testing (保留)
  public readonly masterRoster = MASTER_ROSTER;

  // Public readonly signals for consumption by components
  public students = this._students.asReadonly();
  public isEvening = this._isEvening.asReadonly();
  public countdown = this._countdown.asReadonly();
  
  public totalStudents = computed(() => this._students().length);
  public presentStudents = computed(() => this._students().filter(s => s.status === '出席').length);
  public absentStudents = computed(() => this._students().filter(s => s.status !== '出席').length);

  constructor() {
    this.loadState();
    
    // This effect automatically saves the state to localStorage whenever it changes. (保留)
    effect(() => {
      const students = this._students();
      this.saveState(students);
    });

    // This effect automatically resets the student list when the roll call period changes.
    effect(() => {
      this.isEvening(); // Establish dependency on the signal

      if (this.isInitialEffectRun) {
        this.isInitialEffectRun = false;
        // 載入狀態後，首次運行時應從後端獲取最新狀態
        this.fetchStudents(); 
        return;
      }

      console.log('Roll call period changed. Resetting all students to "Present".');
      // 由於狀態現在由後端管理，這裡只呼叫後端重置 API
      this.resetToInitialList(); 
    });

    if (isPlatformBrowser(this.platformId)) {
      this.updateCountdown();
      // 👈 修正 TS2322 錯誤，使用 number 類型斷言
      this.countdownInterval = setInterval(() => this.updateCountdown(), 1000) as unknown as number;
    }
  }

  // ***************************************************************
  // 狀態管理（保留本地邏輯）
  // ***************************************************************

  /**
   * 從後端獲取當前學生狀態，並更新本地 Signal
   */
  public async fetchStudents(): Promise<void> {
    try {
      // 假設後端有一個 /api/v1/students 端點回傳當前所有學生的狀態
      const studentsData = await firstValueFrom(
        this.http.get<Student[]>(`${this.API_BASE_URL}/students`)
      );
      // 確保將 lastUpdatedAt 轉換為 Date 物件
      const studentsWithDates = studentsData.map(s => ({
        ...s,
        lastUpdatedAt: new Date(s.lastUpdatedAt),
      }));
      this._students.set(studentsWithDates);
    } catch (e) {
      console.error('Failed to fetch student status from backend', e);
      // 如果獲取失敗，可以使用本地狀態作為 fallback
    }
  }

  /**
   * Loads the student list from localStorage if available, otherwise initializes a new list. (保留)
   */
  private loadState(): void {
    if (isPlatformBrowser(this.platformId)) {
      try {
        const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedData) {
          const parsedStudents: Student[] = JSON.parse(savedData);
          const studentsWithDates = parsedStudents.map(s => ({
            ...s,
            lastUpdatedAt: new Date(s.lastUpdatedAt),
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

  /**
   * Saves the current student list to localStorage. (保留)
   */
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
   * Sets the student list to the default state from the master roster. (保留)
   * By default, all students are marked as '缺席'.
   */
  private setInitialList(): void {
    const initialStudents: Student