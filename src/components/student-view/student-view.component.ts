import { Component, ChangeDetectionStrategy, input, output, signal, inject, computed, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Student, LeaveType } from '../../models/student.model';
import { StudentService } from '../../services/student.service';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-student-view',
  templateUrl: './student-view.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentViewComponent {
  initialUser = input.required<Student>({ alias: 'currentUser' });
  logout = output<void>();

  leaveType = signal<LeaveType>('病假');
  remarks = signal('');
  showLeaveForm = signal(false);
  leaveSubmitted = signal(false);
  isSubmitting = signal(false);
  
  private studentService = inject(StudentService);
  public languageService = inject(LanguageService);

  // 🚀 關鍵修正 1：修正 computed 語法錯誤，現在它會正確追蹤服務中的學生狀態
  currentUser = computed(() => 
    this.studentService.students().find(s => s.id === this.initialUser().id)
  );

  currentStatus = computed(() => {
    const user = this.currentUser();
    if (!user) return this.languageService.translate('student.loggingOut');
    
    // 進行狀態字串標準化，以防資料庫儲存時帶有空白字元
    const normalizedStatus = user.status.trim();
    const statusKey = `statuses.${normalizedStatus}`;
    const translatedStatus = this.languageService.translate(statusKey);

    if (normalizedStatus === '出席') return this.languageService.translate('student.status.present');
    
    if (normalizedStatus === '請假' && user.leaveType) {
        const leaveTypeKey = `leaveTypes.${user.leaveType}`;
        const translatedLeaveType = this.languageService.translate(leaveTypeKey);
        return this.languageService.translate('student.status.onLeave', { leaveType: translatedLeaveType });
    }
    
    return this.languageService.translate('student.status.generic', { status: translatedStatus });
  });

  constructor() {
    effect(() => {
      // If student is deleted by admin, currentUser becomes undefined, so log out.
      if (this.currentUser() === undefined) {
        this.logout.emit();
      }
    });
  }

  async submitLeave() {
    const user = this.currentUser();
    if (!user) return;
    
    if (this.leaveType() === '其他' && !this.remarks().trim()) {
      console.warn(this.languageService.translate('student.remarks') + ` (` + this.languageService.translate('student.remarksRequired') + `)`);
      return;
    }

    this.isSubmitting.set(true);
    try {
        await this.studentService.applyForLeave(user.id, this.leaveType(), this.remarks());
        this.leaveSubmitted.set(true);
        this.showLeaveForm.set(false);
    } catch (error) {
        console.error('Failed to submit leave application', error);
        console.error(this.languageService.translate('errors.leaveFailed'));
    } finally {
        this.isSubmitting.set(false);
    }
  }
}