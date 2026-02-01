"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const readline_1 = require("readline");
const whatsapp_1 = require("./services/whatsapp");
const messageHandler_1 = require("./handlers/messageHandler");
const financialHandler_1 = require("./handlers/financialHandler");
const database_1 = require("./services/database");
const rl = (0, readline_1.createInterface)({
    input: process.stdin,
    output: process.stdout
});
async function main() {
    console.log('🏠 Inicializando Barber Bot...');
    // Initialize database
    await (0, database_1.initDatabase)();
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
    const whatsapp = new whatsapp_1.WhatsAppService(config.ownerPhone);
    // Initialize handlers
    const messageHandler = new messageHandler_1.MessageHandler(whatsapp, config);
    const financialHandler = new financialHandler_1.FinancialHandler(whatsapp, config.ownerPhone);
    // Event listeners
    whatsapp.on('qr', async (qr) => {
        console.log('\n📱 Escaneie o QR Code abaixo para conectar ao WhatsApp:\n');
        // Generate QR code directly in terminal
        try {
            const QRCode = await Promise.resolve().then(() => __importStar(require('qrcode')));
            const qrTerminal = await QRCode.toString(qr, { type: 'terminal', small: true });
            console.log(qrTerminal);
            console.log('\n💡 Abra o WhatsApp > Dispositivos conectados > Conectar dispositivo\n');
        }
        catch (error) {
            console.log('❌ Erro ao gerar QR Code:', error);
            console.log('QR Code raw:', qr);
        }
    });
    whatsapp.on('connected', async () => {
        console.log('✅ Conectado ao WhatsApp com sucesso!');
        console.log('🤖 Bot pronto para receber mensagens\n');
        // Check if manager group is saved in database
        const savedGroupJid = (0, database_1.getConfig)('manager_group_jid');
        if (savedGroupJid) {
            messageHandler.setManagerGroup(savedGroupJid);
            console.log(`✅ Grupo de gerenciamento restaurado: ${savedGroupJid}`);
            return;
        }
        // Create manager group if owner phone is set
        if (config.ownerPhone) {
            try {
                console.log('📱 Criando grupo de gerenciamento...');
                const botPhone = await whatsapp.getMyPhoneNumber();
                if (botPhone) {
                    const group = await whatsapp.createGroup(`${config.botName} - Gerenciamento`, [`${config.ownerPhone}@s.whatsapp.net`, `${botPhone}@s.whatsapp.net`]);
                    if (group) {
                        messageHandler.setManagerGroup(group.groupJid);
                        console.log(`✅ Grupo criado: ${group.groupJid}`);
                        // Send welcome message to manager group
                        await whatsapp.sendMessage(group.groupJid, `👋 *Bem-vindo ao ${config.botName}!*\n\n` +
                            `Este é o grupo de gerenciamento da sua barbearia.\n\n` +
                            `📅 *COMANDOS:*\n` +
                            `• *hoje* - Agendamentos de hoje\n` +
                            `• *amanhã* - Agendamentos de amanhã\n` +
                            `• *semana* - Agenda da semana\n` +
                            `• *finanças* - Relatório financeiro\n` +
                            `• *clientes* - Lista de clientes\n` +
                            `• *menu* - Ver este menu\n\n` +
                            `Gerencie sua barbearia diretamente pelo WhatsApp! 💈`);
                    }
                    else {
                        console.log('ℹ️ Não foi possível criar o grupo automaticamente.');
                        console.log('   Para definir o grupo de gerenciamento:');
                        console.log('   - Entre em um grupo e digite: !instalar');
                    }
                }
            }
            catch (error) {
                console.log('ℹ️ Não foi possível criar grupo automaticamente.');
                console.log('   Para definir o grupo de gerenciamento:');
                console.log('   - Entre em um grupo e digite: !instalar');
            }
        }
    });
    whatsapp.on('reconnecting', () => {
        console.log('🔄 Reconectando ao WhatsApp...');
    });
    whatsapp.on('disconnected', () => {
        console.log('❌ Desconectado do WhatsApp');
    });
    whatsapp.on('message', async (message) => {
        try {
            await messageHandler.handleMessage(message);
        }
        catch (error) {
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
        }
        else if (mainCmd === 'status') {
            console.log(whatsapp.isReady() ? '🟢 Conectado' : '🔴 Desconectado');
        }
        else if (mainCmd === 'qr') {
            const qr = await whatsapp.getQRCode();
            if (qr) {
                console.log('QR Code disponível. Verifique a URL abaixo:');
                console.log(qr);
            }
            else {
                console.log('QR Code não disponível. Já está conectado.');
            }
        }
        else if (mainCmd === 'setgroup' && parts[1]) {
            // Set manager group JID
            const groupJid = parts[1];
            messageHandler.setManagerGroup(groupJid);
            console.log(`✅ Grupo de gerenciamento definido: ${groupJid}`);
            // Send welcome message to manager group
            await whatsapp.sendMessage(groupJid, `👋 *Bem-vindo ao ${config.botName}!*\n\n` +
                `Este é o grupo de gerenciamento da sua barbearia.\n\n` +
                `📅 *COMANDOS:*\n` +
                `• *hoje* - Agendamentos de hoje\n` +
                `• *amanhã* - Agendamentos de amanhã\n` +
                `• *semana* - Agenda da semana\n` +
                `• *finanças* - Relatório financeiro\n` +
                `• *clientes* - Lista de clientes\n` +
                `• *menu* - Ver este menu\n\n` +
                `Gerencie sua barbearia diretamente pelo WhatsApp! 💈`);
        }
        else if (mainCmd === 'getjid' && parts[1]) {
            // Get JID from phone number
            const phone = parts[1].replace(/[^0-9]/g, '');
            console.log(`JID para ${phone}: ${phone}@s.whatsapp.net`);
        }
        else {
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
//# sourceMappingURL=index.js.map