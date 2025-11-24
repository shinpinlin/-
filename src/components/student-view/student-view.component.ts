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

  // 定義請假類型列表
  readonly leaveTypes: LeaveType[] = ['病假', '事假', '論文假', '其他'];
  
  leaveType = signal<LeaveType>('病假');
  remarks = signal('');
  showLeaveForm = signal(false);
  leaveSubmitted = signal(false);
  isSubmitting = signal(false);
  
  private studentService = inject(StudentService);
  public languageService = inject(LanguageService);

  // computed properties
  currentUser = computed(() => 
    this.studentService.students().find(s => s.id === this.initialUser().id)
  );

  currentStatus = computed(() => {
    const user = this.currentUser();
    if (!user) return this.languageService.translate('student.loggingOut');
    
    const normalizedStatus = user.status.trim();
    const statusKey = `statuses.${normalizedStatus}`;
    const translatedStatus = this.languageService.translate(statusKey);

    if (normalizedStatus === '出席') return this.languageService.translate('student.status.present');
    
    if (normalizedStatus === '請假' && user.leaveType) {
        let actualLeaveType = user.leaveType;
        
        if (actualLeaveType.startsWith('請假-')) {
            actualLeaveType = actualLeaveType.substring('請假-'.length) as LeaveType;
        }
        
        const leaveTypeKey = `leaveTypes.${actualLeaveType}`;
        const translatedLeaveType = this.languageService.translate(leaveTypeKey);

        if (translatedLeaveType.startsWith('leaveTypes.')) {
             return this.languageService.translate('student.status.generic', { status: normalizedStatus + ` (${user.leaveType})` });
        }
        
        return this.languageService.translate('student.status.onLeave', { leaveType: translatedLeaveType });
    }
    
    return this.languageService.translate('student.status.generic', { status: translatedStatus });
  });

  constructor() {
    this.leaveSubmitted.set(false);
    
    effect(() => {
      if (this.currentUser() === undefined) {
        this.logout.emit();
      }
    });
  }

  // ✅ 強力修正版：強制將時間視為 UTC 並轉為台灣時間
  getTaipeiTime(utcString: string | undefined | null): string {
    if (!utcString) return '';
    try {
      let safeString = String(utcString).trim();

      // 如果格式是 "YYYY-MM-DD HH:mm:ss" (中間有空白)，把空白改成 'T'
      if (safeString.includes(' ') && !safeString.includes('T')) {
        safeString = safeString.replace(' ', 'T');
      }

      // 如果沒有 Z 也沒有時區偏移，強制補上 Z (視為 UTC)
      if (!safeString.endsWith('Z') && !safeString.includes('+') && !safeString.includes('-')) {
        safeString += 'Z';
      }

      const date = new Date(safeString);

      return date.toLocaleString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: 'Asia/Taipei'
      });
    } catch (e) {
      console.error('Time conversion error:', e);
      return String(utcString);
    }
  }

  // ✅ 這是原本報錯的 async submitLeave，現在位置正確了
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