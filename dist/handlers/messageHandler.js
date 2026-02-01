"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageHandler = void 0;
const uuid_1 = require("uuid");
const database_1 = require("../services/database");
const scheduler_1 = require("../services/scheduler");
class MessageHandler {
    whatsapp;
    scheduler;
    sessions;
    ownerPhone;
    managerGroupJid = null;
    constructor(whatsapp, config) {
        this.whatsapp = whatsapp;
        this.scheduler = new scheduler_1.SchedulerService({
            workingHourStart: config.workingHourStart || '09:00',
            workingHourEnd: config.workingHourEnd || '20:00',
            appointmentDuration: config.appointmentDuration || 60,
            lunchStart: config.lunchStart || '12:00',
            lunchEnd: config.lunchEnd || '13:00'
        });
        this.sessions = new Map();
        this.ownerPhone = config.ownerPhone || '';
    }
    setManagerGroup(jid) {
        this.managerGroupJid = jid;
    }
    async handleMessage(message) {
        const content = await this.whatsapp.getMessageContent(message);
        const senderPhone = await this.whatsapp.getSenderPhone(message);
        const groupJid = await this.whatsapp.getGroupJid(message);
        const isGroupMessage = !!groupJid;
        // Ignore group messages except in manager group
        if (isGroupMessage && groupJid !== this.managerGroupJid) {
            return;
        }
        // Ignore status broadcasts
        if (senderPhone === 'status')
            return;
        const command = content?.trim().toLowerCase() || '';
        const senderJid = message.key.remoteJid || '';
        // Check if it's a command for the manager group
        if (isGroupMessage && groupJid === this.managerGroupJid) {
            await this.handleManagerCommand(command, senderPhone, senderJid);
            return;
        }
        // Handle regular customer messages
        await this.handleCustomerMessage(command, senderPhone, senderJid, content || '');
    }
    async handleCustomerMessage(command, phone, senderJid, originalContent) {
        // Initialize session if not exists
        if (!this.sessions.has(phone)) {
            this.sessions.set(phone, { phone, state: 'idle' });
        }
        const session = this.sessions.get(phone);
        // Check for cancel command
        if (command === 'cancelar' || command === 'cancel' || command === '0') {
            this.sessions.delete(phone);
            await this.whatsapp.sendMessage(senderJid, '❌ Agendamento cancelado. Quando quiser agendar, é só mandar *menu*!');
            return;
        }
        // Main menu
        if (command === 'menu' || command === 'oi' || command === 'olá' || command === 'ola' || command === 'início' || command === 'inicio' || command === '1') {
            this.sessions.delete(phone);
            await this.sendMainMenu(senderJid);
            return;
        }
        // Show services
        if (command === 'serviços' || command === 'servicos' || command === '2' || command === 'servico') {
            await this.sendServices(senderJid);
            return;
        }
        // Show my appointments
        if (command === 'meus horários' || command === 'meus horarios' || command === '3') {
            await this.sendMyAppointments(phone, senderJid);
            return;
        }
        // Help
        if (command === 'ajuda' || command === 'help' || command === '?') {
            await this.sendHelp(senderJid);
            return;
        }
        // Handle scheduling flow
        if (session.state !== 'idle') {
            await this.handleSchedulingFlow(session, command, senderJid, originalContent);
            return;
        }
        // Default response
        await this.sendMainMenu(senderJid);
    }
    async handleManagerCommand(command, senderPhone, senderJid) {
        // Only owner can use manager commands
        if (senderPhone !== this.ownerPhone) {
            return;
        }
        if (command === 'hoje') {
            await this.sendTodayAppointments(senderJid);
        }
        else if (command === 'amanhã' || command === 'amanha') {
            await this.sendTomorrowAppointments(senderJid);
        }
        else if (command === 'semana') {
            await this.sendWeekAppointments(senderJid);
        }
        else if (command === 'finanças' || command === 'financas') {
            await this.sendFinancialSummary(senderJid);
        }
        else if (command === 'clientes') {
            await this.sendClientList(senderJid);
        }
        else if (command === 'agendamentos') {
            await this.sendAllAppointments(senderJid);
        }
        else if (command.startsWith('confirmar ')) {
            const id = command.split(' ')[1];
            await this.confirmAppointment(id, senderJid);
        }
        else if (command.startsWith('cancelar ')) {
            const id = command.split(' ')[1];
            await this.cancelAppointment(id, senderJid);
        }
        else if (command === 'menu') {
            await this.sendManagerMenu(senderJid);
        }
        else {
            await this.sendManagerMenu(senderJid);
        }
    }
    async sendMainMenu(jid) {
        const menu = `🏠 *BARBER SHOP*

Olá! Como posso ajudar?

*1* - 💇 Agendar horário
*2* - 📋 Ver serviços e preços
*3* - 📅 Meus agendamentos
*0* - Cancelar

Digite o número da opção ou escreva o que precisa!`;
        await this.whatsapp.sendMessage(jid, menu);
    }
    async sendManagerMenu(jid) {
        const menu = `👨‍💼 *MENU DO BARBEIRO*

*hoje* - Agendamentos de hoje
*amanhã* - Agendamentos de amanhã
*semana* - Agendamentos da semana
*agendamentos* - Todos os agendamentos
*finanças* - Resumo financeiro
*clientes* - Lista de clientes
*menu* - Este menu

Gerencie sua barbearia!`;
        await this.whatsapp.sendMessage(jid, menu);
    }
    async sendHelp(jid) {
        const help = `📖 *COMANDOS DISPONÍVEIS*

• *menu* - Voltar ao menu principal
• *serviços* - Ver serviços disponíveis
• *agendar* - Iniciar agendamento
• *meus horários* - Ver seus agendamentos
• *cancelar* - Cancelar agendamento em andamento

💬 Para agendar, basta digitar *agendar* ou *1*`;
        await this.whatsapp.sendMessage(jid, help);
    }
    async sendServices(jid) {
        const services = (0, database_1.getAllServices)();
        let text = `💈 *SERVIÇOS DISPONÍVEIS*\n\n`;
        for (const service of services) {
            text += `• *${service.name}* - R$ ${service.price.toFixed(2)}\n`;
            text += `  ⏱️ ${service.duration} minutos\n`;
            if (service.description) {
                text += `  📝 ${service.description}\n`;
            }
            text += '\n';
        }
        text += `Para agendar, digite *agendar* ou *1*`;
        await this.whatsapp.sendMessage(jid, text);
    }
    async sendMyAppointments(phone, jid) {
        const client = (0, database_1.getClientByPhone)(phone);
        if (!client) {
            await this.whatsapp.sendMessage(jid, '📅 Você ainda não tem agendamentos. Para agendar, digite *agendar* ou *1*');
            return;
        }
        const today = this.scheduler.getTodayDate();
        const appointments = (0, database_1.getAppointmentsByDate)(today)
            .filter(a => a.clientId === client.id && a.status !== 'cancelled')
            .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
        if (appointments.length === 0) {
            await this.whatsapp.sendMessage(jid, '📅 Você não tem agendamentos marcados. Para agendar, digite *agendar* ou *1*');
            return;
        }
        let text = `📅 *SEUS AGENDAMENTOS*\n\n`;
        for (const apt of appointments) {
            const statusEmoji = apt.status === 'confirmed' ? '✅' : '⏳';
            text += `${statusEmoji} *${apt.serviceName}*\n`;
            text += `📆 ${this.scheduler.formatDateTime(apt.date, apt.time)}\n`;
            text += `💰 R$ ${apt.price.toFixed(2)}\n\n`;
        }
        await this.whatsapp.sendMessage(jid, text);
    }
    async sendTodayAppointments(jid) {
        const today = this.scheduler.getTodayDate();
        const appointments = (0, database_1.getAppointmentsByDate)(today)
            .filter(a => a.status !== 'cancelled')
            .sort((a, b) => a.time.localeCompare(b.time));
        await this.sendAppointmentsList(jid, 'AGENDA DE HOJE', appointments);
    }
    async sendTomorrowAppointments(jid) {
        const tomorrow = this.scheduler.getNext7Days()[1];
        const appointments = (0, database_1.getAppointmentsByDate)(tomorrow)
            .filter(a => a.status !== 'cancelled')
            .sort((a, b) => a.time.localeCompare(b.time));
        await this.sendAppointmentsList(jid, 'AGENDA DE AMANHÃ', appointments);
    }
    async sendWeekAppointments(jid) {
        const dates = this.scheduler.getNext7Days();
        let weekText = `📅 *AGENDA DA SEMANA*\n\n`;
        for (const date of dates) {
            const appointments = (0, database_1.getAppointmentsByDate)(date)
                .filter(a => a.status !== 'cancelled')
                .sort((a, b) => a.time.localeCompare(b.time));
            if (appointments.length > 0) {
                weekText += `📆 *${this.scheduler.formatDate(date)}*\n`;
                for (const apt of appointments) {
                    const statusEmoji = apt.status === 'confirmed' ? '✅' : '⏳';
                    weekText += `${statusEmoji} ${apt.time} - ${apt.clientName} (${apt.serviceName})\n`;
                }
                weekText += '\n';
            }
        }
        if (weekText === '📅 *AGENDA DA SEMANA*\n\n') {
            weekText += 'Nenhum agendamento esta semana.';
        }
        await this.whatsapp.sendMessage(jid, weekText);
    }
    async sendAllAppointments(jid) {
        const appointments = (0, database_1.getUpcomingAppointments)();
        await this.sendAppointmentsList(jid, 'TODOS OS AGENDAMENTOS', appointments);
    }
    async sendAppointmentsList(jid, title, appointments) {
        let appointmentsText = `📅 *${title}*\n\n`;
        if (appointments.length === 0) {
            appointmentsText += 'Nenhum agendamento encontrado.';
        }
        else {
            for (const apt of appointments) {
                const statusEmoji = apt.status === 'confirmed' ? '✅' : '⏳';
                appointmentsText += `${statusEmoji} *${apt.serviceName}*\n`;
                appointmentsText += `👤 ${apt.clientName}\n`;
                appointmentsText += `📆 ${this.scheduler.formatDateTime(apt.date, apt.time)}\n`;
                appointmentsText += `💰 R$ ${apt.price.toFixed(2)}\n`;
                appointmentsText += `📝 ID: \`${apt.id.slice(0, 8)}\`\n`;
                appointmentsText += `Comandos: confirmar ${apt.id.slice(0, 8)} | cancelar ${apt.id.slice(0, 8)}\n\n`;
            }
        }
        await this.whatsapp.sendMessage(jid, appointmentsText);
    }
    async sendFinancialSummary(jid) {
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthSummary = (0, database_1.getFinancialSummary)(startOfMonth, today);
        const summaryText = `💰 *RESUMO FINANCEIRO*\n\n*Este Mês:*\n`;
        const summaryText2 = `💵 Entradas: R$ ${monthSummary.income.toFixed(2)}\n`;
        const summaryText3 = `💸 Saídas: R$ ${monthSummary.expense.toFixed(2)}\n`;
        const summaryText4 = `📊 Saldo: R$ ${monthSummary.balance.toFixed(2)}\n\n`;
        const summaryText5 = `Para ver o fluxo completo, digite *extrato*`;
        await this.whatsapp.sendMessage(jid, summaryText + summaryText2 + summaryText3 + summaryText4 + summaryText5);
    }
    async sendClientList(jid) {
        const clients = (0, database_1.getAllClients)();
        let clientsText = `👥 *CLIENTES CADASTRADOS* (${clients.length})\n\n`;
        for (const client of clients.slice(0, 20)) {
            clientsText += `• ${client.name} (${client.phone})\n`;
            clientsText += `  Visitas: ${client.totalVisits}\n\n`;
        }
        if (clients.length > 20) {
            clientsText += `... e mais ${clients.length - 20} clientes`;
        }
        await this.whatsapp.sendMessage(jid, clientsText);
    }
    async confirmAppointment(id, jid) {
        const fullId = `apt_${id}`;
        const appointment = (0, database_1.getAppointmentById)(fullId);
        if (!appointment) {
            await this.whatsapp.sendMessage(jid, `❌ Agendamento não encontrado: ${id}`);
            return;
        }
        (0, database_1.updateAppointmentStatus)(fullId, 'confirmed');
        // Notify customer
        await this.whatsapp.sendMessage(`${appointment.clientPhone}@s.whatsapp.net`, `✅ *Confirmação de Agendamento*\n\n` +
            `Seu horário foi confirmado!\n\n` +
            `📅 ${this.scheduler.formatDateTime(appointment.date, appointment.time)}\n` +
            `💇 ${appointment.serviceName}\n` +
            `💰 R$ ${appointment.price.toFixed(2)}\n\n` +
            `Nos vemos em breve! 💈`);
        // Notify manager group
        await this.whatsapp.sendMessage(jid, `✅ Agendamento confirmado: ${appointment.clientName} - ${this.scheduler.formatDateTime(appointment.date, appointment.time)}`);
    }
    async cancelAppointment(id, jid) {
        const fullId = `apt_${id}`;
        const appointment = (0, database_1.getAppointmentById)(fullId);
        if (!appointment) {
            await this.whatsapp.sendMessage(jid, `❌ Agendamento não encontrado: ${id}`);
            return;
        }
        (0, database_1.updateAppointmentStatus)(fullId, 'cancelled');
        // Notify customer
        await this.whatsapp.sendMessage(`${appointment.clientPhone}@s.whatsapp.net`, `❌ *Agendamento Cancelado*\n\n` +
            `Seu horário foi cancelado.\n\n` +
            `📅 ${this.scheduler.formatDateTime(appointment.date, appointment.time)}\n` +
            `💇 ${appointment.serviceName}\n\n` +
            `Para remarcar, digite *agendar*!`);
        await this.whatsapp.sendMessage(jid, `❌ Agendamento cancelado: ${appointment.clientName}`);
    }
    async handleSchedulingFlow(session, command, jid, originalContent) {
        switch (session.state) {
            case 'selecting_service':
                await this.handleServiceSelection(session, command, jid);
                break;
            case 'selecting_date':
                await this.handleDateSelection(session, command, jid);
                break;
            case 'selecting_time':
                await this.handleTimeSelection(session, command, jid);
                break;
            case 'awaiting_name':
                await this.handleNameInput(session, originalContent, jid);
                break;
            case 'confirming':
                await this.handleConfirmation(session, command, jid);
                break;
        }
    }
    async handleServiceSelection(session, command, jid) {
        const services = (0, database_1.getAllServices)();
        const serviceIndex = parseInt(command) - 1;
        if (serviceIndex >= 0 && serviceIndex < services.length) {
            session.selectedService = services[serviceIndex].id;
            session.state = 'selecting_date';
            const dates = this.scheduler.getNext7Days();
            let text = `📅 *SELECIONE A DATA*\n\n`;
            dates.forEach((date, i) => {
                text += `*${i + 1}* - ${this.scheduler.formatDate(date)}\n`;
            });
            text += `\n*0* - Cancelar`;
            await this.whatsapp.sendMessage(jid, text);
        }
        else {
            await this.whatsapp.sendMessage(jid, '❌ Opção inválida. Digite o número do serviço desejado:');
            await this.sendServicesList(jid);
        }
    }
    async sendServicesList(jid) {
        const services = (0, database_1.getAllServices)();
        let text = `💇 *SERVIÇOS*\n\n`;
        services.forEach((service, i) => {
            text += `*${i + 1}* - ${service.name} (R$ ${service.price.toFixed(2)})\n`;
        });
        text += `\n*0* - Cancelar`;
        await this.whatsapp.sendMessage(jid, text);
    }
    async handleDateSelection(session, command, jid) {
        const dates = this.scheduler.getNext7Days();
        const dateIndex = parseInt(command) - 1;
        if (dateIndex >= 0 && dateIndex < dates.length) {
            session.selectedDate = dates[dateIndex];
            session.state = 'selecting_time';
            const service = (0, database_1.getServiceById)(session.selectedService);
            const times = await this.scheduler.getAvailableSlotsFormatted(session.selectedDate, session.selectedService);
            if (times.length === 0) {
                await this.whatsapp.sendMessage(jid, '❌ Não há horários disponíveis para esta data. Por favor, escolha outra data.');
                session.state = 'selecting_date';
                return;
            }
            let text = `🕐 *SELECIONE O HORÁRIO*\n\n`;
            text += `📅 ${this.scheduler.formatDate(session.selectedDate)}\n`;
            text += `💇 ${service?.name} (${service?.duration} min)\n\n`;
            times.forEach((time, i) => {
                text += `*${i + 1}* - ${this.scheduler.formatTime(time)}\n`;
            });
            text += `\n*0* - Cancelar`;
            await this.whatsapp.sendMessage(jid, text);
        }
        else if (command === '0') {
            this.sessions.delete(session.phone);
            await this.whatsapp.sendMessage(jid, '❌ Agendamento cancelado.');
            return;
        }
        else {
            await this.whatsapp.sendMessage(jid, '❌ Opção inválida. Digite o número da data:');
        }
    }
    async handleTimeSelection(session, command, jid) {
        const dates = this.scheduler.getNext7Days();
        const dateIndex = parseInt(command) - 1;
        // Check if user is trying to change date
        if (dateIndex >= 0 && dateIndex < dates.length) {
            session.selectedDate = dates[dateIndex];
            session.state = 'selecting_time';
            const service = (0, database_1.getServiceById)(session.selectedService);
            const times = await this.scheduler.getAvailableSlotsFormatted(session.selectedDate, session.selectedService);
            let text = `🕐 *SELECIONE O HORÁRIO*\n\n`;
            text += `📅 ${this.scheduler.formatDate(session.selectedDate)}\n`;
            text += `💇 ${service?.name} (${service?.duration} min)\n\n`;
            times.forEach((time, i) => {
                text += `*${i + 1}* - ${this.scheduler.formatTime(time)}\n`;
            });
            text += `\n*0* - Cancelar`;
            await this.whatsapp.sendMessage(jid, text);
            return;
        }
        const times = await this.scheduler.getAvailableSlotsFormatted(session.selectedDate, session.selectedService);
        const timeIndex = parseInt(command) - 1;
        if (timeIndex >= 0 && timeIndex < times.length) {
            session.selectedTime = times[timeIndex];
            session.state = 'awaiting_name';
            // Check if client already exists
            const existingClient = (0, database_1.getClientByPhone)(session.phone);
            if (existingClient) {
                session.state = 'confirming';
                await this.showConfirmation(session, jid, existingClient.name);
            }
            else {
                await this.whatsapp.sendMessage(jid, `👤 *QUAL É O SEU NOME?*\n\nPor favor, digite seu nome completo:`);
            }
        }
        else if (command === '0') {
            this.sessions.delete(session.phone);
            await this.whatsapp.sendMessage(jid, '❌ Agendamento cancelado.');
            return;
        }
        else {
            await this.whatsapp.sendMessage(jid, '❌ Opção inválida. Digite o número do horário:');
        }
    }
    async handleNameInput(session, name, jid) {
        if (!name || name.length < 2) {
            await this.whatsapp.sendMessage(jid, '❌ Nome inválido. Por favor, digite seu nome completo:');
            return;
        }
        // Update session with name and move to confirmation
        session.state = 'confirming';
        await this.showConfirmation(session, jid, name);
    }
    async showConfirmation(session, jid, clientName) {
        const service = (0, database_1.getServiceById)(session.selectedService);
        const endTime = this.scheduler.calculateEndTime(session.selectedTime, service.duration);
        let text = `✅ *CONFIRMAR AGENDAMENTO*\n\n`;
        text += `💇 *Serviço:* ${service.name}\n`;
        text += `📅 *Data:* ${this.scheduler.formatDate(session.selectedDate)}\n`;
        text += `🕐 *Horário:* ${this.scheduler.formatTime(session.selectedTime)} às ${this.scheduler.formatTime(endTime)}\n`;
        text += `💰 *Valor:* R$ ${service.price.toFixed(2)}\n`;
        text += `👤 *Cliente:* ${clientName}\n\n`;
        text += `Digite *confirmar* para confirmar ou *cancelar* para cancelar.`;
        await this.whatsapp.sendMessage(jid, text);
    }
    async handleConfirmation(session, command, jid) {
        if (command === 'confirmar' || command === 'confirmar' || command === 'sim' || command === 's') {
            const service = (0, database_1.getServiceById)(session.selectedService);
            const clientPhone = session.phone;
            // Get or create client
            let client = (0, database_1.getClientByPhone)(clientPhone);
            if (!client) {
                client = {
                    id: (0, uuid_1.v4)(),
                    phone: clientPhone,
                    name: 'Cliente', // Default name
                    totalVisits: 0,
                    createdAt: new Date()
                };
                (0, database_1.insertClient)(client);
            }
            const endTime = this.scheduler.calculateEndTime(session.selectedTime, service.duration);
            const appointment = {
                id: (0, uuid_1.v4)(),
                clientId: client.id,
                clientPhone,
                clientName: client.name,
                serviceId: service.id,
                serviceName: service.name,
                date: session.selectedDate,
                time: session.selectedTime,
                endTime,
                status: 'pending',
                price: service.price,
                createdAt: new Date()
            };
            (0, database_1.insertAppointment)(appointment);
            let text = `🎉 *AGENDAMENTO REALIZADO!*\n\n`;
            text += `Seu horário foi marcado com sucesso!\n\n`;
            text += `📅 ${this.scheduler.formatDateTime(appointment.date, appointment.time)}\n`;
            text += `💇 ${appointment.serviceName}\n`;
            text += `💰 R$ ${appointment.price.toFixed(2)}\n\n`;
            text += `O barbeiro confirmará seu agendamento em breve.\n`;
            text += `Para cancelar, entre em contato pelo WhatsApp.\n\n`;
            text += `Obrigado! 💈`;
            await this.whatsapp.sendMessage(jid, text);
            // Notify manager group
            if (this.managerGroupJid) {
                await this.whatsapp.sendMessage(this.managerGroupJid, `🔔 *NOVO AGENDAMENTO*\n\n` +
                    `👤 ${client.name}\n` +
                    `💇 ${appointment.serviceName}\n` +
                    `📅 ${this.scheduler.formatDateTime(appointment.date, appointment.time)}\n` +
                    `💰 R$ ${appointment.price.toFixed(2)}\n\n` +
                    `Para confirmar: confirmar ${appointment.id.slice(0, 8)}`);
            }
            this.sessions.delete(session.phone);
        }
        else if (command === 'cancelar' || command === 'cancelar') {
            this.sessions.delete(session.phone);
            await this.whatsapp.sendMessage(jid, '❌ Agendamento cancelado.');
        }
        else {
            await this.whatsapp.sendMessage(jid, '❌ Digite *confirmar* para confirmar ou *cancelar* para cancelar.');
        }
    }
}
exports.MessageHandler = MessageHandler;
//# sourceMappingURL=messageHandler.js.map