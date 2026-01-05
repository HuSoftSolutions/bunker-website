declare global {
  interface Window {
    google?: unknown;
    __googleMapsApiPromise?: Promise<unknown>;
  }
}

export const loadGoogleMapsApi = (apiKey: string) => {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps can only load in the browser."));
  }

  const resolveMaps = () => {
    if (!window.google || typeof window.google !== "object") {
      return null;
    }
    const maps = (window.google as { maps?: unknown }).maps;
    return maps ?? null;
  };

  const existingMaps = resolveMaps();
  if (existingMaps) {
    return Promise.resolve(existingMaps);
  }

  if (window.__googleMapsApiPromise) {
    return window.__googleMapsApiPromise;
  }

  window.__googleMapsApiPromise = new Promise<unknown>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const maps = resolveMaps();
      if (maps) {
        resolve(maps);
      } else {
        reject(new Error("Google Maps failed to load."));
      }
    };
    script.onerror = () => {
      reject(new Error("Google Maps failed to load."));
    };
    document.head.append(script);
  });

  return window.__googleMapsApiPromise;
};
