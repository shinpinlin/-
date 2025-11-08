import { Component, ChangeDetectionStrategy, output, signal, inject, computed } from '@angular/core';
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
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  
  private studentService = inject(StudentService);
  public languageService = inject(LanguageService);

  foundStudentName = computed(() => {
    const id = this.studentId().trim();
    if (!id) {
        return null;
    }
    const student = this.studentService.masterRoster.find(s => s.id === id);
    return student ? student.name : null;
  });

  // 🚀 修正後的 handleStudentLogin 函式
  async handleStudentLogin() {
    this.errorMessage.set(null);
    const id = this.studentId().trim();

    if (!id) {
        this.errorMessage.set(this.languageService.translate('errors.emptyFields'));
        return;
    }
    
    if (!this.foundStudentName()) {
        this.errorMessage.set(this.languageService.translate('errors.studentIdNotFound'));
        return;
    }

    this.isLoading.set(true);
    try {
      const student = await this.studentService.login(id);
      this.studentLoginSuccess.emit(student);
    } catch (error: any) { 
      console.error("Login failed", error);
      
      let translationKey = 'errors.loginFailed'; 
      
      // 檢查後端錯誤回覆 (HttpErrorResponse)，確保能顯示後端提供的錯誤碼/訊息
      if (error && error.error && typeof error.error.error === 'string') {
          translationKey = error.error.error; 
      }
      
      this.errorMessage.set(this.languageService.translate(translationKey));
    } finally {
      this.isLoading.set(false);
    }
  }

  handleAdminLogin() {
    this.adminLoginSuccess.emit();
  }
}