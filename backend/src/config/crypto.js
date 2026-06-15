const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const KEY = Buffer.from(process.env.WALLET_ENCRYPTION_KEY, 'hex'); // 32 bytes

/**
 * Encrypt a private key string using AES-256-CBC.
 * Returns "iv:encryptedData" in hex format.
 */
function encryptPrivateKey(privateKey) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(privateKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt a private key stored as "iv:encryptedData".
 */
function decryptPrivateKey(encryptedStr) {
  const [ivHex, encrypted] = encryptedStr.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

module.exports = { encryptPrivateKey, decryptPrivateKey };
