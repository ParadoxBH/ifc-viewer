import React, { useMemo } from 'react';
import { useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { Plane } from '@react-three/drei';

interface MapGroundProps {
  latitude: number;
  longitude: number;
  rotation: number;
  zoom?: number;
}

// Slippy Map Math
const lon2tile = (lon: number, zoom: number) => {
  return (lon + 180) / 360 * Math.pow(2, zoom);
};

const lat2tile = (lat: number, zoom: number) => {
  return (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom);
};

const tile2lon = (x: number, z: number) => {
  return x / Math.pow(2, z) * 360 - 180;
};

const tile2lat = (y: number, z: number) => {
  const n = Math.PI - 2 * Math.PI * y / Math.pow(2, z);
  return 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
};

const MapTile: React.FC<{ x: number, y: number, z: number, size: number, offsetX: number, offsetY: number }> = ({ x, y, z, size, offsetX, offsetY }) => {
  const url = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
  const texture = useLoader(THREE.TextureLoader, url);
  
  return (
    <Plane 
      args={[size, size]} 
      rotation={[-Math.PI / 2, 0, 0]} 
      position={[offsetX, -0.05, offsetY]} // Slightly below ground to avoid Z-fighting
      receiveShadow
    >
      <meshStandardMaterial map={texture} transparent opacity={0.6} roughness={1} metalness={0} />
    </Plane>
  );
};

const MapGround: React.FC<MapGroundProps> = ({ latitude, longitude, rotation, zoom = 18 }) => {
  const tileInfo = useMemo(() => {
    const x = lon2tile(longitude, zoom);
    const y = lat2tile(latitude, zoom);
    
    const xBase = Math.floor(x);
    const yBase = Math.floor(y);
    
    // Calculate tile size in meters at this latitude
    const earthCircumference = 40075016.686;
    const tileSizeMeters = (earthCircumference * Math.cos(latitude * Math.PI / 180)) / Math.pow(2, zoom);

    // Calculate the offset of the (lat, lon) within the center tile
    const xFraction = x - xBase;
    const yFraction = y - yBase;
    
    const centerOffsetX = (xFraction - 0.5) * tileSizeMeters;
    const centerOffsetY = (yFraction - 0.5) * tileSizeMeters;

    const tiles = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        tiles.push({
          x: xBase + dx,
          y: yBase + dy,
          offsetX: dx * tileSizeMeters - centerOffsetX,
          offsetY: dy * tileSizeMeters - centerOffsetY
        });
      }
    }

    return { tiles, tileSizeMeters };
  }, [latitude, longitude, zoom]);

  return (
    <group rotation={[0, (rotation * Math.PI) / 180, 0]}>
      {tileInfo.tiles.map((t) => (
        <MapTile 
          key={`${t.x}-${t.y}`} 
          x={t.x} 
          y={t.y} 
          z={zoom} 
          size={tileInfo.tileSizeMeters} 
          offsetX={t.offsetX} 
          offsetY={t.offsetY} 
        />
      ))}
    </group>
  );
};

export default MapGround;
