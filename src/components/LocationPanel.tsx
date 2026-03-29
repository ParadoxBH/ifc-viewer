import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Stack, 
  TextField, 
  Button, 
  Tooltip, 
  Accordion, 
  AccordionSummary, 
  AccordionDetails,
  IconButton
} from '@mui/material';
import { motion } from 'framer-motion';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RefreshIcon from '@mui/icons-material/Refresh';
import MapIcon from '@mui/icons-material/Map';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PublicIcon from '@mui/icons-material/Public';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import SettingsInputComponentIcon from '@mui/icons-material/SettingsInputComponent';

import type { GeospatialState } from '../types';

interface LocationPanelProps {
  state: GeospatialState;
  onChange: (newState: GeospatialState) => void;
  onReset: () => void;
}

const LocationPanel: React.FC<LocationPanelProps> = ({ state, onChange, onReset }) => {
  const [expanded, setExpanded] = useState<string | false>('geographic');

  const handleAccordionChange = (panel: string) => (_event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false);
  };

  const handleChange = (field: keyof GeospatialState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const numericValue = parseFloat(value);
    
    if (typeof state[field] === 'number') {
      onChange({ ...state, [field]: isNaN(numericValue) ? 0 : numericValue });
    } else {
      onChange({ ...state, [field]: value });
    }
  };

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        onChange({
          ...state,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      }, (err) => {
        console.error('Geolocation failed:', err);
        alert('Could not get current location: ' + err.message);
      });
    }
  };

  const openInMaps = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${state.latitude},${state.longitude}`;
    window.open(url, '_blank');
  };

  return (
    <Box
      component={motion.div}
      initial={{ x: 320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 320, opacity: 0 }}
      sx={{
        width: 340,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderLeft: '1px solid rgba(255,255,255,0.1)',
        bgcolor: 'background.paper',
        zIndex: 10,
      }}
    >
      <Box sx={{ p: 3, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box 
            sx={{ 
              p: 1, 
              borderRadius: 2, 
              bgcolor: 'rgba(0, 229, 255, 0.1)',
              color: 'primary.main',
              display: 'flex'
            }}
          >
            <MapIcon fontSize="small" />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontSize: '1.2rem', fontWeight: 800, color: 'primary.main' }}>Location Settings</Typography>
            <Typography variant="caption" color="text.secondary">Georeferencing & Projections</Typography>
          </Box>
        </Stack>
      </Box>

      <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 1 }}>
        
        {/* SECTION 1: MAP PROJECTION */}
        <Accordion 
          expanded={expanded === 'projection'} 
          onChange={handleAccordionChange('projection')}
          sx={{ mb: 1 }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <PrecisionManufacturingIcon sx={{ fontSize: 20, opacity: 0.7 }} />
              <Typography variant="subtitle2">Map Projection</Typography>
            </Stack>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2.5}>
              <Box>
                <Typography variant="caption" sx={{ opacity: 0.7, mb: 1, display: 'block' }}>Eastings (X)</Typography>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  value={state.eastings}
                  onChange={handleChange('eastings')}
                />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ opacity: 0.7, mb: 1, display: 'block' }}>Northings (Y)</Typography>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  value={state.northings}
                  onChange={handleChange('northings')}
                />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ opacity: 0.7, mb: 1, display: 'block' }}>Elevation (Z)</Typography>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  value={state.orthogonalHeight}
                  onChange={handleChange('orthogonalHeight')}
                />
              </Box>
              <Stack direction="row" spacing={2}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" sx={{ opacity: 0.7, mb: 1, display: 'block' }}>Rotation (°)</Typography>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    value={state.rotation}
                    onChange={handleChange('rotation')}
                  />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" sx={{ opacity: 0.7, mb: 1, display: 'block' }}>Scale</Typography>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    value={state.scale}
                    onChange={handleChange('scale')}
                    inputProps={{ step: 0.0001 }}
                  />
                </Box>
              </Stack>
            </Stack>
          </AccordionDetails>
        </Accordion>

        {/* SECTION 2: GEOGRAPHIC LOCATION */}
        <Accordion 
          expanded={expanded === 'geographic'} 
          onChange={handleAccordionChange('geographic')}
          sx={{ mb: 1 }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <PublicIcon sx={{ fontSize: 20, opacity: 0.7 }} />
              <Typography variant="subtitle2">Geographic Location</Typography>
            </Stack>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2.5}>
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="caption" sx={{ opacity: 0.7 }}>Latitude (DD)</Typography>
                  <Tooltip title="Get Current Location">
                    <IconButton size="small" onClick={handleGetCurrentLocation} sx={{ color: 'primary.main' }}>
                      <MyLocationIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                </Stack>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  value={state.latitude}
                  onChange={handleChange('latitude')}
                  inputProps={{ step: 0.000001 }}
                />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ opacity: 0.7, mb: 1, display: 'block' }}>Longitude (DD)</Typography>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  value={state.longitude}
                  onChange={handleChange('longitude')}
                  inputProps={{ step: 0.000001 }}
                />
              </Box>
              <Button 
                variant="outlined" 
                size="small" 
                startIcon={<OpenInNewIcon />}
                fullWidth
                onClick={openInMaps}
                sx={{ mt: 1, borderColor: 'rgba(255,255,255,0.1)', color: 'text.secondary' }}
              >
                View in Google Maps
              </Button>
            </Stack>
          </AccordionDetails>
        </Accordion>

        {/* SECTION 3: CRS DEFINITION */}
        <Accordion 
          expanded={expanded === 'crs'} 
          onChange={handleAccordionChange('crs')}
          sx={{ mb: 1 }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <SettingsInputComponentIcon sx={{ fontSize: 20, opacity: 0.7 }} />
              <Typography variant="subtitle2">CRS Definition</Typography>
            </Stack>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              <Box>
                <Typography variant="caption" sx={{ opacity: 0.7, mb: 1, display: 'block' }}>CRS Name (EPSG)</Typography>
                <TextField
                  fullWidth
                  size="small"
                  value={state.crsName}
                  onChange={handleChange('crsName')}
                  placeholder="e.g. EPSG:3857"
                />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ opacity: 0.7, mb: 1, display: 'block' }}>Description</Typography>
                <TextField
                  fullWidth
                  size="small"
                  multiline
                  rows={2}
                  value={state.crsDescription}
                  onChange={handleChange('crsDescription')}
                />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ opacity: 0.7, mb: 1, display: 'block' }}>Datum</Typography>
                <TextField
                  fullWidth
                  size="small"
                  value={state.geodeticDatum}
                  onChange={handleChange('geodeticDatum')}
                />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ opacity: 0.7, mb: 1, display: 'block' }}>Projection</Typography>
                <TextField
                  fullWidth
                  size="small"
                  value={state.mapProjection}
                  onChange={handleChange('mapProjection')}
                />
              </Box>
            </Stack>
          </AccordionDetails>
        </Accordion>

      </Box>

      <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <Button
          fullWidth
          variant="text"
          color="inherit"
          startIcon={<RefreshIcon />}
          onClick={onReset}
          sx={{ opacity: 0.6, fontSize: '0.8rem' }}
        >
          Reset to Defaults
        </Button>
      </Box>
    </Box>
  );
};

export default LocationPanel;
