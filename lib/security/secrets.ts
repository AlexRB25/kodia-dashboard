import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Cifrado de secretos (tokens de integraciones) antes de guardarlos.
 * AES-256-GCM con la clave INTEGRATION_ENCRYPTION_KEY (32 bytes en base64).
 * Formato: v1:<iv>:<etiqueta>:<datos>, todo en base64.
 *
 * Genera una clave con:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 *
 * IMPORTANTE: si pierdes o cambias la clave, los tokens guardados dejan de
 * poder leerse y hay que volver a conectar las cuentas.
 */

const VERSION = "v1";

function getKey(): Buffer {
  const raw = process.env.INTEGRATION_ENCRYPTION_KEY;

  if (!raw) {
    throw new Error("Falta INTEGRATION_ENCRYPTION_KEY.");
  }

  const key = Buffer.from(raw, "base64");

  if (key.length !== 32) {
    throw new Error("INTEGRATION_ENCRYPTION_KEY debe ser de 32 bytes en base64.");
  }

  return key;
}

export function isEncryptionConfigured(): boolean {
  try {
    getKey();
    return true;
  } catch {
    return false;
  }
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [VERSION, iv.toString("base64"), tag.toString("base64"), encrypted.toString("base64")].join(":");
}

export function decryptSecret(payload: string): string {
  const [version, iv, tag, data] = payload.split(":");

  if (version !== VERSION || !iv || !tag || !data) {
    throw new Error("Secreto con formato desconocido.");
  }

  const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(data, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
