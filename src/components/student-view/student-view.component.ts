import { Component, ChangeDetectionStrategy, input, output, signal, inject, computed, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Student, LeaveType } from '../../models/student.model';
import { StudentService } from '../../services/student.service';
import { LanguageService } from '../../services/language.service';
// 關鍵修正：移除 LanguageSwitcherComponent 匯入

@Component({
  selector: 'app-student-view',
  templateUrl: './student-view.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule], // 👈 關鍵修正：從 imports 陣列中移除 LanguageSwitcherComponent
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

  // Reactive signal that tracks the current user's state from the service
  currentUser = computed(() => 
    this.studentService.students().find(s => s.id === this.initialUser().id)
  );

  constructor() {
    effect(() => {
      // If student is deleted by admin, currentUser becomes undefined, so log out.
      if (this.currentUser() === undefined) {
        // Using a timeout to avoid changing view during a change detection cycle.
        setTimeout(() => this.logout.emit(), 0);
      }
    });
  }

  readonly leaveTypes: LeaveType[] = ['病假', '事假', '論文假', '其他'];

  currentStatus = computed(() => {
    this.languageService.language(); // Establish dependency on language change
    const user = this.currentUser();
    if (!user) return this.languageService.translate('student.loggingOut');
    
    const statusKey = `statuses.${user.status}`;
    const translatedStatus = this.languageService.translate(statusKey);

    if (user.status === '出席') return this.languageService.translate('student.status.present');
    if (user.status === '請假' && user.leaveType) {
        const leaveTypeKey = `leaveTypes.${user.leaveType}`;
        const translatedLeaveType = this.languageService.translate(leaveTypeKey);
        return this.languageService.translate('student.status.onLeave', { leaveType: translatedLeaveType });
    }
    return this.languageService.translate('student.status.generic', { status: translatedStatus });
  });

  async submitLeave() {
    const user = this.currentUser();
    if (!user) return;
    
    if (this.leaveType() === '其他' && !this.remarks().trim()) {
      const alertMessage = this.languageService.translate('student.remarks') + ` (` + this.languageService.translate('student.remarksRequired') + `)`;
      alert(alertMessage);
      return;
    }

    this.isSubmitting = true;
    try {
        await this.studentService.applyForLeave(user.id, this.leaveType(), this.remarks());
        this.leaveSubmitted.set(true);
        this.showLeaveForm.set(false);
    } catch (error) {
        console.error('Failed to submit leave application', error);
        alert(this.languageService.translate('errors.leaveSubmitFailed'));
    } finally {
        this.isSubmitting.set(false);
    }
  }
}