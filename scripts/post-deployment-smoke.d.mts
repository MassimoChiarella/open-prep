export interface DeploymentReleaseIdentity {
  cacheId: string;
  product: "Open Prep";
  version: string;
}

export interface DeploymentManifestIcon {
  purpose: string;
  sizes: string;
  src: string;
  type: string;
}

export interface PostDeploymentSmokeResult extends DeploymentReleaseIdentity {
  icons: number;
  origin: string;
}

export interface RuntimeRequestDescription {
  method: string;
  url: string;
}

type HeaderSource = Headers | Readonly<Record<string, string | null | undefined>>;

export function validateDeploymentOrigin(value: string): string;
export function validateReleaseMarker(value: unknown): Readonly<DeploymentReleaseIdentity>;
export function validateSecurityHeaders(headers: HeaderSource): void;
export function validateManifest(
  value: unknown,
  expectedOrigin: string
): ReadonlyArray<Readonly<DeploymentManifestIcon>>;
export function validateServiceWorkerSource(source: string, identity: Pick<DeploymentReleaseIdentity, "cacheId">): void;
export function validateServiceWorkerCacheControl(value: string | null | undefined): void;
export function findRuntimeRequestViolations(
  requests: readonly Readonly<RuntimeRequestDescription>[],
  expectedOrigin: string
): string[];
export function runPostDeploymentSmoke(input: string): Promise<Readonly<PostDeploymentSmokeResult>>;
