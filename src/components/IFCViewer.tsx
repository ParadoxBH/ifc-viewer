import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Grid, PerspectiveCamera, Center, Text } from '@react-three/drei';
import { Box, Typography } from '@mui/material';
import * as THREE from 'three';
import MapGround from './MapGround';

import type { GeospatialState } from '../types';

interface IFCViewerProps {
  model: THREE.Object3D | null;
  geospatial: GeospatialState;
}

const IFCModel: React.FC<{ model: THREE.Object3D, rotation: number }> = ({ model, rotation }) => {
  // Apply rotation to the model group
  // IFC rotation is usually around Z axis (Up in many GIS systems, but in Three.js check if it's Y-up or Z-up)
  // R3F default is Y-up. Most IFCs are Z-up. IFCLoader usually handles the conversion to Y-up.
  return <primitive object={model} rotation={[0, (rotation * Math.PI) / 180, 0]} />;
};

const IFCViewer: React.FC<IFCViewerProps> = ({ model, geospatial }) => {
  return (
    <Box sx={{ width: '100%', height: '100%', position: 'relative', background: 'radial-gradient(circle, #1a1a1a 0%, #0a0a0a 100%)' }}>
      <Canvas shadows={{ type: THREE.PCFShadowMap }} gl={{ antialias: true, logarithmicDepthBuffer: true }}>
        <PerspectiveCamera makeDefault position={[10, 10, 10]} fov={45} />
        
        <Suspense fallback={null}>
          <group>
            {model ? (
              <Center top>
                <IFCModel model={model} rotation={geospatial.rotation} />
              </Center>
            ) : (
              <Box3D />
            )}
          </group>

          <Environment preset="city" />
          <ambientLight intensity={0.5} />
          <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
          
            <Grid 
              infiniteGrid 
              fadeDistance={100} 
              fadeStrength={10} 
              cellSize={1} 
              sectionSize={10} 
              sectionThickness={1.5} 
              sectionColor="#444444" 
              cellColor="#222222" 
              position={[0, 0.01, 0]} // Slightly above map ground
            />
            
            <MapGround 
              latitude={geospatial.latitude} 
              longitude={geospatial.longitude} 
              rotation={geospatial.rotation} 
            />

          {/* North Arrow / Compass */}
          <group position={[5, 0, 5]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.5, 32]} />
              <meshBasicMaterial color="#222222" transparent opacity={0.5} />
            </mesh>
            <Text
              position={[0, 0.1, -0.6]}
              fontSize={0.4}
              color="red"
              anchorX="center"
              anchorY="middle"
              rotation={[-Math.PI / 2, 0, 0]}
            >
              N
            </Text>
            <mesh position={[0, 0.05, -0.3]} rotation={[-Math.PI / 2, 0, 0]}>
              <coneGeometry args={[0.1, 0.4, 4]} />
              <meshBasicMaterial color="#ff4444" />
            </mesh>
          </group>
          
          <ContactShadows position={[0, -0.01, 0]} opacity={0.4} scale={20} blur={24} far={4.5} />
        </Suspense>

        <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 1.75} />
      </Canvas>

      {!model && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          <Typography variant="h4" sx={{ opacity: 0.2, fontWeight: 800 }}>
            DROP IFC FILE HERE
          </Typography>
        </Box>
      )}
    </Box>
  );
};

// Placeholder when no model is loaded
const Box3D = () => (
  <mesh castShadow receiveShadow>
    <boxGeometry args={[1, 1, 1]} />
    <meshStandardMaterial color="#333333" roughness={0.1} metalness={0.8} />
  </mesh>
);

export default IFCViewer;
