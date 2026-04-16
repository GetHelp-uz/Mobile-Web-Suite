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

function execCommand(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let stdout = '', stderr = '';
      stream.on('data', (d) => { stdout += d.toString(); process.stdout.write(d); });
      stream.stderr.on('data', (d) => { stderr += d.toString(); process.stderr.write(d); });
      stream.on('close', (code) => resolve({ stdout, stderr, code }));
    });
  });
}

const conn = new Client();
conn.on('ready', async () => {
    try {
        console.log('fixing server...');
        await execCommand(conn, 'cd /opt/gethelp && mv .env .env.bak && git pull origin main && mv .env.bak .env');
        console.log('done.');
        conn.end();
    } catch(e) {
        console.error(e);
        conn.end();
    }
});
conn.connect(SERVER);
