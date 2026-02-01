export declare class SchedulerService {
    private workingHourStart;
    private workingHourEnd;
    private appointmentDuration;
    private lunchStart;
    private lunchEnd;
    constructor(config: {
        workingHourStart: string;
        workingHourEnd: string;
        appointmentDuration: number;
        lunchStart: string;
        lunchEnd: string;
    });
    getAvailableDates(): string[];
    getAvailableTimes(date: string): string[];
    isInLunchTime(time: string): boolean;
    calculateEndTime(startTime: string, durationMinutes: number): string;
    isTimeAvailable(date: string, startTime: string, durationMinutes: number, excludeAppointmentId?: string): boolean;
    private timeToMinutes;
    formatDate(date: string): string;
    formatTime(time: string): string;
    formatDateTime(date: string, time: string): string;
    getTodayDate(): string;
    getNext7Days(): string[];
    getAvailableSlotsFormatted(date: string, serviceId: string): Promise<string[]>;
}
//# sourceMappingURL=scheduler.d.ts.map