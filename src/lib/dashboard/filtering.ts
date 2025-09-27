import type { CaseRecord, FeedFilterState } from "./types";
import { initialFeedFilterState } from "./types";

const searchableFields: Array<keyof CaseRecord> = [
  "incidentId",
  "incidentCategory",
  "incidentDescription",
  "location",
  "fullName",
  "resolution",
  "faultDetermination",
];

const normalize = (value: string) => value.trim().toLowerCase();

export function isFeedFilterActive(filter: FeedFilterState): boolean {
  return (
    filter.summary.trim().length > 0 ||
    filter.searchText.trim().length > 0 ||
    filter.categories.length > 0 ||
    filter.jurisdictions.length > 0 ||
    filter.incidentIds.length > 0 ||
    filter.injury !== null ||
    filter.propertyDamage !== null
  );
}

export function applyFeedFilter(cases: CaseRecord[], rawFilter: FeedFilterState | undefined): CaseRecord[] {
  if (!rawFilter) {
    return cases;
  }

  const filter = {
    ...initialFeedFilterState,
    ...rawFilter,
  } satisfies FeedFilterState;

  if (!isFeedFilterActive(filter)) {
    return cases;
  }

  const term = normalize(filter.searchText);
  const tokens = term.length > 0 ? term.split(/\s+/).filter(Boolean) : [];

  const normalizedCategories = filter.categories.map(normalize);
  const normalizedJurisdictions = filter.jurisdictions.map(normalize);
  const normalizedIncidentIds = filter.incidentIds.map(normalize);

  return cases.filter((record) => {
    if (normalizedIncidentIds.length > 0 && !normalizedIncidentIds.includes(normalize(record.incidentId))) {
      return false;
    }

    if (
      normalizedCategories.length > 0 &&
      !normalizedCategories.some((category) => normalize(record.incidentCategory) === category)
    ) {
      return false;
    }

    if (
      normalizedJurisdictions.length > 0 &&
      !normalizedJurisdictions.some((jurisdiction) => normalize(record.jurisdiction) === jurisdiction)
    ) {
      return false;
    }

    if (filter.injury !== null && record.injuryReported !== filter.injury) {
      return false;
    }

    if (filter.propertyDamage !== null && record.propertyDamage !== filter.propertyDamage) {
      return false;
    }

    if (tokens.length > 0) {
      const haystack = searchableFields
        .map((field) => normalize(String(record[field] ?? "")))
        .join(" ");

      const matchesAllTokens = tokens.every((token) => haystack.includes(token));
      if (!matchesAllTokens) {
        return false;
      }
    }

    return true;
  });
}

export function summarizeFeedFilter(filter: FeedFilterState): string {
  if (!isFeedFilterActive(filter)) {
    return "";
  }

  if (filter.summary.trim().length > 0) {
    return filter.summary.trim();
  }

  const parts: string[] = [];

  if (filter.categories.length > 0) {
    parts.push(`Categories: ${filter.categories.join(", ")}`);
  }

  if (filter.jurisdictions.length > 0) {
    parts.push(`Jurisdictions: ${filter.jurisdictions.join(", ")}`);
  }

  if (filter.injury !== null) {
    parts.push(filter.injury ? "Requires injury" : "Exclude injury cases");
  }

  if (filter.propertyDamage !== null) {
    parts.push(filter.propertyDamage ? "Requires property damage" : "Exclude property damage cases");
  }

  if (filter.incidentIds.length > 0) {
    parts.push(`Incident IDs: ${filter.incidentIds.join(", ")}`);
  }

  if (filter.searchText.trim().length > 0) {
    parts.push(`Text contains "${filter.searchText.trim()}"`);
  }

  return parts.join(" • ") || "Custom filter";
}
