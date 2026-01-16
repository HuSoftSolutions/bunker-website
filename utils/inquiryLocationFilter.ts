export type InquiryLocationOption = {
  id: string;
  name: string;
};

const resolveStringValue = (value: unknown, fallback = "") =>
  typeof value === "string" && value.trim() ? value.trim() : fallback;

export const buildInquiryLocationOptions = (
  locations: unknown,
): InquiryLocationOption[] => {
  if (!Array.isArray(locations)) {
    return [];
  }

  return locations
    .map((location) => {
      const record =
        location && typeof location === "object"
          ? (location as Record<string, unknown>)
          : {};
      return {
        id: resolveStringValue(record.id),
        name: resolveStringValue(record.name, "Location"),
      };
    })
    .filter((location) => location.id);
};

export const normalizeInquiryLocationValue = (value: unknown) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

export const matchesInquiryLocation = (
  inquiryLocation: unknown,
  selectedLocation: InquiryLocationOption | null,
) => {
  if (!selectedLocation) {
    return true;
  }
  const normalizedInquiry = normalizeInquiryLocationValue(inquiryLocation);
  if (!normalizedInquiry) {
    return false;
  }
  const normalizedName = normalizeInquiryLocationValue(selectedLocation.name);
  const normalizedId = normalizeInquiryLocationValue(selectedLocation.id);
  if (!normalizedName) {
    return false;
  }
  return (
    normalizedInquiry === normalizedName ||
    normalizedInquiry.includes(normalizedName) ||
    normalizedName.includes(normalizedInquiry) ||
    (normalizedId && normalizedInquiry === normalizedId)
  );
};

export const matchesAllowedInquiryLocations = (
  inquiryLocation: unknown,
  allowedLocations: InquiryLocationOption[],
) => {
  if (!allowedLocations.length) {
    return false;
  }
  return allowedLocations.some((location) =>
    matchesInquiryLocation(inquiryLocation, location),
  );
};
