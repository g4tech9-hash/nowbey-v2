const { Client } = require('pg');
const fs = require('fs');

async function check() {
  try {
    const env = fs.readFileSync('.env', 'utf8');
    const match = env.match(/DATABASE_URL="?([^"\n\r]+)"?/);
    if (!match) {
      console.error('DATABASE_URL not found in .env');
      process.exit(1);
    }
    const dbUrl = match[1];
    const client = new Client({ connectionString: dbUrl });
    await client.connect();
    const res = await client.query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'digest_partners') as exists");
    console.log(res.rows[0].exists);
    await client.end();
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
check();
