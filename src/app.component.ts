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

  // --- 🚀 這是我們新增的「重置」功能 ---
  resetAttendance() {
    // 1. 跳出輸入框，詢問密碼
    const password = prompt("此為高風險操作，請輸入密碼以繼續：");

    // 2. 如果使用者按了「取消」或沒輸入，就什麼都不做
    if (!password) {
        return; 
    }

    // 3. 您的後端 API 網址
    // (根據您的 app.py，路徑是 /api/v1/reset-attendance)
    // (根據您的 docx，後端主機是 rocallsystem-backend)
    const apiUrl = 'https://rocallsystem-backend.onrender.com/api/v1/reset-attendance';

    // 4. 將使用者輸入的密碼，"POST" 到您的「後端」API
    fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ adminPassword: password }) // 將密碼包在 JSON 中
    })
    .then(response => response.json())
    .then(data => {
        // 5. 顯示後端傳回來的訊息 (成功或密碼錯誤)
        alert(data.message); 
    })
    .catch(error => {
        console.error('重置時發生錯誤:', error);
        alert('操作失敗，請查看控制台日誌。');
    });
  }
  // --- 新增功能結束 ---
}