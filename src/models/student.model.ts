export type StudentStatus = '出席' | '缺席' | '請假';
export type LeaveType = '病假' | '事假' | '論文假' | '其他';

export interface Student {
  id: string;
  name: string;
  status: StudentStatus;
  lastUpdatedAt: Date;
  leaveType?: LeaveType;
  leaveRemarks?: string;
}