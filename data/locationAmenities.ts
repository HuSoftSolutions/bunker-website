export const AMENITY_ICONS = {
  TrackmanBaysSvg: "/assets/icons/TRACKMAN_Bays.svg",
  IndoorOutdoorBarSvg: "/assets/icons/Indoor-Outdoor_Bar.svg",
  OutdoorSeatingSvg: "/assets/icons/Outdoor_Seating.svg",
  OutdoorGrillSvg: "/assets/icons/Outdoor_Grill.svg",
  FullBarSvg: "/assets/icons/Full_Bar.svg",
  FullFoodSvg: "/assets/icons/Full_Food.svg",
  LightFoodSvg: "/assets/icons/Light_Food.svg",
  CateringSvg: "/assets/icons/Catering.svg",
  GolfLessonsSvg: "/assets/icons/Golf_Lessons.svg",
  EventsSvg: "/assets/icons/Events.svg",
  GiftCardsSvg: "/assets/icons/Gift_Cards.svg",
  HappyHourSvg: "/assets/icons/Happy_Hour.svg",
  DartsSvg: "/assets/icons/Darts.svg",
  LoungeSvg: "/assets/icons/Lounge.svg",
  TwoFloorsSvg: "/assets/icons/2_Floors.svg",
} as const;

export type AmenityIconKey = keyof typeof AMENITY_ICONS;

export type AmenityConfig = {
  icon: AmenityIconKey;
  label: string;
};

type LocationAmenityConfig = Record<string, AmenityConfig[]>;

export const LOCATION_AMENITIES: LocationAmenityConfig = {
  cliftonpark: [
    { icon: "TrackmanBaysSvg", label: "6 TRACKMAN Bays" },
    { icon: "IndoorOutdoorBarSvg", label: "Indoor/Outdoor Bar" },
    { icon: "OutdoorSeatingSvg", label: "Outdoor Seating" },
    { icon: "FullBarSvg", label: "Full Bar" },
    { icon: "FullFoodSvg", label: "Full Food Menu" },
    { icon: "DartsSvg", label: "Darts" },
    { icon: "CateringSvg", label: "Catering" },
    { icon: "GolfLessonsSvg", label: "Golf Lessons" },
    { icon: "EventsSvg", label: "Events" },
    { icon: "GiftCardsSvg", label: "Gift Cards" },
    { icon: "HappyHourSvg", label: "Happy Hour" },
  ],
  guilderland: [
    { icon: "TrackmanBaysSvg", label: "5 TRACKMAN Bays" },
    { icon: "FullBarSvg", label: "Full Bar" },
    { icon: "LightFoodSvg", label: "Light Food Menu" },
    { icon: "CateringSvg", label: "Catering" },
    { icon: "GolfLessonsSvg", label: "Golf Lessons" },
    { icon: "EventsSvg", label: "Events" },
    { icon: "GiftCardsSvg", label: "Gift Cards" },
    { icon: "LoungeSvg", label: "Lounge and Bar" },
    { icon: "HappyHourSvg", label: "Happy Hour" },
  ],
  latham: [
    { icon: "TrackmanBaysSvg", label: "7 TRACKMAN Bays" },
    { icon: "TrackmanBaysSvg", label: "2 Multi Sport Simulators" },
    { icon: "GolfLessonsSvg", label: "Golf Lessons" },
    { icon: "FullBarSvg", label: "Full Bar" },
    { icon: "FullFoodSvg", label: "Full Food Menu" },
    { icon: "CateringSvg", label: "Catering" },
    { icon: "TwoFloorsSvg", label: "2 Floors" },
    { icon: "EventsSvg", label: "Events" },
    { icon: "GiftCardsSvg", label: "Gift Cards" },
    { icon: "HappyHourSvg", label: "Happy Hour" },
  ],
  northgreenbush: [
    { icon: "TrackmanBaysSvg", label: "7 TRACKMAN Bays" },
    { icon: "IndoorOutdoorBarSvg", label: "Indoor/Outdoor Bar" },
    { icon: "TwoFloorsSvg", label: "2 Floors" },
    { icon: "OutdoorSeatingSvg", label: "Outdoor Seating" },
    { icon: "FullBarSvg", label: "Full Bar" },
    { icon: "FullFoodSvg", label: "Full Food Menu" },
    { icon: "CateringSvg", label: "Catering" },
    { icon: "GolfLessonsSvg", label: "Golf Lessons" },
    { icon: "EventsSvg", label: "Events" },
    { icon: "GiftCardsSvg", label: "Gift Cards" },
    { icon: "HappyHourSvg", label: "Happy Hour" },
  ],
  newhartford: [
    { icon: "TrackmanBaysSvg", label: "8 TRACKMAN Bays" },
    { icon: "FullBarSvg", label: "Full Bar" },
    { icon: "FullFoodSvg", label: "Full Food Menu" },
    { icon: "CateringSvg", label: "Catering" },
    { icon: "GolfLessonsSvg", label: "Golf Lessons" },
    { icon: "EventsSvg", label: "Events" },
    { icon: "GiftCardsSvg", label: "Gift Cards" },
    { icon: "HappyHourSvg", label: "Happy Hour" },
  ],
  mohawkharbor: [
    { icon: "TrackmanBaysSvg", label: "4 TRACKMAN Bays" },
    { icon: "IndoorOutdoorBarSvg", label: "Indoor/Outdoor Bar" },
    { icon: "OutdoorSeatingSvg", label: "Outdoor Seating" },
    { icon: "OutdoorGrillSvg", label: "Outdoor Grill" },
    { icon: "FullBarSvg", label: "Full Bar" },
    { icon: "FullFoodSvg", label: "Full Food Menu" },
    { icon: "DartsSvg", label: "Darts" },
    { icon: "CateringSvg", label: "Catering" },
    { icon: "GolfLessonsSvg", label: "Golf Lessons" },
    { icon: "EventsSvg", label: "Events" },
    { icon: "GiftCardsSvg", label: "Gift Cards" },
    { icon: "HappyHourSvg", label: "Happy Hour" },
  ],
  saratoga: [
    { icon: "TrackmanBaysSvg", label: "7 TRACKMAN Bays" },
    { icon: "FullBarSvg", label: "2 Full Bars" },
    { icon: "FullFoodSvg", label: "Full Food Menu" },
    { icon: "TwoFloorsSvg", label: "2 Floors" },
    { icon: "CateringSvg", label: "Catering" },
    { icon: "GolfLessonsSvg", label: "Golf Lessons" },
    { icon: "EventsSvg", label: "Events" },
    { icon: "DartsSvg", label: "Darts" },
    { icon: "GiftCardsSvg", label: "Gift Cards" },
  ],
} as const;

export type LocationAmenitiesMap = typeof LOCATION_AMENITIES;

export type ResolvedAmenity = {
  icon: string;
  title: string;
};

export function resolveAmenities(
  amenities: AmenityConfig[] | undefined,
): ResolvedAmenity[] {
  if (!amenities?.length) {
    return [];
  }

  return amenities.map(({ icon, label }) => ({
    icon: AMENITY_ICONS[icon],
    title: label,
  }));
}

export function getAmenitiesForLocation(
  locationId: keyof LocationAmenitiesMap,
): ResolvedAmenity[] {
  return resolveAmenities(LOCATION_AMENITIES[locationId]);
}
