import { createRequire } from 'module';
import { execSync } from 'child_process';
const require = createRequire(import.meta.url);
const tmpDir = execSync('cygpath -w /tmp').toString().trim();
const { Client } = require(tmpDir + '\\node_modules\\ssh2');

const SERVER = { host: '164.92.244.229', port: 22, username: 'root', password: 'gEt_help777g' };

const client = new Client();
client.on('ready', () => {
    client.sftp((err, sftp) => {
        if (err) throw err;
        const remotePath = '/opt/gethelp/.env';
        
        sftp.readFile(remotePath, 'utf8', (err, data) => {
            if (err) throw err;
            
            // Replace HTTP IP with HTTPS Domain
            let newData = data.replace(/http:\/\/164\.92\.244\.229/g, 'https://gethelp.uz');
            newData = newData.replace(/164\.92\.244\.229/g, 'gethelp.uz');
            
            sftp.writeFile(remotePath, newData, (err) => {
                if (err) throw err;
                console.log('Env updated on server.');
                
                // Restart PM2 to apply changes
                client.exec('pm2 restart all', (err, stream) => {
                    stream.on('data', d => process.stdout.write(d));
                    stream.stderr.on('data', d => process.stderr.write(d));
                    stream.on('close', () => client.end());
                });
            });
        });
    });
}).connect(SERVER);
