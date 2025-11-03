import { Injectable, signal, computed } from '@angular/core';
import { Student, StudentStatus, LeaveType } from '../models/student.model';

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


  async login(studentId: string, name: string): Promise<Student> {
    await fakeApiCall();
    
    let studentToReturn: Student | undefined;
    
    this._students.update(students => {
      const existingStudent = students.find(s => s.id === studentId);
      if (existingStudent) {
        // If student exists, update their name and mark as present
        return students.map(s => {
          if (s.id === studentId) {
            studentToReturn = { ...s, name: name, status: '出席', leaveType: undefined, leaveRemarks: undefined, lastUpdatedAt: new Date() };
            return studentToReturn;
          }
          return s;
        });
      } else {
        // If new student, add them to the list
        const newStudent: Student = {
          id: studentId,
          name: name,
          status: '出席',
          lastUpdatedAt: new Date()
        };
        studentToReturn = newStudent;
        return [...students, newStudent];
      }
    });

    if (!studentToReturn) {
      // This case should not happen with the logic above, but it's good practice for type safety
      throw new Error('Login failed: could not find or create student.');
    }
    
    return studentToReturn;
  }

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
    await fakeApiCall(1000); // A slightly longer delay for a "heavy" operation
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