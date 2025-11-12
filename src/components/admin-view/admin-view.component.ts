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

  // 台灣時間轉換工具 (有 log)
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
