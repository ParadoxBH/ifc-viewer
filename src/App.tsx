import React, { useState } from 'react';
import { Box, Typography, LinearProgress, Paper } from '@mui/material';
import { AnimatePresence } from 'framer-motion';
import Header from './components/Header';
import LocationPanel from './components/LocationPanel';
import IFCViewer from './components/IFCViewer';
import { useIFC } from './hooks/useIFC';
import type { GeospatialState } from './types';
import { defaultGeospatialState } from './types';

const App: React.FC = () => {
  const { model, loading, loadIFC, loadIFCFromUrl, exportIFC, getMetadataPreview } = useIFC();
  const [geospatial, setGeospatial] = useState<GeospatialState>(defaultGeospatialState);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      loadIFC(file).then((initialState) => {
        if (initialState) {
          setGeospatial(initialState);
        }
      });
    }
  };

  const handleDownload = () => {
    if (model) {
      exportIFC(geospatial);
    }
  };

  const handleTemplateSelect = (url: string) => {
    loadIFCFromUrl(url).then((initialState: GeospatialState | null) => {
      if (initialState) {
        setGeospatial(initialState);
      }
    });
  };

  const handleReset = () => {
    setGeospatial(defaultGeospatialState);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw' }}>
      <Header 
        onUpload={handleFileUpload} 
        onDownload={handleDownload} 
        onTemplateSelect={handleTemplateSelect}
        isModelLoaded={!!model} 
      />

      {loading && (
        <LinearProgress 
          sx={{ 
            height: 2, 
            background: 'rgba(0, 229, 255, 0.1)',
            '& .MuiLinearProgress-bar': { background: '#00e5ff' }
          }} 
        />
      )}

      <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
        <Box sx={{ flexGrow: 1, position: 'relative' }}>
          <IFCViewer model={model} geospatial={geospatial} />
          
          {/* Overlay info box when model is loaded */}
          {model && (
            <AnimatePresence>
              <Paper
                key="info"
                sx={{
                  position: 'absolute',
                  bottom: 24,
                  left: 24,
                  p: 2,
                  zIndex: 2,
                  maxWidth: 300,
                  opacity: 0.8,
                }}
              >
                <Typography variant="overline" color="primary">SYSTEM STATUS</Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  IFC model loaded correctly. The 3D view shows the local engineering frame.
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.5 }}>
                  The geospatial edits will be applied to the export file.
                </Typography>
              </Paper>
            </AnimatePresence>
          )}
        </Box>

        <AnimatePresence>
          <LocationPanel 
            state={geospatial} 
            onChange={setGeospatial} 
            onReset={handleReset} 
            getMetadataPreview={getMetadataPreview}
          />
        </AnimatePresence>
      </Box>
    </Box>
  );
};

export default App;
