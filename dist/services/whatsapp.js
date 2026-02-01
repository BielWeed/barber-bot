"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppService = void 0;
const baileys_1 = require("@whiskeysockets/baileys");
const pino_1 = __importDefault(require("pino"));
const qrcode_1 = __importDefault(require("qrcode"));
const fs_1 = __importDefault(require("fs"));
const events_1 = require("events");
const logger = (0, pino_1.default)({ level: 'silent' });
const AUTH_DIR = './data/auth';
class WhatsAppService extends events_1.EventEmitter {
    sock = null;
    qrCodeData = null;
    isConnected = false;
    ownerPhone = '';
    constructor(ownerPhone) {
        super();
        this.ownerPhone = ownerPhone;
    }
    async connect() {
        const { version } = await (0, baileys_1.fetchLatestBaileysVersion)();
        // Ensure auth directory exists
        if (!fs_1.default.existsSync(AUTH_DIR)) {
            fs_1.default.mkdirSync(AUTH_DIR, { recursive: true });
        }
        const { state, saveCreds } = await (0, baileys_1.useMultiFileAuthState)(AUTH_DIR);
        this.sock = (0, baileys_1.makeWASocket)({
            version,
            logger,
            auth: state,
            printQRInTerminal: false,
            browser: ['BarberBot', 'Desktop', '1.0.0'],
            syncFullHistory: false,
        });
        // Handle connection events
        this.sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;
            if (qr) {
                this.qrCodeData = qr;
                this.emit('qr', qr);
            }
            if (connection === 'close') {
                const shouldReconnect = lastDisconnect?.error?.statusCode !== baileys_1.DisconnectReason.loggedOut;
                if (shouldReconnect) {
                    this.emit('reconnecting');
                    await this.connect();
                }
                else {
                    this.isConnected = false;
                    this.emit('disconnected');
                }
            }
            else if (connection === 'open') {
                this.isConnected = true;
                this.qrCodeData = null;
                this.emit('connected');
            }
        });
        this.sock.ev.on('creds.update', () => {
            saveCreds();
            this.emit('credsUpdated');
        });
        // Handle incoming messages
        this.sock.ev.on('messages.upsert', async (event) => {
            for (const message of event.messages) {
                if (message.key.fromMe)
                    continue;
                this.emit('message', message);
            }
        });
        // Handle group updates
        this.sock.ev.on('groups.update', (events) => {
            for (const event of events) {
                this.emit('groupUpdate', event);
            }
        });
        // Handle group participants update
        this.sock.ev.on('group-participants.update', (event) => {
            this.emit('groupParticipantsUpdate', event);
        });
    }
    async getQRCode() {
        if (this.qrCodeData) {
            return qrcode_1.default.toDataURL(this.qrCodeData);
        }
        return null;
    }
    async sendMessage(to, text) {
        if (!this.sock)
            return;
        await this.sock.sendMessage(to, { text });
    }
    async createGroup(name, participants) {
        if (!this.sock)
            return null;
        try {
            // Format participants correctly for group creation
            const formattedParticipants = participants.map(p => {
                // Ensure the phone number is in the correct format
                if (p.includes('@'))
                    return p;
                return `${p}@s.whatsapp.net`;
            });
            const group = await this.sock.groupCreate(name, formattedParticipants);
            return { groupJid: group.gid };
        }
        catch (error) {
            console.error('Error creating group:', error);
            return null;
        }
    }
    async addParticipant(groupJid, participantPhone) {
        if (!this.sock)
            return;
        await this.sock.groupParticipantsUpdate(groupJid, [participantPhone], 'add');
    }
    async removeParticipant(groupJid, participantPhone) {
        if (!this.sock)
            return;
        await this.sock.groupParticipantsUpdate(groupJid, [participantPhone], 'remove');
    }
    async getGroupInfo(groupJid) {
        if (!this.sock)
            return null;
        try {
            return await this.sock.groupMetadata(groupJid);
        }
        catch (error) {
            return null;
        }
    }
    async getGroupInviteLink(groupJid) {
        if (!this.sock)
            return null;
        try {
            const code = await this.sock.groupInviteCode(groupJid);
            return code || null;
        }
        catch (error) {
            return null;
        }
    }
    async getMyPhoneNumber() {
        if (!this.sock)
            return null;
        const user = this.sock.user;
        return user?.id?.split(':')[0] || null;
    }
    isReady() {
        return this.isConnected && this.sock !== null;
    }
    getSocket() {
        return this.sock;
    }
    async getMessageContent(message) {
        if (!message.message)
            return '';
        const content = message.message.conversation ||
            message.message.extendedTextMessage?.text ||
            message.message.imageMessage?.caption ||
            '';
        return content;
    }
    async getSenderPhone(message) {
        const key = message.key;
        const jid = key.remoteJid || '';
        // Extract phone number from jid (format: phone@s.whatsapp.net)
        const phone = jid.split('@')[0];
        return phone;
    }
    async getGroupJid(message) {
        const jid = message.key.remoteJid;
        if (jid && jid.endsWith('@g.us')) {
            return jid;
        }
        return null;
    }
    async isGroupAdmin(message) {
        if (!this.sock)
            return false;
        const groupJid = await this.getGroupJid(message);
        if (!groupJid)
            return false;
        try {
            const metadata = await this.sock.groupMetadata(groupJid);
            const sender = message.key.participant || message.key.remoteJid || '';
            const adminIds = metadata.participants
                .filter((p) => p.admin)
                .map((p) => p.id);
            return adminIds.includes(sender);
        }
        catch {
            return false;
        }
    }
}
exports.WhatsAppService = WhatsAppService;
//# sourceMappingURL=whatsapp.js.map