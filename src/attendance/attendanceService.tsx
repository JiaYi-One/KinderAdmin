import { collection, getDocs } from "firebase/firestore";
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

// Utility for attendance data fetching and caching
const AttendanceDataService = {
    // Cache for reducing API calls
    cache: new Map<string, AttendanceResult>(),

    // Generate cache key
    getCacheKey: (classId: string, date: string) => `${classId}-${date}`,

    // Fetch attendance for a single class on a single date
    fetchClassAttendance: async (classId: string, date: string): Promise<AttendanceResult> => {
        const cacheKey = AttendanceDataService.getCacheKey(classId, date);
        if (AttendanceDataService.cache.has(cacheKey)) {
            return AttendanceDataService.cache.get(cacheKey)!;
        }
        try {
            const studentsCol = collection(db, "attendance", classId, date);
            const snapshot = await getDocs(studentsCol);
            const result: AttendanceResult = {
                present: 0,
                absent: 0,
                leave: 0,
                total: snapshot.size,
                percentage: 0,
                students: []
            };
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                const student: AttendanceStudent = {
                    id: data.studentId,
                    name: data.name,
                    status: data.status
                };
                result.students.push(student);
                if (data.status === "present") result.present++;
                else if (data.status === "absent") result.absent++;
                else if (data.status === "on leave") result.leave++;
            });
            result.percentage = result.total ? Math.round((result.present / result.total) * 100) : 0;
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
        const promises: Promise<AttendanceResult & { classId: string; date: string }>[] = [];
        for (const classId of classIds) {
            for (const date of dates) {
                promises.push(
                    AttendanceDataService.fetchClassAttendance(classId, date)
                        .then(result => ({ ...result, classId, date }))
                );
            }
        }
        return Promise.all(promises);
    },

    // Clear cache when needed
    clearCache: () => {
        AttendanceDataService.cache.clear();
    }
};

export default AttendanceDataService; 