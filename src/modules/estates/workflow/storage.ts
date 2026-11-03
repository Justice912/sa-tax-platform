import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Estate document storage.
 *
 * Production: Supabase Storage (private bucket). Uploads go browser/skill ->
 * Supabase via signed upload URLs (createSignedUploadUrl / uploadToSignedUrl),
 * so large scans bypass the Vercel function body limit. Downloads use
 * short-lived signed URLs.
 *
 * Fallback (demo / local desktop): files are written under STORAGE_ROOT and
 * streamed through the app's own upload route.
 */

export const ESTATE_DOCUMENT_BUCKET = process.env.ESTATE_DOCUMENTS_BUCKET ?? "estate-documents";
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.ms-excel",
];

let client: SupabaseClient | undefined;

export function isSupabaseStorageConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function supabase() {
  if (!client) {
    client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

export function buildStorageKey(estateId: string, fileName: string) {
  const safeName = fileName.replace(/[^A-Za-z0-9._-]+/g, "_").slice(-120) || "document";
  return `estates/${estateId}/${new Date().toISOString().slice(0, 10)}/${crypto.randomBytes(6).toString("hex")}-${safeName}`;
}

export function validateUpload(meta: { mimeType: string; fileSizeBytes: number }) {
  if (!ALLOWED_MIME_TYPES.includes(meta.mimeType)) return `File type ${meta.mimeType} is not accepted. Upload PDF, image, Word or Excel files.`;
  if (meta.fileSizeBytes <= 0 || meta.fileSizeBytes > MAX_UPLOAD_BYTES) return "Files must be between 1 byte and 25 MB.";
  return undefined;
}

export type UploadTicket =
  | { mode: "supabase"; storageKey: string; signedUrl: string; token: string; bucket: string }
  | { mode: "local"; storageKey: string };

export async function createUploadTicket(storageKey: string): Promise<UploadTicket> {
  if (!isSupabaseStorageConfigured()) return { mode: "local", storageKey };
  const { data, error } = await supabase().storage.from(ESTATE_DOCUMENT_BUCKET).createSignedUploadUrl(storageKey);
  if (error || !data) throw new Error(`Could not create upload URL: ${error?.message ?? "unknown error"}`);
  return { mode: "supabase", storageKey, signedUrl: data.signedUrl, token: data.token, bucket: ESTATE_DOCUMENT_BUCKET };
}

function localPath(storageKey: string) {
  const root = path.resolve(process.env.ESTATE_DOCUMENTS_LOCAL_DIR ?? path.join(env.STORAGE_ROOT, "estate-documents"));
  const full = path.resolve(root, storageKey);
  if (!full.startsWith(root)) throw new Error("Invalid storage key.");
  return full;
}

/** Server-side write (local mode, or staff uploads proxied through the app). */
export async function putObject(storageKey: string, bytes: Buffer, mimeType: string) {
  if (isSupabaseStorageConfigured()) {
    const { error } = await supabase().storage.from(ESTATE_DOCUMENT_BUCKET).upload(storageKey, bytes, { contentType: mimeType, upsert: false });
    if (error) throw new Error(`Upload failed: ${error.message}`);
    return;
  }
  const full = localPath(storageKey);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, bytes);
}

export async function objectExists(storageKey: string): Promise<boolean> {
  if (isSupabaseStorageConfigured()) {
    const dir = storageKey.split("/").slice(0, -1).join("/");
    const name = storageKey.split("/").pop()!;
    const { data } = await supabase().storage.from(ESTATE_DOCUMENT_BUCKET).list(dir, { search: name });
    return Boolean(data?.some((f) => f.name === name));
  }
  return fs.existsSync(localPath(storageKey));
}

export async function getObject(storageKey: string): Promise<Buffer> {
  if (isSupabaseStorageConfigured()) {
    const { data, error } = await supabase().storage.from(ESTATE_DOCUMENT_BUCKET).download(storageKey);
    if (error || !data) throw new Error(`Download failed: ${error?.message ?? "not found"}`);
    return Buffer.from(await data.arrayBuffer());
  }
  return fs.readFileSync(localPath(storageKey));
}

/** Short-lived download URL (Supabase) or undefined when files are served by the app. */
export async function createDownloadUrl(storageKey: string, fileName: string): Promise<string | undefined> {
  if (!isSupabaseStorageConfigured()) return undefined;
  const { data, error } = await supabase().storage.from(ESTATE_DOCUMENT_BUCKET).createSignedUrl(storageKey, 300, { download: fileName });
  if (error || !data) throw new Error(`Could not sign download: ${error?.message ?? "unknown"}`);
  return data.signedUrl;
}

export function sha256(bytes: Buffer) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}
