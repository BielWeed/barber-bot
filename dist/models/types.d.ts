export interface Client {
    id: string;
    phone: string;
    name: string;
    notes?: string;
    createdAt: Date;
    lastVisit?: Date;
    totalVisits: number;
}
export interface Service {
    id: string;
    name: string;
    price: number;
    duration: number;
    description?: string;
    active: boolean;
}
export interface Appointment {
    id: string;
    clientId: string;
    clientPhone: string;
    clientName: string;
    serviceId: string;
    serviceName: string;
    date: string;
    time: string;
    endTime: string;
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
    price: number;
    notes?: string;
    createdAt: Date;
    confirmedAt?: Date;
}
export interface Barber {
    id: string;
    phone: string;
    name: string;
    isOwner: boolean;
}
export interface FinancialRecord {
    id: string;
    type: 'income' | 'expense';
    category: string;
    amount: number;
    description: string;
    date: Date;
    appointmentId?: string;
}
export interface GroupSettings {
    groupId: string;
    groupJid: string;
    isManagerGroup: boolean;
    notifyAppointments: boolean;
    notifyFinancials: boolean;
    notifyCancellations: boolean;
}
export interface BotConfig {
    workingHourStart: string;
    workingHourEnd: string;
    appointmentDuration: number;
    lunchStart: string;
    lunchEnd: string;
    ownerPhone: string;
    botName: string;
}
//# sourceMappingURL=types.d.ts.map