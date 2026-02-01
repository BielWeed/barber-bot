"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDatabase = initDatabase;
exports.saveDatabase = saveDatabase;
exports.getDatabase = getDatabase;
exports.insertClient = insertClient;
exports.getClientByPhone = getClientByPhone;
exports.getAllClients = getAllClients;
exports.getAllServices = getAllServices;
exports.getServiceById = getServiceById;
exports.insertAppointment = insertAppointment;
exports.getAppointmentById = getAppointmentById;
exports.getAppointmentsByDate = getAppointmentsByDate;
exports.getUpcomingAppointments = getUpcomingAppointments;
exports.updateAppointmentStatus = updateAppointmentStatus;
exports.insertFinancialRecord = insertFinancialRecord;
exports.getFinancialRecords = getFinancialRecords;
exports.getFinancialSummary = getFinancialSummary;
exports.getConfig = getConfig;
exports.setConfig = setConfig;
const sql_js_1 = __importDefault(require("sql.js"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const DB_PATH = process.env.DATABASE_PATH || './data/barber.db';
let db = null;
async function initDatabase() {
    const SQL = await (0, sql_js_1.default)();
    // Create data directory if not exists
    const dataDir = path_1.default.dirname(DB_PATH);
    if (!fs_1.default.existsSync(dataDir)) {
        fs_1.default.mkdirSync(dataDir, { recursive: true });
    }
    // Load existing database or create new one
    if (fs_1.default.existsSync(DB_PATH)) {
        const fileBuffer = fs_1.default.readFileSync(DB_PATH);
        db = new SQL.Database(fileBuffer);
    }
    else {
        db = new SQL.Database();
    }
    // Create tables
    db.run(`
    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      phone TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      last_visit TEXT,
      total_visits INTEGER DEFAULT 0
    )
  `);
    db.run(`
    CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      duration INTEGER NOT NULL,
      description TEXT,
      active INTEGER DEFAULT 1
    )
  `);
    db.run(`
    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      client_phone TEXT NOT NULL,
      client_name TEXT NOT NULL,
      service_id TEXT NOT NULL,
      service_name TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      price REAL NOT NULL,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      confirmed_at TEXT,
      FOREIGN KEY (client_id) REFERENCES clients(id)
    )
  `);
    db.run(`
    CREATE TABLE IF NOT EXISTS financial_records (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT,
      date TEXT DEFAULT CURRENT_TIMESTAMP,
      appointment_id TEXT
    )
  `);
    db.run(`
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);
    // Insert default services if empty
    const servicesCount = db.exec('SELECT COUNT(*) as count FROM services');
    if (servicesCount[0]?.values[0][0] === 0) {
        insertDefaultServices();
    }
    saveDatabase();
    return db;
}
function insertDefaultServices() {
    if (!db)
        return;
    const services = [
        { id: 'svc_1', name: 'Corte Masculino', price: 50, duration: 45, description: 'Corte de cabelo masculino tradicional' },
        { id: 'svc_2', name: 'Barba', price: 40, duration: 30, description: 'Modelagem e aparo de barba' },
        { id: 'svc_3', name: 'Corte + Barba', price: 80, duration: 60, description: 'Combo corte masculino e barba' },
        { id: 'svc_4', name: 'Navalhado', price: 35, duration: 25, description: 'Navalhado completo' },
        { id: 'svc_5', name: 'Coloração', price: 70, duration: 90, description: 'Coloração de cabelo' },
        { id: 'svc_6', name: 'Hidratação', price: 45, duration: 40, description: 'Tratamento hidratanção profunda' },
    ];
    for (const svc of services) {
        db.run('INSERT INTO services (id, name, price, duration, description) VALUES (?, ?, ?, ?, ?)', [svc.id, svc.name, svc.price, svc.duration, svc.description]);
    }
}
function saveDatabase() {
    if (db) {
        const data = db.export();
        const buffer = Buffer.from(data);
        fs_1.default.writeFileSync(DB_PATH, buffer);
    }
}
function getDatabase() {
    return db;
}
// Client operations
function insertClient(client) {
    db?.run('INSERT OR REPLACE INTO clients (id, phone, name, notes, created_at, last_visit, total_visits) VALUES (?, ?, ?, ?, ?, ?, ?)', [client.id, client.phone, client.name, client.notes || null, client.createdAt.toISOString(), client.lastVisit?.toISOString() || null, client.totalVisits]);
    saveDatabase();
}
function getClientByPhone(phone) {
    const stmt = db?.prepare('SELECT * FROM clients WHERE phone = ?');
    stmt?.get([phone]);
    const row = stmt?.getAsObject();
    stmt?.free();
    return row ? row : null;
}
function getAllClients() {
    const stmt = db?.prepare('SELECT * FROM clients ORDER BY name');
    const results = [];
    while (stmt?.step()) {
        results.push(stmt.getAsObject());
    }
    stmt?.free();
    return results;
}
// Service operations
function getAllServices() {
    const stmt = db?.prepare('SELECT * FROM services WHERE active = 1 ORDER BY name');
    const results = [];
    while (stmt?.step()) {
        results.push(stmt.getAsObject());
    }
    stmt?.free();
    return results;
}
function getServiceById(id) {
    const stmt = db?.prepare('SELECT * FROM services WHERE id = ?');
    stmt?.get([id]);
    const row = stmt?.getAsObject();
    stmt?.free();
    return row ? row : null;
}
// Appointment operations
function insertAppointment(appointment) {
    db?.run('INSERT INTO appointments (id, client_id, client_phone, client_name, service_id, service_name, date, time, end_time, status, price, notes, created_at, confirmed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [appointment.id, appointment.clientId, appointment.clientPhone, appointment.clientName, appointment.serviceId, appointment.serviceName, appointment.date, appointment.time, appointment.endTime, appointment.status, appointment.price, appointment.notes || null, appointment.createdAt.toISOString(), appointment.confirmedAt?.toISOString() || null]);
    saveDatabase();
}
function getAppointmentById(id) {
    if (!id)
        return null;
    const stmt = db?.prepare('SELECT * FROM appointments WHERE id = ?');
    stmt?.bind([id]);
    const row = stmt?.getAsObject();
    stmt?.free();
    return row ? row : null;
}
function getAppointmentsByDate(date) {
    if (!date)
        return [];
    const stmt = db?.prepare('SELECT * FROM appointments WHERE date = ? ORDER BY time');
    stmt?.bind([date]);
    const results = [];
    while (stmt?.step()) {
        results.push(stmt.getAsObject());
    }
    stmt?.free();
    return results;
}
function getUpcomingAppointments() {
    const stmt = db?.prepare("SELECT * FROM appointments WHERE date >= date('now') AND status IN ('pending', 'confirmed') ORDER BY date, time");
    const results = [];
    while (stmt?.step()) {
        results.push(stmt.getAsObject());
    }
    stmt?.free();
    return results;
}
function updateAppointmentStatus(id, status) {
    const confirmedAt = status === 'confirmed' ? new Date().toISOString() : null;
    db?.run('UPDATE appointments SET status = ?, confirmed_at = ? WHERE id = ?', [status, confirmedAt, id]);
    saveDatabase();
}
// Financial operations
function insertFinancialRecord(record) {
    db?.run('INSERT INTO financial_records (id, type, category, amount, description, date, appointment_id) VALUES (?, ?, ?, ?, ?, ?, ?)', [record.id, record.type, record.category, record.amount, record.description, record.date.toISOString(), record.appointmentId || null]);
    saveDatabase();
}
function getFinancialRecords(startDate, endDate) {
    let query = 'SELECT * FROM financial_records';
    const params = [];
    if (startDate && endDate) {
        query += ' WHERE date BETWEEN ? AND ?';
        params.push(startDate.toISOString(), endDate.toISOString());
    }
    else if (startDate) {
        query += ' WHERE date >= ?';
        params.push(startDate.toISOString());
    }
    else if (endDate) {
        query += ' WHERE date <= ?';
        params.push(endDate.toISOString());
    }
    query += ' ORDER BY date DESC';
    const stmt = db?.prepare(query);
    if (params.length > 0) {
        stmt?.bind(params);
    }
    const results = [];
    while (stmt?.step()) {
        results.push(stmt.getAsObject());
    }
    stmt?.free();
    return results;
}
function getFinancialSummary(startDate, endDate) {
    const records = getFinancialRecords(startDate, endDate);
    const income = records.filter(r => r.type === 'income').reduce((sum, r) => sum + r.amount, 0);
    const expense = records.filter(r => r.type === 'expense').reduce((sum, r) => sum + r.amount, 0);
    return { income, expense, balance: income - expense };
}
// Config operations
function getConfig(key) {
    if (!key)
        return null;
    const stmt = db?.prepare('SELECT value FROM config WHERE key = ?');
    stmt?.bind([key]);
    const row = stmt?.getAsObject();
    stmt?.free();
    return row?.value || null;
}
function setConfig(key, value) {
    db?.run('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)', [key, value]);
    saveDatabase();
}
//# sourceMappingURL=database.js.map