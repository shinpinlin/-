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

  getTaipeiTime(utcString: string | undefined | null): string {
    console.log('DEBUG lastUpdatedAt', utcString, typeof utcString);
    if (!utcString) return '';
    try {
      const dateObject = new Date(utcString);
      return dateObject.toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false });
    } catch {
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
      let translationKey = 'errors.resetFailed';
      if (error && error.error && typeof error.error.error === 'string') {
        translationKey = error.error.error;
      }
      this.passwordError.set(this.languageService.translate(translationKey));
    } finally {
      this.isResetting.set(false);
    }
  }

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
    if (this.deletePasswordInput() !== this.ADMIN_DELETE_PASSWORD) {
      this.deletePasswordError.set(this.languageService.translate('errors.passwordIncorrect'));
      this.deletePasswordInput.set('');
      return;
    }
    this.isDeleting.set(true);
    this.deletePasswordError.set(null);
    try {
      await this.studentService.deleteStudent(student.id);
      this.cancelDelete();
    } catch (error) {
      console.error('Failed to delete student', error);
      console.error(this.languageService.translate('errors.deleteFailed'));
    } finally {
      this.isDeleting.set(false);
    }
  }

  exportAbsentList() {
    console.log("Exporting list...");
    const studentsToExport = this.studentService.students().filter(
      s => s.status !== '出席'
    );
    if (studentsToExport.length === 0) {
      console.warn("沒有可匯出的缺席/請假紀錄");
      return;
    }
    const headers = [
      "學號",
      "姓名",
      "狀態",
      "假別",
      "備註",
      "最後更新時間 (台北時間)"
    ];
    const csvRows = [headers.join(',')];
    for (const student of studentsToExport) {
      const status = this.languageService.translate(`statuses.${student.status}`);
      const leaveType = student.leaveType ? this.languageService.translate(`leaveTypes.${this.getCleanLeaveType(student.leaveType)}`) : 'N/A';
      const remarks = student.leaveRemarks ? `"${student.leaveRemarks.replace(/"/g, '""')}"` : 'N/A';
      let time = 'N/A';
      if (student.lastUpdatedAt) {
        try {
          const date = new Date(student.lastUpdatedAt);
          time = date.toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
        } catch (e) {
          console.error("時間轉換失敗:", student.lastUpdatedAt, e);
          time = String(student.lastUpdatedAt);
        }
      }
      const row = [
        student.id,
        student.name,
        status,
        leaveType,
        remarks,
        time
      ].join(',');
      csvRows.push(row);
    }
    const csvContent = csvRows.join('\n');
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "rollcall_export.csv");
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
}
