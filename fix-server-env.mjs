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

const envContent = `DATABASE_URL="postgresql://postgres:G3tH3lp_Pr0d_2026@localhost:5432/gethelp"
JWT_SECRET="bbcb0d2ef9f9c704486fe6cb085e92195409cf3a688ce32357e42ba7fd42dc6a"
APP_URL="https://gethelp.uz"
WEB_APP_URL="https://gethelp.uz"
EXPO_PUBLIC_DOMAIN="gethelp.uz"
PORT="8080"
NODE_ENV="production"
BASE_PATH="/"
DO_SPACES_KEY="DO0069A8AN69CZKFFGZ4"
DO_SPACES_SECRET="/ZSHSASXbBej0PCLhPAnmszNOSFBkcQUeE94Fbfsftc"
DO_SPACES_ENDPOINT="fra1.digitaloceanspaces.com"
DO_SPACES_BUCKET="gethelp-img"
DO_SPACES_CDN="https://gethelp-img.fra1.cdn.digitaloceanspaces.com"
`;

async function main() {
  const conn = new Client();
  return new Promise((resolve, reject) => {
    conn.on('ready', () => {
      console.log('✅ Connected to server');
      const cmd = `cd /opt/gethelp && git reset --hard && git pull origin main && cat << 'EOF' > /opt/gethelp/.env\n${envContent}\nEOF\npm2 restart gethelp && sleep 3 && curl -s http://localhost:8080/api/health`;
      conn.exec(cmd, (err, stream) => {
        if (err) return reject(err);
        let out = '';
        stream.on('data', d => { out += d.toString(); process.stdout.write(d); });
        stream.stderr.on('data', d => { out += d.toString(); process.stderr.write(d); });
        stream.on('close', () => {
          console.log('\\n✅ Done!');
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
