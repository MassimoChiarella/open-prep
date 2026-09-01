export interface VersionContractOptions {
  rootDirectory?: string;
  sourceRef?: string;
  artifactDirectory?: string;
}

export function checkVersionContract(options?: VersionContractOptions): Promise<{ version: string }>;
