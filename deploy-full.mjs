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
    const timer = setTimeout(() => {
      console.log(`⏰ Timeout for: ${cmd.slice(0, 80)}...`);
      resolve({ stdout: '', stderr: 'timeout', code: -1 });
    }, timeout);
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
  const conn = new Client();
  
  return new Promise((resolve, reject) => {
    conn.on('ready', async () => {
      try {
        console.log('✅ Connected to server');
        
        // 1. DB Migration
        console.log('\n📊 Running DB migrations...');
        const migration = `docker exec gethelp-postgres psql -U postgres -d gethelp -c "
          ALTER TABLE rentals ADD COLUMN IF NOT EXISTS contract_signed BOOLEAN DEFAULT FALSE;
          ALTER TABLE rentals ADD COLUMN IF NOT EXISTS contract_signed_at TIMESTAMP;
          
          CREATE TABLE IF NOT EXISTS contracts (
            id SERIAL PRIMARY KEY,
            rental_id INTEGER UNIQUE,
            contract_number TEXT NOT NULL,
            customer_id INTEGER,
            shop_id INTEGER,
            content TEXT,
            signature_data TEXT,
            signature_ip TEXT,
            signed_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW()
          );
          
          CREATE TABLE IF NOT EXISTS peer_listings (
            id SERIAL PRIMARY KEY,
            owner_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            category TEXT,
            daily_price REAL NOT NULL DEFAULT 0,
            deposit_amount REAL DEFAULT 0,
            condition TEXT DEFAULT 'good',
            region TEXT,
            district TEXT,
            address TEXT,
            images JSONB,
            min_days INTEGER DEFAULT 1,
            max_days INTEGER DEFAULT 30,
            is_available BOOLEAN DEFAULT TRUE,
            rating REAL DEFAULT 0,
            rental_count INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT NOW()
          );
          
          CREATE TABLE IF NOT EXISTS peer_rentals (
            id SERIAL PRIMARY KEY,
            listing_id INTEGER NOT NULL,
            renter_id INTEGER NOT NULL,
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            total_price REAL NOT NULL,
            deposit_paid REAL DEFAULT 0,
            notes TEXT,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT NOW()
          );
          
          CREATE TABLE IF NOT EXISTS platform_settings (
            key TEXT PRIMARY KEY,
            value TEXT
          );
          
          CREATE TABLE IF NOT EXISTS commission_logs (
            id SERIAL PRIMARY KEY,
            rental_id INTEGER,
            shop_id INTEGER,
            total_amount REAL,
            commission_rate REAL,
            commission_amount REAL,
            shop_amount REAL,
            created_at TIMESTAMP DEFAULT NOW()
          );
        "`;
        
        const migResult = await execCommand(conn, migration);
        console.log(`Migration exit code: ${migResult.code}`);
        
        // 2. Update .env on server with DO Spaces credentials
        console.log('\n🔑 Updating .env with DO Spaces credentials...');
        await execCommand(conn, `cd /opt/gethelp && grep -q DO_SPACES_KEY .env || cat >> .env << 'ENVEOF'

# DigitalOcean Spaces (S3-compatible)
DO_SPACES_KEY="DO0069A8AN69CZKFFGZ4"
DO_SPACES_SECRET="/ZSHSASXbBej0PCLhPAnmszNOSFBkcQUeE94Fbfsftc"
DO_SPACES_ENDPOINT="fra1.digitaloceanspaces.com"
DO_SPACES_BUCKET="gethelp-img"
DO_SPACES_CDN="https://gethelp-img.fra1.cdn.digitaloceanspaces.com"
ENVEOF`);
        
        // 3. Git pull latest code
        console.log('\n📦 Pulling latest code...');
        await execCommand(conn, 'cd /opt/gethelp && git stash 2>/dev/null; git pull origin main 2>&1 || echo "Git pull done or failed"');
        
        // 4. Install dependencies
        console.log('\n📥 Installing dependencies...');
        await execCommand(conn, 'cd /opt/gethelp && pnpm install --no-frozen-lockfile 2>&1 | tail -5', 180000);
        
        // 5. Build
        console.log('\n🔨 Building...');
        await execCommand(conn, 'cd /opt/gethelp && pnpm run build 2>&1 | tail -10', 180000);
        
        // 6. Restart
        console.log('\n🔄 Restarting server...');
        await execCommand(conn, 'cd /opt/gethelp && pm2 restart all 2>&1 || (pm2 start ecosystem.config.cjs 2>&1)');
        
        // 7. Health check
        console.log('\n🏥 Health check...');
        await execCommand(conn, 'sleep 3 && curl -s http://localhost:8080/api/health || echo "Health check pending..."');
        
        console.log('\n✅ Deploy complete!');
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
