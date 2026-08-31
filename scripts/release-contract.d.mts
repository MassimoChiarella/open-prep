export interface ArtifactInventoryEntry {
  bytes: number;
  path: string;
  sha256: string;
}

export interface ReleaseSource {
  clean: boolean;
  commit: string;
  sourceRef: string;
  version: string;
  workerPolicySha256: string;
}

export interface ReleaseMarker {
  artifact: {
    cacheId: string;
    files: number;
    inventorySha256: string;
    workerPolicySha256: string;
  };
  product: "Open Prep";
  schemaVersion: number;
  source: {
    clean: boolean;
    commit: string;
    ref: string;
  };
  version: string;
}

export const RELEASE_MARKER_FILENAME: string;
export const RELEASE_SCHEMA_VERSION: number;
export const REQUIRED_STATIC_ARTIFACTS: readonly string[];

export function removeStaticOutput(outputDirectory?: string): Promise<void>;
export function createArtifactInventory(outputDirectory?: string): Promise<ArtifactInventoryEntry[]>;
export function hashArtifactInventory(inventory: readonly ArtifactInventoryEntry[]): string;
export function selectCorePrecacheInventory(
  inventory: readonly ArtifactInventoryEntry[],
  corePaths: readonly string[]
): ArtifactInventoryEntry[];
export function createCacheIdentity(options: Pick<ReleaseSource, "commit" | "version" | "workerPolicySha256"> & {
  coreInventory: readonly ArtifactInventoryEntry[];
}): string;
export function createReleaseProvenance(options: ReleaseSource & {
  artifactCount: number;
  cacheId: string;
  inventorySha256: string;
}): ReleaseMarker;
export function writeReleaseMarker(
  outputDirectory: string,
  source: ReleaseSource & { cacheId: string }
): Promise<ReleaseMarker>;
export function readReleaseMarker(outputDirectory?: string): Promise<ReleaseMarker>;
export function validateReleaseOutput(
  outputDirectory?: string,
  expected?: Partial<ReleaseSource & { cacheId: string }>
): Promise<{ inventory: ArtifactInventoryEntry[]; marker: ReleaseMarker }>;
export function validateRequiredStaticArtifacts(
  outputDirectory: string,
  inventory?: readonly ArtifactInventoryEntry[]
): Promise<readonly ArtifactInventoryEntry[]>;
export function assertReleasePrivacy(
  outputDirectory: string,
  inventory: readonly ArtifactInventoryEntry[]
): Promise<void>;
export function assertPortableArtifactPath(relativePath: string): void;
export function sha256(value: string | Uint8Array): string;
