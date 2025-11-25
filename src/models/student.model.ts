export type StudentStatus = '出席' | '缺席' | '請假';

// ✅ 修改：加入所有新的假別與紀錄類型
export type LeaveType = 
  | '病假' 
  | '事假' 
  | '論文假' 
  | 'K書中心' 
  | '文康室' 
  | '寢室查鋪' 
  | '夜間外出' 
  | '其他';

export interface Student {
  id: string;
  name: string;
  status: StudentStatus;
  // 這裡放寬型別以容納後端可能回傳的字串
  leaveType?: LeaveType | string;
  leaveRemarks?: string;
  lastUpdatedAt?: string | null;
}