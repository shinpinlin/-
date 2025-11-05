import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
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
export class AppComponent {
  view = signal<'login' | 'student' | 'admin'>('login');
  currentUser = signal<Student | null>(null);

  // With a simulated backend, we no longer persist sessions in localStorage.
  // The app will always start on the login screen.

  onStudentLogin(student: Student) {
    this.currentUser.set(student);
    this.view.set('student');
  }

  onAdminLogin() {
    this.currentUser.set(null);
    this.view.set('admin');
  }

  onLogout() {
    // In a real app, this would also call a backend logout endpoint.
    this.currentUser.set(null);
    this.view.set('login');
  }
}