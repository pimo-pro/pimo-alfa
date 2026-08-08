/**
 * Deploy one-way do pimo-alfa → https://alfa.pimo.pro
 * Envia apenas o conteúdo de ./dist para /public_html/alfa
 * (deleteRemote=false — nunca apaga ficheiros fora desse diretório).
 */
import FTPDeploy from 'ftp-deploy';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const configPath = join(__dirname, 'ftp-alfa.json');

if (!existsSync(configPath)) {
  console.error('Falta ftp-alfa.json. Crie o ficheiro com as credenciais FTP do alfa.');
  process.exit(1);
}

const config = JSON.parse(readFileSync(configPath, 'utf8'));

if (!config.password || config.password === 'SENHA_FTP_AQUI') {
  console.error('Defina a password real em ftp-alfa.json (substitua SENHA_FTP_AQUI).');
  process.exit(1);
}

config.localRoot = resolve(__dirname, config.localRoot || './dist');
if (!existsSync(config.localRoot)) {
  console.error(
    `Pasta local não encontrada: ${config.localRoot}\nExecute antes: npm run build`
  );
  process.exit(1);
}

// Garantia: só o destino alfa; nunca limpar o remoto.
config.deleteRemote = false;

const remote = String(config.remoteRoot || '');
if (!remote.includes('/public_html/alfa')) {
  console.error(
    `remoteRoot inválido (deve apontar para /public_html/alfa): ${remote}`
  );
  process.exit(1);
}

console.log('Deploy alfa →', config.remoteRoot);
console.log('Origem local:', config.localRoot);

const ftpDeploy = new FTPDeploy();

ftpDeploy
  .deploy(config)
  .then((result) => {
    console.log('Deploy alfa concluído com sucesso!');
    if (Array.isArray(result)) {
      console.log(`Ficheiros processados: ${result.length}`);
    }
  })
  .catch((err) => {
    console.error('Erro no deploy:', err);
    process.exit(1);
  });
