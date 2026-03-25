import { createRequire } from 'module';
import { execSync } from 'child_process';
const require = createRequire(import.meta.url);
// Resolve actual tmp path for Windows/Git Bash
const tmpDir = execSync('cygpath -w /tmp').toString().trim();
const { Client } = require(tmpDir + '\\node_modules\\ssh2');

const SERVER = {
  host: '164.92.244.229',
  port: 22,
  username: 'root',
  password: 'gEt_help777g',
};

function execCommand(conn, cmd, timeout = 300000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout: ${cmd}`)), timeout);
    conn.exec(cmd, (err, stream) => {
      if (err) { clearTimeout(timer); return reject(err); }
      let stdout = '', stderr = '';
      stream.on('data', (d) => { stdout += d.toString(); process.stdout.write(d); });
      stream.stderr.on('data', (d) => { stderr += d.toString(); process.stderr.write(d); });
      stream.on('close', (code) => {
        clearTimeout(timer);
        resolve({ stdout, stderr, code });
      });
    });
  });
}

async function main() {
  const cmd = process.argv[2] || 'uname -a';
  
  const conn = new Client();
  
  return new Promise((resolve, reject) => {
    conn.on('ready', async () => {
      try {
        const result = await execCommand(conn, cmd);
        conn.end();
        resolve(result);
      } catch (e) {
        conn.end();
        reject(e);
      }
    });
    conn.on('error', reject);
    conn.connect(SERVER);
  });
}

main().then(r => process.exit(r.code || 0)).catch(e => { console.error(e.message); process.exit(1); });
