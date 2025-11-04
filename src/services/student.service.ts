import { Injectable, signal, computed, inject } from '@angular/core';
import { Student, StudentStatus, LeaveType } from '../models/student.model';
import { HttpClient } from '@angular/common/http'; 
import { firstValueFrom } from 'rxjs'; 

@Injectable({
  providedIn: 'root',
})
export class StudentService {
  private _students = signal<Student[]>([]);

  public students = this._students.asReadonly();
  
  public totalStudents = computed(() => this._students().length);
  public presentStudents = computed(() => this._students().filter(s => s.status === '出席').length);
  public absentStudents = computed(() => this._students().filter(s => s.status !== '出席').length);

  // --- 1. 注入 HttpClient 並設定後端 URL ---
  private http = inject(HttpClient);
  private backendApiUrl = 'https://rocallsystem-backend.onrender.com'; 

  async login(studentId: string, name: string): Promise<Student> {
    
    const payload = { 
      studentId: studentId, 
      studentName: name 
    };

    try {
      const loggedInStudent = await firstValueFrom(
        this.http.post<Student>(`${this.backendApiUrl}/api/login`, payload)
      );

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

  // --- 2. 修正「請假」功能，讓它呼叫後端 API ---
  async applyForLeave(studentId: string, leaveType: LeaveType, remarks: string): Promise<void> {
    
    const payload = {
      studentId: studentId,
      leaveType: leaveType,
      remarks: remarks
    };

    try {
      // 真正呼叫後端 API
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

  // (注意：刪除和重設功能仍然是 "假的")
  async deleteStudent(studentId: string): Promise<void> {
    this._students.update(students => students.filter(s => s.id !== studentId));
  }
   
  async resetToInitialList(): Promise<void> {
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