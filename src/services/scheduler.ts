import { DateTime, Interval } from 'luxon';
import { Service, Appointment } from '../models/types';
import { getAllServices, getAppointmentsByDate, getServiceById } from './database';

// Set locale to Portuguese
DateTime.local().setLocale('pt-BR');

export class SchedulerService {
  private workingHourStart: string;
  private workingHourEnd: string;
  private appointmentDuration: number;
  private lunchStart: string;
  private lunchEnd: string;

  constructor(config: {
    workingHourStart: string;
    workingHourEnd: string;
    appointmentDuration: number;
    lunchStart: string;
    lunchEnd: string;
  }) {
    this.workingHourStart = config.workingHourStart;
    this.workingHourEnd = config.workingHourEnd;
    this.appointmentDuration = config.appointmentDuration;
    this.lunchStart = config.lunchStart;
    this.lunchEnd = config.lunchEnd;
  }

  getAvailableDates(): string[] {
    const dates: string[] = [];
    const today = DateTime.now();

    // Generate available dates for next 30 days (excluding Sundays)
    for (let i = 0; i < 30; i++) {
      const date = today.plus({ days: i });
      if (date.weekday !== 7) { // Exclude Sunday (7 = Sunday in Luxon)
        dates.push(date.toFormat('yyyy-MM-dd'));
      }
    }

    return dates;
  }

  getAvailableTimes(date: string): string[] {
    const times: string[] = [];
    const dateTime = DateTime.fromFormat(date, 'yyyy-MM-dd');
    const today = DateTime.now();
    const now = DateTime.now();

    // If date is today, only show future times
    const startHour = dateTime.hasSame(today, 'day')
      ? Math.max(now.hour + 1, parseInt(this.workingHourStart.split(':')[0]))
      : parseInt(this.workingHourStart.split(':')[0]);

    const endHour = parseInt(this.workingHourEnd.split(':')[0]);

    // Get appointments for this date
    const appointments = getAppointmentsByDate(date);
    const bookedTimes = new Set(appointments.map(a => a.time));

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += this.appointmentDuration) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

        // Skip lunch time
        if (this.isInLunchTime(time)) continue;

        // Skip if already booked
        if (bookedTimes.has(time)) continue;

        // Skip past times for today
        if (dateTime.hasSame(today, 'day')) {
          const appointmentTime = dateTime.set({ hour, minute });
          if (appointmentTime <= now) continue;
        }

        times.push(time);
      }
    }

    return times;
  }

  isInLunchTime(time: string): boolean {
    const [hours, minutes] = time.split(':').map(Number);
    const lunchStart = this.lunchStart.split(':').map(Number);
    const lunchEnd = this.lunchEnd.split(':').map(Number);

    const timeMinutes = hours * 60 + minutes;
    const lunchStartMinutes = lunchStart[0] * 60 + lunchStart[1];
    const lunchEndMinutes = lunchEnd[0] * 60 + lunchEnd[1];

    return timeMinutes >= lunchStartMinutes && timeMinutes < lunchEndMinutes;
  }

  calculateEndTime(startTime: string, durationMinutes: number): string {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + durationMinutes;
    const endHours = Math.floor(totalMinutes / 60);
    const endMinutes = totalMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
  }

  isTimeAvailable(date: string, startTime: string, durationMinutes: number, excludeAppointmentId?: string): boolean {
    const appointments = getAppointmentsByDate(date);
    const newStart = this.timeToMinutes(startTime);
    const newEnd = newStart + durationMinutes;

    for (const apt of appointments) {
      if (excludeAppointmentId && apt.id === excludeAppointmentId) continue;
      if (apt.status === 'cancelled') continue;

      const aptStart = this.timeToMinutes(apt.time);
      const aptEnd = this.timeToMinutes(apt.endTime);

      // Check for overlap
      if (newStart < aptEnd && newEnd > aptStart) {
        return false;
      }
    }

    return true;
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  formatDate(date: string): string {
    return DateTime.fromFormat(date, 'yyyy-MM-dd').toFormat("dd 'de' MMMM 'de' yyyy");
  }

  formatTime(time: string): string {
    const [hours, minutes] = time.split(':').map(Number);
    const dateTime = DateTime.now().set({ hour: hours, minute: minutes });
    return dateTime.toFormat('HH:mm');
  }

  formatDateTime(date: string, time: string): string {
    return `${this.formatDate(date)} às ${this.formatTime(time)}`;
  }

  getTodayDate(): string {
    return DateTime.now().toFormat('yyyy-MM-dd');
  }

  getNext7Days(): string[] {
    return this.getAvailableDates().slice(0, 7);
  }

  async getAvailableSlotsFormatted(date: string, serviceId: string): Promise<string[]> {
    const service = getServiceById(serviceId);
    if (!service) return [];

    const times = this.getAvailableTimes(date);
    return times.filter(time =>
      this.isTimeAvailable(date, time, service.duration)
    );
  }
}
