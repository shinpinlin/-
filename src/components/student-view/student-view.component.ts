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
        let actualLeaveType = this.getCleanLeaveType(user.leaveType);
        
        // 特殊狀態顯示文字
        if (actualLeaveType === '寢室查鋪' as any) return `寢室查鋪完成 (${user.leaveRemarks})`;
        if (actualLeaveType === '已就寢' as any) return `已回宿就寢`;
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

  // 提交請假
  async submitLeave() {
    const user = this.currentUser();
    if (!user) return;
    
    const type = this.leaveType();
    // 只有 '其他' 必須填寫備註
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

  // ✅ 學生銷假/回宿功能 (資料保存邏輯)
  async studentReturn() {
      const user = this.currentUser();
      if (!user) return;
      
      if (!confirm('確定已回到宿舍並要更改為「就寢」狀態嗎？')) return;

      this.isSubmitting.set(true);
      try {
          // 1. 抓取舊的請假資料
          let historyNote = '學生自行回報';
          
          if (user.status === '請假') {
              const oldType = this.getCleanLeaveType(user.leaveType);
              // 取得上次更新時間作為「請假時間」
              const leaveTime = this.getTaipeiTime(user.lastUpdatedAt); 
              // 格式化存入備註: "銷假回宿 | 原假別:K書中心 | 請假時間:23:10"
              historyNote = `銷假回宿 | 原假別:${oldType} | 請假時間:${leaveTime}`;
          }

          // 2. 發送新狀態 '已就寢'，並附帶歷史備註
          await this.studentService.applyForLeave(user.id, '已就寢' as any, historyNote);
          alert('歡迎回來！狀態已更新為「就寢」。');
      } catch (e) {
          alert('更新失敗，請稍後再試。');
      } finally {
          this.isSubmitting.set(false);
      }
  }

  // 寢室長功能
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
    
    const allStudents = this.studentService.students();

    try {
        if (this.dormCheckOption() === 'checked') {
            // 情境A: 宿舍區查鋪完成
            const leader = this.currentUser();
            if (leader) {
                // 防呆：如果寢室長正在請假(K書中心等)，提示且不覆蓋
                const currentType = this.getCleanLeaveType(leader.leaveType);
                const isAlreadyOnLeave = leader.status === '請假' && currentType !== '寢室查鋪' && currentType !== '已就寢';
                
                if (isAlreadyOnLeave) {
                    alert(`您目前狀態為「${currentType}」，系統將保留您的請假紀錄，不會變更為查鋪完成。`);
                    this.isDormSubmitting.set(false);
                    return;
                }

                const remarks = `寢室:${room}`;
                await this.studentService.applyForLeave(leader.id, '寢室查鋪' as any, remarks);
                this.dormMessage.set('回報成功');
            }
        } else {
            // 情境B: 不在宿舍區
            const studentId = this.missingStudentId().trim();
            const reason = this.missingReason().trim();
            const returnTime = this.missingReturnTime().trim();

            if (!studentId || !reason || !returnTime) {
                this.dormMessage.set('請填寫完整資訊');
                this.isDormSubmitting.set(false);
                return;
            }

            const targetStudent = allStudents.find(s => s.id === studentId);
            if (!targetStudent) {
                 this.dormMessage.set('找不到該學號');
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
        this.dormMessage.set('系統錯誤');
    } finally {
        this.isDormSubmitting.set(false);
    }
  }
}