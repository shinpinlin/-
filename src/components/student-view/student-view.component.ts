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

  readonly normalLeaveTypes: LeaveType[] = ['病假', '事假', '論文假', '其他'];
  readonly bedtimeLeaveTypes: LeaveType[] = ['K書中心', '文康室', '其他'];
  
  leaveType = signal<LeaveType>('病假');
  remarks = signal('');
  showLeaveForm = signal(false);
  leaveSubmitted = signal(false);
  isSubmitting = signal(false);

  showDormCheckModal = signal(false);
  dormRoomNumber = signal('');
  isDormSubmitting = signal(false);
  dormMessage = signal('');
  dormCheckOption = signal<'checked' | 'missing'>('checked');
  
  missingStudentId = signal('');
  missingReason = signal('');
  missingReturnTime = signal('');
  
  public studentService = inject(StudentService);
  public languageService = inject(LanguageService);

  currentUser = computed(() => 
    this.studentService.students().find(s => s.id === this.initialUser().id)
  );

  currentLeaveTypes = computed(() => {
    return this.studentService.isBedtime() ? this.bedtimeLeaveTypes : this.normalLeaveTypes;
  });

  currentStatus = computed(() => {
    const user = this.currentUser();
    if (!user) return this.languageService.translate('student.loggingOut');
    
    const normalizedStatus = user.status.trim();
    const statusKey = `statuses.${normalizedStatus}`;
    const translatedStatus = this.languageService.translate(statusKey);

    if (normalizedStatus === '出席') {
        if (this.studentService.isBedtime()) {
            return "您目前狀態：就寢";
        }
        return this.languageService.translate('student.status.present');
    }
    
    if (normalizedStatus === '請假' && user.leaveType) {
        let actualLeaveType = user.leaveType;
        if (actualLeaveType.startsWith('請假-')) {
            actualLeaveType = actualLeaveType.substring('請假-'.length) as LeaveType;
        }
        
        if (actualLeaveType === ('寢室查鋪' as any)) return `寢室查鋪完成 (${user.leaveRemarks})`;
        if (actualLeaveType === ('夜間外出' as any)) return `夜間外出中`;

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
        const types = this.currentLeaveTypes();
        if (types.length > 0) this.leaveType.set(types[0]);
    }, { allowSignalWrites: true });

    effect(() => {
      if (this.currentUser() === undefined) {
        this.logout.emit();
      }
    });
  }

  getTaipeiTime(utcString: string | undefined | null): string {
    if (!utcString) return '';
    try {
      const date = new Date(utcString);
      const originalTime = date.getTime();
      const newTime = originalTime + (8 * 60 * 60 * 1000);
      const newDate = new Date(newTime);
      return newDate.toLocaleString('zh-TW', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false
      });
    } catch (e) {
      return String(utcString);
    }
  }

  // ✅ 修正：只在選 '其他' 時強制檢查備註
  async submitLeave() {
    const user = this.currentUser();
    if (!user) return;
    
    const type = this.leaveType();
    
    // 只有 '其他' 需要檢查備註
    if (type === '其他' && !this.remarks().trim()) {
      alert(`申請「${type}」必須填寫備註欄位！`);
      return;
    }

    this.isSubmitting.set(true);
    try {
        await this.studentService.applyForLeave(user.id, this.leaveType(), this.remarks());
        alert('申請成功！');
        this.leaveSubmitted.set(true);
        this.showLeaveForm.set(false);
    } catch (error) {
        console.error('Failed to submit leave application', error);
        alert('申請失敗！可能是網路問題或後端拒絕了此假別。');
    } finally {
        this.isSubmitting.set(false);
    }
  }

  openDormModal() {
    this.dormRoomNumber.set('');
    this.dormCheckOption.set('checked');
    this.missingStudentId.set('');
    this.missingReason.set('');
    this.missingReturnTime.set('');
    this.dormMessage.set('');
    this.showDormCheckModal.set(true);
  }

  async submitDormCheck() {
    const room = this.dormRoomNumber().trim();
    if (!room) {
        this.dormMessage.set('請輸入寢室號碼');
        return;
    }

    this.isDormSubmitting.set(true);
    this.dormMessage.set('處理中...');

    try {
        if (this.dormCheckOption() === 'checked') {
            const leader = this.currentUser();
            if (leader) {
                const remarks = `寢室:${room} - 查鋪完成`;
                await this.studentService.applyForLeave(leader.id, '寢室查鋪' as any, remarks);
                this.dormMessage.set('回報成功：全寢到位');
            }
        } else {
            const studentId = this.missingStudentId().trim();
            const reason = this.missingReason().trim();
            const returnTime = this.missingReturnTime().trim();

            if (!studentId || !reason || !returnTime) {
                this.dormMessage.set('請填寫完整資訊 (學號、事由、時間)');
                this.isDormSubmitting.set(false);
                return;
            }
            
            const remarks = `寢室:${room}, 事由:${reason}, 預計返回:${returnTime}`;
            await this.studentService.applyForLeave(studentId, '夜間外出' as any, remarks);
            this.dormMessage.set(`回報成功：學生 ${studentId} 不在宿舍`);
        }

        this.studentService.fetchStudents();
        setTimeout(() => {
            if (this.showDormCheckModal()) {
                this.showDormCheckModal.set(false);
            }
        }, 1500);
    } catch (error) {
        this.dormMessage.set('系統錯誤或學號不存在');
    } finally {
        this.isDormSubmitting.set(false);
    }
  }
}