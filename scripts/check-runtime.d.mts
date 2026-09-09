export function runtimeErrors(options: {
  nodeVersion: string;
  npmVersion?: string;
}): string[];

export function npmVersionFromUserAgent(userAgent?: string): string | undefined;
