import { Component, ChangeDetectionStrategy, output, signal, inject, OnInit } from '@angular/core';
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
export class LoginComponent implements OnInit {
  studentLoginSuccess = output<Student>();
  adminLoginSuccess = output<void>();

  studentId = signal('');
  studentName = signal('');
  rememberMe = signal(false); // Default to false for more explicit user consent
  errorMessage = signal<string | null>(null);
  
  private studentService = inject(StudentService);

  private readonly STUDENT_INFO_KEY = 'lastStudentLogin';

  ngOnInit() {
    try {
      const savedStudentInfo = localStorage.getItem(this.STUDENT_INFO_KEY);
      if (savedStudentInfo) {
        const { studentId, studentName } = JSON.parse(savedStudentInfo);
        if (studentId && studentName) {
          this.studentId.set(studentId);
          this.studentName.set(studentName);
          this.rememberMe.set(true); // If there's saved data, check the box
        }
      }
    } catch (error) {
      console.error("Failed to parse student info from localStorage", error);
      localStorage.removeItem(this.STUDENT_INFO_KEY);
    }
  }

  handleStudentLogin() {
    this.errorMessage.set(null);
    const id = this.studentId().trim();
    const name = this.studentName().trim();

    if (!id || !name) {
        this.errorMessage.set('學號和姓名不能為空');
        return;
    }

    this.studentId.set(id);
    this.studentName.set(name);
    
    if (this.rememberMe()) {
      try {
        const studentInfo = JSON.stringify({ studentId: id, studentName: name });
        localStorage.setItem(this.STUDENT_INFO_KEY, studentInfo);
      } catch (error) {
        console.error("Failed to save student info to localStorage", error);
      }
    } else {
      localStorage.removeItem(this.STUDENT_INFO_KEY);
    }

    const student = this.studentService.login(id, name);
    this.studentLoginSuccess.emit(student);
  }

  handleAdminLogin() {
    this.adminLoginSuccess.emit();
  }
}
