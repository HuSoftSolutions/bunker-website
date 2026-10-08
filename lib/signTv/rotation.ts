export type RotationSettings = {
  tvMounted?: "portrait" | "landscape";
  tvRotationDegrees?: number;
  tvRotationDirection?: string;
};

export type Rotation = 0 | 90 | 180 | 270;

export function resolveRotation(settings: RotationSettings = {}): Rotation {
  if ([0, 90, 180, 270].includes(settings.tvRotationDegrees ?? -1)) {
    return settings.tvRotationDegrees as Rotation;
  }
  const match = settings.tvRotationDirection?.match(/rotate\(\s*(-?\d+)deg\s*\)/);
  const legacy = match ? ((Number(match[1]) % 360) + 360) % 360 : 270;
  // Landscape historically ignored the default left/right portrait rotation.
  if (settings.tvMounted !== "portrait") return legacy === 180 ? 180 : 0;
  return [0, 90, 180, 270].includes(legacy) ? legacy as Rotation : 270;
}

export function rotationSettings(degrees: Rotation): RotationSettings {
  return {
    tvRotationDegrees: degrees,
    tvMounted: degrees === 90 || degrees === 270 ? "portrait" : "landscape",
    tvRotationDirection: `translate(-50%, -50%) rotate(${degrees}deg)`,
  };
}

export function rotationStyle(settings: RotationSettings) {
  const degrees = resolveRotation(settings);
  const quarterTurn = degrees === 90 || degrees === 270;
  return {
    position: "fixed" as const,
    top: "50%",
    left: "50%",
    width: quarterTurn ? "100vh" : "100vw",
    height: quarterTurn ? "100vw" : "100vh",
    transform: `translate(-50%, -50%) rotate(${degrees}deg)`,
  };
}
