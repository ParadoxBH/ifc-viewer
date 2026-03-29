import React from 'react';
import { Box, Typography, Stack, TextField, Divider, Button, Tooltip } from '@mui/material';
import { motion } from 'framer-motion';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import MapIcon from '@mui/icons-material/Map';
import type { GeospatialState } from '../types';

interface SidebarProps {
  state: GeospatialState;
  onChange: (newState: GeospatialState) => void;
  onReset: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ state, onChange, onReset }) => {
  const handleChange = (field: keyof GeospatialState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const numericValue = parseFloat(value);
    
    // For numeric fields, use the parsed value, otherwise use the string value
    if (typeof state[field] === 'number') {
      onChange({ ...state, [field]: isNaN(numericValue) ? 0 : numericValue });
    } else {
      onChange({ ...state, [field]: value });
    }
  };

  return (
    <Box
      component={motion.div}
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      sx={{
        width: 320,
        height: '100%',
        p: 3,
        borderLeft: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1} mb={3}>
        <MapIcon sx={{ color: 'primary.main' }} />
        <Typography variant="h6">Coordinate Edit</Typography>
      </Stack>

      <Typography variant="body2" sx={{ opacity: 0.6, mb: 3 }}>
        Adjust the geospatial parameters. These will be used to generate the <code>IfcMapConversion</code> entity upon export.
      </Typography>

      <Divider sx={{ mb: 3 }} />

      <Stack spacing={3}>
        <Box>
          <Stack direction="row" spacing={1} alignItems="center" mb={1}>
            <Typography variant="subtitle2">Eastings (X)</Typography>
            <Tooltip title="Global X coordinate of the local origin in the projected CRS.">
              <InfoOutlinedIcon sx={{ fontSize: 16, cursor: 'help', opacity: 0.5 }} />
            </Tooltip>
          </Stack>
          <TextField
            fullWidth
            size="small"
            type="number"
            value={state.eastings}
            onChange={handleChange('eastings')}
          />
        </Box>

        <Box>
          <Stack direction="row" spacing={1} alignItems="center" mb={1}>
            <Typography variant="subtitle2">Northings (Y)</Typography>
            <Tooltip title="Global Y coordinate of the local origin in the projected CRS.">
              <InfoOutlinedIcon sx={{ fontSize: 16, cursor: 'help', opacity: 0.5 }} />
            </Tooltip>
          </Stack>
          <TextField
            fullWidth
            size="small"
            type="number"
            value={state.northings}
            onChange={handleChange('northings')}
          />
        </Box>

        <Box>
          <Stack direction="row" spacing={1} alignItems="center" mb={1}>
            <Typography variant="subtitle2">Elevation (Z)</Typography>
            <Tooltip title="Orthogonal height (elevation) of the local origin.">
              <InfoOutlinedIcon sx={{ fontSize: 16, cursor: 'help', opacity: 0.5 }} />
            </Tooltip>
          </Stack>
          <TextField
            fullWidth
            size="small"
            type="number"
            value={state.orthogonalHeight}
            onChange={handleChange('orthogonalHeight')}
          />
        </Box>

        <Box>
          <Stack direction="row" spacing={1} alignItems="center" mb={1}>
            <Typography variant="subtitle2">Rotation (°)</Typography>
            <Tooltip title="Rotation angle between the local X-axis and the global Easting-axis.">
              <InfoOutlinedIcon sx={{ fontSize: 16, cursor: 'help', opacity: 0.5 }} />
            </Tooltip>
          </Stack>
          <TextField
            fullWidth
            size="small"
            type="number"
            value={state.rotation}
            onChange={handleChange('rotation')}
            helperText="Rotation in degrees"
          />
        </Box>

        <Box>
          <Stack direction="row" spacing={1} alignItems="center" mb={1}>
            <Typography variant="subtitle2">Scale</Typography>
            <Tooltip title="Map conversion scale (usually 1.0).">
              <InfoOutlinedIcon sx={{ fontSize: 16, cursor: 'help', opacity: 0.5 }} />
            </Tooltip>
          </Stack>
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

      <Box sx={{ mt: 4, mb: 2 }}>
        <Divider sx={{ mb: 2, opacity: 0.1 }}>
          <Typography variant="overline" color="primary" sx={{ px: 1 }}>CRS Definition</Typography>
        </Divider>
        
        <Stack spacing={2}>
          <Box>
            <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mb: 0.5 }}>CRS Name (EPSG)</Typography>
            <TextField
              fullWidth
              size="small"
              value={state.crsName}
              onChange={handleChange('crsName')}
              placeholder="e.g. EPSG:3857"
            />
          </Box>

          <Box>
            <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mb: 0.5 }}>Description</Typography>
            <TextField
              fullWidth
              size="small"
              multiline
              rows={2}
              value={state.crsDescription}
              onChange={handleChange('crsDescription')}
            />
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
            <Box>
              <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mb: 0.5 }}>Datum</Typography>
              <TextField
                fullWidth
                size="small"
                value={state.geodeticDatum}
                onChange={handleChange('geodeticDatum')}
              />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mb: 0.5 }}>Projection</Typography>
              <TextField
                fullWidth
                size="small"
                value={state.mapProjection}
                onChange={handleChange('mapProjection')}
              />
            </Box>
          </Box>
        </Stack>
      </Box>

      <Box sx={{ flexGrow: 1 }} />

      <Button
        variant="text"
        color="inherit"
        startIcon={<RefreshIcon />}
        onClick={onReset}
        sx={{ mt: 3, opacity: 0.7 }}
      >
        Reset Default
      </Button>
    </Box>
  );
};

export default Sidebar;
