import {
  compareCommunityPackSemVer,
  parseCommunityPackCatalog,
  type CommunityPackCatalog,
  type CommunityPackCatalogEntry,
  type CommunityPackCatalogKind,
  type CommunityPackCatalogTopic,
  type CommunityPackContentLicenseId
} from "@/features/question-packs/communityPackCatalog";

export const communityPackCatalogUrl = "/community-packs/catalog.v1.json" as const;

export type CommunityPackCatalogFetch = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>;

export type CommunityPackCatalogLoadErrorKind = "invalid" | "network" | "unavailable";

export class CommunityPackCatalogLoadError extends Error {
  constructor(
    readonly kind: CommunityPackCatalogLoadErrorKind,
    message: string,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = "CommunityPackCatalogLoadError";
  }
}

export async function loadCommunityPackCatalog(
  fetchImpl: CommunityPackCatalogFetch = globalThis.fetch
): Promise<CommunityPackCatalog> {
  let response: Response;
  try {
    response = await fetchImpl(communityPackCatalogUrl, { credentials: "same-origin" });
  } catch (cause) {
    throw new CommunityPackCatalogLoadError(
      "network",
      "The community pack catalog request failed.",
      { cause }
    );
  }

  if (!response.ok) {
    throw new CommunityPackCatalogLoadError(
      "unavailable",
      `The community pack catalog returned HTTP ${response.status}.`
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (cause) {
    throw new CommunityPackCatalogLoadError(
      "invalid",
      "The community pack catalog is not valid JSON.",
      { cause }
    );
  }

  const validation = parseCommunityPackCatalog(payload);
  if (validation.status === "invalid") {
    throw new CommunityPackCatalogLoadError(
      "invalid",
      `The community pack catalog is invalid: ${validation.errors.join(" ")}`
    );
  }

  return validation.catalog;
}

type CatalogDifficulty = CommunityPackCatalogEntry["difficulties"][number];

export interface CommunityPackCatalogFilters {
  compatibility: "" | "compatible" | "incompatible";
  difficulty: "" | CatalogDifficulty;
  kind: "" | CommunityPackCatalogKind;
  language: string;
  license: "" | CommunityPackContentLicenseId;
  publisher: string;
  reviewRecency: "" | "90" | "365";
  topic: "" | CommunityPackCatalogTopic;
}

export const defaultCommunityPackCatalogFilters: Readonly<CommunityPackCatalogFilters> = {
  compatibility: "",
  difficulty: "",
  kind: "",
  language: "",
  license: "",
  publisher: "",
  reviewRecency: "",
  topic: ""
};

export function isCommunityPackCompatible(
  entry: CommunityPackCatalogEntry,
  appVersion: string
): boolean {
  return compareCommunityPackSemVer(entry.minimumAppVersion, appVersion) <= 0;
}

export function filterCommunityPackCatalogEntries(
  entries: readonly CommunityPackCatalogEntry[],
  filters: CommunityPackCatalogFilters,
  appVersion: string,
  now: Date
): CommunityPackCatalogEntry[] {
  const recencyDays = filters.reviewRecency === "" ? undefined : Number(filters.reviewRecency);
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const reviewCutoff = recencyDays === undefined ? undefined : today - recencyDays * 86_400_000;

  return entries
    .filter((entry) => {
      const compatible = isCommunityPackCompatible(entry, appVersion);
      return (
        (filters.kind === "" || entry.kind === filters.kind) &&
        (filters.topic === "" || entry.topics.includes(filters.topic)) &&
        (filters.difficulty === "" || entry.difficulties.includes(filters.difficulty)) &&
        (filters.language === "" || entry.language === filters.language) &&
        (filters.publisher === "" || entry.publisher.id === filters.publisher) &&
        (filters.license === "" || entry.contentLicenseId === filters.license) &&
        (filters.compatibility === "" ||
          (filters.compatibility === "compatible" ? compatible : !compatible)) &&
        (reviewCutoff === undefined || Date.parse(`${entry.reviewDate}T00:00:00Z`) >= reviewCutoff)
      );
    })
    .sort(compareCatalogEntries);
}

function compareCatalogEntries(
  left: CommunityPackCatalogEntry,
  right: CommunityPackCatalogEntry
): number {
  return (
    compareText(left.title, right.title) ||
    compareText(left.publisher.name, right.publisher.name) ||
    compareText(left.id, right.id) ||
    compareCommunityPackSemVer(right.version, left.version)
  );
}

function compareText(left: string, right: string): number {
  return left === right ? 0 : left < right ? -1 : 1;
}
