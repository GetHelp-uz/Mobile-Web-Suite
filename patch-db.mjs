import { createRequire } from 'module';
import { execSync } from 'child_process';
const require = createRequire(import.meta.url);
const tmpDir = execSync('cygpath -w /tmp').toString().trim();
const { Client } = require(tmpDir + '\\node_modules\\ssh2');

const SERVER = {
  host: '164.92.244.229',
  port: 22,
  username: 'root',
  password: 'gEt_help777g',
};

async function main() {
  const conn = new Client();
  return new Promise((resolve, reject) => {
    conn.on('ready', () => {
      console.log('✅ Connected to server');
      const cmd = `docker exec gethelp-postgres psql -U postgres -d gethelp -c "ALTER TABLE users ADD COLUMN IF NOT EXISTS passport_id text;" && cd /opt/gethelp && git reset --hard && git pull origin main && pm2 restart gethelp && sleep 3 && curl -s http://localhost:8080/api/health`;
      conn.exec(cmd, (err, stream) => {
        if (err) return reject(err);
        let out = '';
        stream.on('data', d => { out += d.toString(); process.stdout.write(d); });
        stream.stderr.on('data', d => { out += d.toString(); process.stderr.write(d); });
        stream.on('close', (code) => {
          console.log('\\n✅ DB patched & Server restarted with code: ' + code);
          conn.end();
          resolve({ code });
        });
      });
    });
    conn.on('error', reject);
    conn.connect(SERVER);
  });
}

main().catch(console.error);
