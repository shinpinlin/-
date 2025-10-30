import { Component, ChangeDetectionStrategy, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Student } from './models/student.model';

import { LoginComponent } from './components/login/login.component';
import { StudentViewComponent } from './components/student-view/student-view.component';
import { AdminViewComponent } from './components/admin-view/admin-view.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    LoginComponent,
    StudentViewComponent,
    AdminViewComponent
  ],
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit {
  view = signal<'login' | 'student' | 'admin'>('login');
  currentUser = signal<Student | null>(null);

  ngOnInit() {
    try {
      const savedSession = localStorage.getItem('rollCallSession');
      if (savedSession) {
        const session = JSON.parse(savedSession);
        if (session.type === 'admin') {
          this.onAdminLogin(false); // don't write to localStorage again
        } else if (session.type === 'student' && session.user) {
          this.onStudentLogin(session.user, false); // don't write to localStorage again
        }
      }
    } catch (error) {
      console.error("Failed to parse session from localStorage", error);
      localStorage.removeItem('rollCallSession');
    }
  }

  onStudentLogin(student: Student, writeToStorage = true) {
    this.currentUser.set(student);
    this.view.set('student');
    if (writeToStorage) {
      localStorage.setItem('rollCallSession', JSON.stringify({ type: 'student', user: student }));
    }
  }

  onAdminLogin(writeToStorage = true) {
    this.currentUser.set(null);
    this.view.set('admin');
    if (writeToStorage) {
      localStorage.setItem('rollCallSession', JSON.stringify({ type: 'admin' }));
    }
  }

  onLogout() {
    localStorage.removeItem('rollCallSession');
    this.currentUser.set(null);
    this.view.set('login');
  }
}
