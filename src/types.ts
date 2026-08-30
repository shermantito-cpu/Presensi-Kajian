export interface AttendanceRecord {
  id: string;
  civitasId: string;
  scheduleId: string;
  date: string; // ISO Date string YYYY-MM-DD
  timestamp: number;
}
