import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { env } from "@/lib/env";

export interface StorageWriteInput {
  fileName: string;
  content: Buffer;
}

export interface StorageWriteResult {
  storageKey: string;
  checksum: string;
  sizeBytes: number;
}

export interface StorageProvider {
  save(input: StorageWriteInput): Promise<StorageWriteResult>;
}

export function resolveStorageRoot() {
  return path.resolve(process.cwd(), env.STORAGE_ROOT);
}

export function resolveStoragePath(storageKey: string) {
  return path.join(resolveStorageRoot(), storageKey);
}

class LocalStorageProvider implements StorageProvider {
  private readonly root = resolveStorageRoot();

  async save(input: StorageWriteInput) {
    const stamp = Date.now();
    const safeName = input.fileName.replace(/\s+/g, "-").toLowerCase();
    const storageKey = `uploads/${stamp}-${safeName}`;
    const fullPath = path.join(this.root, storageKey);

    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, input.content);

    const checksum = crypto.createHash("sha256").update(input.content).digest("hex");

    return {
      storageKey,
      checksum,
      sizeBytes: input.content.length,
    };
  }
}

export const storageProvider: StorageProvider = new LocalStorageProvider();

