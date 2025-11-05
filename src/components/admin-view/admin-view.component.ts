import { Component, ChangeDetectionStrategy, inject, output, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudentService } from '../../services/student.service';
import { Student, StudentStatus, LeaveType } from '../../models/student.model';
import { LanguageService } from '../../services/language.service';
import { LanguageSwitcherComponent } from '../language-switcher/language-switcher.component';

@Component({
  selector: 'app-admin-view',
  templateUrl: './admin-view.component.html',
  standalone: true,
  [CommonModule, FormsModule], //,
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
    // 之前錯誤發生的位置，現在已修正為返回 filtered
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

  // Checks the password and performs the reset action
  async confirmReset(): Promise<void> {
    if (this.resetPasswordInput() === '119') {
      this.passwordError.set(null);
      this.isResetting.set(true);
      try {
        await this.studentService.resetToInitialList();
        this.showResetPasswordModal.set(false);
        alert(this.languageService.translate('admin.resetModal.resetSuccessAlert'));
      } catch (error) {
        console.error('Failed to reset student list', error);
        this.passwordError.set(this.languageService.translate('errors.resetFailed'));
      } finally {
        this.isResetting.set(false);
      }
    } else {
      this.passwordError.set(this.languageService.translate('errors.passwordIncorrect'));
      this.resetPasswordInput.set('');
    }
  }

  // --- 修正後的匯出功能 ---
  exportAbsentList(): void {
    const absentStudents = this.studentService.students().filter(s => s.status !== '出席');
    if (absentStudents.length === 0) {
      alert(this.languageService.translate('admin.export.noAbsentStudents'));
      return;
    }
    
    const header = '學號,姓名,狀態,假別,備註\n';
    const csvRows = absentStudents.map(s => {
      const remarks = s.leaveRemarks || '';
      // Escape quotes by doubling them, and wrap in quotes if it contains comma or quote
      const sanitizedRemarks = `"${remarks.replace(/"/g, '""')}"`;
      const leaveType = s.leaveType || '';
      return `${s.id},${s.name},${s.status},${leaveType},${sanitizedRemarks}`;
    });

    const csvContent = header + csvRows.join('\n');
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    // 最終修正：直接使用一個通用的檔名，避免 isEvening 錯誤
    const filename = `${this.languageService.translate('admin.export.absentFileName')}_${new Date().toISOString().slice(0,10)}.csv`;
    
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