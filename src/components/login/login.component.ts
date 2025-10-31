import { Component, ChangeDetectionStrategy, output, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Student } from '../../models/student.model';
import { StudentService } from '../../services/student.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  standalone: true,
  imports: [FormsModule, CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  studentLoginSuccess = output<Student>();
  adminLoginSuccess = output<void>();

  studentId = signal('');
  studentName = signal('');
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  
  private studentService = inject(StudentService);

  // The 'Remember Me' feature was removed as we are moving away from localStorage
  // to simulate a backend-driven application where sessions would be handled differently.

  async handleStudentLogin() {
    this.errorMessage.set(null);
    const id = this.studentId().trim();
    const name = this.studentName().trim();

    if (!id || !name) {
        this.errorMessage.set('學號和姓名不能為空');
        return;
    }
    
    this.isLoading.set(true);
    try {
      const student = await this.studentService.login(id, name);
      this.studentLoginSuccess.emit(student);
    } catch (error) {
      console.error("Login failed", error);
      this.errorMessage.set('登入失敗，請稍後再試。');
    } finally {
      this.isLoading.set(false);
    }
  }

  handleAdminLogin() {
    this.adminLoginSuccess.emit();
  }
}
