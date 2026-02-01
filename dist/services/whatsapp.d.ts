import { WASocket, WAMessage, GroupMetadata } from '@whiskeysockets/baileys';
import { EventEmitter } from 'events';
export declare class WhatsAppService extends EventEmitter {
    private sock;
    private qrCodeData;
    private isConnected;
    private ownerPhone;
    constructor(ownerPhone: string);
    connect(): Promise<void>;
    getQRCode(): Promise<string | null>;
    sendMessage(to: string, text: string): Promise<void>;
    createGroup(name: string, participants: string[]): Promise<{
        groupJid: string;
    } | null>;
    addParticipant(groupJid: string, participantPhone: string): Promise<void>;
    removeParticipant(groupJid: string, participantPhone: string): Promise<void>;
    getGroupInfo(groupJid: string): Promise<GroupMetadata | null>;
    getGroupInviteLink(groupJid: string): Promise<string | null>;
    getMyPhoneNumber(): Promise<string | null>;
    isReady(): boolean;
    getSocket(): WASocket | null;
    getMessageContent(message: WAMessage): Promise<string>;
    getSenderPhone(message: WAMessage): Promise<string>;
    getGroupJid(message: WAMessage): Promise<string | null>;
    isGroupAdmin(message: WAMessage): Promise<boolean>;
}
//# sourceMappingURL=whatsapp.d.ts.map