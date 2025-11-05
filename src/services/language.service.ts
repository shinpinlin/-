import { Injectable, signal, PLATFORM_ID, inject, effect } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type Language = 'zh-TW' | 'en' | 'vi' | 'th' | 'id';
const LOCAL_STORAGE_KEY = 'studentAttendanceApp_language';

// Helper function to get a nested property from an object using a dot-separated string.
const get = (obj: any, path: string): string => path.split('.').reduce((acc, part) => acc && acc[part], obj);

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private platformId = inject(PLATFORM_ID);
  
  language = signal<Language>('zh-TW');

  private translations = {
    'zh-TW': {
      login: {
        title: "點名系統",
        subtitle: "請選擇您的登入身份",
        studentLogin: "學生登入",
        studentId: "學號",
        studentIdPlaceholder: "請輸入您的學號",
        studentName: "姓名",
        studentNamePlaceholder: "請輸入您的姓名",
        loginButton: "登入",
        loggingIn: "登入中...",
        testAccountsHint: "測試帳號提示",
        testAccountsDescription: "可使用以下任何一組學生資料登入：",
        or: "或",
        adminTitle: "管理者",
        adminButton: "進入管理系統",
      },
      student: {
        welcome: "歡迎, {{name}}",
        status: {
          present: "您目前的狀態為：出席",
          onLeave: "您已請假 (假別：{{leaveType}})",
          generic: "您目前的狀態為：{{status}}",
        },
        askForLeave: "需要請假嗎？",
        leaveApplication: "請假申請",
        leaveType: "假別",
        remarks: "備註",
        remarksRequired: "必填",
        remarksPlaceholder: "請在此說明...",
        submit: "送出申請",
        submitting: "處理中...",
        statusUpdated: "您的狀態已更新！",
        loggingOut: "正在登出...",
        accountRemoved: "您的帳戶已被管理者移除。",
      },
      admin: {
        dashboardTitle: "管理者儀表板",
        totalStudents: "總學生人數",
        presentStudents: "已出席人數",
        absentStudents: "未出席/請假人數",
        managementActions: "管理操作",
        morningRollCall: "早點名 (剩餘 {{countdown}})",
        eveningRollCall: "晚點名 (剩餘 {{countdown}})",
        resetStatus: "重置狀態",
        exportAbsentList: "匯出缺席名單",
        searchStudent: "搜尋學生 (依姓名或學號)",
        searchPlaceholder: "輸入關鍵字...",
        filterLeaveType: "篩選假別",
        allLeaveTypes: "所有假別",
        studentId: "學號",
        name: "姓名",
        status: "狀態",
        leaveType: "假別",
        remarks: "備註",
        lastUpdated: "最後更新時間",
        actions: "操作",
        delete: "刪除",
        noMatchingStudents: "沒有符合條件的學生",
        resetModal: {
          title: "需要管理員權限",
          description: "此為高風險操作，請輸入密碼以繼續。",
          passwordPlaceholder: "請輸入密碼",
          resetSuccessAlert: "重置完成！所有學生的狀態均已標記為「出席」。",
        },
        deleteModal: {
          title: "確認刪除",
          description: "您確定要刪除學生 {{name}} ({{id}}) 嗎？",
          description2: "此為高風險操作，請輸入密碼以確認。",
        },
        export: {
          noAbsentStudents: "目前沒有缺席或請假的學生。",
          eveningFileName: "晚點名_缺席名單",
          morningFileName: "早點名_缺席名單"
        }
      },
      common: {
        logout: "登出",
        cancel: "取消",
        confirm: "確認",
        confirmReset: "確認重置",
        confirmDelete: "確認刪除",
        password: "密碼",
        processing: "處理中...",
        resetting: "重置中...",
        deleting: "刪除中...",
      },
      statuses: {
        '出席': "出席",
        '缺席': "缺席",
        '請假': "請假",
      },
      leaveTypes: {
        '病假': "病假",
        '事假': "事假",
        '論文假': "論文假",
        '其他': "其他",
      },
      errors: {
        studentIdNotFound: "學號不存在於名冊中",
        nameMismatch: "學號與姓名不符",
        emptyFields: "學號和姓名不能為空",
        loginFailed: "登入失敗，請稍後再試。",
        leaveSubmitFailed: "提交請假申請失敗，請稍後再試。",
        passwordIncorrect: "密碼錯誤，請重試。",
        resetFailed: "重置失敗，請稍後再試。",
        deleteFailed: "刪除學生失敗，請稍後再試。",
      }
    },
    'en': {
      login: {
        title: "Roll Call System",
        subtitle: "Please select your login identity",
        studentLogin: "Student Login",
        studentId: "Student ID",
        studentIdPlaceholder: "Enter your student ID",
        studentName: "Name",
        studentNamePlaceholder: "Enter your name",
        loginButton: "Login",
        loggingIn: "Logging in...",
        testAccountsHint: "Test Account Hint",
        testAccountsDescription: "You can log in with any of the following student accounts:",
        or: "OR",
        adminTitle: "Administrator",
        adminButton: "Enter Admin System",
      },
      student: {
        welcome: "Welcome, {{name}}",
        status: {
          present: "Your current status is: Present",
          onLeave: "You are on leave (Type: {{leaveType}})",
          generic: "Your current status is: {{status}}",
        },
        askForLeave: "Need to Request Leave?",
        leaveApplication: "Leave Application",
        leaveType: "Leave Type",
        remarks: "Remarks",
        remarksRequired: "Required",
        remarksPlaceholder: "Please explain here...",
        submit: "Submit Application",
        submitting: "Submitting...",
        statusUpdated: "Your status has been updated!",
        loggingOut: "Logging out...",
        accountRemoved: "Your account has been removed by the administrator.",
      },
      admin: {
        dashboardTitle: "Admin Dashboard",
        totalStudents: "Total Students",
        presentStudents: "Present Students",
        absentStudents: "Absent / On Leave",
        managementActions: "Management Actions",
        morningRollCall: "Morning Roll Call ({{countdown}} left)",
        eveningRollCall: "Evening Roll Call ({{countdown}} left)",
        resetStatus: "Reset Status",
        exportAbsentList: "Export Absent List",
        searchStudent: "Search Student (by Name or ID)",
        searchPlaceholder: "Enter keyword...",
        filterLeaveType: "Filter by Leave Type",
        allLeaveTypes: "All Leave Types",
        studentId: "ID",
        name: "Name",
        status: "Status",
        leaveType: "Leave Type",
        remarks: "Remarks",
        lastUpdated: "Last Updated",
        actions: "Actions",
        delete: "Delete",
        noMatchingStudents: "No matching students found.",
        resetModal: {
          title: "Admin Permission Required",
          description: "This is a high-risk operation. Please enter the password to continue.",
          passwordPlaceholder: "Enter password",
          resetSuccessAlert: "Reset complete! All students have been marked as 'Present'.",
        },
        deleteModal: {
          title: "Confirm Deletion",
          description: "Are you sure you want to delete student {{name}} ({{id}})?",
          description2: "This is a high-risk operation. Please enter the password to confirm.",
        },
        export: {
          noAbsentStudents: "There are currently no absent or on-leave students.",
          eveningFileName: "EveningRollCall_AbsentList",
          morningFileName: "MorningRollCall_AbsentList"
        }
      },
      common: {
        logout: "Logout",
        cancel: "Cancel",
        confirm: "Confirm",
        confirmReset: "Confirm Reset",
        confirmDelete: "Confirm Delete",
        password: "Password",
        processing: "Processing...",
        resetting: "Resetting...",
        deleting: "Deleting...",
      },
      statuses: {
        '出席': "Present",
        '缺席': "Absent",
        '請假': "On Leave",
      },
      leaveTypes: {
        '病假': "Sick Leave",
        '事假': "Personal Leave",
        '論文假': "Thesis Leave",
        '其他': "Other",
      },
      errors: {
        studentIdNotFound: "Student ID not found in roster.",
        nameMismatch: "Student ID and name do not match.",
        emptyFields: "Student ID and name cannot be empty.",
        loginFailed: "Login failed. Please try again later.",
        leaveSubmitFailed: "Failed to submit leave application. Please try again later.",
        passwordIncorrect: "Incorrect password. Please try again.",
        resetFailed: "Failed to reset. Please try again later.",
        deleteFailed: "Failed to delete student. Please try again later.",
      }
    },
    'vi': {
      login: {
        title: "Hệ thống Điểm danh",
        subtitle: "Vui lòng chọn danh tính đăng nhập của bạn",
        studentLogin: "Đăng nhập Sinh viên",
        studentId: "Mã số sinh viên",
        studentIdPlaceholder: "Nhập mã số sinh viên của bạn",
        studentName: "Tên",
        studentNamePlaceholder: "Nhập tên của bạn",
        loginButton: "Đăng nhập",
        loggingIn: "Đang đăng nhập...",
        testAccountsHint: "Gợi ý Tài khoản Kiểm tra",
        testAccountsDescription: "Bạn có thể đăng nhập bằng bất kỳ tài khoản sinh viên nào sau đây:",
        or: "HOẶC",
        adminTitle: "Quản trị viên",
        adminButton: "Vào Hệ thống Quản trị",
      },
      student: {
        welcome: "Chào mừng, {{name}}",
        status: {
          present: "Trạng thái hiện tại của bạn là: Có mặt",
          onLeave: "Bạn đang nghỉ phép (Loại: {{leaveType}})",
          generic: "Trạng thái hiện tại của bạn là: {{status}}",
        },
        askForLeave: "Cần Xin nghỉ phép?",
        leaveApplication: "Đơn xin nghỉ phép",
        leaveType: "Loại nghỉ phép",
        remarks: "Ghi chú",
        remarksRequired: "Bắt buộc",
        remarksPlaceholder: "Vui lòng giải thích ở đây...",
        submit: "Gửi đơn",
        submitting: "Đang gửi...",
        statusUpdated: "Trạng thái của bạn đã được cập nhật!",
        loggingOut: "Đang đăng xuất...",
        accountRemoved: "Tài khoản của bạn đã bị quản trị viên xóa.",
      },
      admin: {
        dashboardTitle: "Bảng điều khiển Quản trị viên",
        totalStudents: "Tổng số sinh viên",
        presentStudents: "Sinh viên có mặt",
        absentStudents: "Vắng mặt / Nghỉ phép",
        managementActions: "Hành động Quản lý",
        morningRollCall: "Điểm danh buổi sáng (còn lại {{countdown}})",
        eveningRollCall: "Điểm danh buổi tối (còn lại {{countdown}})",
        resetStatus: "Đặt lại Trạng thái",
        exportAbsentList: "Xuất Danh sách Vắng mặt",
        searchStudent: "Tìm kiếm Sinh viên (theo Tên hoặc MSV)",
        searchPlaceholder: "Nhập từ khóa...",
        filterLeaveType: "Lọc theo Loại nghỉ phép",
        allLeaveTypes: "Tất cả các loại nghỉ phép",
        studentId: "MSV",
        name: "Tên",
        status: "Trạng thái",
        leaveType: "Loại nghỉ phép",
        remarks: "Ghi chú",
        lastUpdated: "Cập nhật lần cuối",
        actions: "Hành động",
        delete: "Xóa",
        noMatchingStudents: "Không tìm thấy sinh viên phù hợp.",
        resetModal: {
          title: "Yêu cầu quyền Quản trị viên",
          description: "Đây là một thao tác có rủi ro cao. Vui lòng nhập mật khẩu để tiếp tục.",
          passwordPlaceholder: "Nhập mật khẩu",
          resetSuccessAlert: "Đặt lại hoàn tất! Tất cả sinh viên đã được đánh dấu là 'Có mặt'.",
        },
        deleteModal: {
          title: "Xác nhận Xóa",
          description: "Bạn có chắc chắn muốn xóa sinh viên {{name}} ({{id}})?",
          description2: "Đây là một thao tác có rủi ro cao. Vui lòng nhập mật khẩu để xác nhận.",
        },
        export: {
          noAbsentStudents: "Hiện tại không có sinh viên nào vắng mặt hoặc nghỉ phép.",
          eveningFileName: "DiemDanhToi_VangMat",
          morningFileName: "DiemDanhSang_VangMat"
        }
      },
      common: {
        logout: "Đăng xuất",
        cancel: "Hủy",
        confirm: "Xác nhận",
        confirmReset: "Xác nhận Đặt lại",
        confirmDelete: "Xác nhận Xóa",
        password: "Mật khẩu",
        processing: "Đang xử lý...",
        resetting: "Đang đặt lại...",
        deleting: "Đang xóa...",
      },
      statuses: { '出席': "Có mặt", '缺席': "Vắng mặt", '請假': "Nghỉ phép" },
      leaveTypes: { '病假': "Nghỉ ốm", '事假': "Nghỉ việc riêng", '論文假': "Nghỉ làm luận văn", '其他': "Khác" },
      errors: {
        studentIdNotFound: "Không tìm thấy mã số sinh viên trong danh sách.",
        nameMismatch: "Mã số sinh viên và tên không khớp.",
        emptyFields: "Mã số sinh viên và tên không được để trống.",
        loginFailed: "Đăng nhập thất bại. Vui lòng thử lại sau.",
        leaveSubmitFailed: "Gửi đơn xin nghỉ phép thất bại. Vui lòng thử lại sau.",
        passwordIncorrect: "Mật khẩu không đúng. Vui lòng thử lại.",
        resetFailed: "Đặt lại thất bại. Vui lòng thử lại sau.",
        deleteFailed: "Xóa sinh viên thất bại. Vui lòng thử lại sau.",
      }
    },
    'th': {
      login: {
        title: "ระบบเช็คชื่อ",
        subtitle: "กรุณาเลือกข้อมูลประจำตัวเพื่อเข้าสู่ระบบ",
        studentLogin: "ล็อกอินสำหรับนักเรียน",
        studentId: "รหัสนักเรียน",
        studentIdPlaceholder: "ป้อนรหัสนักเรียนของคุณ",
        studentName: "ชื่อ",
        studentNamePlaceholder: "ป้อนชื่อของคุณ",
        loginButton: "ล็อกอิน",
        loggingIn: "กำลังล็อกอิน...",
        testAccountsHint: "คำใบ้บัญชีทดสอบ",
        testAccountsDescription: "คุณสามารถล็อกอินด้วยบัญชีนักเรียนต่อไปนี้:",
        or: "หรือ",
        adminTitle: "ผู้ดูแลระบบ",
        adminButton: "เข้าสู่ระบบผู้ดูแล",
      },
      student: {
        welcome: "ยินดีต้อนรับ, {{name}}",
        status: {
          present: "สถานะปัจจุบันของคุณคือ: มาเรียน",
          onLeave: "คุณกำลังลา (ประเภท: {{leaveType}})",
          generic: "สถานะปัจจุบันของคุณคือ: {{status}}",
        },
        askForLeave: "ต้องการขอลาหรือไม่?",
        leaveApplication: "ใบลา",
        leaveType: "ประเภทการลา",
        remarks: "หมายเหตุ",
        remarksRequired: "จำเป็น",
        remarksPlaceholder: "โปรดอธิบายที่นี่...",
        submit: "ส่งใบลา",
        submitting: "กำลังส่ง...",
        statusUpdated: "สถานะของคุณได้รับการอัปเดตแล้ว!",
        loggingOut: "กำลังออกจากระบบ...",
        accountRemoved: "บัญชีของคุณถูกลบโดยผู้ดูแลระบบ",
      },
      admin: {
        dashboardTitle: "แดชบอร์ดผู้ดูแลระบบ",
        totalStudents: "นักเรียนทั้งหมด",
        presentStudents: "นักเรียนที่มาเรียน",
        absentStudents: "ขาดเรียน / ลา",
        managementActions: "การจัดการ",
        morningRollCall: "เช็คชื่อตอนเช้า (เหลือ {{countdown}})",
        eveningRollCall: "เช็คชื่อตอนเย็น (เหลือ {{countdown}})",
        resetStatus: "รีเซ็ตสถานะ",
        exportAbsentList: "ส่งออกรายชื่อคนขาด",
        searchStudent: "ค้นหานักเรียน (ตามชื่อหรือรหัส)",
        searchPlaceholder: "ป้อนคำค้นหา...",
        filterLeaveType: "กรองตามประเภทการลา",
        allLeaveTypes: "การลาทุกประเภท",
        studentId: "รหัส",
        name: "ชื่อ",
        status: "สถานะ",
        leaveType: "ประเภทการลา",
        remarks: "หมายเหตุ",
        lastUpdated: "อัปเดตล่าสุด",
        actions: "การกระทำ",
        delete: "ลบ",
        noMatchingStudents: "ไม่พบนักเรียนที่ตรงกัน",
        resetModal: {
          title: "ต้องการสิทธิ์ผู้ดูแลระบบ",
          description: "นี่เป็นการดำเนินการที่มีความเสี่ยงสูง โปรดป้อนรหัสผ่านเพื่อดำเนินการต่อ",
          passwordPlaceholder: "ป้อนรหัสผ่าน",
          resetSuccessAlert: "รีเซ็ตสำเร็จ! นักเรียนทุกคนถูกทำเครื่องหมายเป็น 'มาเรียน' แล้ว",
        },
        deleteModal: {
          title: "ยืนยันการลบ",
          description: "คุณแน่ใจหรือไม่ว่าต้องการลบนักเรียน {{name}} ({{id}})?",
          description2: "นี่เป็นการดำเนินการที่มีความเสี่ยงสูง โปรดป้อนรหัสผ่านเพื่อยืนยัน",
        },
        export: {
          noAbsentStudents: "ขณะนี้ไม่มีนักเรียนที่ขาดเรียนหรือลา",
          eveningFileName: "เช็คชื่อเย็น_รายชื่อขาด",
          morningFileName: "เช็คชื่อเช้า_รายชื่อขาด"
        }
      },
      common: {
        logout: "ออกจากระบบ",
        cancel: "ยกเลิก",
        confirm: "ยืนยัน",
        confirmReset: "ยืนยันการรีเซ็ต",
        confirmDelete: "ยืนยันการลบ",
        password: "รหัสผ่าน",
        processing: "กำลังประมวลผล...",
        resetting: "กำลังรีเซ็ต...",
        deleting: "กำลังลบ...",
      },
      statuses: { '出席': "มาเรียน", '缺席': "ขาดเรียน", '請假': "ลา" },
      leaveTypes: { '病假': "ลาป่วย", '事假': "ลากิจ", '論文假': "ลาทำวิทยานิพนธ์", '其他': "อื่นๆ" },
      errors: {
        studentIdNotFound: "ไม่พบรหัสนักเรียนในรายชื่อ",
        nameMismatch: "รหัสนักเรียนและชื่อไม่ตรงกัน",
        emptyFields: "รหัสนักเรียนและชื่อต้องไม่ว่างเปล่า",
        loginFailed: "ล็อกอินล้มเหลว โปรดลองอีกครั้งในภายหลัง",
        leaveSubmitFailed: "ส่งใบลาล้มเหลว โปรดลองอีกครั้งในภายหลัง",
        passwordIncorrect: "รหัสผ่านไม่ถูกต้อง โปรดลองอีกครั้ง",
        resetFailed: "รีเซ็ตล้มเหลว โปรดลองอีกครั้งในภายหลัง",
        deleteFailed: "ลบนักเรียนล้มเหลว โปรดลองอีกครั้งในภายหลัง",
      }
    },
    'id': {
      login: {
        title: "Sistem Absensi",
        subtitle: "Silakan pilih identitas login Anda",
        studentLogin: "Login Mahasiswa",
        studentId: "Nomor Induk Mahasiswa",
        studentIdPlaceholder: "Masukkan NIM Anda",
        studentName: "Nama",
        studentNamePlaceholder: "Masukkan nama Anda",
        loginButton: "Login",
        loggingIn: "Sedang masuk...",
        testAccountsHint: "Petunjuk Akun Uji Coba",
        testAccountsDescription: "Anda dapat login dengan salah satu akun mahasiswa berikut:",
        or: "ATAU",
        adminTitle: "Administrator",
        adminButton: "Masuk Sistem Admin",
      },
      student: {
        welcome: "Selamat datang, {{name}}",
        status: {
          present: "Status Anda saat ini: Hadir",
          onLeave: "Anda sedang cuti (Jenis: {{leaveType}})",
          generic: "Status Anda saat ini: {{status}}",
        },
        askForLeave: "Perlu Mengajukan Izin?",
        leaveApplication: "Pengajuan Izin",
        leaveType: "Jenis Izin",
        remarks: "Keterangan",
        remarksRequired: "Wajib diisi",
        remarksPlaceholder: "Silakan jelaskan di sini...",
        submit: "Kirim Pengajuan",
        submitting: "Mengirim...",
        statusUpdated: "Status Anda telah diperbarui!",
        loggingOut: "Sedang keluar...",
        accountRemoved: "Akun Anda telah dihapus oleh administrator.",
      },
      admin: {
        dashboardTitle: "Dasbor Admin",
        totalStudents: "Total Mahasiswa",
        presentStudents: "Mahasiswa Hadir",
        absentStudents: "Absen / Izin",
        managementActions: "Tindakan Manajemen",
        morningRollCall: "Absensi Pagi (tersisa {{countdown}})",
        eveningRollCall: "Absensi Malam (tersisa {{countdown}})",
        resetStatus: "Atur Ulang Status",
        exportAbsentList: "Ekspor Daftar Absen",
        searchStudent: "Cari Mahasiswa (berdasarkan Nama atau NIM)",
        searchPlaceholder: "Masukkan kata kunci...",
        filterLeaveType: "Filter berdasarkan Jenis Izin",
        allLeaveTypes: "Semua Jenis Izin",
        studentId: "NIM",
        name: "Nama",
        status: "Status",
        leaveType: "Jenis Izin",
        remarks: "Keterangan",
        lastUpdated: "Terakhir Diperbarui",
        actions: "Aksi",
        delete: "Hapus",
        noMatchingStudents: "Tidak ada mahasiswa yang cocok.",
        resetModal: {
          title: "Diperlukan Izin Admin",
          description: "Ini adalah operasi berisiko tinggi. Silakan masukkan kata sandi untuk melanjutkan.",
          passwordPlaceholder: "Masukkan kata sandi",
          resetSuccessAlert: "Pengaturan ulang selesai! Semua mahasiswa telah ditandai sebagai 'Hadir'.",
        },
        deleteModal: {
          title: "Konfirmasi Penghapusan",
          description: "Apakah Anda yakin ingin menghapus mahasiswa {{name}} ({{id}})?",
          description2: "Ini adalah operasi berisiko tinggi. Silakan masukkan kata sandi untuk mengonfirmasi.",
        },
        export: {
          noAbsentStudents: "Saat ini tidak ada mahasiswa yang absen atau izin.",
          eveningFileName: "AbsensiMalam_DaftarAbsen",
          morningFileName: "AbsensiPagi_DaftarAbsen"
        }
      },
      common: {
        logout: "Keluar",
        cancel: "Batal",
        confirm: "Konfirmasi",
        confirmReset: "Konfirmasi Atur Ulang",
        confirmDelete: "Konfirmasi Hapus",
        password: "Kata Sandi",
        processing: "Memproses...",
        resetting: "Mengatur ulang...",
        deleting: "Menghapus...",
      },
      statuses: { '出席': "Hadir", '缺席': "Absen", '請假': "Izin" },
      leaveTypes: { '病假': "Izin Sakit", '事假': "Izin Pribadi", '論文假': "Izin Tesis", '其他': "Lainnya" },
      errors: {
        studentIdNotFound: "NIM tidak ditemukan dalam daftar.",
        nameMismatch: "NIM dan nama tidak cocok.",
        emptyFields: "NIM dan nama tidak boleh kosong.",
        loginFailed: "Login gagal. Silakan coba lagi nanti.",
        leaveSubmitFailed: "Gagal mengajukan izin. Silakan coba lagi nanti.",
        passwordIncorrect: "Kata sandi salah. Silakan coba lagi.",
        resetFailed: "Gagal mengatur ulang. Silakan coba lagi nanti.",
        deleteFailed: "Gagal menghapus mahasiswa. Silakan coba lagi nanti.",
      }
    }
  };

  constructor() {
    this.loadLanguage();
    effect(() => {
      const lang = this.language();
      this.saveLanguage(lang);
    });
  }

  private loadLanguage(): void {
    if (isPlatformBrowser(this.platformId)) {
      const savedLang = localStorage.getItem(LOCAL_STORAGE_KEY) as Language | null;
      if (savedLang && Object.prototype.hasOwnProperty.call(this.translations, savedLang)) {
        this.language.set(savedLang);
      }
    }
  }

  private saveLanguage(lang: Language): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(LOCAL_STORAGE_KEY, lang);
    }
  }

  setLanguage(lang: Language) {
    this.language.set(lang);
  }

  translate(key: string, params?: Record<string, string | number>): string {
    const lang = this.language();
    const translationSet = this.translations[lang] || this.translations['en'];
    let translation = get(translationSet, key) || key;

    if (params) {
      Object.keys(params).forEach(paramKey => {
        const regex = new RegExp(`\\{\\{\\s*${paramKey}\\s*\\}\\}`, 'g');
        translation = translation.replace(regex, String(params[paramKey]));
      });
    }
    
    return translation;
  }
}