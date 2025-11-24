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

  // 最終修正：定義請假類型列表 (讓 HTML 模板可以循環顯示選項)
  readonly leaveTypes: LeaveType[] = ['病假', '事假', '論文假', '其他'];
  
  leaveType = signal<LeaveType>('病假');
  remarks = signal('');
  showLeaveForm = signal(false);
  leaveSubmitted = signal(false);
  isSubmitting = signal(false);
  
  private studentService = inject(StudentService);
  public languageService = inject(LanguageService);

  // 修正後的 computed properties，確保狀態同步
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
    
    // 關鍵修正：處理後端傳回的 '請假' 狀態並解析翻譯鍵
    if (normalizedStatus === '請假' && user.leaveType) {
        // 檢查 leaveType 是否以 '請假-' 開頭 (這是後端 app.py 的儲存格式)
        let actualLeaveType = user.leaveType;
        
        if (actualLeaveType.startsWith('請假-')) {
            // 關鍵修正：使用 'as LeaveType' 進行類型斷言，解決 TS2322 錯誤
            actualLeaveType = actualLeaveType.substring('請假-'.length) as LeaveType;
        }
        
        const leaveTypeKey = `leaveTypes.${actualLeaveType}`;
        const translatedLeaveType = this.languageService.translate(leaveTypeKey);

        // 如果翻譯失敗（回傳了翻譯鍵本身），則顯示通用錯誤，否則顯示完整句子
        if (translatedLeaveType.startsWith('leaveTypes.')) {
             return this.languageService.translate('student.status.generic', { status: normalizedStatus + ` (${user.leaveType})` });
        }
        
        return this.languageService.translate('student.status.onLeave', { leaveType: translatedLeaveType });
    }
    
    return this.languageService.translate('student.status.generic', { status: translatedStatus });
  });

  constructor() {
    this.leaveSubmitted.set(false); // 確保每次組件啟動時，leaveSubmitted 狀態被重置
    
    effect(() => {
      // If student is deleted by admin, currentUser becomes undefined, so log out.
      if (this.currentUser() === undefined) {
        this.logout.emit();
      }
    });
  }

// 👇👇👇 請將這段程式碼貼入 student-view.component.ts 類別中 👇👇👇  
  getTaipeiTime(utcString: string | undefined | null): string {
    if (!utcString) return '';
    try {
      const date = new Date(utcString);
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
    } catch {
      return String(utcString);
    }
  }

  // 👆👆👆 貼上結束 👆👆👆
  async submitLeave() {
    // ... 原有的程式碼 ...  
async submitLeave() {
    const user = this.currentUser();
    if (!user) return;
    
    if (this.leaveType() === '其他' && !this.remarks().trim()) {
      console.warn(this.languageService.translate('student.remarks') + ` (` + this.languageService.translate('student.remarksRequired') + `)`);
      return;
    }

    this.isSubmitting.set(true);
    try {
        // 這裡傳遞 leaveType，後端會將其轉換為 '請假-類型' 格式
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