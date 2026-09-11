import type { InquiryLocationOption } from "./inquiryLocationFilter";

// Available for careers and manager assignments without creating a full site location.
const CAREER_ONLY_LOCATIONS: InquiryLocationOption[] = [
  { id: "turningstoneverona", name: "The Bunker Turning Stone" },
];

export function buildCareerLocationOptions(
  locations: Array<{ id?: unknown; name?: unknown }>,
): InquiryLocationOption[] {
  const options = locations.flatMap((location) => {
    const name = typeof location.name === "string" ? location.name.trim() : "";
    if (!name) return [];
    const id = typeof location.id === "string" && location.id.trim()
      ? location.id.trim()
      : name.replace(", NY", "").toLowerCase().replace(/\s+/g, "");
    return [{ id, name }];
  });

  for (const option of CAREER_ONLY_LOCATIONS) {
    if (!options.some((existing) =>
      existing.id === option.id ||
      existing.name.toLowerCase() === option.name.toLowerCase(),
    )) {
      options.push({ ...option });
    }
  }

  return options.sort((a, b) => a.name.localeCompare(b.name));
}
