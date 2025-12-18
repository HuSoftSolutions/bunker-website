export type GeoPoint = {
  lat: number;
  lng: number;
};

const toRadians = (value: number) => (value * Math.PI) / 180;

/**
 * Returns distance in miles between two geo points using the Haversine formula.
 */
export const getDistanceInMiles = (from: GeoPoint, to: GeoPoint) => {
  const earthRadiusMiles = 3958.8;
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(from.lat)) *
      Math.cos(toRadians(to.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusMiles * c;
};

export const isValidCoordinate = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

