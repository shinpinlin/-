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
  searchQuery = signal('');
  leaveTypeFilter = signal('all');
  showAbsentOnly = signal(false);

  showResetPasswordModal = signal(false);
  resetPasswordInput = signal('');
  passwordError = signal<string | null>(null);
  isResetting = signal(false);

  showDeleteConfirmModal = signal(false);
  studentToDelete = signal<Student | null>(null);
  deletePasswordInput = signal('');
  deletePasswordError = signal<string | null>(null);
  isDeleting = signal(false);

  public studentService = inject(StudentService);
  public languageService = inject(LanguageService);

  readonly leaveTypes: LeaveType[] = ['病假', '事假', '論文假', '其他'];
  private readonly ADMIN_DELETE_PASSWORD = '119';

  ngOnInit(): void {
    this.studentService.fetchStudents();
  }

  // ✅ 暴力修正：網頁顯示專用 (手動 +8 小時)
  getTaipeiTime(utcString: string | undefined | null): string {
    if (!utcString) return '';
    try {
      const date = new Date(utcString);
      const originalTime = date.getTime();
      // 加 8 小時
      const newTime = originalTime + (8 * 60 * 60 * 1000);
      const newDate = new Date(newTime);

      return newDate.toLocaleString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
    } catch (e) {
      return String(utcString);
    }
  }

  filteredStudents = computed(() => {
    const students = this.studentService.students();
    const query = this.searchQuery().toLowerCase();
    const leaveType = this.leaveTypeFilter();
    const absentOnly = this.showAbsentOnly();

    let filtered = students.filter(student => {
      const normalizedStatus = student.status ? student.status.trim() : '';
      if (absentOnly && normalizedStatus === '出席') {
        return false;
      }
      if (leaveType !== 'all') {
        if (normalizedStatus !== '請假' || this.getCleanLeaveType(student.leaveType) !== leaveType) {
          return false;
        }
      }
      if (query && !(
        student.name.toLowerCase().includes(query) ||
        student.id.includes(query)
      )) {
        return false;
      }
      return true;
    });

    return filtered.sort((a, b) => {
      if (a.status === '出席' && b.status !== '出席') return -1;
      if (a.status !== '出席' && b.status === '出席') return 1;
      return 0;
    });
  });

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

  getCleanLeaveType(leaveType: string | null | undefined): string {
    if (!leaveType) return '';
    if (leaveType.startsWith('請假-')) {
      return leaveType.substring(3);
    }
    return leaveType;
  }

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
      let translationKey