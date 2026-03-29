import React from 'react';
import { AppBar, Toolbar, Typography, Button, Stack, Box, IconButton, Tooltip, Menu, MenuItem } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import FolderSpecialIcon from '@mui/icons-material/FolderSpecial';
import DownloadIcon from '@mui/icons-material/Download';
import PublicIcon from '@mui/icons-material/Public';
import GitHubIcon from '@mui/icons-material/GitHub';

interface HeaderProps {
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDownload: () => void;
  onTemplateSelect: (url: string) => void;
  isModelLoaded: boolean;
}

const Header: React.FC<HeaderProps> = ({ onUpload, onDownload, onTemplateSelect, isModelLoaded }) => {
  const [templateAnchor, setTemplateAnchor] = React.useState<null | HTMLElement>(null);

  const handleTemplateClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setTemplateAnchor(event.currentTarget);
  };

  const handleTemplateClose = (url?: string) => {
    setTemplateAnchor(null);
    if (url) onTemplateSelect(url);
  };
  return (
    <AppBar position="static" color="transparent" elevation={0} sx={{ borderBottom: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }}>
      <Toolbar>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ flexGrow: 1 }}>
          <PublicIcon sx={{ color: 'primary.main', fontSize: 32 }} />
          <Box>
            <Typography variant="h5" component="div">
              IFC <span style={{ color: '#00e5ff' }}>SPATIAL</span>
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.6, display: 'block', mt: -0.5 }}>
              Geospatial BIM Tool
            </Typography>
          </Box>
        </Stack>
        
        <Stack direction="row" spacing={2} alignItems="center">
          <Button
            variant="outlined"
            startIcon={<FolderSpecialIcon />}
            onClick={handleTemplateClick}
            sx={{ borderColor: 'rgba(255,255,255,0.3)', color: 'white' }}
          >
            Templates
          </Button>
          <Menu
            anchorEl={templateAnchor}
            open={Boolean(templateAnchor)}
            onClose={() => handleTemplateClose()}
          >
            <MenuItem onClick={() => handleTemplateClose('/template/test.ifc')}>
              Test Model (test.ifc)
            </MenuItem>
          </Menu>

          <Button
            component="label"
            variant="contained"
            startIcon={<CloudUploadIcon />}
            sx={{ 
              background: 'linear-gradient(45deg, #00e5ff 30%, #448aff 90%)',
              color: 'black'
            }}
          >
            Upload IFC
            <input type="file" accept=".ifc" hidden onChange={onUpload} />
          </Button>

          <Button
            variant="outlined"
            color="primary"
            startIcon={<DownloadIcon />}
            onClick={onDownload}
            disabled={!isModelLoaded}
            sx={{ borderColor: 'primary.main', '&:hover': { background: 'rgba(0, 229, 255, 0.1)' } }}
          >
            Download
          </Button>

          <Tooltip title="View Source on GitHub">
            <IconButton color="inherit" href="https://github.com" target="_blank">
              <GitHubIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
