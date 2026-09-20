import { DatabaseSync } from 'node:sqlite';
import { PrismaClient } from '@prisma/client';

const target = new URL(process.env.DATABASE_URL);
if (target.hostname !== '127.0.0.1' || target.pathname !== '/soul_crm_local') throw new Error('Solo se permite la base local dedicada.');
const sqlite = new DatabaseSync('prisma/dev.db', { readOnly: true });
const prisma = new PrismaClient();
const tables = [['User','user'],['Service','service'],['Lead','lead'],['Conversation','conversation'],['Message','message'],['AISettings','aISettings']];
const booleans = new Set(['active','aiEnabled','isDraft','humanHandoffForHot']);
try {
  const data = {};
  for (const [table, model] of tables) {
    if (await prisma[model].count()) throw new Error('La base local debe estar vacía.');
    data[model] = sqlite.prepare('SELECT * FROM "' + table + '" ORDER BY id').all().map(row => {
      for (const key of Object.keys(row)) {
        if (row[key] !== null && booleans.has(key)) row[key] = Boolean(row[key]);
        if (row[key] !== null && key.endsWith('At')) row[key] = new Date(row[key]);
      }
      return row;
    });
  }
  await prisma.$transaction(async tx => {
    for (const [,model] of tables) if (data[model].length) await tx[model].createMany({ data: data[model] });
  });
  const counts = {};
  for (const [table,model] of tables) {
    const actual = await prisma[model].count();
    if (actual !== data[model].length) throw new Error('Conteo inesperado.');
    counts[table] = { sqlite: data[model].length, mysqlLocal: actual };
  }
  console.log(JSON.stringify(counts));
} finally { sqlite.close(); await prisma.$disconnect(); }
