"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinancialHandler = void 0;
const uuid_1 = require("uuid");
const database_1 = require("../services/database");
const scheduler_1 = require("../services/scheduler");
class FinancialHandler {
    whatsapp;
    scheduler;
    sessions;
    ownerPhone;
    incomeCategories = [
        'Corte de Cabelo',
        'Barba',
        'Corte + Barba',
        'Navalhado',
        'Coloração',
        'Hidratação',
        'Outro Serviço'
    ];
    expenseCategories = [
        'Produtos/Insumos',
        'Aluguel',
        'Contas (luz/água)',
        'Equipamentos',
        'Marketing',
        'Transporte',
        'Impostos',
        'Outro'
    ];
    constructor(whatsapp, ownerPhone) {
        this.whatsapp = whatsapp;
        this.scheduler = new scheduler_1.SchedulerService({
            workingHourStart: '09:00',
            workingHourEnd: '20:00',
            appointmentDuration: 60,
            lunchStart: '12:00',
            lunchEnd: '13:00'
        });
        this.sessions = new Map();
        this.ownerPhone = ownerPhone;
    }
    async handleMessage(message, senderPhone, senderJid) {
        // Only owner can use financial commands
        if (senderPhone !== this.ownerPhone) {
            return;
        }
        const command = message.trim().toLowerCase();
        if (command === 'finanças' || command === 'financas' || command === 'extrato') {
            await this.sendFinancialReport(senderJid);
            return;
        }
        if (command === 'entrada' || command === 'receita') {
            this.sessions.set(senderPhone, { phone: senderPhone, state: 'selecting_type', selectedType: 'income' });
            await this.sendIncomeCategories(senderJid);
            return;
        }
        if (command === 'saída' || command === 'saida' || command === 'despesa') {
            this.sessions.set(senderPhone, { phone: senderPhone, state: 'selecting_type', selectedType: 'expense' });
            await this.sendExpenseCategories(senderJid);
            return;
        }
        // Handle flow
        const session = this.sessions.get(senderPhone);
        if (session) {
            await this.handleFlow(session, command, senderJid);
        }
    }
    async handleFlow(session, command, jid) {
        switch (session.state) {
            case 'selecting_category':
                await this.handleCategorySelection(session, command, jid);
                break;
            case 'entering_amount':
                await this.handleAmountInput(session, command, jid);
                break;
            case 'entering_description':
                await this.handleDescriptionInput(session, command, jid);
                break;
            case 'confirming':
                await this.handleConfirmation(session, command, jid);
                break;
        }
    }
    async sendIncomeCategories(jid) {
        let text = `💵 *CATEGORIA DE ENTRADA*\n\n`;
        this.incomeCategories.forEach((cat, i) => {
            text += `*${i + 1}* - ${cat}\n`;
        });
        text += `\n*0* - Cancelar`;
        await this.whatsapp.sendMessage(jid, text);
    }
    async sendExpenseCategories(jid) {
        let text = `💸 *CATEGORIA DE SAÍDA*\n\n`;
        this.expenseCategories.forEach((cat, i) => {
            text += `*${i + 1}* - ${cat}\n`;
        });
        text += `\n*0* - Cancelar`;
        await this.whatsapp.sendMessage(jid, text);
    }
    async handleCategorySelection(session, command, jid) {
        const categories = session.selectedType === 'income' ? this.incomeCategories : this.expenseCategories;
        const index = parseInt(command) - 1;
        if (index >= 0 && index < categories.length) {
            session.selectedCategory = categories[index];
            session.state = 'entering_amount';
            const typeText = session.selectedType === 'income' ? 'entrada' : 'saída';
            await this.whatsapp.sendMessage(jid, `💰 *VALOR DA ${typeText.toUpperCase()}*\n\nDigite o valor (apenas números):\n\nEx: 50.00`);
        }
        else if (command === '0') {
            this.sessions.delete(session.phone);
            await this.whatsapp.sendMessage(jid, '❌ Operação cancelada.');
        }
        else {
            await this.whatsapp.sendMessage(jid, '❌ Opção inválida. Digite o número da categoria:');
            if (session.selectedType === 'income') {
                await this.sendIncomeCategories(jid);
            }
            else {
                await this.sendExpenseCategories(jid);
            }
        }
    }
    async handleAmountInput(session, command, jid) {
        const amount = parseFloat(command.replace(',', '.'));
        if (isNaN(amount) || amount <= 0) {
            await this.whatsapp.sendMessage(jid, '❌ Valor inválido. Digite um número positivo:');
            return;
        }
        session.amount = amount;
        session.state = 'entering_description';
        await this.whatsapp.sendMessage(jid, `📝 *DESCRIÇÃO*\n\nOpcional: Digite uma descrição ou *pular* para continuar:`);
    }
    async handleDescriptionInput(session, command, jid) {
        session.description = command === 'pular' || command === 'pular' ? '' : command;
        session.state = 'confirming';
        const typeText = session.selectedType === 'income' ? 'ENTRADA' : 'SAÍDA';
        const emoji = session.selectedType === 'income' ? '💵' : '💸';
        let text = `${emoji} *CONFIRMAR ${typeText}*\n\n`;
        text += `📂 Categoria: ${session.selectedCategory}\n`;
        text += `💰 Valor: R$ ${session.amount.toFixed(2)}\n`;
        if (session.description) {
            text += `📝 Descrição: ${session.description}\n`;
        }
        text += `\nDigite *confirmar* para salvar ou *cancelar* para cancelar.`;
        await this.whatsapp.sendMessage(jid, text);
    }
    async handleConfirmation(session, command, jid) {
        if (command === 'confirmar' || command === 'sim' || command === 's') {
            const record = {
                id: (0, uuid_1.v4)(),
                type: session.selectedType,
                category: session.selectedCategory,
                amount: session.amount,
                description: session.description || '',
                date: new Date()
            };
            (0, database_1.insertFinancialRecord)(record);
            const emoji = session.selectedType === 'income' ? '💵' : '💸';
            const typeText = session.selectedType === 'income' ? 'Entrada' : 'Saída';
            await this.whatsapp.sendMessage(jid, `${emoji} *${typeText.toUpperCase()} REGISTRADA!*\n\n` +
                `📂 Categoria: ${record.category}\n` +
                `💰 Valor: R$ ${record.amount.toFixed(2)}\n\n` +
                `Registro salvo com sucesso!`);
            this.sessions.delete(session.phone);
        }
        else {
            this.sessions.delete(session.phone);
            await this.whatsapp.sendMessage(jid, '❌ Operação cancelada.');
        }
    }
    async sendFinancialReport(jid) {
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const weekSummary = (0, database_1.getFinancialSummary)(startOfWeek, today);
        const monthSummary = (0, database_1.getFinancialSummary)(startOfMonth, today);
        const weekRecords = (0, database_1.getFinancialRecords)(startOfWeek, today);
        const monthRecords = (0, database_1.getFinancialRecords)(startOfMonth, today);
        let text = `💰 *RELATÓRIO FINANCEIRO*\n\n`;
        text += `*HOJE:* ${this.scheduler.formatDate(this.scheduler.getTodayDate())}\n\n`;
        text += `📊 *ESTA SEMANA:*\n`;
        text += `💵 Entradas: R$ ${weekSummary.income.toFixed(2)}\n`;
        text += `💸 Saídas: R$ ${weekSummary.expense.toFixed(2)}\n`;
        text += `📊 Saldo: R$ ${weekSummary.balance.toFixed(2)}\n\n`;
        text += `📊 *ESTE MÊS:*\n`;
        text += `💵 Entradas: R$ ${monthSummary.income.toFixed(2)}\n`;
        text += `💸 Saídas: R$ ${monthSummary.expense.toFixed(2)}\n`;
        text += `📊 Saldo: R$ ${monthSummary.balance.toFixed(2)}\n\n`;
        // Recent transactions
        const recentRecords = (0, database_1.getFinancialRecords)(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), today);
        if (recentRecords.length > 0) {
            text += `🕐 *ÚLTIMAS TRANSAÇÕES:*\n`;
            recentRecords.slice(0, 10).forEach(record => {
                const emoji = record.type === 'income' ? '💵' : '💸';
                const date = this.scheduler.formatDate(record.date.toISOString().split('T')[0]);
                text += `${emoji} ${date} - ${record.category}: R$ ${record.amount.toFixed(2)}\n`;
            });
        }
        text += `\n📝 *COMANDOS:*\n`;
        text += `• *entrada* - Registrar entrada\n`;
        text += `• *saída* - Registrar saída\n`;
        text += `• *finanças* - Ver este relatório`;
        await this.whatsapp.sendMessage(jid, text);
    }
}
exports.FinancialHandler = FinancialHandler;
//# sourceMappingURL=financialHandler.js.map