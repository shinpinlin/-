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

  readonly leaveTypes: LeaveType[] = ['病假', '事假', '論文假', 'K書中心', '文康室', '寢室查鋪' as any, '已就寢' as any, '夜間外出' as any, '其他'];
  private readonly ADMIN_DELETE_PASSWORD = '119';

  ngOnInit(): void {
    this.studentService.fetchStudents();
  }

  // 統計查鋪完成人數 (包含已就寢)
  dormCheckedStudents = computed(() => {
      return this.studentService.students().filter(s => {
          const type = this.getCleanLeaveType(s.leaveType);
          return type === '寢室查鋪' || type === '已就寢';
      }).length;
  });

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

  filteredStudents = computed(() => {
    const students = this.studentService.students();
    const query = this.searchQuery().toLowerCase();
    const leaveType = this.leaveTypeFilter();
    const absentOnly = this.showAbsentOnly();

    let filtered = students.filter(student => {
      const normalizedStatus = student.status ? student.status.trim() : '';
      // 寢室查鋪 & 已就寢 視為 "在場"，不應被「只顯示缺席」過濾掉
      const cleanType = this.getCleanLeaveType(student.leaveType);
      const isPracticallyPresent = normalizedStatus === '出席' || cleanType === '寢室查鋪' || cleanType === '已就寢';

      if (absentOnly && isPracticallyPresent) {
        return false;
      }
      if (leaveType !== 'all') {
        if (normalizedStatus !== '請假' || cleanType !== leaveType) {
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
      if (a.status === '出席' && b.status !== '出席') return 1;
      if (a.status !== '出席' && b.status === '出席') return -1;
      return 0;
    });
  });

  getStatusClass(status: StudentStatus): string {
    const normalizedStatus = status ? status.trim() : '';
    switch (normalizedStatus) {
      case '出席': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case '缺席': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case '請假': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
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

  exportGeneralLeave() {
    console.log("Exporting General Leave...");
    const studentsToExport = this.studentService.students().filter(s => {
        const type = this.getCleanLeaveType(s.leaveType);
        return s.status !== '出席' && type !== '寢室查鋪' && type !== '夜間外出' && type !== 'K書中心' && type !== '文康室' && type !== '已就寢';
    });

    if (studentsToExport.length === 0) {
      alert("目前沒有一般請假紀錄。");
      return;
    }

    const headers = ["學號", "姓名", "假別", "備註", "時間 (台北時間)"];
    const csvRows = [headers.join(',')];

    for (const student of studentsToExport) {
      const type = this.getCleanLeaveType(student.leaveType);
      const remarks = student.leaveRemarks ? `"${student.leaveRemarks.replace(/"/g, '""')}"` : '無';
      const time = this.getTaipeiTime(student.lastUpdatedAt);
      csvRows.push([student.id, student.name, type, remarks, time].join(','));
    }
    this.downloadCsv(csvRows.join('\n'), "一般請假名單.csv");
  }

  // ✅ 匯出夜間報表：解析「請假時間」與「返回時間」
  exportDormReport() {
    console.log("Exporting Dorm Report...");
    const studentsToExport = this.studentService.students().filter(s => {
        const type = this.getCleanLeaveType(s.leaveType);
        // 包含所有夜間相關 (查鋪、外出、已就寢、K書、文康)
        return type === '寢室查鋪' || type === '夜間外出' || type === '已就寢' || type === 'K書中心' || type === '文康室';
    });

    if (studentsToExport.length === 0) {
      alert("目前沒有夜間相關紀錄。");
      return;
    }

    const headers = ["學號", "姓名", "類別", "寢室/地點", "說明/事由", "請假時間", "返回/查鋪時間"];
    const csvRows = [headers.join(',')];

    for (const student of studentsToExport) {
      const type = this.getCleanLeaveType(student.leaveType);
      const rawRemarks = student.leaveRemarks || '';
      const currentTime = this.getTaipeiTime(student.lastUpdatedAt); // 這是最新的一次操作時間

      let category = type;
      let location = 'N/A';
      let reason = 'N/A';
      let leaveTime = 'N/A'; // 請假時間
      let returnTime = currentTime; // 返回或查鋪時間

      if (type === '寢室查鋪') {
          if (rawRemarks.includes('寢室')) {
             const match = rawRemarks.match(/寢室[:：]\s*(\w+)/);
             if (match) location = match[1] + " (寢室)";
          }
          reason = '查鋪完成';
          returnTime = currentTime;
      } 
      else if (type === '已就寢') {
          category = '已銷假回宿';
          // 解析: "銷假回宿 | 原假別:K書中心 | 請假時間:23:10"
          const parts = rawRemarks.split('|');
          for (const p of parts) {
              const [key, val] = p.split(/[:：]/);
              if (key && val) {
                  if (key.trim() === '原假別') location = `去過: ${val.trim()}`;
                  if (key.trim() === '請假時間') leaveTime = val.trim(); // 提取舊的請假時間
              }
          }
          returnTime = currentTime; // 這是按下「我已回宿」的時間
      }
      else if (type === '夜間外出') {
          category = '不在宿舍';
          returnTime = '尚未返回'; // 外出中，尚未有返回時間
          leaveTime = currentTime; // 這是被通報外出的時間

          const parts = rawRemarks.split(/[,，]+/);
          parts.forEach(p => {
              const [key, val] = p.split(/[:：]/);
              if (key && val) {
                  if (key.trim() === '寢室') location = val.trim() + " (寢室)";
                  if (key.trim() === '事由') reason = val.trim();
                  if (key.trim() === '預計返回') reason += ` (預計 ${val.trim()} 返)`;
              }
          });
      } 
      else {
          // K書中心, 文康室 (尚未銷假)
          location = type;
          reason = rawRemarks;
          leaveTime = currentTime; // 這是申請時間
          returnTime = '尚未返回';
      }

      csvRows.push([student.id, student.name, category, location, reason, leaveTime, returnTime].join(','));
    }
    this.downloadCsv(csvRows.join('\n'), "寢室查鋪報表.csv");
  }

  private downloadCsv(content: string, filename: string) {
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const blob = new Blob([bom, content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
}