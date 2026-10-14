const { Client } = require('pg');
const fs = require('fs');

async function check() {
  try {
    const env = fs.readFileSync('.env', 'utf8');
    const match = env.match(/DATABASE_URL="?([^"\n\r]+)"?/);
    if (!match) process.exit(1);
    const client = new Client({ connectionString: match[1] });
    await client.connect();
    const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    console.log(JSON.stringify(res.rows.map(r => r.table_name)));
    await client.end();
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
check();
