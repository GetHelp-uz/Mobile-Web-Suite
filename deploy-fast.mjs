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

function execCommand(conn, cmd, timeout = 120000) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let stdout = '', stderr = '';
      stream.on('data', (d) => { stdout += d.toString(); process.stdout.write(d); });
      stream.stderr.on('data', (d) => { stderr += d.toString(); process.stderr.write(d); });
      stream.on('close', (code) => {
        resolve({ stdout, stderr, code });
      });
    });
  });
}

async function main() {
  const conn = new Client();
  return new Promise((resolve, reject) => {
    conn.on('ready', async () => {
      try {
        console.log('✅ Connected to server');
        
        console.log('\\n📦 Pulling latest code...');
        await execCommand(conn, 'cd /opt/gethelp && git stash 2>/dev/null; git pull origin main 2>&1');
        
        console.log('\\n🔨 Building api-server ONLY...');
        await execCommand(conn, 'cd /opt/gethelp/artifacts/api-server && pnpm run build 2>&1', 180000);
        
        console.log('\\n🔄 Restarting server...');
        await execCommand(conn, 'cd /opt/gethelp && pm2 restart gethelp');
        
        console.log('\\n🏥 Health check...');
        const health = await execCommand(conn, 'sleep 3 && curl -s http://localhost:8080/api/health || echo "Health check failed"');
        console.log('Health Output:', health.stdout);
        
        conn.end();
        resolve({ code: 0 });
      } catch (e) {
        console.error('❌ Deploy error:', e.message);
        conn.end();
        reject(e);
      }
    });
    conn.on('error', reject);
    conn.connect(SERVER);
  });
}

main().then(r => process.exit(r.code || 0)).catch(e => { console.error(e.message); process.exit(1); });
