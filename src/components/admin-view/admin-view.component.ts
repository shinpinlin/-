import { Component, ChangeDetectionStrategy, output, signal, inject, computed, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Student, StudentStatus, LeaveType } from '../../models/student.model';
import { StudentService } from '../../services/student.service';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-admin-view',
  templateUrl: './admin-view.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminViewComponent implements OnInit {
  logout = output<void>();
  
  // 篩選/搜尋相關的 Signal
  searchQuery = signal('');
  leaveTypeFilter = signal('all'); // 預設值為 'all'
  showAbsentOnly = signal(false); // 控制是否只顯示缺席/請假人員
  
  // 模態框相關的 Signal
  showResetPasswordModal = signal(false);
  resetPasswordInput = signal('');
  passwordError = signal<string | null>(null);
  isResetting = signal(false);

  showDeleteConfirmModal = signal(false);
  studentToDelete = signal<Student | null>(null);
  deletePasswordInput = signal('');
  deletePasswordError = signal<string | null>(null);
  isDeleting = signal(false);

  // 服務注入
  public studentService = inject(StudentService);
  public languageService = inject(LanguageService);

  // 靜態資料
  readonly leaveTypes: LeaveType[] = ['病假', '事假', '論文假', '其他'];
  private readonly ADMIN_DELETE_PASSWORD = '119'; // 內嵌的刪除密碼

  ngOnInit(): void {
    // 確保在初始化時從後端載入最新數據
    this.studentService.fetchStudents();
  }

  // --- 🚀 新增：清理假別名稱的輔助函式 (解決顯示問題) ---
  getCleanLeaveType(leaveType: string | null): string {
    if (!leaveType) return '';
    
    // 檢查並移除後端可能儲存的 '請假-' 前綴 (處理舊資料或未修正的後端)
    const prefix = '請假-';
    if (leaveType.startsWith(prefix)) {
      return leaveType.substring(prefix.length);
    }
    // 否則直接返回假別名稱 (處理新資料或已修正的後端)
    return leaveType;
  }

  // 篩選學生的計算屬性 (Computed Signal)
  filteredStudents = computed(() => {
    const students = this.studentService.students();
    const query = this.searchQuery().toLowerCase();
    const leaveType = this.leaveTypeFilter();
    const absentOnly = this.showAbsentOnly();

    // 1. 執行主要篩選
    let filtered = students.filter(student => {
      const normalizedStatus = student.status ? student.status.trim() : '';

      // 檢查是否只顯示缺席/請假人員
      if (absentOnly && normalizedStatus === '出席') {
        return false;
      }
      
      // 檢查請假類型過濾
      if (leaveType !== 'all' && normalizedStatus === '請假') {
        // 使用清理後的假別進行比對
        const cleanLeaveType = this.getCleanLeaveType(student.leaveType);
        if (cleanLeaveType !== leaveType) {
          return false;
        }
      }

      // 檢查搜尋欄位
      if (query && !(
        student.name.toLowerCase().includes(query) ||
        student.id.includes(query)
      )) {
        return false;
      }

      return true;
    });

    // 2. 將出席人員排在最前面
    return filtered.sort((a, b) => {
      if (a.status === '出席' && b.status !== '出席') return -1;
      if (a.status !== '出席' && b.status === '出席') return 1;
      return 0; // 保持其他狀態的相對順序
    });
  });

  // 狀態顏色樣式邏輯 (與 HTML 搭配)
  getStatusClass(status: StudentStatus): string {
    const normalizedStatus = status ? status.trim() : '';
    switch (normalizedStatus) {
      case '出席':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case '缺席':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case '請假':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  }

  // 動作處理函式
  toggleAbsentFilter() {
    this.showAbsentOnly.update(current => !current);
  }

  openResetModal() {
    this.resetPasswordInput.set('');
    this.passwordError.set(null);
    this.showResetPasswordModal.set(true);
  }

  cancelReset() {
    this.showResetPasswordModal.set(false);
  }
  
  async confirmReset(): Promise<void> {
    const password = this.resetPasswordInput();
    
    this.passwordError.set(null);

    if (!password) {
      this.passwordError.set(this.languageService.translate('errors.passwordRequired'));
      return;
    }

    this.isResetting.set(true);
    try {
      await this.studentService.resetToInitialList(password);
      this.studentService.fetchStudents(); 
      
      this.showResetPasswordModal.set(false);
      this.resetPasswordInput.set(''); 

    } catch (error: any) {
      console.error('Failed to reset status:', error);
      
      let translationKey = 'errors.resetFailed'; 
      
      if (error && error.error && typeof error.error.error === 'string') {
          translationKey = error.error.error; 
      }
      
      this.passwordError.set(this.languageService.translate(translationKey));

    } finally {
      this.isResetting.set(false);
    }
  }  
  
  // 刪除確認邏輯
  openDeleteConfirm(student: Student) {
    this.studentToDelete.set(student);
    this.deletePasswordInput.set('');
    this.deletePasswordError.set(null);
    this.showDeleteConfirmModal.set(true);
  }

  cancelDelete() {
    this.showDeleteConfirmModal.set(false);
    this.studentToDelete.set(null);
  }

  async confirmDelete(): Promise<void> {
    const student = this.studentToDelete();
    if (!student) return;
    
    // 檢查硬編碼的刪除密碼
    if (this.deletePasswordInput() !== this.ADMIN_DELETE_PASSWORD) {
      this.deletePasswordError.set(this.languageService.translate('errors.passwordIncorrect'));
      this.deletePasswordInput.set('');
      return;
    }

    this.isDeleting.set(true);
    this.deletePasswordError.set(null);
    try {
      await this.studentService.deleteStudent(student.id);
      this.cancelDelete(); // Close modal on success
    } catch (error) {
      console.error('Failed to delete student', error);
      // 使用 Console 輸出，取代 alert
      console.error(this.languageService.translate('errors.deleteFailed')); 
    } finally {
      this.isDeleting.set(false);
    }
  }
  
  // --- 🚀 新增：匯出缺席名單為 CSV 功能 ---
  exportAbsentList() {
    // 1. 過濾出缺席及請假學生
    const students = this.studentService.students();
    const absentStudents = students.filter(s => s.status !== '出席');

    if (absentStudents.length === 0) {
      console.warn(this.languageService.translate('admin.noAbsentToExport') || '沒有缺席或請假人員可匯出。');
      return;
    }

    // 2. 準備 CSV 內容
    const header = [
      this.languageService.translate('admin.studentId'),
      this.languageService.translate('admin.name'),
      this.languageService.translate('admin.status'),
      this.languageService.translate('admin.leaveType'),
      this.languageService.translate('admin.remarks'),
      this.languageService.translate('admin.lastUpdated')
    ].join(',');

    const rows = absentStudents.map(student => {
        // 取得乾淨的假別名稱 (例如：只取 '論文假')
        const cleanLeaveType = this.getCleanLeaveType(student.leaveType);
        
        return [
          `"${student.id}"`, // 使用雙引號確保不丟失前導零，且兼容逗號
          `"${student.name}"`,
          `"${this.languageService.translate('statuses.' + student.status)}"`,
          `"${student.leaveType ? this.languageService.translate('leaveTypes.' + cleanLeaveType) : '無'}"`,
          `"${student.leaveRemarks || ''}"`,
          // 格式化時間
          `"${student.lastUpdatedAt ? new Date(student.lastUpdatedAt).toLocaleString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''}"`
        ].join(',');
    });

    const csvContent = [header, ...rows].join('\n');
    
    // 3. 觸發下載 (使用 Blob 和 BOM 確保中文在 Excel 中正確顯示)
    // '\ufeff' 是 Byte Order Mark (BOM)，確保 Excel 正確識別 UTF-8
    const blob = new Blob(['\ufeff', csvContent], { type: 'text/csv;charset=utf-8;' }); 
    const url = URL.createObjectURL(blob);
    
    const now = new Date();
    const dateStr = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`;
    const filename = `${this.languageService.translate('admin.absentListFilename')}_${dateStr}.csv`;

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log(`${this.languageService.translate('admin.exportSuccess', { count: absentStudents.length })}`);
  }
}