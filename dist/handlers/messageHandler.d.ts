import { WAMessage } from '@whiskeysockets/baileys';
import { WhatsAppService } from '../services/whatsapp';
export declare class MessageHandler {
    private whatsapp;
    private scheduler;
    private sessions;
    private ownerPhone;
    private managerGroupJid;
    constructor(whatsapp: WhatsAppService, config: any);
    setManagerGroup(jid: string): void;
    handleMessage(message: WAMessage): Promise<void>;
    private handleCustomerMessage;
    private handleManagerCommand;
    private sendMainMenu;
    private sendManagerMenu;
    private sendHelp;
    private sendServices;
    private sendMyAppointments;
    private sendTodayAppointments;
    private sendTomorrowAppointments;
    private sendWeekAppointments;
    private sendAllAppointments;
    private sendAppointmentsList;
    private sendFinancialSummary;
    private sendClientList;
    private confirmAppointment;
    private cancelAppointment;
    private handleSchedulingFlow;
    private handleServiceSelection;
    private sendServicesList;
    private handleDateSelection;
    private handleTimeSelection;
    private handleNameInput;
    private showConfirmation;
    private handleConfirmation;
}
//# sourceMappingURL=messageHandler.d.ts.map