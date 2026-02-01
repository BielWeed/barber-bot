import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { Client, Service, Appointment, FinancialRecord } from '../models/types';

const DB_PATH = process.env.DATABASE_PATH || './data/barber.db';

let db: Database | null = null;

export async function initDatabase(): Promise<Database> {
  const SQL = await initSqlJs();

  // Create data directory if not exists
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Load existing database or create new one
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
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
  if (!db) return;

  const services = [
    { id: 'svc_1', name: 'Corte Masculino', price: 50, duration: 45, description: 'Corte de cabelo masculino tradicional' },
    { id: 'svc_2', name: 'Barba', price: 40, duration: 30, description: 'Modelagem e aparo de barba' },
    { id: 'svc_3', name: 'Corte + Barba', price: 80, duration: 60, description: 'Combo corte masculino e barba' },
    { id: 'svc_4', name: 'Navalhado', price: 35, duration: 25, description: 'Navalhado completo' },
    { id: 'svc_5', name: 'Coloração', price: 70, duration: 90, description: 'Coloração de cabelo' },
    { id: 'svc_6', name: 'Hidratação', price: 45, duration: 40, description: 'Tratamento hidratanção profunda' },
  ];

  for (const svc of services) {
    db!.run(
      'INSERT INTO services (id, name, price, duration, description) VALUES (?, ?, ?, ?, ?)',
      [svc.id, svc.name, svc.price, svc.duration, svc.description]
    );
  }
}

// Type normalization functions
function normalizeClientRow(row: Record<string, unknown>): Client {
  return {
    id: String(row.id || ''),
    phone: String(row.phone || ''),
    name: String(row.name || ''),
    notes: row.notes ? String(row.notes) : undefined,
    createdAt: row.created_at ? new Date(String(row.created_at)) : new Date(),
    lastVisit: row.last_visit ? new Date(String(row.last_visit)) : undefined,
    totalVisits: Number(row.total_visits) || 0
  };
}

function normalizeServiceRow(row: Record<string, unknown>): Service {
  return {
    id: String(row.id || ''),
    name: String(row.name || ''),
    price: Number(row.price) || 0,
    duration: Number(row.duration) || 30,
    description: row.description ? String(row.description) : undefined,
    active: Boolean(row.active)
  };
}

function normalizeAppointmentRow(row: Record<string, unknown>): Appointment {
  return {
    id: String(row.id || ''),
    clientId: String(row.client_id || ''),
    clientPhone: String(row.client_phone || ''),
    clientName: String(row.client_name || ''),
    serviceId: String(row.service_id || ''),
    serviceName: String(row.service_name || ''),
    date: String(row.date || ''),
    time: String(row.time || ''),
    endTime: String(row.end_time || ''),
    status: (row.status as Appointment['status']) || 'pending',
    price: Number(row.price) || 0,
    notes: row.notes ? String(row.notes) : undefined,
    createdAt: row.created_at ? new Date(String(row.created_at)) : new Date(),
    confirmedAt: row.confirmed_at ? new Date(String(row.confirmed_at)) : undefined
  };
}

function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

export function getDatabase(): Database | null {
  return db;
}

// Client operations
export function insertClient(client: Client) {
  db?.run(
    'INSERT OR REPLACE INTO clients (id, phone, name, notes, created_at, last_visit, total_visits) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [client.id, client.phone, client.name, client.notes || null, client.createdAt.toISOString(), client.lastVisit?.toISOString() || null, client.totalVisits]
  );
  saveDatabase();
}

export function getClientByPhone(phone: string): Client | null {
  if (!db || !phone) return null;
  const stmt = db.prepare('SELECT * FROM clients WHERE phone = ?');
  if (!stmt) return null;
  stmt.bind([phone]);
  const row = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  return row ? normalizeClientRow(row as Record<string, unknown>) : null;
}

export function getAllClients(): Client[] {
  if (!db) return [];
  const stmt = db.prepare('SELECT * FROM clients ORDER BY name');
  if (!stmt) return [];
  const results: Client[] = [];
  while (stmt.step()) {
    results.push(normalizeClientRow(stmt.getAsObject() as Record<string, unknown>));
  }
  stmt.free();
  return results;
}

// Service operations
export function getAllServices(): Service[] {
  if (!db) return [];
  const stmt = db.prepare('SELECT * FROM services WHERE active = 1 ORDER BY name');
  if (!stmt) return [];
  const results: Service[] = [];
  while (stmt.step()) {
    results.push(normalizeServiceRow(stmt.getAsObject() as Record<string, unknown>));
  }
  stmt.free();
  return results;
}

export function getServiceById(id: string): Service | null {
  if (!db || !id) return null;
  const stmt = db.prepare('SELECT * FROM services WHERE id = ?');
  if (!stmt) return null;
  stmt.bind([id]);
  const row = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  return row ? normalizeServiceRow(row as Record<string, unknown>) : null;
}

// Appointment operations
export function insertAppointment(appointment: Appointment) {
  db?.run(
    'INSERT INTO appointments (id, client_id, client_phone, client_name, service_id, service_name, date, time, end_time, status, price, notes, created_at, confirmed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [appointment.id, appointment.clientId, appointment.clientPhone, appointment.clientName, appointment.serviceId, appointment.serviceName, appointment.date, appointment.time, appointment.endTime, appointment.status, appointment.price, appointment.notes || null, appointment.createdAt.toISOString(), appointment.confirmedAt?.toISOString() || null]
  );
  saveDatabase();
}

export function getAppointmentById(id: string): Appointment | null {
  if (!db || !id) return null;
  const stmt = db.prepare('SELECT * FROM appointments WHERE id = ?');
  if (!stmt) return null;
  stmt.bind([id]);
  const row = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  return row ? normalizeAppointmentRow(row as Record<string, unknown>) : null;
}

export function getAppointmentsByDate(date: string): Appointment[] {
  if (!db || !date) return [];
  const stmt = db.prepare('SELECT * FROM appointments WHERE date = ? ORDER BY time');
  if (!stmt) return [];
  stmt.bind([date]);
  const results: Appointment[] = [];
  while (stmt.step()) {
    results.push(normalizeAppointmentRow(stmt.getAsObject() as Record<string, unknown>));
  }
  stmt.free();
  return results;
}

export function getUpcomingAppointments(): Appointment[] {
  if (!db) return [];
  const stmt = db.prepare("SELECT * FROM appointments WHERE date >= date('now') AND status IN ('pending', 'confirmed') ORDER BY date, time");
  if (!stmt) return [];
  const results: Appointment[] = [];
  while (stmt.step()) {
    results.push(normalizeAppointmentRow(stmt.getAsObject() as Record<string, unknown>));
  }
  stmt.free();
  return results;
}

export function updateAppointmentStatus(id: string, status: Appointment['status']) {
  const confirmedAt = status === 'confirmed' ? new Date().toISOString() : null;
  db?.run(
    'UPDATE appointments SET status = ?, confirmed_at = ? WHERE id = ?',
    [status, confirmedAt, id]
  );
  saveDatabase();
}

// Financial operations
export function insertFinancialRecord(record: FinancialRecord) {
  db?.run(
    'INSERT INTO financial_records (id, type, category, amount, description, date, appointment_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [record.id, record.type, record.category, record.amount, record.description, record.date.toISOString(), record.appointmentId || null]
  );
  saveDatabase();
}

export function getFinancialRecords(startDate?: Date, endDate?: Date): FinancialRecord[] {
  if (!db) return [];
  let query = 'SELECT * FROM financial_records';
  const params: string[] = [];

  if (startDate && endDate) {
    query += ' WHERE date BETWEEN ? AND ?';
    params.push(startDate.toISOString(), endDate.toISOString());
  } else if (startDate) {
    query += ' WHERE date >= ?';
    params.push(startDate.toISOString());
  } else if (endDate) {
    query += ' WHERE date <= ?';
    params.push(endDate.toISOString());
  }

  query += ' ORDER BY date DESC';

  const stmt = db.prepare(query);
  if (!stmt) return [];
  if (params.length > 0) {
    stmt.bind(params);
  }
  const results: FinancialRecord[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as Record<string, unknown>;
    results.push({
      id: String(row.id || ''),
      type: (row.type as FinancialRecord['type']) || 'income',
      category: String(row.category || ''),
      amount: Number(row.amount) || 0,
      description: row.description ? String(row.description) : undefined,
      date: row.date ? new Date(String(row.date)) : new Date(),
      appointmentId: row.appointment_id ? String(row.appointment_id) : undefined
    });
  }
  stmt.free();
  return results;
}

export function getFinancialSummary(startDate?: Date, endDate?: Date): { income: number; expense: number; balance: number } {
  const records = getFinancialRecords(startDate, endDate);
  const income = records.filter(r => r.type === 'income').reduce((sum, r) => sum + r.amount, 0);
  const expense = records.filter(r => r.type === 'expense').reduce((sum, r) => sum + r.amount, 0);
  return { income, expense, balance: income - expense };
}

// Config operations
export function getConfig(key: string): string | null {
  if (!db || !key) return null;
  const stmt = db.prepare('SELECT value FROM config WHERE key = ?');
  if (!stmt) return null;
  stmt.bind([key]);
  const row = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  return row ? String(row.value || '') : null;
}

export function setConfig(key: string, value: string) {
  if (!key || value === undefined || value === null) {
    console.log('setConfig: invalid key or value', { key, value });
    return;
  }
  db?.run(
    'INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)',
    [key, value]
  );
  saveDatabase();
}
