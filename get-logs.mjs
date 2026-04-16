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
      conn.exec('pm2 logs gethelp --lines 30 --nostream', (err, stream) => {
        if (err) return reject(err);
        let out = '';
        stream.on('data', d => { out += d.toString(); });
        stream.stderr.on('data', d => { out += d.toString(); });
        stream.on('close', () => {
          console.log(out);
          conn.end();
          resolve({ code: 0 });
        });
      });
    });
    conn.on('error', reject);
    conn.connect(SERVER);
  });
}

main().catch(console.error);
