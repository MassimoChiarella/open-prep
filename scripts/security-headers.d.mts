export const STATIC_SECURITY_HEADERS_FILENAME: string;

export function writeStaticSecurityHeaders(outputDirectory: string): Promise<Readonly<Record<string, string>>>;
export function readStaticSecurityHeaders(outputDirectory: string): Promise<Readonly<Record<string, string>>>;
export function createSecurityHeaders(inlineScriptHashes?: readonly string[]): Readonly<Record<string, string>>;
export function serializeStaticSecurityHeaders(headers: Readonly<Record<string, string>>): string;
export function parseStaticSecurityHeaders(contents: string): Readonly<Record<string, string>>;
