import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

export interface AttendanceStudent {
    id: string;
    name: string;
    status: string;
}

export interface AttendanceResult {
    present: number;
    absent: number;
    leave: number;
    total: number;
    percentage: number;
    students: AttendanceStudent[];
    classId?: string;
    date?: string;
}

// New interface for the updated Firestore structure
interface MonthlyAttendanceData {
    [date: string]: {
        [studentId: string]: {
            name: string;
            status: string;
            note?: string;
        };
    };
}

// Utility for attendance data fetching and caching
const AttendanceDataService = {
    // Cache for reducing API calls
    cache: new Map<string, AttendanceResult>(),

    // Generate cache key
    getCacheKey: (classId: string, date: string) => `${classId}-${date}`,

    // Fetch attendance for a single class on a single date (updated for new structure)
    fetchClassAttendance: async (classId: string, date: string): Promise<AttendanceResult> => {
        const cacheKey = AttendanceDataService.getCacheKey(classId, date);
        if (AttendanceDataService.cache.has(cacheKey)) {
            return AttendanceDataService.cache.get(cacheKey)!;
        }
        
        try {
            // Get the year and month from the date
            const [year, month] = date.split('-').slice(0, 2);
            const monthDocId = `${year}-${month}`;
            
            console.log(`Fetching attendance for ${classId} on ${date}`);
            console.log(`Month document ID: ${monthDocId}`);
            
            // Fetch the monthly document
            const monthlyDocRef = doc(db, "attendance", classId, "months", monthDocId);
            const monthlyDoc = await getDoc(monthlyDocRef);
            
            const result: AttendanceResult = {
                present: 0,
                absent: 0,
                leave: 0,
                total: 0,
                percentage: 0,
                students: []
            };
            
            if (monthlyDoc.exists()) {
                const data = monthlyDoc.data() as MonthlyAttendanceData;
                console.log(`Monthly document data:`, data);
                
                const dayData = data[date];
                console.log(`Day data for ${date}:`, dayData);
                
                if (dayData) {
                    const students: AttendanceStudent[] = [];
                    let present = 0, absent = 0, leave = 0;
                    
                    Object.entries(dayData).forEach(([studentId, studentData]) => {
                        students.push({
                            id: studentId,
                            name: studentData.name,
                            status: studentData.status
                        });
                        
                        if (studentData.status === "present") present++;
                        else if (studentData.status === "absent") absent++;
                        else if (studentData.status === "on leave") leave++;
                    });
                    
                    result.students = students;
                    result.present = present;
                    result.absent = absent;
                    result.leave = leave;
                    result.total = students.length;
                    result.percentage = result.total ? Math.round((present / result.total) * 100) : 0;
                    
                    console.log(`Result for ${classId} on ${date}:`, result);
                } else {
                    console.log(`No day data found for ${date} in ${classId}`);
                }
            } else {
                console.log(`Monthly document does not exist for ${classId}/${monthDocId}`);
            }
            
            // Cache the result
            AttendanceDataService.cache.set(cacheKey, result);
            return result;
        } catch (error) {
            console.error(`Error fetching attendance for ${classId} on ${date}:`, error);
            return { present: 0, absent: 0, leave: 0, total: 0, percentage: 0, students: [] };
        }
    },

    // Fetch attendance for multiple classes on multiple dates (parallel)
    fetchBulkAttendance: async (classIds: string[], dates: string[]): Promise<(AttendanceResult & { classId: string; date: string })[]> => {
        console.log('fetchBulkAttendance called with:', { classIds, dates });
        
        const promises: Promise<AttendanceResult & { classId: string; date: string }>[] = [];
        for (const classId of classIds) {
            for (const date of dates) {
                promises.push(
                    AttendanceDataService.fetchClassAttendance(classId, date)
                        .then(result => ({ ...result, classId, date }))
                );
            }
        }
        const results = await Promise.all(promises);
        console.log('fetchBulkAttendance results:', results);
        return results;
    },

    // Clear cache when needed
    clearCache: () => {
        AttendanceDataService.cache.clear();
    },

    // Clear cache for specific class and date
    clearCacheForClass: (classId: string, date: string) => {
        const cacheKey = AttendanceDataService.getCacheKey(classId, date);
        AttendanceDataService.cache.delete(cacheKey);
        console.log(`Cleared cache for ${classId} on ${date}`);
    },

    // Clear cache for all dates in a month (useful when saving new attendance)
    clearCacheForMonth: (classId: string, yearMonth: string) => {
        const keysToDelete: string[] = [];
        AttendanceDataService.cache.forEach((_, key) => {
            if (key.startsWith(`${classId}-${yearMonth}`)) {
                keysToDelete.push(key);
            }
        });
        keysToDelete.forEach(key => AttendanceDataService.cache.delete(key));
        console.log(`Cleared cache for ${classId} month ${yearMonth}`);
    }
};

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

export default AttendanceDataService; 