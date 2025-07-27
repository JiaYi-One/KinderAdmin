import AttendanceDataService from "./attendanceService";

export interface AttendanceResult {
    present: number;
    absent: number;
    leave: number;
    total: number;
    percentage: number;
    students: any[];
    classId?: string;
    date?: string;
}

// Fetch functions for different time periods (used in AttendanceReport.tsx)
export const fetchDailyAttendance = async (classIds: string[], dates: string[]): Promise<(AttendanceResult & { classId: string; date: string })[]> => {
    return AttendanceDataService.fetchBulkAttendance(classIds, dates);
};

export const fetchWeeklyAttendance = async (classIds: string[], dates: string[]): Promise<(AttendanceResult & { classId: string; date: string })[]> => {
    return AttendanceDataService.fetchBulkAttendance(classIds, dates);
};

export const fetchMonthlyAttendance = async (classIds: string[], dates: string[]): Promise<(AttendanceResult & { classId: string; date: string })[]> => {
    return AttendanceDataService.fetchBulkAttendance(classIds, dates);
}; 