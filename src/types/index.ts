export interface GeospatialState {
  eastings: number;
  northings: number;
  orthogonalHeight: number;
  rotation: number; // In degrees for the UI
  scale: number;
  crsName: string;
  crsDescription: string;
  geodeticDatum: string;
  mapProjection: string;
  latitude: number;
  longitude: number;
}

export const defaultGeospatialState: GeospatialState = {
  eastings: 0,
  northings: 0,
  orthogonalHeight: 0,
  rotation: 0,
  scale: 1.0,
  crsName: 'EPSG:3857',
  crsDescription: 'WGS 84 / Pseudo-Mercator -- Spherical Mercator',
  geodeticDatum: 'WGS 84',
  mapProjection: 'Web Mercator',
  latitude: -23.5505, // Default São Paulo
  longitude: -46.6333,
};
