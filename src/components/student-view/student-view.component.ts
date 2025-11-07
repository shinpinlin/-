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
  imports: [CommonModule, FormsModule], // 根據您的註解，已移除 LanguageSwitcherComponent
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
    this.languageService.language(); // Establish dependency on the signal
    const user = this.currentUser();
    if (!user) return this.languageService.translate('student.loggingOut');
   
    // 🚀 修正點：對狀態字串進行 trim() 處理，移除頭尾空白
    const normalizedStatus = user.status.trim();
    
    const statusKey = `statuses.${normalizedStatus}`;
    const translatedStatus = this.languageService.translate(statusKey);

    // 🚀 修正點：比對 '出席' 時使用 normalizedStatus
    if (normalizedStatus === '出席') return this.languageService.translate('student.status.present');
    
    // 🚀 修正點：比對 '請假' 時使用 normalizedStatus
    if (normalizedStatus === '請假' && user.leaveType) {
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
      // 根據您的註解，已移除 alert()
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
        // 根據您的註解，已移除 alert()
        console.error(this.languageService.translate('errors.leaveSubmitFailed'));
    } finally {
        this.isSubmitting.set(false);
    }
  }
}