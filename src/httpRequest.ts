import { request } from 'http';
import { decrypt } from './decryptAES256';

export function performRequest(options, airqpass) {
  return new Promise<string>((resolve, reject) => {
    request(
      options,
      (response) => {
        const { statusCode } = response;
        if (statusCode && statusCode >= 300) {
          reject(
            new Error(response.statusMessage),
          );
        }
        const chunks: any[] = [];
        response.on('data', (chunk) => {
          chunks.push(chunk);
        });
        response.on('end', () => {
          const result = Buffer.concat(chunks).toString();
          resolve(decrypt(JSON.parse(result).content, airqpass));
        });
      },
    )
      .end();
  });
}
