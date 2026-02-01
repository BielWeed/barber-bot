import { Database } from 'sql.js';
import { Client, Service, Appointment, FinancialRecord } from '../models/types';
export declare function initDatabase(): Promise<Database>;
export declare function saveDatabase(): void;
export declare function getDatabase(): Database | null;
export declare function insertClient(client: Client): void;
export declare function getClientByPhone(phone: string): Client | null;
export declare function getAllClients(): Client[];
export declare function getAllServices(): Service[];
export declare function getServiceById(id: string): Service | null;
export declare function insertAppointment(appointment: Appointment): void;
export declare function getAppointmentById(id: string): Appointment | null;
export declare function getAppointmentsByDate(date: string): Appointment[];
export declare function getUpcomingAppointments(): Appointment[];
export declare function updateAppointmentStatus(id: string, status: Appointment['status']): void;
export declare function insertFinancialRecord(record: FinancialRecord): void;
export declare function getFinancialRecords(startDate?: Date, endDate?: Date): FinancialRecord[];
export declare function getFinancialSummary(startDate?: Date, endDate?: Date): {
    income: number;
    expense: number;
    balance: number;
};
//# sourceMappingURL=database.d.ts.map