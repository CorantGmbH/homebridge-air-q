import CryptoJS from 'crypto-js';

export function decrypt(msgb64, airqpass) {
  if (airqpass.length < 32) {
    for (let i=airqpass.length; i<32; i++) {
      airqpass += '0';
    }
  } else if (airqpass.length > 32) {
    airqpass = airqpass.substring(0, 32);
  }
  const key = CryptoJS.enc.Utf8.parse(airqpass);
  const ciphertext = CryptoJS.enc.Base64.parse(msgb64);
  const iv = ciphertext.clone();
  iv.sigBytes = 16;
  iv.clamp();
  ciphertext.words.splice(0, 4); // delete 4 words = 16 bytes
  ciphertext.sigBytes -= 16;
  const decrypted = CryptoJS.AES.decrypt({ciphertext: ciphertext}, key, {
    iv: iv,
  });
  try {
    return JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
  } catch {
    return undefined;
  }
}
