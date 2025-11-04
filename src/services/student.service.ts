import { Injectable, signal, computed, inject } from '@angular/core';
import { Student, StudentStatus, LeaveType } from '../models/student.model';
import { HttpClient } from '@angular/common/http'; // <-- 匯入 HttpClient
import { firstValueFrom } from 'rxjs'; // <-- 匯入 firstValueFrom

// Helper to simulate network latency
const fakeApiCall = (delay: number = 500): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, delay));
};

@Injectable({
  providedIn: 'root',
})
export class StudentService {
  // In a real app, this data would live on a server.
  // We manage it in-memory here to simulate a shared data source.
  private _students = signal<Student[]>([]);

  public students = this._students.asReadonly();
  
  public totalStudents = computed(() => this._students().length);
  public presentStudents = computed(() => this._students().filter(s => s.status === '出席').length);
  public absentStudents = computed(() => this._students().filter(s => s.status !== '出席').length);

  // --- 1. 注入 HttpClient 並設定後端 URL ---
  private http = inject(HttpClient);
  // 您的後端 API 網址 (請確認與您部署成功的 "rocallsystem-backend" 網址一致)
  private backendApiUrl = 'https://rocallsystem-backend.onrender.com'; 

  async login(studentId: string, name: string): Promise<Student> {
    
    // --- 2. 移除 fakeApiCall() 並建立傳送的資料 ---
    const payload = { 
      studentId: studentId, 
      studentName: name 
    };

    try {
      // --- 3. 真正呼叫後端 API (POST 請求) ---
      const loggedInStudent = await firstValueFrom(
        this.http.post<Student>(`${this.backendApiUrl}/api/login`, payload)
      );

      // --- 4. 更新本地狀態 (讓 UI 立即更新) ---
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

  // (注意：以下的功能仍然是 "假的"，未來需要您為它們建立各自的後端 API)

  async applyForLeave(studentId: string, leaveType: LeaveType, remarks: string): Promise<void> {
    await fakeApiCall();
    this._students.update(students => 
      students.map(s => {
        if (s.id === studentId) {
          return { ...s, status: '請假', leaveType: leaveType, leaveRemarks: remarks, lastUpdatedAt: new Date() };
        }
        return s;
      })
    );
  }

  async deleteStudent(studentId: string): Promise<void> {
    await fakeApiCall();
    this._students.update(students => students.filter(s => s.id !== studentId));
  }
   
  async resetToInitialList(): Promise<void> {
    await fakeApiCall(1000); 
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