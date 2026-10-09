import { runTransaction } from "firebase/firestore";
import type Firebase from "@/lib/firebase/client";
import { FALLBACK_LOCATION_MAP } from "@/data/locationConfig";

export async function createLocation(
  firebase: Firebase,
  id: string,
  form: Record<string, unknown>,
) {
  const name = typeof form.name === "string" ? form.name.trim() : "";
  const locationId = id.trim().toLowerCase();
  if (!name || locationId.length > 80 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(locationId)) {
    throw new Error("Enter a location name and an ID of up to 80 lowercase letters, numbers, and hyphens.");
  }
  // Avoid inherited object keys as well as existing fallback locations.
  if (locationId in FALLBACK_LOCATION_MAP) {
    throw new Error("That location ID already exists or is reserved. Choose another ID.");
  }
  const images = Array.isArray(form.images) ? form.images : [];
  const image = typeof images[0] === "string" ? images[0].trim() : "";
  if (image) {
    let valid = false;
    try { valid = new URL(image).protocol === "https:"; } catch { /* invalid URL */ }
    if (!valid) throw new Error("Use a valid HTTPS URL for the cover image.");
  }
  await runTransaction(firebase.db, async (transaction) => {
    const reference = firebase.locationRef(locationId);
    const existing = await transaction.get(reference);
    if (existing.exists()) throw new Error("That location ID already exists. Choose another ID.");
    transaction.set(reference, {
      name,
      comingSoon: form.comingSoon !== false,
      city: typeof form.city === "string" ? form.city.trim() : "",
      openingMessage: typeof form.openingMessage === "string" ? form.openingMessage.trim() : "",
      images: image ? [image] : [],
    });
  });
  return locationId;
}
