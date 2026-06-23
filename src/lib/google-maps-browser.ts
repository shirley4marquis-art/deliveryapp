type GoogleLatLng = {
  lat: () => number;
  lng: () => number;
};

export type GoogleAddressComponent = {
  long_name: string;
  short_name: string;
  types: string[];
};

export type GooglePlaceResult = {
  address_components?: GoogleAddressComponent[];
  formatted_address?: string;
  geometry?: {
    location?: GoogleLatLng;
  };
  name?: string;
  place_id?: string;
};

type GoogleMapInstance = {
  fitBounds: (bounds: GoogleLatLngBounds) => void;
};

type GoogleLatLngBounds = {
  extend: (point: { lat: number; lng: number }) => void;
};

type GoogleAutocomplete = {
  addListener: (eventName: "place_changed", handler: () => void) => void;
  getPlace: () => GooglePlaceResult;
};

type GoogleMapsApi = {
  maps: {
    Map: new (
      element: HTMLElement,
      options: {
        center: { lat: number; lng: number };
        zoom: number;
        mapTypeControl?: boolean;
        streetViewControl?: boolean;
        fullscreenControl?: boolean;
      },
    ) => GoogleMapInstance;
    Marker: new (options: {
      position: { lat: number; lng: number };
      map: GoogleMapInstance;
      title: string;
      label?: string;
    }) => unknown;
    Polyline: new (options: {
      path: Array<{ lat: number; lng: number }>;
      geodesic: boolean;
      strokeColor: string;
      strokeOpacity: number;
      strokeWeight: number;
      map: GoogleMapInstance;
    }) => unknown;
    LatLngBounds: new () => GoogleLatLngBounds;
    places?: {
      Autocomplete: new (
        input: HTMLInputElement,
        options: {
          componentRestrictions?: { country: string };
          fields?: string[];
          types?: string[];
        },
      ) => GoogleAutocomplete;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleMapsApi;
    royalRunsGoogleMapsLoaded?: Promise<void>;
  }
}

export function loadGoogleMaps(apiKey: string, libraries: string[] = []) {
  if (window.google?.maps) {
    return Promise.resolve();
  }

  if (window.royalRunsGoogleMapsLoaded) {
    return window.royalRunsGoogleMapsLoaded;
  }

  const libraryList = Array.from(new Set(["places", ...libraries]));
  const libraryParam = `&libraries=${encodeURIComponent(libraryList.join(","))}`;

  window.royalRunsGoogleMapsLoaded = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}${libraryParam}`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google Maps failed to load."));
    document.head.appendChild(script);
  });

  return window.royalRunsGoogleMapsLoaded;
}
