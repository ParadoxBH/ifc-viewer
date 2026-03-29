import { useState, useCallback } from 'react';
import { IFCLoader } from 'web-ifc-three';
import * as WEBIFC from 'web-ifc';
import { type GeospatialState, defaultGeospatialState } from '../types';

export const useIFC = () => {
  const [model, setModel] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [originalFileContent, setOriginalFileContent] = useState<string | null>(null);
  const [ifcLoader] = useState(() => {
    const loader = new IFCLoader();
    loader.ifcManager.useWebWorkers(false);
    return loader;
  });

  // Helpers for Latitude/Longitude conversion (Decimal <-> DMS for IFC)
  const decimalToDMS = (decimal: number): number[] => {
    const absDecimal = Math.abs(decimal);
    const d = Math.floor(absDecimal);
    const m = Math.floor((absDecimal - d) * 60);
    const s = Math.floor(((absDecimal - d) * 60 - m) * 60);
    const ms = Math.round((((absDecimal - d) * 60 - m) * 60 - s) * 1000000);
    return [decimal < 0 ? -d : d, m, s, ms];
  };

  const DMSToDecimal = (dmsArray: any): number => {
    if (!dmsArray || !Array.isArray(dmsArray)) return 0;
    
    // Safely extract value whether it is a primitive number or an object {value: X, type: Y}
    const extract = (val: any) => (val !== null && typeof val === 'object' && 'value' in val) ? val.value : val;

    const d = Number(extract(dmsArray[0])) || 0;
    const m = Number(extract(dmsArray[1])) || 0;
    const s = Number(extract(dmsArray[2])) || 0;
    const ms = Number(extract(dmsArray[3])) || 0;
    
    const isNegative = d < 0;
    const decimal = Math.abs(d) + m / 60 + s / 3600 + ms / 3600000000;
    return isNegative ? -decimal : decimal;
  };


  // Function to extract geospatial data from the loaded model
  const extractGeospatialData = async (modelID: number): Promise<GeospatialState> => {
    try {
      const ifc = ifcLoader.ifcManager;
      
      // Look for IFCMAPCONVERSION (IFC4)
      const mapConversions = await ifc.getAllItemsOfType(modelID, WEBIFC.IFCMAPCONVERSION, false);
      if (mapConversions.length > 0) {
        const mc = await ifc.getItemProperties(modelID, mapConversions[0]);
        
        // Calculate rotation from XAxisAbscissa and XAxisOrdinate
        const abscissa = mc.XAxisAbscissa?.value || 1;
        const ordinate = mc.XAxisOrdinate?.value || 0;
        const rotationInRadians = Math.atan2(ordinate, abscissa);
        const rotationInDegrees = (rotationInRadians * 180) / Math.PI;

        // Try to find the CRS name
        let crsName = defaultGeospatialState.crsName;
        let crsDesc = defaultGeospatialState.crsDescription;
        let datum = defaultGeospatialState.geodeticDatum;
        let proj = defaultGeospatialState.mapProjection;

        if (mc.TargetCRS?.value) {
          const crs = await ifc.getItemProperties(modelID, mc.TargetCRS.value);
          crsName = crs.Name?.value || crsName;
          crsDesc = crs.Description?.value || crsDesc;
          datum = crs.GeodeticDatum?.value || datum;
          proj = crs.MapProjection?.value || proj;
        }

        let lat = defaultGeospatialState.latitude;
        let lon = defaultGeospatialState.longitude;

        // Fetch Site info for Lat/Long
        const sites = await ifc.getAllItemsOfType(modelID, WEBIFC.IFCSITE, false);
        if (sites.length > 0) {
          const site = await ifc.getItemProperties(modelID, sites[0]);
          if (site.RefLatitude?.value) lat = DMSToDecimal(site.RefLatitude.value);
          if (site.RefLongitude?.value) lon = DMSToDecimal(site.RefLongitude.value);
        }

        return {
          eastings: mc.Eastings?.value || 0,
          northings: mc.Northings?.value || 0,
          orthogonalHeight: mc.OrthogonalHeight?.value || 0,
          rotation: rotationInDegrees,
          scale: mc.Scale?.value || 1.0,
          crsName,
          crsDescription: crsDesc,
          geodeticDatum: datum,
          mapProjection: proj,
          latitude: lat,
          longitude: lon,
        };
      }

      // Fallback: Look for IFCSITE (Common in IFC2x3/4 for simple lat/long/alt)
      const sites = await ifc.getAllItemsOfType(modelID, WEBIFC.IFCSITE, false);
      if (sites.length > 0) {
        const site = await ifc.getItemProperties(modelID, sites[0]);
        const extract = (val: any) => (val !== null && typeof val === 'object' && 'value' in val) ? val.value : val;
        
        const latVal = extract(site.RefLatitude);
        const lonVal = extract(site.RefLongitude);
        const altVal = extract(site.RefElevation);

        return {
          ...defaultGeospatialState,
          orthogonalHeight: Number(altVal) || 0,
          latitude: latVal ? DMSToDecimal(latVal) : defaultGeospatialState.latitude,
          longitude: lonVal ? DMSToDecimal(lonVal) : defaultGeospatialState.longitude,
        };
      }
    } catch (err) {
      console.warn('Failed to extract geospatial data:', err);
    }
    return defaultGeospatialState;
  };

  const loadIFC = useCallback(async (file: File): Promise<GeospatialState | null> => {
    setLoading(true);
    await ifcLoader.ifcManager.setWasmPath('/wasm/');

    // Store original text for text-based surgery during export
    const text = await file.text();
    setOriginalFileContent(text);

    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      ifcLoader.load(url, async (ifcModel) => {
        setModel(ifcModel);
        setLoading(false);
        const state = await extractGeospatialData(ifcModel.modelID);
        resolve(state);
      }, undefined, (err) => {
        console.error(err);
        setLoading(false);
        resolve(null);
      });
    });
  }, [ifcLoader]);

  const loadIFCFromUrl = useCallback(async (url: string): Promise<GeospatialState | null> => {
    setLoading(true);
    await ifcLoader.ifcManager.setWasmPath('/wasm/');

    // For template URLs, we also need the text
    try {
      const response = await fetch(url);
      const text = await response.text();
      setOriginalFileContent(text);
    } catch (err) {
      console.warn('Failed to pre-cache IFC text from URL:', err);
    }

    return new Promise((resolve) => {
      ifcLoader.load(url, async (ifcModel) => {
        setModel(ifcModel);
        setLoading(false);
        const state = await extractGeospatialData(ifcModel.modelID);
        resolve(state);
      }, undefined, (err) => {
        console.error(err);
        setLoading(false);
        resolve(null);
      });
    });
  }, [ifcLoader]);

  const exportIFC = useCallback(async (state: GeospatialState) => {
    if (!originalFileContent) {
      alert('Arquivo original não encontrado na memória. Por favor, recarregue o arquivo IFC.');
      return;
    }

    try {
      setLoading(true);

      // Função cirúrgica para substituir argumentos no IFCSITE
      const updateIfcSite = (content: string) => {
        console.log('Starting surgical update of IFC text content...');
        
        // Regex mais flexível para encontrar a linha IFCSITE: #ID= IFCSITE(...)
        const ifcSiteRegex = /(#\d+\s*=\s*IFCSITE\s*\()([\s\S]*?)(\)\s*;\s*)/gi;
        
        let found = false;
        const newContent = content.replace(ifcSiteRegex, (_match, prefix, argsPart, suffix) => {
          found = true;
          const args: string[] = [];
          let current = '';
          let depth = 0;
          let inQuote = false;

          for (let i = 0; i < argsPart.length; i++) {
            const char = argsPart[i];
            if (char === "'" && (i === 0 || argsPart[i-1] !== "\\")) inQuote = !inQuote;
            if (!inQuote) {
              if (char === '(') depth++;
              if (char === ')') depth--;
            }
            if (char === ',' && depth === 0 && !inQuote) {
              args.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          args.push(current.trim());

          const latDMS = decimalToDMS(state.latitude).map(v => Math.round(v));
          const lonDMS = decimalToDMS(state.longitude).map(v => Math.round(v));

          if (args.length >= 12) {
            args[9] = `(${latDMS.join(',')})`;
            args[10] = `(${lonDMS.join(',')})`;
            args[11] = state.orthogonalHeight.toFixed(6);
          }
          return `${prefix}${args.join(',')}${suffix}`;
        });

        if (!found) console.warn('IFCSITE not found');
        return newContent;
      };

      const finalContent = updateIfcSite(originalFileContent);

      // Função cirúrgica secundária para IFCMAPCONVERSION (IFC4)
      const updateIfcMapConversion = (content: string) => {
        const mcRegex = /(#\d+\s*=\s*IFCMAPCONVERSION\s*\()([\s\S]*?)(\)\s*;\s*)/gi;
        
        let found = false;
        const newContent = content.replace(mcRegex, (_match, prefix, argsPart, suffix) => {
          found = true;
          const args: string[] = [];
          let current = '';
          let depth = 0;
          let inQuote = false;

          for (let i = 0; i < argsPart.length; i++) {
            const char = argsPart[i];
            if (char === "'" && (i === 0 || argsPart[i-1] !== "\\")) inQuote = !inQuote;
            if (!inQuote) {
              if (char === '(') depth++;
              if (char === ')') depth--;
            }
            if (char === ',' && depth === 0 && !inQuote) {
              args.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          args.push(current.trim());

          const rotationInRadians = (state.rotation * Math.PI) / 180;
          const xAxisAbscissa = Math.cos(rotationInRadians);
          const xAxisOrdinate = Math.sin(rotationInRadians);

          if (args.length >= 8) {
            args[2] = state.eastings.toFixed(6);
            args[3] = state.northings.toFixed(6);
            args[4] = state.orthogonalHeight.toFixed(6);
            args[5] = xAxisAbscissa.toFixed(8);
            args[6] = xAxisOrdinate.toFixed(8);
            args[7] = state.scale.toFixed(6);
          }
          return `${prefix}${args.join(',')}${suffix}`;
        });

        if (!found) console.warn('IFCMAPCONVERSION not found');
        return newContent;
      };

      const trulyFinalContent = updateIfcMapConversion(finalContent);

      const blob = new Blob([trulyFinalContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'georeferenced_model.ifc';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setLoading(false);
    } catch (err) {
      console.error('Export failed details:', err);
      alert('Falha na exportação. Verifique o console para detalhes.');
      setLoading(false);
    }
  }, [originalFileContent]);

  const getMetadataPreview = useCallback((state: GeospatialState) => {
    if (!originalFileContent) return null;
    
    const latDMS = decimalToDMS(state.latitude).map(v => Math.round(v));
    const lonDMS = decimalToDMS(state.longitude).map(v => Math.round(v));
    
    const rotationInRadians = (state.rotation * Math.PI) / 180;
    const xAxisAbscissa = Math.cos(rotationInRadians);
    const xAxisOrdinate = Math.sin(rotationInRadians);

    return {
      ifcSite: `IFCSITE(..., (${latDMS.join(',')}), (${lonDMS.join(',')}), ${state.orthogonalHeight.toFixed(2)}, ...)`,
      ifcMapConversion: `IFCMAPCONVERSION(..., ${state.eastings.toFixed(2)}, ${state.northings.toFixed(2)}, ${state.orthogonalHeight.toFixed(2)}, ${xAxisAbscissa.toFixed(4)}, ${xAxisOrdinate.toFixed(4)}, ...)`
    };
  }, [originalFileContent]);

  return { model, loading, loadIFC, loadIFCFromUrl, exportIFC, getMetadataPreview };
};
