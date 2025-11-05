import { Component, ChangeDetectionStrategy, output, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Student } from '../../models/student.model';
import { StudentService } from '../../services/student.service';
import { CommonModule } from '@angular/common';
import { LanguageService } from '../../services/language.service';
import { LanguageSwitcherComponent } from '../language-switcher/language-switcher.component';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  standalone: true,
  imports: [FormsModule, CommonModule, LanguageSwitcherComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  studentLoginSuccess = output<Student>();
  adminLoginSuccess = output<void>();

  studentId = signal('');
  // 移除 studentName signal
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  
  private studentService = inject(StudentService);
  public languageService = inject(LanguageService);

  async handleStudentLogin() {
    this.errorMessage.set(null);
    const id = this.studentId().trim();
    // 移除取得 name 的邏輯

    if (!id) { // 修正：只檢查學號是否為空
        this.errorMessage.set(this.languageService.translate('errors.emptyFields'));
        return;
    }
    
    this.isLoading.set(true);
    try {
      // 修正：只傳遞學號 (ID) 即可，不再傳遞 name
      const student = await this.studentService.login(id); 
      this.studentLoginSuccess.emit(student);
    } catch (error) {
      console.error("Login failed", error);
      const messageKey = error instanceof Error ? error.message : 'errors.loginFailed';
      this.errorMessage.set(this.languageService.translate(messageKey));
    } finally {
      this.isLoading.set(false);
    }
  }

  handleAdminLogin() {
    this.adminLoginSuccess.emit();
  }
}