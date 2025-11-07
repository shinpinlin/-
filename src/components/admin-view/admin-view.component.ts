import { Component, ChangeDetectionStrategy, inject, output, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudentService } from '../../services/student.service';
import { Student, StudentStatus, LeaveType } from '../../models/student.model';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-admin-view',
  templateUrl: './admin-view.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminViewComponent {
  studentService = inject(StudentService);
  public languageService = inject(LanguageService);
  logout = output<void>();

  private filter = signal<'all' | 'absent'>('all');
  searchQuery = signal('');
  leaveTypeFilter = signal<'all' | LeaveType>('all');

  // Signals for the password modal
  showResetPasswordModal = signal(false);
  resetPasswordInput = signal('');
  passwordError = signal<string | null>(null);
  isResetting = signal(false);

  // Signals for delete confirmation modal
  showDeleteConfirmModal = signal(false);
  studentToDelete = signal<Student | null>(null);
  isDeleting = signal(false);
  deletePasswordInput = signal('');
  deletePasswordError = signal<string | null>(null);

  readonly leaveTypes: LeaveType[] = ['病假', '事假', '論文假', '其他'];

  filteredStudents = computed(() => {
    const students = this.studentService.students();
    const currentFilter = this.filter();
    const query = this.searchQuery().toLowerCase().trim();
    const leaveFilter = this.leaveTypeFilter();

    let filtered = students;

    // 1. Filter by absent status (toggled by clicking the card)
    if (currentFilter === 'absent') {
      filtered = filtered.filter(s => s.status !== '出席');
    }

    // 2. Filter by search query on ID or name
    if (query) {
      filtered = filtered.filter(s => 
        s.id.toLowerCase().includes(query) || 
        s.name.toLowerCase().includes(query)
      );
    }

    // 3. Filter by leave type
    if (leaveFilter !== 'all') {
      filtered = filtered.filter(s => s.status === '請假' && s.leaveType === leaveFilter);
    }

    return filtered;
  });

  toggleAbsentFilter(): void {
    this.filter.update(current => (current === 'all' ? 'absent' : 'all'));
  }

  // Opens the password modal
  openResetModal(): void {
    this.resetPasswordInput.set('');
    this.passwordError.set(null);
    this.showResetPasswordModal.set(true);
  }

  // Closes the password modal
  cancelReset(): void {
    this.showResetPasswordModal.set(false);
  }

  
  async confirmReset(): Promise<void> {
    // 1. 您的密碼檢查 (119)
    if (this.resetPasswordInput() !== '119') {
      this.passwordError.set(this.languageService.translate('errors.passwordIncorrect'));
      this.resetPasswordInput.set('');
      return; // 密碼錯誤，結束
    }
    
    // 2. 密碼正確，開始呼叫
    this.passwordError.set(null);
    this.isResetting.set(true);
    
    // 3. 您的後端 API 網址 (指向我們在 app.py 建立的新 API)
    const apiUrl = 'https://rocallsystem-backend.onrender.com/api/v1/reset-attendance';

    try {
      // 4. 執行「正確的」 fetch 網路請求
      const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json'
          },
          // 將 "119" 作為密碼傳送
          body: JSON.stringify({ adminPassword: this.resetPasswordInput() }) 
      });

      const data = await response.json();

      if (!response.ok) {
        // 如果後端回傳錯誤 (例如密碼錯誤，雖然我們前端已檢查，但後端會再驗證)
        throw new Error(data.message || '後端伺服器錯誤');
      }
      
      // 5. 成功！
      this.showResetPasswordModal.set(false);
      alert(data.message); // 顯示 "成功：已將所有人員狀態重置為「出席默認」。"

      // 6. 🚀 🚀 🚀 最終修正 🚀 🚀 🚀
      // 我們將錯誤的 loadStudents() 換成 location.reload()
      // 這將會「重新整理網頁」，強制載入新資料
      location.reload(); 

    } catch (error) {
      console.error('Failed to reset student list', error);
      // 在 modal 中顯示錯誤
      this.passwordError.set((error as Error).message || this.languageService.translate('errors.resetFailed'));
    } finally {
      // 結束 loading
      this.isResetting.set(false);
    }
  }
  
  exportAbsentList(): void {
    const absentStudents = this.studentService.students().filter(s => s.status !== '出席');
    if (absentStudents.length === 0) {
      alert(this.languageService.translate('admin.export.noAbsentStudents'));
      return;
    }
    
    const header = this.languageService.translate('admin.export.csvHeader') + '\n';
    const csvRows = absentStudents.map(s => {
      const remarks = s.leaveRemarks || '';
      // Escape quotes by doubling them, and wrap in quotes if it contains comma or quote
      const sanitizedRemarks = `"${remarks.replace(/"/g, '""')}"`;
      
      const translatedStatus = this.languageService.translate(`statuses.${s.status}`);
      const translatedLeaveType = s.leaveType ? this.languageService.translate(`leaveTypes.${s.leaveType}`) : '';
      const leaveTime = s.status === '請假' ? s.lastUpdatedAt.toLocaleString(this.languageService.language()) : '';

      return `${s.id},${s.name},${translatedStatus},${translatedLeaveType},${sanitizedRemarks},${leaveTime}`;
    });

    const csvContent = header + csvRows.join('\n');
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const rollCallType = this.studentService.isEvening() ? 
        this.languageService.translate('admin.export.eveningFileName') : 
        this.languageService.translate('admin.export.morningFileName');
    const filename = `${rollCallType}_${new Date().toISOString().slice(0,10)}.csv`;
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  openDeleteConfirm(student: Student): void {
    this.studentToDelete.set(student);
    this.deletePasswordInput.set('');
    this.deletePasswordError.set(null);
    this.showDeleteConfirmModal.set(true);
  }

  cancelDelete(): void {
    this.showDeleteConfirmModal.set(false);
    this.studentToDelete.set(null);
    this.deletePasswordInput.set('');
    this.deletePasswordError.set(null);
  }

  async confirmDelete(): Promise<void> {
    const student = this.studentToDelete();
    if (!student) return;
    
    if (this.deletePasswordInput() !== '119') {
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
      alert(this.languageService.translate('errors.deleteFailed'));
    } finally {
      this.isDeleting.set(false);
    }
  }

  getStatusClass(status: StudentStatus): string {
    switch (status) {
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
}
```eof

