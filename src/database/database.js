// src/database/database.js
import { resolve } from 'node:path';
import { Database } from 'sqlite-async';

// Ele vai criar o arquivo db.sqlite aqui dentro dessa pasta
const dbFile = resolve('src', 'database', 'db.sqlite');

async function connect() {
  return await Database.open(dbFile);
}

export default { connect };