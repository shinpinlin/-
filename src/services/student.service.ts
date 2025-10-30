import { Injectable, signal, computed, effect } from '@angular/core';
import { Student, StudentStatus, LeaveType } from '../models/student.model';

const STUDENT_LIST_KEY = 'rollCallStudentList';

function getInitialStudents(): Student[] {
  try {
    // Check if localStorage is available to prevent errors in non-browser environments
    if (typeof localStorage !== 'undefined') {
      const savedStudents = localStorage.getItem(STUDENT_LIST_KEY);
      return savedStudents ? JSON.parse(savedStudents) : [];
    }
  } catch (e) {
    console.error("Failed to parse students from localStorage", e);
    // If parsing fails, remove the invalid item to prevent future errors
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STUDENT_LIST_KEY);
    }
  }
  return [];
}

@Injectable({
  providedIn: 'root',
})
export class StudentService {
  private _students = signal<Student[]>(getInitialStudents());

  public students = this._students.asReadonly();
  
  public totalStudents = computed(() => this._students().length);
  public presentStudents = computed(() => this._students().filter(s => s.status === '出席').length);
  public absentStudents = computed(() => this._students().filter(s => s.status !== '出席').length);

  constructor() {
    effect(() => {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(STUDENT_LIST_KEY, JSON.stringify(this._students()));
        }
      } catch (e) {
        console.error("Failed to save students to localStorage", e);
      }
    });
  }

  login(studentId: string, name: string): Student {
    let studentToReturn: Student | undefined;
    
    this._students.update(students => {
      const existingStudent = students.find(s => s.id === studentId);
      if (existingStudent) {
        return students.map(s => {
          if (s.id === studentId) {
            // Update existing student, mark as present, and clear leave info
            studentToReturn = { ...s, name: name, status: '出席', leaveType: undefined, leaveRemarks: undefined };
            return studentToReturn;
          }
          return s;
        });
      } else {
        // Add new student
        const newStudent: Student = {
          id: studentId,
          name: name,
          status: '出席'
        };
        studentToReturn = newStudent;
        return [...students, newStudent];
      }
    });

    return studentToReturn!;
  }

  applyForLeave(studentId: string, leaveType: LeaveType, remarks: string) {
    this._students.update(students => 
      students.map(s => {
        if (s.id === studentId) {
          return { ...s, status: '請假', leaveType: leaveType, leaveRemarks: remarks };
        }
        return s;
      })
    );
  }

  deleteStudent(studentId: string) {
    this._students.update(students => students.filter(s => s.id !== studentId));
  }
  
  resetToInitialList() {
    this._students.update(currentStudents => 
      currentStudents.map(student => ({
        ...student,
        status: '出席' as StudentStatus,
        leaveType: undefined,
        leaveRemarks: undefined
      }))
    );
  }
}