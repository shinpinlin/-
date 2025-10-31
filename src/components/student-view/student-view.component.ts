import { Component, ChangeDetectionStrategy, input, output, signal, inject, computed, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Student, LeaveType } from '../../models/student.model';
import { StudentService } from '../../services/student.service';

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

  leaveType = signal<LeaveType>('病假');
  remarks = signal('');
  showLeaveForm = signal(false);
  leaveSubmitted = signal(false);
  isSubmitting = signal(false);
  
  private studentService = inject(StudentService);

  // Reactive signal that tracks the current user's state from the service
  currentUser = computed(() => 
    this.studentService.students().find(s => s.id === this.initialUser().id)
  );

  constructor() {
    effect(() => {
      // If student is deleted by admin, currentUser becomes undefined, so log out.
      if (this.currentUser() === undefined) {
        // Using a timeout to avoid changing view during a change detection cycle.
        setTimeout(() => this.logout.emit(), 0);
      }
    });
  }

  readonly leaveTypes: LeaveType[] = ['病假', '事假', '論文假', '其他'];

  currentStatus = computed(() => {
    const user = this.currentUser();
    if (!user) return '正在登出...';
    if (user.status === '出席') return '您目前的狀態為：出席';
    if (user.status === '請假') return `您已請假 (假別：${user.leaveType})`;
    return `您目前的狀態為：${user.status}`;
  });

  async submitLeave() {
    if (this.leaveType() === '其他' && !this.remarks().trim()) {
      alert('選擇「其他」假別時，請務必填寫備註。');
      return;
    }
    const user = this.currentUser();
    if (user) {
        this.isSubmitting.set(true);
        try {
            await this.studentService.applyForLeave(user.id, this.leaveType(), this.remarks());
            this.leaveSubmitted.set(true);
            this.showLeaveForm.set(false);
        } catch (error) {
            console.error('Failed to submit leave application', error);
            alert('提交請假申請失敗，請稍後再試。');
        } finally {
            this.isSubmitting.set(false);
        }
    }
  }
}
