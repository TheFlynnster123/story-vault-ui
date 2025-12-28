import { d } from "../Dependencies";

let encryptionManagerSingleton: EncryptionManager | null = null;

export function getEncryptionManagerSingleton(): EncryptionManager {
  if (!encryptionManagerSingleton)
    encryptionManagerSingleton = new EncryptionManager();

  return encryptionManagerSingleton;
}

export type EncryptionKeyType = "grok" | "chat" | "civitai";

export class EncryptionManager {
  //TODO: THESE SHOULD BE STORED VIA ACCESSOR, SO THEY CAN BE RETRIEVED ASYNC
  private grokEncryptionKey?: string;
  private chatEncryptionKey?: string;
  private civitaiEncryptionKey?: string;
  private encryptionGuid?: string;

  async getGrokEncryptionKey() {
    await this.ensureKeysInitialized();
    return this.grokEncryptionKey!;
  }

  async getChatEncryptionKey() {
    await this.ensureKeysInitialized();
    return this.chatEncryptionKey!;
  }

  async getCivitaiEncryptionKey() {
    await this.ensureKeysInitialized();
    return this.civitaiEncryptionKey!;
  }

  async getEncryptionGuid() {
    await this.ensureKeysInitialized();
    return this.encryptionGuid!;
  }

  async ensureKeysInitialized() {
    if (!this.encryptionGuid) {
      this.encryptionGuid = await d.AuthAPI().getEncryptionGuid();

      this.grokEncryptionKey = await this.deriveKey("grok");
      this.chatEncryptionKey = await this.deriveKey("chat");
      this.civitaiEncryptionKey = await this.deriveKey("civitai");
    }
  }

  async encryptString(keyType: EncryptionKeyType, data: string) {
    await this.ensureKeysInitialized();

    const keyHex = this.getKeyHex(keyType);

    const keyBuffer = new Uint8Array(
      keyHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
    );
    const key = await crypto.subtle.importKey(
      "raw",
      keyBuffer,
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encodedData = new TextEncoder().encode(data);

    const encryptedData = await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      key,
      encodedData
    );

    const combinedBuffer = new Uint8Array(iv.length + encryptedData.byteLength);
    combinedBuffer.set(iv, 0);
    combinedBuffer.set(new Uint8Array(encryptedData), iv.length);

    return arrayBufferToBase64(combinedBuffer.buffer);
  }

  async decryptString(keyType: EncryptionKeyType, data: string) {
    await this.ensureKeysInitialized();

    const keyHex = this.getKeyHex(keyType);

    const keyBuffer = new Uint8Array(
      keyHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
    );
    const key = await crypto.subtle.importKey(
      "raw",
      keyBuffer,
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );

    const combinedBuffer = base64ToArrayBuffer(data);
    const iv = combinedBuffer.slice(0, 12);
    const encryptedData = combinedBuffer.slice(12);

    const decryptedData = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: new Uint8Array(iv),
      },
      key,
      encryptedData
    );

    return new TextDecoder().decode(decryptedData);
  }

  private async deriveKey(salt: string) {
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(this.encryptionGuid),
      { name: "PBKDF2" },
      false,
      ["deriveKey"]
    );

    const derivedKey = await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: new TextEncoder().encode(salt),
        iterations: 100000,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );

    const exportedKey = await crypto.subtle.exportKey("raw", derivedKey);
    return Array.from(new Uint8Array(exportedKey))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  private getKeyHex(keyType: string) {
    switch (keyType) {
      case "grok":
        return this.grokEncryptionKey!;
      case "chat":
        return this.chatEncryptionKey!;
      case "civitai":
        return this.civitaiEncryptionKey!;
      default:
        throw new Error(`Unknown key type: ${keyType}`);
    }
  }
}

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

const base64ToArrayBuffer = (base64: string) => {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
};
