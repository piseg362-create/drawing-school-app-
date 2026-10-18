import { PrismaClient } from '../../generated/prisma/index.js';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import Database from 'better-sqlite3';
import { AsyncLocalStorage } from 'async_hooks';
import path from 'path';
import * as electron from 'electron';

export const als = new AsyncLocalStorage();

export const MULTI_TENANT_MODELS = new Set([
  'PaymentTaken',
  'Attendance',
  'CalendarEvent',
  'Car',
  'SetupChecklist',
  'Instructor',
  'MaintenanceSchedule',
  'MaintenanceItem',
  'Package',
  'PaymentCycle',
  'Schedule',
  'SchoolSetUp',
  'Student',
  'MessageQueue',
  'WhatsAppToken',
  'StudentAttendance',
]);

function getDatabasePath() {
  if (process.env.DATABASE_PATH) {
    return process.env.DATABASE_PATH;
  }

  const electronApp = typeof electron === 'object' && electron !== null ? (electron.app || electron.default?.app) : null;
  if (electronApp && typeof electronApp.getPath === 'function') {
    const isProd = process.env.NODE_ENV === 'production' || electronApp.isPackaged;
    if (isProd) {
      return path.join(electronApp.getPath('userData'), 'dev.db');
    }
  }

  return path.resolve(process.cwd(), 'dev.db');
}

function autoMigrateDatabase(dbPath) {
  try {
    const db = new Database(dbPath);
    db.pragma('foreign_keys = OFF');

    // 1. Auto-heal WhatsAppToken columns
    const waCols = db.prepare("PRAGMA table_info('WhatsAppToken');").all().map(c => c.name);
    if (waCols.length > 0) {
      if (!waCols.includes('switchOffMode')) {
        console.log('[auto-migrate] Adding switchOffMode column to WhatsAppToken');
        db.exec("ALTER TABLE WhatsAppToken ADD COLUMN switchOffMode BOOLEAN DEFAULT 0;");
      }
      if (!waCols.includes('monthlyBudget')) {
        console.log('[auto-migrate] Adding monthlyBudget column to WhatsAppToken');
        db.exec("ALTER TABLE WhatsAppToken ADD COLUMN monthlyBudget REAL DEFAULT 150.0;");
      }
      if (!waCols.includes('utilityRate')) {
        console.log('[auto-migrate] Adding utilityRate column to WhatsAppToken');
        db.exec("ALTER TABLE WhatsAppToken ADD COLUMN utilityRate REAL DEFAULT 0.15;");
      }
      if (!waCols.includes('defaultLanguage')) {
        console.log('[auto-migrate] Adding defaultLanguage column to WhatsAppToken');
        db.exec("ALTER TABLE WhatsAppToken ADD COLUMN defaultLanguage TEXT DEFAULT 'en';");
      }
    }

    // 2. Auto-heal StudentAttendance table
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table';").all().map(t => t.name);
    if (!tables.includes('StudentAttendance')) {
      console.log('[auto-migrate] Creating StudentAttendance table');
      db.exec(`
        CREATE TABLE IF NOT EXISTS "StudentAttendance" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "studentId" TEXT NOT NULL,
          "date" DATETIME NOT NULL,
          "status" TEXT NOT NULL,
          "timeSlot" TEXT,
          "notes" TEXT,
          "markedBy" TEXT,
          "systemID" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL,
          CONSTRAINT "StudentAttendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        );
      `);
    }

    db.pragma('foreign_keys = ON');
    db.close();
  } catch (err) {
    console.error('[auto-migrate] Failed to auto-migrate database:', err);
  }
}

const prismaClientSingleton = () => {
  const dbPath = getDatabasePath();
  autoMigrateDatabase(dbPath);
  const adapter = new PrismaBetterSqlite3({
    url: `file:${dbPath}`
  });
  const baseClient = new PrismaClient({ adapter });

  return baseClient.$extends({
    query: {
      $allModels: {
        async findMany({ model, operation, args, query }) {
          if (MULTI_TENANT_MODELS.has(model)) {
            const systemId = als.getStore();
            if (systemId === '__BYPASS_TENANT__') {
              return query(args);
            }
            if (systemId) {
              if (model === 'WhatsAppToken') {
                args.where = {
                  ...args.where,
                  OR: [
                    { systemID: systemId },
                    { schoolId: systemId }
                  ]
                };
                const res = await query(args);
                if (res && res.length > 0) return res;
                return query({ ...args, where: {} });
              } else {
                args.where = { ...args.where, systemID: systemId };
              }
            } else {
              if (model === 'WhatsAppToken') {
                return query(args);
              }
              args.where = { ...args.where, systemID: '__UNAUTHENTICATED__' };
            }
          }
          return query(args);
        },
        async findFirst({ model, operation, args, query }) {
          if (MULTI_TENANT_MODELS.has(model)) {
            const systemId = als.getStore();
            if (systemId === '__BYPASS_TENANT__') {
              return query(args);
            }
            if (systemId) {
              if (model === 'WhatsAppToken') {
                args.where = {
                  ...args.where,
                  OR: [
                    { systemID: systemId },
                    { schoolId: systemId }
                  ]
                };
                const res = await query(args);
                if (res) return res;
                return query({ ...args, where: {} });
              } else {
                args.where = { ...args.where, systemID: systemId };
              }
            } else {
              if (model === 'WhatsAppToken') {
                return query(args);
              }
              args.where = { ...args.where, systemID: '__UNAUTHENTICATED__' };
            }
          }
          return query(args);
        },
        async findUnique({ model, operation, args, query }) {
          const item = await query(args);
          if (item && MULTI_TENANT_MODELS.has(model)) {
            const systemId = als.getStore();
            if (systemId === '__BYPASS_TENANT__') {
              return item;
            }
            if (model === 'WhatsAppToken') {
              if (!systemId || (item.systemID !== systemId && item.schoolId !== systemId)) {
                return null;
              }
            } else if (!systemId || item.systemID !== systemId) {
              return null;
            }
          }
          return item;
        },
        async count({ model, operation, args, query }) {
          if (MULTI_TENANT_MODELS.has(model)) {
            const systemId = als.getStore();
            if (systemId === '__BYPASS_TENANT__') {
              return query(args);
            }
            if (systemId) {
              if (model === 'WhatsAppToken') {
                args.where = {
                  ...args.where,
                  OR: [
                    { systemID: systemId },
                    { schoolId: systemId }
                  ]
                };
              } else {
                args.where = { ...args.where, systemID: systemId };
              }
            } else {
              return 0;
            }
          }
          return query(args);
        },
        async create({ model, operation, args, query }) {
          if (MULTI_TENANT_MODELS.has(model)) {
            const systemId = als.getStore();
            if (systemId && systemId !== '__BYPASS_TENANT__') {
              args.data = { ...args.data, systemID: args.data?.systemID || systemId };
            }
          }
          return query(args);
        },
        async createMany({ model, operation, args, query }) {
          if (MULTI_TENANT_MODELS.has(model)) {
            const systemId = als.getStore();
            if (systemId && systemId !== '__BYPASS_TENANT__') {
              if (Array.isArray(args.data)) {
                args.data = args.data.map(d => ({ ...d, systemID: d.systemID || systemId }));
              } else if (args.data) {
                args.data = { ...args.data, systemID: args.data.systemID || systemId };
              }
            }
          }
          return query(args);
        },
        async update({ model, operation, args, query }) {
          if (MULTI_TENANT_MODELS.has(model)) {
            const systemId = als.getStore();
            if (systemId && systemId !== '__BYPASS_TENANT__') {
              const whereCondition = model === 'WhatsAppToken'
                ? { ...args.where, OR: [{ systemID: systemId }, { schoolId: systemId }] }
                : { ...args.where, systemID: systemId };
              const existing = await baseClient[model].findFirst({
                where: whereCondition
              });
              if (!existing) {
                throw new Error(`Record not found or access denied`);
              }
              if (args.data && args.data.systemID !== undefined) {
                delete args.data.systemID;
              }
            }
          }
          return query(args);
        },
        async updateMany({ model, operation, args, query }) {
          if (MULTI_TENANT_MODELS.has(model)) {
            const systemId = als.getStore();
            if (systemId === '__BYPASS_TENANT__') {
              return query(args);
            }
            if (systemId) {
              args.where = { ...args.where, systemID: systemId };
            } else {
              args.where = { ...args.where, systemID: '__UNAUTHENTICATED__' };
            }
          }
          return query(args);
        },
        async delete({ model, operation, args, query }) {
          if (MULTI_TENANT_MODELS.has(model)) {
            const systemId = als.getStore();
            if (systemId && systemId !== '__BYPASS_TENANT__') {
              const existing = await baseClient[model].findFirst({
                where: { ...args.where, systemID: systemId }
              });
              if (!existing) {
                throw new Error(`Record not found or access denied`);
              }
            }
          }
          return query(args);
        },
        async deleteMany({ model, operation, args, query }) {
          if (MULTI_TENANT_MODELS.has(model)) {
            const systemId = als.getStore();
            if (systemId === '__BYPASS_TENANT__') {
              return query(args);
            }
            if (systemId) {
              args.where = { ...args.where, systemID: systemId };
            } else {
              args.where = { ...args.where, systemID: '__UNAUTHENTICATED__' };
            }
          }
          return query(args);
        }
      }
    }
  });
}

const globalForPrisma = globalThis;
const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;