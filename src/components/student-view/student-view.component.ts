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

  // 寢室長查鋪相關
  showDormCheckModal = signal(false);
  dormRoomNumber = signal('');
  isDormSubmitting = signal(false);
  dormMessage = signal('');
  dormCheckOption = signal<'checked' | 'missing'>('checked');
  
  // ✅ 修改：支援多個學號輸入
  missingStudentIds = signal(''); 
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
        let actualLeaveType = this.getCleanLeaveType(user.leaveType);
        
        if (actualLeaveType === '寢室查鋪' as any) return `就寢 (查鋪確認)`;
        if (actualLeaveType === '已就寢' as any) return `就寢 (已銷假)`;
        if (actualLeaveType === '夜間外出' as any) return `夜間外出中`;

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

  getCleanLeaveType(t: string | undefined | null) {
      if (!t) return '';
      if (t.startsWith('請假-')) return t.substring(3);
      return t;
  }

  async submitLeave() {
    const user = this.currentUser();
    if (!user) return;
    
    const type = this.leaveType();
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
        alert('申請失敗！');
    } finally {
        this.isSubmitting.set(false);
    }
  }

  async studentReturn() {
      const user = this.currentUser();
      if (!user) return;
      
      if (!confirm('確定已回到宿舍並要更改為「就寢」狀態嗎？')) return;

      this.isSubmitting.set(true);
      try {
          let historyNote = '學生自行回報';
          if (user.status === '請假') {
              const oldType = this.getCleanLeaveType(user.leaveType);
              const leaveTime = this.getTaipeiTime(user.lastUpdatedAt); 
              historyNote = `銷假回宿 | 原假別:${oldType} | 請假時間:${leaveTime}`;
          }

          await this.studentService.applyForLeave(user.id, '已就寢' as any, historyNote);
          alert('歡迎回來！狀態已更新為「就寢」。');
      } catch (e) {
          alert('更新失敗，請稍後再試。');
      } finally {
          this.isSubmitting.set(false);
      }
  }

  openDormModal() {
    this.dormRoomNumber.set('');
    this.dormCheckOption.set('checked');
    this.missingStudentIds.set('');
    this.missingReason.set('');
    this.missingReturnTime.set('');
    this.dormMessage.set('');
    this.showDormCheckModal.set(true);
  }

  // ✅ 邏輯升級：批次處理缺席者，並自動標記寢室長為「查鋪」
  async submitDormCheck() {
    const room = this.dormRoomNumber().trim();
    if (!room) {
        this.dormMessage.set('請輸入寢室號碼');
        return;
    }

    this.isDormSubmitting.set(true);
    this.dormMessage.set('處理中...');

    try {
        // 1. 無論如何，先嘗試標記寢室長為「查鋪完成」
        // 除非寢室長自己已經請假 (K書中心等)
        const leader = this.currentUser();
        if (leader) {
            const currentType = this.getCleanLeaveType(leader.leaveType);
            // 如果寢室長狀態正常，或已經是查鋪/就寢狀態 -> 更新為查鋪
            const canUpdateLeader = leader.status === '出席' || currentType === '寢室查鋪' || currentType === '已就寢';
            
            if (canUpdateLeader) {
                const leaderRemarks = `寢室:${room} - 查鋪完成`;
                await this.studentService.applyForLeave(leader.id, '寢室查鋪' as any, leaderRemarks);
            }
            // 如果寢室長本人在 K書中心，系統不更新他的狀態，但允許他回報室友
        }

        // 2. 根據選項處理
        if (this.dormCheckOption() === 'checked') {
            // 全寢到位：只更新寢室長狀態 (已在上方執行)
            this.dormMessage.set('回報成功：全寢到位');
        } else {
            // 不在宿舍區：批次處理缺席名單
            const idsInput = this.missingStudentIds().trim();
            const reason = this.missingReason().trim();
            const returnTime = this.missingReturnTime().trim();

            if (!idsInput || !reason || !returnTime) {
                this.dormMessage.set('請填寫缺席學號及原因');
                this.isDormSubmitting.set(false);
                return;
            }

            // ✅ 支援多個學號：用空格、逗號分隔
            const studentIds = idsInput.split(/[,，\s]+/).filter(id => id.trim() !== '');
            let successCount = 0;

            for (const sid of studentIds) {
                const remarks = `寢室:${room}, 事由:${reason}, 預計返回:${returnTime}`;
                await this.studentService.applyForLeave(sid, '夜間外出' as any, remarks);
                successCount++;
            }

            this.dormMessage.set(`回報成功：已標記 ${successCount} 位學生外出`);
        }

        this.studentService.fetchStudents();
        setTimeout(() => {
            if (this.showDormCheckModal()) {
                this.showDormCheckModal.set(false);
            }
        }, 2000);
    } catch (error) {
        this.dormMessage.set('系統錯誤');
    } finally {
        this.isDormSubmitting.set(false);
    }
  }
}