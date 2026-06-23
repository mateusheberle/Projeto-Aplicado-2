const db = require('./src/config/database');

async function run() {
  try {
    console.log('Executando bootstrap do banco...');
    await db.ready;
    console.log('Migração concluída com sucesso!');
  } catch (err) {
    console.error('Erro na migração:', err.message);
    process.exitCode = 1;
  } finally {
    await db.end();
  }
}

run();
