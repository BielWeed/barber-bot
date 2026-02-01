import 'dotenv/config';
import { createInterface } from 'readline';
import { WhatsAppService } from './services/whatsapp';
import { MessageHandler } from './handlers/messageHandler';
import { FinancialHandler } from './handlers/financialHandler';
import { initDatabase } from './services/database';
import { WAMessage } from '@whiskeysockets/baileys';

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

async function main() {
  console.log('🏠 Inicializando Barber Bot...');

  // Initialize database
  await initDatabase();
  console.log('✅ Banco de dados inicializado');

  // Load configuration
  const config = {
    ownerPhone: process.env.OWNER_PHONE || '',
    workingHourStart: process.env.WORKING_HOUR_START || '09:00',
    workingHourEnd: process.env.WORKING_HOUR_END || '20:00',
    appointmentDuration: parseInt(process.env.APPOINTMENT_DURATION || '60'),
    lunchStart: process.env.LUNCH_START || '12:00',
    lunchEnd: process.env.LUNCH_END || '13:00',
    botName: process.env.BOT_NAME || 'BarberBot'
  };

  // Initialize WhatsApp service
  const whatsapp = new WhatsAppService(config.ownerPhone);

  // Initialize handlers
  const messageHandler = new MessageHandler(whatsapp, config);
  const financialHandler = new FinancialHandler(whatsapp, config.ownerPhone);

  // Event listeners
  whatsapp.on('qr', async (qr: string) => {
    console.log('\n📱 Escaneie o QR Code abaixo para conectar ao WhatsApp:\n');

    // Generate QR code directly in terminal
    try {
      const QRCode = await import('qrcode');
      const qrTerminal = await QRCode.toString(qr, { type: 'terminal', small: true });
      console.log(qrTerminal);
      console.log('\n💡 Abra o WhatsApp > Dispositivos conectados > Conectar dispositivo\n');
    } catch (error) {
      console.log('❌ Erro ao gerar QR Code:', error);
      console.log('QR Code raw:', qr);
    }
  });

  whatsapp.on('connected', async () => {
    console.log('✅ Conectado ao WhatsApp com sucesso!');
    console.log('🤖 Bot pronto para receber mensagens\n');

    // Create manager group if owner phone is set
    if (config.ownerPhone) {
      try {
        console.log('📱 Criando grupo de gerenciamento...');
        const botPhone = await whatsapp.getMyPhoneNumber();
        if (botPhone) {
          const group = await whatsapp.createGroup(
            `${config.botName} - Gerenciamento`,
            [`${config.ownerPhone}@s.whatsapp.net`, `${botPhone}@s.whatsapp.net`]
          );
          if (group) {
            messageHandler.setManagerGroup(group.groupJid);
            console.log(`✅ Grupo criado: ${group.groupJid}`);

            // Send welcome message to manager group
            await whatsapp.sendMessage(group.groupJid,
              `👋 *Bem-vindo ao ${config.botName}!*\n\n` +
              `Este é o grupo de gerenciamento da sua barbearia.\n\n` +
              `📅 *COMANDOS:*\n` +
              `• *hoje* - Agendamentos de hoje\n` +
              `• *amanhã* - Agendamentos de amanhã\n` +
              `• *semana* - Agenda da semana\n` +
              `• *finanças* - Relatório financeiro\n` +
              `• *clientes* - Lista de clientes\n` +
              `• *menu* - Ver este menu\n\n` +
              `Gerencie sua barbearia diretamente pelo WhatsApp! 💈`
            );
          } else {
            console.log('ℹ️ Não foi possível criar o grupo automaticamente.');
            console.log('   Para definir o grupo de gerenciamento:');
            console.log('   - Crie um grupo no WhatsApp e adicione o bot');
            console.log('   - Depois digite: setgroup <jid-do-grupo>');
          }
        }
      } catch (error) {
        console.log('ℹ️ Não foi possível criar grupo automaticamente.');
        console.log('   Para definir o grupo de gerenciamento manualmente:');
        console.log('   - Crie um grupo no WhatsApp e adicione o bot');
        console.log('   - Depois digite: setgroup <jid-do-grupo>');
      }
    }
  });

  whatsapp.on('reconnecting', () => {
    console.log('🔄 Reconectando ao WhatsApp...');
  });

  whatsapp.on('disconnected', () => {
    console.log('❌ Desconectado do WhatsApp');
  });

  whatsapp.on('message', async (message: WAMessage) => {
    try {
      await messageHandler.handleMessage(message);
    } catch (error) {
      console.error('Erro ao processar mensagem:', error);
    }
  });

  // Connect to WhatsApp
  await whatsapp.connect();

  // Keep the process running
  rl.on('line', async (line) => {
    const command = line.trim().toLowerCase();
    const parts = line.trim().split(/\s+/);
    const mainCmd = parts[0].toLowerCase();

    if (mainCmd === 'sair' || mainCmd === 'exit' || mainCmd === 'quit') {
      console.log('👋 Encerrando Barber Bot...');
      process.exit(0);
    } else if (mainCmd === 'status') {
      console.log(whatsapp.isReady() ? '🟢 Conectado' : '🔴 Desconectado');
    } else if (mainCmd === 'qr') {
      const qr = await whatsapp.getQRCode();
      if (qr) {
        console.log('QR Code disponível. Verifique a URL abaixo:');
        console.log(qr);
      } else {
        console.log('QR Code não disponível. Já está conectado.');
      }
    } else if (mainCmd === 'setgroup' && parts[1]) {
      // Set manager group JID
      const groupJid = parts[1];
      messageHandler.setManagerGroup(groupJid);
      console.log(`✅ Grupo de gerenciamento definido: ${groupJid}`);

      // Send welcome message to manager group
      await whatsapp.sendMessage(groupJid,
        `👋 *Bem-vindo ao ${config.botName}!*\n\n` +
        `Este é o grupo de gerenciamento da sua barbearia.\n\n` +
        `📅 *COMANDOS:*\n` +
        `• *hoje* - Agendamentos de hoje\n` +
        `• *amanhã* - Agendamentos de amanhã\n` +
        `• *semana* - Agenda da semana\n` +
        `• *finanças* - Relatório financeiro\n` +
        `• *clientes* - Lista de clientes\n` +
        `• *menu* - Ver este menu\n\n` +
        `Gerencie sua barbearia diretamente pelo WhatsApp! 💈`
      );
    } else if (mainCmd === 'getjid' && parts[1]) {
      // Get JID from phone number
      const phone = parts[1].replace(/[^0-9]/g, '');
      console.log(`JID para ${phone}: ${phone}@s.whatsapp.net`);
    } else {
      console.log('Comandos disponíveis:');
      console.log('  status - Verificar status de conexão');
      console.log('  qr - Gerar QR Code novamente');
      console.log('  setgroup <jid> - Definir grupo de gerenciamento');
      console.log('  getjid <phone> - Converter telefone para JID');
      console.log('  sair - Encerrar o bot');
    }
  });
}

main().catch(console.error);
