import { Component, ChangeDetectionStrategy, inject, output, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudentService } from '../../services/student.service';
import { Student, StudentStatus, LeaveType } from '../../models/student.model';

@Component({
  selector: 'app-admin-view',
  templateUrl: './admin-view.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminViewComponent implements OnInit, OnDestroy {
  studentService = inject(StudentService);
  logout = output<void>();

  private filter = signal<'all' | 'absent'>('all');
  searchQuery = signal('');
  leaveTypeFilter = signal<'all' | LeaveType>('all');
  isEvening = signal(false);
  countdown = signal('');
  private countdownInterval: any;

  // Signals for the password modal
  showResetPasswordModal = signal(false);
  resetPasswordInput = signal('');
  passwordError = signal<string | null>(null);
  isResetting = signal(false);

  // Signals for delete confirmation modal
  showDeleteConfirmModal = signal(false);
  studentToDelete = signal<Student | null>(null);
  isDeleting = signal(false);

  readonly leaveTypes: LeaveType[] = ['病假', '事假', '論文假', '其他'];

  ngOnInit(): void {
    this.updateCountdown();
    this.countdownInterval = setInterval(() => this.updateCountdown(), 1000); // 每秒更新一次
  }

  ngOnDestroy(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

  private updateCountdown(): void {
    const now = new Date();
    const currentHour = now.getHours();

    // 晚點名時間為 14:00 到 22:59
    const isCurrentlyEvening = currentHour >= 14 && currentHour < 23;
    this.isEvening.set(isCurrentlyEvening);

    let nextTransitionTime: Date;

    if (isCurrentlyEvening) {
      // 如果是晚點名，下一個切換點是當日 23:00
      nextTransitionTime = new Date(now);
      nextTransitionTime.setHours(23, 0, 0, 0);
    } else {
      // 如果是早點名，下一個切換點是 14:00
      nextTransitionTime = new Date(now);
      nextTransitionTime.setHours(14, 0, 0, 0);
      
      // 如果現在已過 14:00 (即在 23:00-23:59 區間)，則下一個 14:00 是明天
      if (currentHour >= 23) {
        nextTransitionTime.setDate(nextTransitionTime.getDate() + 1);
      }
    }

    const timeDifference = nextTransitionTime.getTime() - now.getTime();

    // 計算時、分、秒
    const hours = Math.max(0, Math.floor(timeDifference / (1000 * 60 * 60)));
    const minutes = Math.max(0, Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60)));
    const seconds = Math.max(0, Math.floor((timeDifference % (1000 * 60)) / 1000));

    // 格式化倒數計時字串
    const formattedCountdown = 
      `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    
    this.countdown.set(formattedCountdown);
  }

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

  // Checks the password and performs the reset action
  async confirmReset(): Promise<void> {
    if (this.resetPasswordInput() === '119') {
      this.passwordError.set(null);
      this.isResetting.set(true);
      try {
        await this.studentService.resetToInitialList();
        this.showResetPasswordModal.set(false);
        alert('重置完成！所有學生的狀態均已標記為「出席」。');
      } catch (error) {
        console.error('Failed to reset student list', error);
        this.passwordError.set('重置失敗，請稍後再試。');
      } finally {
        this.isResetting.set(false);
      }
    } else {
      this.passwordError.set('密碼錯誤，請重試。');
      this.resetPasswordInput.set('');
    }
  }
  
  exportAbsentList(): void {
    const absentStudents = this.studentService.students().filter(s => s.status !== '出席');
    if (absentStudents.length === 0) {
      alert('目前沒有缺席或請假的學生。');
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
    const rollCallType = this.isEvening() ? '晚點名' : '早點名';
    const filename = `${rollCallType}_缺席名單_${new Date().toISOString().slice(0,10)}.csv`;
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  openDeleteConfirm(student: Student): void {
    this.studentToDelete.set(student);
    this.showDeleteConfirmModal.set(true);
  }

  cancelDelete(): void {
    this.showDeleteConfirmModal.set(false);
    this.studentToDelete.set(null);
  }

  async confirmDelete(): Promise<void> {
    const student = this.studentToDelete();
    if (!student) return;

    this.isDeleting.set(true);
    try {
      await this.studentService.deleteStudent(student.id);
      this.cancelDelete(); // Close modal on success
    } catch (error) {
      console.error('Failed to delete student', error);
      alert('刪除學生失敗，請稍後再試。');
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