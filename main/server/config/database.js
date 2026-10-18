import { PrismaClient } from '../../generated/prisma/index.js';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
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

const prismaClientSingleton = () => {
  const dbPath = getDatabasePath();
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
              } else {
                args.where = { ...args.where, systemID: systemId };
              }
            } else {
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
              } else {
                args.where = { ...args.where, systemID: systemId };
              }
            } else {
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