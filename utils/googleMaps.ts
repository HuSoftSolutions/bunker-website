declare global {
  interface Window {
    google?: any;
    __googleMapsApiPromise?: Promise<any>;
  }
}

export const loadGoogleMapsApi = (apiKey: string) => {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps can only load in the browser."));
  }

  if (window.google?.maps) {
    return Promise.resolve(window.google.maps);
  }

  if (window.__googleMapsApiPromise) {
    return window.__googleMapsApiPromise;
  }

  window.__googleMapsApiPromise = new Promise<any>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google?.maps) {
        resolve(window.google.maps);
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

