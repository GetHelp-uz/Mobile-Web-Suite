import { createRequire } from 'module';
import { execSync } from 'child_process';
const require = createRequire(import.meta.url);
const tmpDir = execSync('cygpath -w /tmp').toString().trim();
const { Client } = require(tmpDir + '\\node_modules\\ssh2');

const SERVER = { host: '164.92.244.229', port: 22, username: 'root', password: 'gEt_help777g' };

const client = new Client();
client.on('ready', () => {
    client.exec(`docker ps --format "{{.Names}}" | grep -iE "db|postgres"`, (err, stream) => {
        if (err) throw err;
        let contName = "";
        stream.on('data', d => contName += d.toString());
        stream.on('close', () => {
             contName = contName.trim().split('\n')[0];
             if(!contName) contName = "gethelp-db-1";
             console.log("Using container:", contName);
             const sql = `
             INSERT INTO users (name, username, phone, password, role, is_active) VALUES ('Super Admin', 'im_yakuboff98', '998901234567', '$2b$10$62HNGGQrwHLWiUEuhGIbXe4qXwu9p1IHLtp6kHSFgLciWv07UHBVq', 'super_admin', true) ON CONFLICT (phone) DO UPDATE SET password='$2b$10$62HNGGQrwHLWiUEuhGIbXe4qXwu9p1IHLtp6kHSFgLciWv07UHBVq', username='im_yakuboff98', role='super_admin';
             `;
             const cmd = `docker exec -i ${contName} env PGPASSWORD=password psql -U postgres -d gethelp -c "${sql}"`;
             client.exec(cmd, (err, s2) => {
                s2.on('data', d => process.stdout.write(d));
                s2.stderr.on('data', d => process.stderr.write(d));
                s2.on('close', () => {
                    console.log("Password update done!");
                    client.end();
                });
             });
        });
    });
}).connect(SERVER);
