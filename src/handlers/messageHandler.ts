import { WAMessage } from '@whiskeysockets/baileys';
import { v4 as uuidv4 } from 'uuid';
import {
  getClientByPhone,
  insertClient,
  getAllServices,
  getServiceById,
  insertAppointment,
  getAppointmentsByDate,
  getAppointmentById,
  updateAppointmentStatus,
  getUpcomingAppointments,
  getFinancialSummary,
  getFinancialRecords,
  insertFinancialRecord,
  getAllClients,
  setConfig
} from '../services/database';
import { SchedulerService } from '../services/scheduler';
import { WhatsAppService } from '../services/whatsapp';
import { Appointment } from '../models/types';

interface UserSession {
  phone: string;
  state: 'idle' | 'selecting_service' | 'selecting_date' | 'selecting_time' | 'confirming' | 'awaiting_name';
  selectedService?: string;
  selectedDate?: string;
  selectedTime?: string;
}

export class MessageHandler {
  private whatsapp: WhatsAppService;
  private scheduler: SchedulerService;
  private sessions: Map<string, UserSession>;
  private ownerPhone: string;
  private managerGroupJid: string | null = null;

  constructor(whatsapp: WhatsAppService, config: any) {
    this.whatsapp = whatsapp;
    this.scheduler = new SchedulerService({
      workingHourStart: config.workingHourStart || '09:00',
      workingHourEnd: config.workingHourEnd || '20:00',
      appointmentDuration: config.appointmentDuration || 60,
      lunchStart: config.lunchStart || '12:00',
      lunchEnd: config.lunchEnd || '13:00'
    });
    this.sessions = new Map();
    this.ownerPhone = config.ownerPhone || '';
  }

  setManagerGroup(jid: string) {
    this.managerGroupJid = jid;
  }

  // Normalize phone number for comparison (remove all non-digits)
  private normalizePhone(phone: string): string {
    return phone.replace(/[^0-9]/g, '');
  }

  async handleMessage(message: WAMessage): Promise<void> {
    const content = await this.whatsapp.getMessageContent(message);
    const senderPhone = await this.whatsapp.getSenderPhone(message);
    const groupJid = await this.whatsapp.getGroupJid(message);
    const isGroupMessage = !!groupJid;
    const senderJid = message.key.remoteJid || '';

    // Debug log
    console.log(`Msg: "${content}" | from: ${senderPhone} | group: ${groupJid || 'nenhum'}`);

    // Ignore status broadcasts
    if (senderPhone === 'status') return;

    // Normalize phones for comparison
    const normalizedSender = this.normalizePhone(senderPhone);
    const normalizedOwner = this.normalizePhone(this.ownerPhone);
    const isOwner = normalizedSender === normalizedOwner;

    // Check if owner wants to install this group as manager
    if (isGroupMessage && content?.trim().toLowerCase() === '!instalar' && isOwner) {
      this.managerGroupJid = groupJid;
      // Persist to database
      setConfig('manager_group_jid', groupJid);
      await this.whatsapp.sendMessage(senderJid,
        `✅ *Grupo de Gerenciamento Configurado!*\n\n` +
        `Este grupo agora é o painel de controle da sua barbearia.\n\n` +
        `📅 *COMANDOS:*\n` +
        `• *hoje* - Agendamentos de hoje\n` +
        `• *amanhã* - Agendamentos de amanhã\n` +
        `• *semana* - Agenda da semana\n` +
        `• *finanças* - Resumo financeiro\n` +
        `• *clientes* - Lista de clientes\n` +
        `• *menu* - Ver este menu\n\n` +
        `Gerencie sua barbearia diretamente pelo WhatsApp! 💈`
      );
      console.log(`✅ Grupo de gerenciamento definido e salvo: ${groupJid}`);
      return;
    }

    // Check if it's a command for the manager group
    if (isGroupMessage && groupJid === this.managerGroupJid) {
      await this.handleManagerCommand(content?.trim() || '', senderPhone, senderJid);
      return;
    }

    const command = content?.trim().toLowerCase() || '';

    // Handle regular customer messages
    await this.handleCustomerMessage(command, senderPhone, senderJid, content || '');
  }

  private async handleCustomerMessage(command: string, phone: string, senderJid: string, originalContent: string): Promise<void> {
    // Initialize session if not exists
    if (!this.sessions.has(phone)) {
      this.sessions.set(phone, { phone, state: 'idle' });
    }
    const session = this.sessions.get(phone)!;

    // First, handle scheduling flow if in progress (before other checks)
    if (session.state !== 'idle') {
      await this.handleSchedulingFlow(session, command, senderJid, originalContent);
      return;
    }

    // Check for cancel command (only when idle)
    if (command === 'cancelar' || command === 'cancel' || command === '0') {
      this.sessions.delete(phone);
      await this.whatsapp.sendMessage(senderJid, '❌ Agendamento cancelado. Quando quiser agendar, é só mandar *menu*!');
      return;
    }

    // Main menu - only for explicit "menu" or greeting commands
    if (command === 'menu' || command === 'oi' || command === 'olá' || command === 'ola' || command === 'início' || command === 'inicio') {
      await this.sendMainMenu(senderJid);
      return;
    }

    // Start scheduling flow with "1" or "agendar"
    if (command === '1' || command === 'agendar') {
      session.state = 'selecting_service';
      await this.sendServicesList(senderJid);
      return;
    }

    // Show services with "2" or "servicos"
    if (command === '2' || command === 'serviços' || command === 'servicos' || command === 'servico') {
      await this.sendServices(senderJid);
      return;
    }

    // Show my appointments with "3" or "meus horarios"
    if (command === '3' || command === 'meus horários' || command === 'meus horarios') {
      await this.sendMyAppointments(phone, senderJid);
      return;
    }

    // Help
    if (command === 'ajuda' || command === 'help' || command === '?') {
      await this.sendHelp(senderJid);
      return;
    }

    // Default response
    await this.sendMainMenu(senderJid);
  }

  private async handleManagerCommand(command: string, senderPhone: string, senderJid: string): Promise<void> {
    // Only owner can use manager commands
    if (senderPhone !== this.ownerPhone) {
      return;
    }

    if (command === 'hoje') {
      await this.sendTodayAppointments(senderJid);
    } else if (command === 'amanhã' || command === 'amanha') {
      await this.sendTomorrowAppointments(senderJid);
    } else if (command === 'semana') {
      await this.sendWeekAppointments(senderJid);
    } else if (command === 'finanças' || command === 'financas') {
      await this.sendFinancialSummary(senderJid);
    } else if (command === 'clientes') {
      await this.sendClientList(senderJid);
    } else if (command === 'agendamentos') {
      await this.sendAllAppointments(senderJid);
    } else if (command.startsWith('confirmar ')) {
      const id = command.split(' ')[1];
      await this.confirmAppointment(id, senderJid);
    } else if (command.startsWith('cancelar ')) {
      const id = command.split(' ')[1];
      await this.cancelAppointment(id, senderJid);
    } else if (command === 'menu') {
      await this.sendManagerMenu(senderJid);
    } else {
      await this.sendManagerMenu(senderJid);
    }
  }

  private async sendMainMenu(jid: string): Promise<void> {
    const menu = `🏠 *BARBER SHOP*

Olá! Como posso ajudar?

*1* - 💇 Agendar horário
*2* - 📋 Ver serviços e preços
*3* - 📅 Meus agendamentos
*0* - Cancelar

Digite o número da opção ou escreva o que precisa!`;

    await this.whatsapp.sendMessage(jid, menu);
  }

  private async sendManagerMenu(jid: string): Promise<void> {
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

  private async sendHelp(jid: string): Promise<void> {
    const help = `📖 *COMANDOS DISPONÍVEIS*

• *menu* - Voltar ao menu principal
• *serviços* - Ver serviços disponíveis
• *agendar* - Iniciar agendamento
• *meus horários* - Ver seus agendamentos
• *cancelar* - Cancelar agendamento em andamento

💬 Para agendar, basta digitar *agendar* ou *1*`;

    await this.whatsapp.sendMessage(jid, help);
  }

  private async sendServices(jid: string): Promise<void> {
    const services = getAllServices();
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

  private async sendMyAppointments(phone: string, jid: string): Promise<void> {
    const client = getClientByPhone(phone);
    if (!client) {
      await this.whatsapp.sendMessage(jid, '📅 Você ainda não tem agendamentos. Para agendar, digite *agendar* ou *1*');
      return;
    }

    const today = this.scheduler.getTodayDate();
    const appointments = getAppointmentsByDate(today)
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

  private async sendTodayAppointments(jid: string): Promise<void> {
    const today = this.scheduler.getTodayDate();
    const appointments = getAppointmentsByDate(today)
      .filter(a => a.status !== 'cancelled')
      .sort((a, b) => a.time.localeCompare(b.time));

    await this.sendAppointmentsList(jid, 'AGENDA DE HOJE', appointments);
  }

  private async sendTomorrowAppointments(jid: string): Promise<void> {
    const tomorrow = this.scheduler.getNext7Days()[1];
    const appointments = getAppointmentsByDate(tomorrow)
      .filter(a => a.status !== 'cancelled')
      .sort((a, b) => a.time.localeCompare(b.time));

    await this.sendAppointmentsList(jid, 'AGENDA DE AMANHÃ', appointments);
  }

  private async sendWeekAppointments(jid: string): Promise<void> {
    const dates = this.scheduler.getNext7Days();
    let weekText = `📅 *AGENDA DA SEMANA*\n\n`;

    for (const date of dates) {
      const appointments = getAppointmentsByDate(date)
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

  private async sendAllAppointments(jid: string): Promise<void> {
    const appointments = getUpcomingAppointments();
    await this.sendAppointmentsList(jid, 'TODOS OS AGENDAMENTOS', appointments);
  }

  private async sendAppointmentsList(jid: string, title: string, appointments: Appointment[]): Promise<void> {
    let appointmentsText = `📅 *${title}*\n\n`;

    if (appointments.length === 0) {
      appointmentsText += 'Nenhum agendamento encontrado.';
    } else {
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

  private async sendFinancialSummary(jid: string): Promise<void> {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const monthSummary = getFinancialSummary(startOfMonth, today);

    const summaryText = `💰 *RESUMO FINANCEIRO*\n\n*Este Mês:*\n`;
    const summaryText2 = `💵 Entradas: R$ ${monthSummary.income.toFixed(2)}\n`;
    const summaryText3 = `💸 Saídas: R$ ${monthSummary.expense.toFixed(2)}\n`;
    const summaryText4 = `📊 Saldo: R$ ${monthSummary.balance.toFixed(2)}\n\n`;
    const summaryText5 = `Para ver o fluxo completo, digite *extrato*`;

    await this.whatsapp.sendMessage(jid, summaryText + summaryText2 + summaryText3 + summaryText4 + summaryText5);
  }

  private async sendClientList(jid: string): Promise<void> {
    const clients = getAllClients();
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

  private async confirmAppointment(id: string, jid: string): Promise<void> {
    const fullId = `apt_${id}`;
    const appointment = getAppointmentById(fullId);

    if (!appointment) {
      await this.whatsapp.sendMessage(jid, `❌ Agendamento não encontrado: ${id}`);
      return;
    }

    updateAppointmentStatus(fullId, 'confirmed');

    // Notify customer
    await this.whatsapp.sendMessage(`${appointment.clientPhone}@s.whatsapp.net`,
      `✅ *Confirmação de Agendamento*\n\n` +
      `Seu horário foi confirmado!\n\n` +
      `📅 ${this.scheduler.formatDateTime(appointment.date, appointment.time)}\n` +
      `💇 ${appointment.serviceName}\n` +
      `💰 R$ ${appointment.price.toFixed(2)}\n\n` +
      `Nos vemos em breve! 💈`);

    // Notify manager group
    await this.whatsapp.sendMessage(jid, `✅ Agendamento confirmado: ${appointment.clientName} - ${this.scheduler.formatDateTime(appointment.date, appointment.time)}`);
  }

  private async cancelAppointment(id: string, jid: string): Promise<void> {
    const fullId = `apt_${id}`;
    const appointment = getAppointmentById(fullId);

    if (!appointment) {
      await this.whatsapp.sendMessage(jid, `❌ Agendamento não encontrado: ${id}`);
      return;
    }

    updateAppointmentStatus(fullId, 'cancelled');

    // Notify customer
    await this.whatsapp.sendMessage(`${appointment.clientPhone}@s.whatsapp.net`,
      `❌ *Agendamento Cancelado*\n\n` +
      `Seu horário foi cancelado.\n\n` +
      `📅 ${this.scheduler.formatDateTime(appointment.date, appointment.time)}\n` +
      `💇 ${appointment.serviceName}\n\n` +
      `Para remarcar, digite *agendar*!`);

    await this.whatsapp.sendMessage(jid, `❌ Agendamento cancelado: ${appointment.clientName}`);
  }

  private async handleSchedulingFlow(session: UserSession, command: string, jid: string, originalContent: string): Promise<void> {
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

  private async handleServiceSelection(session: UserSession, command: string, jid: string): Promise<void> {
    const services = getAllServices();
    const serviceIndex = parseInt(command) - 1;

    // Check if command is a valid number
    if (isNaN(serviceIndex)) {
      await this.whatsapp.sendMessage(jid, '❌ Por favor, digite o *número* do serviço desejado:\n');
      await this.sendServicesList(jid);
      return;
    }

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
    } else {
      await this.whatsapp.sendMessage(jid, '❌ Opção inválida. Digite o número do serviço desejado:');
      await this.sendServicesList(jid);
    }
  }

  private async sendServicesList(jid: string): Promise<void> {
    const services = getAllServices();
    let text = `💇 *SERVIÇOS*\n\n`;

    services.forEach((service, i) => {
      text += `*${i + 1}* - ${service.name} (R$ ${service.price.toFixed(2)})\n`;
    });
    text += `\n*0* - Cancelar`;

    await this.whatsapp.sendMessage(jid, text);
  }

  private async handleDateSelection(session: UserSession, command: string, jid: string): Promise<void> {
    const dates = this.scheduler.getNext7Days();
    const dateIndex = parseInt(command) - 1;

    if (dateIndex >= 0 && dateIndex < dates.length) {
      session.selectedDate = dates[dateIndex];
      session.state = 'selecting_time';

      const service = getServiceById(session.selectedService!);
      const times = await this.scheduler.getAvailableSlotsFormatted(session.selectedDate, session.selectedService!);

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
    } else if (command === '0') {
      this.sessions.delete(session.phone);
      await this.whatsapp.sendMessage(jid, '❌ Agendamento cancelado.');
      return;
    } else {
      await this.whatsapp.sendMessage(jid, '❌ Opção inválida. Digite o número da data:');
    }
  }

  private async handleTimeSelection(session: UserSession, command: string, jid: string): Promise<void> {
    const dates = this.scheduler.getNext7Days();
    const dateIndex = parseInt(command) - 1;

    // Check if user is trying to change date
    if (dateIndex >= 0 && dateIndex < dates.length) {
      session.selectedDate = dates[dateIndex];
      session.state = 'selecting_time';

      const service = getServiceById(session.selectedService!);
      const times = await this.scheduler.getAvailableSlotsFormatted(session.selectedDate, session.selectedService!);

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

    const times = await this.scheduler.getAvailableSlotsFormatted(session.selectedDate!, session.selectedService!);
    const timeIndex = parseInt(command) - 1;

    if (timeIndex >= 0 && timeIndex < times.length) {
      session.selectedTime = times[timeIndex];
      session.state = 'awaiting_name';

      // Check if client already exists
      const existingClient = getClientByPhone(session.phone);
      if (existingClient) {
        session.state = 'confirming';
        await this.showConfirmation(session, jid, existingClient.name);
      } else {
        await this.whatsapp.sendMessage(jid, `👤 *QUAL É O SEU NOME?*\n\nPor favor, digite seu nome completo:`);
      }
    } else if (command === '0') {
      this.sessions.delete(session.phone);
      await this.whatsapp.sendMessage(jid, '❌ Agendamento cancelado.');
      return;
    } else {
      await this.whatsapp.sendMessage(jid, '❌ Opção inválida. Digite o número do horário:');
    }
  }

  private async handleNameInput(session: UserSession, name: string, jid: string): Promise<void> {
    if (!name || name.length < 2) {
      await this.whatsapp.sendMessage(jid, '❌ Nome inválido. Por favor, digite seu nome completo:');
      return;
    }

    // Update session with name and move to confirmation
    session.state = 'confirming';
    await this.showConfirmation(session, jid, name);
  }

  private async showConfirmation(session: UserSession, jid: string, clientName: string): Promise<void> {
    const service = getServiceById(session.selectedService!);
    const endTime = this.scheduler.calculateEndTime(session.selectedTime!, service!.duration);

    let text = `✅ *CONFIRMAR AGENDAMENTO*\n\n`;
    text += `💇 *Serviço:* ${service!.name}\n`;
    text += `📅 *Data:* ${this.scheduler.formatDate(session.selectedDate!)}\n`;
    text += `🕐 *Horário:* ${this.scheduler.formatTime(session.selectedTime!)} às ${this.scheduler.formatTime(endTime)}\n`;
    text += `💰 *Valor:* R$ ${service!.price.toFixed(2)}\n`;
    text += `👤 *Cliente:* ${clientName}\n\n`;
    text += `Digite *confirmar* para confirmar ou *cancelar* para cancelar.`;

    await this.whatsapp.sendMessage(jid, text);
  }

  private async handleConfirmation(session: UserSession, command: string, jid: string): Promise<void> {
    if (command === 'confirmar' || command === 'confirmar' || command === 'sim' || command === 's') {
      const service = getServiceById(session.selectedService!);
      const clientPhone = session.phone;

      // Get or create client
      let client = getClientByPhone(clientPhone);
      if (!client) {
        client = {
          id: uuidv4(),
          phone: clientPhone,
          name: 'Cliente', // Default name
          totalVisits: 0,
          createdAt: new Date()
        };
        insertClient(client);
      }

      const endTime = this.scheduler.calculateEndTime(session.selectedTime!, service!.duration);

      const appointment: Appointment = {
        id: uuidv4(),
        clientId: client.id,
        clientPhone,
        clientName: client.name,
        serviceId: service!.id,
        serviceName: service!.name,
        date: session.selectedDate!,
        time: session.selectedTime!,
        endTime,
        status: 'pending',
        price: service!.price,
        createdAt: new Date()
      };

      insertAppointment(appointment);

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
        await this.whatsapp.sendMessage(this.managerGroupJid,
          `🔔 *NOVO AGENDAMENTO*\n\n` +
          `👤 ${client.name}\n` +
          `💇 ${appointment.serviceName}\n` +
          `📅 ${this.scheduler.formatDateTime(appointment.date, appointment.time)}\n` +
          `💰 R$ ${appointment.price.toFixed(2)}\n\n` +
          `Para confirmar: confirmar ${appointment.id.slice(0, 8)}`);
      }

      this.sessions.delete(session.phone);
    } else if (command === 'cancelar' || command === 'cancelar') {
      this.sessions.delete(session.phone);
      await this.whatsapp.sendMessage(jid, '❌ Agendamento cancelado.');
    } else {
      await this.whatsapp.sendMessage(jid, '❌ Digite *confirmar* para confirmar ou *cancelar* para cancelar.');
    }
  }
}
