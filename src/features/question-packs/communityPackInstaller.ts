import {
  getCommunityPackDownloadPath,
  type CommunityPackCatalogEntry
} from "@/features/question-packs/communityPackCatalog";
import type { QuestionPackImportCandidate } from "@/features/question-packs/QuestionPackManager";
import { questionPackMaxFileBytes } from "@/features/question-packs/questionPack";

export type CommunityPackDownloadFailure = "integrity" | "invalid" | "offline" | "unavailable";

export class CommunityPackDownloadError extends Error {
  constructor(readonly reason: CommunityPackDownloadFailure, message: string) {
    super(message);
    this.name = "CommunityPackDownloadError";
  }
}

interface CommunityPackDownloadOptions {
  fetcher?: typeof fetch;
  online?: boolean;
  subtle?: SubtleCrypto;
}

export async function fetchCommunityPackCandidate(
  entry: CommunityPackCatalogEntry,
  options: CommunityPackDownloadOptions = {}
): Promise<QuestionPackImportCandidate> {
  const expectedPath = getCommunityPackDownloadPath(entry.id, entry.version);
  if (entry.file !== expectedPath) {
    throw new CommunityPackDownloadError("integrity", "The catalog pack path does not match its identity.");
  }
  if (entry.bytes < 1 || entry.bytes > questionPackMaxFileBytes) {
    throw new CommunityPackDownloadError("integrity", "The catalog pack size is outside the import limit.");
  }

  let response: Response;
  try {
    response = await (options.fetcher ?? globalThis.fetch)(entry.file, {
      credentials: "same-origin",
      headers: { Accept: "application/json" }
    });
  } catch {
    const online = options.online ?? (typeof navigator === "undefined" || navigator.onLine);
    throw new CommunityPackDownloadError(
      online ? "unavailable" : "offline",
      online
        ? "The reviewed pack could not be downloaded."
        : "This reviewed pack has not been cached on this device."
    );
  }

  if (!response.ok) {
    throw new CommunityPackDownloadError(
      response.status === 503 && !(options.online ?? (typeof navigator === "undefined" || navigator.onLine))
        ? "offline"
        : "unavailable",
      `The reviewed pack could not be downloaded (${response.status}).`
    );
  }

  const bytes = await response.arrayBuffer();
  if (bytes.byteLength !== entry.bytes) {
    throw new CommunityPackDownloadError("integrity", "The downloaded pack size does not match the reviewed catalog record.");
  }
  const sha256 = await digestSha256(bytes, options.subtle ?? crypto.subtle);
  if (sha256 !== entry.sha256) {
    throw new CommunityPackDownloadError("integrity", "The downloaded pack checksum does not match the reviewed catalog record.");
  }

  let payload: unknown;
  try {
    payload = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new CommunityPackDownloadError("invalid", "The reviewed pack is not valid UTF-8 JSON.");
  }

  return {
    key: `${entry.id}:${entry.version}:${entry.sha256}`,
    payload,
    provenance: {
      file: entry.file,
      id: entry.id,
      language: entry.language,
      publisherId: entry.publisher.id,
      reviewDate: entry.reviewDate,
      sha256: entry.sha256,
      source: "repository_catalog",
      version: entry.version
    }
  };
}

async function digestSha256(bytes: ArrayBuffer, subtle: SubtleCrypto): Promise<string> {
  const digest = new Uint8Array(await subtle.digest("SHA-256", bytes));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
