import { Injectable, signal, computed, inject } from '@angular/core';
import { Student, StudentStatus, LeaveType } from '../models/student.model';
import { HttpClient } from '@angular/common/http'; 
import { firstValueFrom } from 'rxjs'; 

@Injectable({
  providedIn: 'root',
})
export class StudentService {
  // 移除所有與計時器相關的變數，解決 TS2322 錯誤！
  // private countdownInterval: any; // 這行也應該被移除

  private _students = signal<Student[]>([]);

  public students = this._students.asReadonly();

  public totalStudents = computed(() => this._students().length);
  public presentStudents = computed(() => this._students().filter(s => s.status === '出席').length);
  public absentStudents = computed(() => this._students().filter(s => s.status !== '出席').length);

  private http = inject(HttpClient);
  // 您的後端 API 網址
  private backendApiUrl = 'https://rocallsystem-backend.onrender.com'; 

  // --- 建構子：啟動時自動載入資料 ---
  constructor() {
    this.loadInitialData();
  }

  private async loadInitialData(): Promise<void> {
    try {
      // 呼叫後端 GET /api/students API
      const studentsFromDb = await firstValueFrom(
        this.http.get<Student[]>(`${this.backendApiUrl}/api/students`)
      );
      // 將從資料庫讀取的資料設定為目前狀態
      this._students.set(studentsFromDb);
    } catch (error) {
      console.error("載入初始資料失敗", error);
    }
  }

  // --- Login 功能 ---
  async login(studentId: string): Promise<Student> {

    const payload = { 
      studentId: studentId, 
      studentName: name 
    };

    try {
      const loggedInStudent = await firstValueFrom(
        this.http.post<Student>(`${this.backendApiUrl}/api/login`, payload)
      );

      // 更新本地狀態
      this._students.update(students => {
        const existingStudent = students.find(s => s.id === loggedInStudent.id);
        if (existingStudent) {
          return students.map(s => s.id === loggedInStudent.id ? loggedInStudent : s);
        } else {
          return [...students, loggedInStudent];
        }
      });

      return loggedInStudent;

    } catch (error) {
      console.error("Login failed", error);
      throw error; 
    }
  }

  // --- Apply for Leave 功能 ---
  async applyForLeave(studentId: string, leaveType: LeaveType, remarks: string): Promise<void> {

    const payload = {
      studentId: studentId,
      leaveType: leaveType,
      remarks: remarks
    };

    try {
      await firstValueFrom(
        this.http.post(`${this.backendApiUrl}/api/leave`, payload)
      );

      // 更新本地 UI 狀態
      this._students.update(students => 
        students.map(s => {
          if (s.id === studentId) {
            return { ...s, status: '請假', leaveType: leaveType, leaveRemarks: remarks, lastUpdatedAt: new Date() };
          }
          return s;
        })
      );
    } catch (error) {
       console.error("Apply for leave failed", error);
       throw error;
    }
  }

  // (注意：以下功能仍然是 "假的" - 不會連線後端)
  async deleteStudent(studentId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 500));
    this._students.update(students => students.filter(s => s.id !== studentId));
  }

  async resetToInitialList(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    this._students.update(currentStudents => 
      currentStudents.map(student => ({
        ...student,
        status: '出席' as StudentStatus,
        leaveType: undefined,
        leaveRemarks: undefined,
        lastUpdatedAt: new Date()
      }))
    );
  }
}