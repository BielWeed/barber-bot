import { WhatsAppService } from '../services/whatsapp';
export declare class FinancialHandler {
    private whatsapp;
    private scheduler;
    private sessions;
    private ownerPhone;
    private incomeCategories;
    private expenseCategories;
    constructor(whatsapp: WhatsAppService, ownerPhone: string);
    handleMessage(message: string, senderPhone: string, senderJid: string): Promise<void>;
    private handleFlow;
    private sendIncomeCategories;
    private sendExpenseCategories;
    private handleCategorySelection;
    private handleAmountInput;
    private handleDescriptionInput;
    private handleConfirmation;
    private sendFinancialReport;
}
//# sourceMappingURL=financialHandler.d.ts.map