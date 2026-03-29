export interface GeospatialState {
  eastings: number;
  northings: number;
  orthogonalHeight: number;
  rotation: number; // In degrees for the UI
  scale: number;
}

export const defaultGeospatialState: GeospatialState = {
  eastings: 0,
  northings: 0,
  orthogonalHeight: 0,
  rotation: 0,
  scale: 1.0,
};
