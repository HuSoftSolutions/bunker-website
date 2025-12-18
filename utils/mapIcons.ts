const PRIMARY_COLOR = "#C12126";

export const createLocationMarkerIcon = (maps: any) => ({
  path: maps.SymbolPath.BACKWARD_CLOSED_ARROW,
  scale: 6,
  fillColor: PRIMARY_COLOR,
  fillOpacity: 1,
  strokeColor: "#ffffff",
  strokeWeight: 2,
});

export const createUserMarkerIcon = (maps: any) => ({
  path: maps.SymbolPath.CIRCLE,
  scale: 9,
  fillColor: "#ffffff",
  fillOpacity: 1,
  strokeColor: PRIMARY_COLOR,
  strokeWeight: 3,
});

