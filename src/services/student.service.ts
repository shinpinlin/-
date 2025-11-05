import { Injectable, signal, computed, effect, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Student, StudentStatus, LeaveType } from '../models/student.model';

// Helper to simulate network latency
const fakeApiCall = (delay: number = 500): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, delay));
};

// A pre-defined master list of all students in the class.
// In a real application, this would come from a database.
const MASTER_ROSTER: { id: string, name: string }[] = [
  // 請在此處貼上您的學生名單
  // 範例:
  // { id: 'S001', name: '王小明' },
  // { id: 'S002', name: '陳大文' },
];

const LOCAL_STORAGE_KEY = 'studentAttendanceApp_students';

@Injectable({
  providedIn: 'root',
})
export class StudentService {
  private _students = signal<Student[]>([]);
  private platformId = inject(PLATFORM_ID);

  // Time-related signals for roll call period
  private readonly _isEvening = signal(false);
  private readonly _countdown = signal('');
  private isInitialEffectRun = true;
  // Fix: Changed NodeJS.Timeout to number for the return type of setInterval, which is correct for browser environments.
  // 修正後的程式碼 (使用聯合類型或 any)
private countdownInterval: any; 
// 或者更嚴謹: private countdownInterval: number | undefined; 
// 但我們使用 any 來確保編譯通過

  // Expose master roster for hints/testing
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
    
    // This effect automatically saves the state to localStorage whenever it changes.
    effect(() => {
      const students = this._students();
      this.saveState(students);
    });

    // This effect automatically resets the student list when the roll call period changes.
    effect(() => {
      this.isEvening(); // Establish dependency on the signal

      if (this.isInitialEffectRun) {
        this.isInitialEffectRun = false;
        return;
      }

      console.log('Roll call period changed. Resetting all students to "Present".');
      this.resetToInitialList();
    });

    if (isPlatformBrowser(this.platformId)) {
      this.updateCountdown();
      this.countdownInterval = setInterval(() => this.updateCountdown(), 1000);
    }
  }

  /**
   * Loads the student list from localStorage if available, otherwise initializes a new list.
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
   * Saves the current student list to localStorage.
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
   * Sets the student list to the default state from the master roster.
   * By default, all students are marked as '缺席'.
   */
  private setInitialList(): void {
    const initialStudents: Student[] = MASTER_ROSTER.map(s => ({
      id: s.id,
      name: s.name,
      status: '缺席',
      lastUpdatedAt: new Date(),
    }));
    this._students.set(initialStudents);
  }
  
  private updateCountdown(): void {
    const now = new Date();
    
    const morningCutoff = new Date(now);
    morningCutoff.setHours(9, 30, 0, 0);

    const eveningCutoff = new Date(now);
    eveningCutoff.setHours(21, 30, 0, 0);

    let isCurrentlyEvening: boolean;
    let nextTransitionTime: Date;

    // From 09:30 to 21:30 is now considered Evening Roll Call
    if (now >= morningCutoff && now < eveningCutoff) {
      isCurrentlyEvening = true; 
      nextTransitionTime = eveningCutoff;
    } else {
      // Outside 09:30 to 21:30 is now considered Morning Roll Call
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

  async login(studentId: string, name: string): Promise<Student> {
    await fakeApiCall();

    const studentFromRoster = MASTER_ROSTER.find(s => s.id === studentId);
    
    if (!studentFromRoster) {
      throw new Error('errors.studentIdNotFound');
    }

    if (studentFromRoster.name !== name) {
      throw new Error('errors.nameMismatch');
    }

    let loggedInStudent!: Student;
    this._students.update(currentStudents =>
      currentStudents.map(s => {
        if (s.id === studentId) {
          loggedInStudent = {
            ...s,
            status: '出席',
            leaveType: undefined,
            leaveRemarks: undefined,
            lastUpdatedAt: new Date(),
          };
          return loggedInStudent;
        }
        return s;
      })
    );
    
    return loggedInStudent;
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
  
  /**
   * Resets all students from the master roster to '出席' status.
   */
  async resetToInitialList(): Promise<void> {
    await fakeApiCall(1000);
    const resetStudents: Student[] = MASTER_ROSTER.map(s => ({
      id: s.id,
      name: s.name,
      status: '出席',
      leaveType: undefined,
      leaveRemarks: undefined,
      lastUpdatedAt: new Date(),
    }));
    this._students.set(resetStudents);
  }
}