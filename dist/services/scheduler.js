"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchedulerService = void 0;
const luxon_1 = require("luxon");
const database_1 = require("./database");
class SchedulerService {
    workingHourStart;
    workingHourEnd;
    appointmentDuration;
    lunchStart;
    lunchEnd;
    constructor(config) {
        this.workingHourStart = config.workingHourStart;
        this.workingHourEnd = config.workingHourEnd;
        this.appointmentDuration = config.appointmentDuration;
        this.lunchStart = config.lunchStart;
        this.lunchEnd = config.lunchEnd;
    }
    getAvailableDates() {
        const dates = [];
        const today = luxon_1.DateTime.now();
        // Generate available dates for next 30 days (excluding Sundays)
        for (let i = 0; i < 30; i++) {
            const date = today.plus({ days: i });
            if (date.weekday !== 7) { // Exclude Sunday (7 = Sunday in Luxon)
                dates.push(date.toFormat('yyyy-MM-dd'));
            }
        }
        return dates;
    }
    getAvailableTimes(date) {
        const times = [];
        const dateTime = luxon_1.DateTime.fromFormat(date, 'yyyy-MM-dd');
        const today = luxon_1.DateTime.now();
        const now = luxon_1.DateTime.now();
        // If date is today, only show future times
        const startHour = dateTime.hasSame(today, 'day')
            ? Math.max(now.hour + 1, parseInt(this.workingHourStart.split(':')[0]))
            : parseInt(this.workingHourStart.split(':')[0]);
        const endHour = parseInt(this.workingHourEnd.split(':')[0]);
        // Get appointments for this date
        const appointments = (0, database_1.getAppointmentsByDate)(date);
        const bookedTimes = new Set(appointments.map(a => a.time));
        for (let hour = startHour; hour < endHour; hour++) {
            for (let minute = 0; minute < 60; minute += this.appointmentDuration) {
                const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                // Skip lunch time
                if (this.isInLunchTime(time))
                    continue;
                // Skip if already booked
                if (bookedTimes.has(time))
                    continue;
                // Skip past times for today
                if (dateTime.hasSame(today, 'day')) {
                    const appointmentTime = dateTime.set({ hour, minute });
                    if (appointmentTime <= now)
                        continue;
                }
                times.push(time);
            }
        }
        return times;
    }
    isInLunchTime(time) {
        const [hours, minutes] = time.split(':').map(Number);
        const lunchStart = this.lunchStart.split(':').map(Number);
        const lunchEnd = this.lunchEnd.split(':').map(Number);
        const timeMinutes = hours * 60 + minutes;
        const lunchStartMinutes = lunchStart[0] * 60 + lunchStart[1];
        const lunchEndMinutes = lunchEnd[0] * 60 + lunchEnd[1];
        return timeMinutes >= lunchStartMinutes && timeMinutes < lunchEndMinutes;
    }
    calculateEndTime(startTime, durationMinutes) {
        const [hours, minutes] = startTime.split(':').map(Number);
        const totalMinutes = hours * 60 + minutes + durationMinutes;
        const endHours = Math.floor(totalMinutes / 60);
        const endMinutes = totalMinutes % 60;
        return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
    }
    isTimeAvailable(date, startTime, durationMinutes, excludeAppointmentId) {
        const appointments = (0, database_1.getAppointmentsByDate)(date);
        const newStart = this.timeToMinutes(startTime);
        const newEnd = newStart + durationMinutes;
        for (const apt of appointments) {
            if (excludeAppointmentId && apt.id === excludeAppointmentId)
                continue;
            if (apt.status === 'cancelled')
                continue;
            const aptStart = this.timeToMinutes(apt.time);
            const aptEnd = this.timeToMinutes(apt.endTime);
            // Check for overlap
            if (newStart < aptEnd && newEnd > aptStart) {
                return false;
            }
        }
        return true;
    }
    timeToMinutes(time) {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
    }
    formatDate(date) {
        return luxon_1.DateTime.fromFormat(date, 'yyyy-MM-dd').toFormat("dd 'de' MMMM 'de' yyyy");
    }
    formatTime(time) {
        const [hours, minutes] = time.split(':').map(Number);
        const dateTime = luxon_1.DateTime.now().set({ hour: hours, minute: minutes });
        return dateTime.toFormat('HH:mm');
    }
    formatDateTime(date, time) {
        return `${this.formatDate(date)} às ${this.formatTime(time)}`;
    }
    getTodayDate() {
        return luxon_1.DateTime.now().toFormat('yyyy-MM-dd');
    }
    getNext7Days() {
        return this.getAvailableDates().slice(0, 7);
    }
    async getAvailableSlotsFormatted(date, serviceId) {
        const service = (0, database_1.getServiceById)(serviceId);
        if (!service)
            return [];
        const times = this.getAvailableTimes(date);
        return times.filter(time => this.isTimeAvailable(date, time, service.duration));
    }
}
exports.SchedulerService = SchedulerService;
//# sourceMappingURL=scheduler.js.map