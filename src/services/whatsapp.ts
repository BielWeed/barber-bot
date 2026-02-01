import {
  useMultiFileAuthState,
  DisconnectReason,
  makeWASocket,
  WASocket,
  fetchLatestBaileysVersion,
  proto,
  WAMessage,
  GroupMetadata
} from '@whiskeysockets/baileys';
import P from 'pino';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';

const logger = P({ level: 'silent' });
const AUTH_DIR = './data/auth';

export class WhatsAppService extends EventEmitter {
  private sock: WASocket | null = null;
  private qrCodeData: string | null = null;
  private isConnected: boolean = false;
  private ownerPhone: string = '';

  constructor(ownerPhone: string) {
    super();
    this.ownerPhone = ownerPhone;
  }

  async connect(): Promise<void> {
    const { version } = await fetchLatestBaileysVersion();

    // Ensure auth directory exists
    if (!fs.existsSync(AUTH_DIR)) {
      fs.mkdirSync(AUTH_DIR, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

    this.sock = makeWASocket({
      version,
      logger,
      auth: state,
      printQRInTerminal: false,
      browser: ['BarberBot', 'Desktop', '1.0.0'],
      syncFullHistory: false,
    });

    // Handle connection events
    this.sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update as any;

      if (qr) {
        this.qrCodeData = qr;
        this.emit('qr', qr);
      }

      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect?.error as any)?.statusCode !== DisconnectReason.loggedOut;
        if (shouldReconnect) {
          this.emit('reconnecting');
          await this.connect();
        } else {
          this.isConnected = false;
          this.emit('disconnected');
        }
      } else if (connection === 'open') {
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
        if (message.key.fromMe) continue;
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

  async getQRCode(): Promise<string | null> {
    if (this.qrCodeData) {
      return QRCode.toDataURL(this.qrCodeData);
    }
    return null;
  }

  async sendMessage(to: string, text: string): Promise<void> {
    if (!this.sock) return;
    await this.sock.sendMessage(to, { text });
  }

  async createGroup(name: string, participants: string[]): Promise<{ groupJid: string } | null> {
    if (!this.sock) return null;
    try {
      // Format participants correctly for group creation
      const formattedParticipants = participants.map(p => {
        // Ensure the phone number is in the correct format
        if (p.includes('@')) return p;
        return `${p}@s.whatsapp.net`;
      });

      const group = await this.sock.groupCreate(name, formattedParticipants);
      return { groupJid: (group as any).gid };
    } catch (error) {
      console.error('Error creating group:', error);
      return null;
    }
  }

  async addParticipant(groupJid: string, participantPhone: string): Promise<void> {
    if (!this.sock) return;
    await this.sock.groupParticipantsUpdate(groupJid, [participantPhone], 'add');
  }

  async removeParticipant(groupJid: string, participantPhone: string): Promise<void> {
    if (!this.sock) return;
    await this.sock.groupParticipantsUpdate(groupJid, [participantPhone], 'remove');
  }

  async getGroupInfo(groupJid: string): Promise<GroupMetadata | null> {
    if (!this.sock) return null;
    try {
      return await this.sock.groupMetadata(groupJid);
    } catch (error) {
      return null;
    }
  }

  async getGroupInviteLink(groupJid: string): Promise<string | null> {
    if (!this.sock) return null;
    try {
      const code = await this.sock.groupInviteCode(groupJid);
      return code || null;
    } catch (error) {
      return null;
    }
  }

  async getMyPhoneNumber(): Promise<string | null> {
    if (!this.sock) return null;
    const user = this.sock.user;
    return user?.id?.split(':')[0] || null;
  }

  isReady(): boolean {
    return this.isConnected && this.sock !== null;
  }

  getSocket(): WASocket | null {
    return this.sock;
  }

  async getMessageContent(message: WAMessage): Promise<string> {
    if (!message.message) return '';
    const content = message.message.conversation ||
      (message.message as any).extendedTextMessage?.text ||
      (message.message as any).imageMessage?.caption ||
      '';
    return content;
  }

  async getSenderPhone(message: WAMessage): Promise<string> {
    const key = message.key;
    // For group messages, use participant instead of remoteJid
    const jid = message.key.participant || key.remoteJid || '';
    // Extract phone number from jid (format: phone@s.whatsapp.net)
    const phone = jid.split('@')[0];
    return phone;
  }

  async getGroupJid(message: WAMessage): Promise<string | null> {
    const jid = message.key.remoteJid;
    if (jid && jid.endsWith('@g.us')) {
      return jid;
    }
    // Also check for broadcast or other formats
    if (jid && (jid.endsWith('@broadcast') || jid.includes('@g.us'))) {
      return jid;
    }
    return null;
  }

  async isGroupAdmin(message: WAMessage): Promise<boolean> {
    if (!this.sock) return false;
    const groupJid = await this.getGroupJid(message);
    if (!groupJid) return false;

    try {
      const metadata = await this.sock.groupMetadata(groupJid);
      const sender = message.key.participant || message.key.remoteJid || '';
      const adminIds = metadata.participants
        .filter((p: any) => p.admin)
        .map((p: any) => p.id);
      return adminIds.includes(sender);
    } catch {
      return false;
    }
  }
}
