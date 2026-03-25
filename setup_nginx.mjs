import { createRequire } from 'module';
import { execSync } from 'child_process';
const require = createRequire(import.meta.url);
const tmpDir = execSync('cygpath -w /tmp').toString().trim();
const { Client } = require(tmpDir + '\\node_modules\\ssh2');

const SERVER = { host: '164.92.244.229', port: 22, username: 'root', password: 'gEt_help777g' };
const NGINX_CONF = `server {
    listen 80;
    server_name gethelp.uz www.gethelp.uz;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}`;

const client = new Client();
client.on('ready', () => {
    client.sftp((err, sftp) => {
        if (err) throw err;
        const stream = sftp.createWriteStream('/etc/nginx/sites-available/gethelp.uz');
        stream.on('close', () => {
            console.log('Nginx configuration written.');
            client.exec('ln -sf /etc/nginx/sites-available/gethelp.uz /etc/nginx/sites-enabled/ && rm -f /etc/nginx/sites-enabled/default && nginx -t && systemctl restart nginx && apt-get update && apt-get install -y certbot python3-certbot-nginx && certbot --nginx -d gethelp.uz -d www.gethelp.uz --non-interactive --agree-tos -m admin@gethelp.uz', (err, stream2) => {
                if(err) throw err;
                stream2.on('data', d => process.stdout.write(d));
                stream2.stderr.on('data', d => process.stderr.write(d));
                stream2.on('close', (code) => {
                    console.log('Script finished with code: ' + code);
                    client.end();
                });
            });
        });
        stream.write(NGINX_CONF);
        stream.end();
    });
}).connect(SERVER);
