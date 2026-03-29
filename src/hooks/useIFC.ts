import { useState, useCallback } from 'react';
import { IFCLoader } from 'web-ifc-three';
import * as WEBIFC from 'web-ifc';
import { type GeospatialState, defaultGeospatialState } from '../types';

export const useIFC = () => {
  const [model, setModel] = useState<any>(null);
  const [loading, setLoading] = useState(false);
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
    // web-ifc returns an array of objects/values for RefLatitude/RefLongitude
    if (!dmsArray || !Array.isArray(dmsArray)) return 0;
    const d = dmsArray[0]?.value ?? 0;
    const m = dmsArray[1]?.value ?? 0;
    const s = dmsArray[2]?.value ?? 0;
    const ms = dmsArray[3]?.value ?? 0;
    const isNegative = d < 0;
    const decimal = Math.abs(d) + m / 60 + s / 3600 + ms / 3600000000;
    return isNegative ? -decimal : decimal;
  };

  // Helper to find the project's representation context (usually where the geospatial info is anchored)
  const findModelContext = async (modelID: number): Promise<number | null> => {
    try {
      const ifc = ifcLoader.ifcManager;
      const contexts = await ifc.getAllItemsOfType(modelID, WEBIFC.IFCGEOMETRICREPRESENTATIONCONTEXT, false);
      for (const ctxID of contexts) {
        const ctx = await ifc.getItemProperties(modelID, ctxID);
        // We look for the main 'Model' context
        if (ctx.ContextType?.value === 'Model') {
          return ctxID;
        }
      }
      return contexts.length > 0 ? contexts[0] : null;
    } catch (err) {
      console.error('Failed to find model context:', err);
      return null;
    }
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
        return {
          ...defaultGeospatialState,
          orthogonalHeight: site.RefElevation?.value || 0,
          latitude: site.RefLatitude?.value ? DMSToDecimal(site.RefLatitude.value) : defaultGeospatialState.latitude,
          longitude: site.RefLongitude?.value ? DMSToDecimal(site.RefLongitude.value) : defaultGeospatialState.longitude,
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
    if (!model) return;

    try {
      setLoading(true);
      const ifc = ifcLoader.ifcManager;
      const modelID = model.modelID;

      // 1. Convert rotation back to Abscissa/Ordinate
      const rotationInRadians = (state.rotation * Math.PI) / 180;
      const xAxisAbscissa = Math.cos(rotationInRadians);
      const xAxisOrdinate = Math.sin(rotationInRadians);

      // 2. Find or create georeferencing entities
      const mapConversions = await ifc.getAllItemsOfType(modelID, WEBIFC.IFCMAPCONVERSION, false);
      
      if (mapConversions.length > 0) {
        // Update existing record
        const mcID = mapConversions[0];
        const mc = await ifc.getItemProperties(modelID, mcID);
        
        mc.Eastings = { type: 4, value: state.eastings };
        mc.Northings = { type: 4, value: state.northings };
        mc.OrthogonalHeight = { type: 4, value: state.orthogonalHeight };
        mc.XAxisAbscissa = { type: 4, value: xAxisAbscissa };
        mc.XAxisOrdinate = { type: 4, value: xAxisOrdinate };
        mc.Scale = { type: 4, value: state.scale };

        await ifc.ifcAPI.WriteLine(modelID, mc);

        // Also update CRS if it exists
        if (mc.TargetCRS?.value) {
          const crs = await ifc.getItemProperties(modelID, mc.TargetCRS.value);
          crs.Name = { type: 1, value: state.crsName };
          crs.Description = { type: 1, value: state.crsDescription };
          crs.GeodeticDatum = { type: 1, value: state.geodeticDatum };
          crs.MapProjection = { type: 1, value: state.mapProjection };
          await ifc.ifcAPI.WriteLine(modelID, crs);
        }
      } else {
        // Create new records
        const contextID = await findModelContext(modelID);
        if (!contextID) {
          throw new Error('Could not find a suitable Geometric Representation Context for georeferencing.');
        }

        // 2a. Create Projected CRS
        // Args: Name, Description, GeodeticDatum, VerticalDatum, MapProjection, MapZone, MapUnit
        const crsID = (ifc.ifcAPI as any).CreateIfcEntity(modelID, WEBIFC.IFCPROJECTEDCRS,
          { type: 1, value: state.crsName },
          { type: 1, value: state.crsDescription },
          { type: 1, value: state.geodeticDatum },
          null,
          { type: 1, value: state.mapProjection },
          null,
          null
        );

        // 2b. Create Map Conversion
        // Args: SourceCRS, TargetCRS, Eastings, Northings, OrthogonalHeight, XAxisAbscissa, XAxisOrdinate, Scale
        (ifc.ifcAPI as any).CreateIfcEntity(modelID, WEBIFC.IFCMAPCONVERSION,
          { type: 5, value: contextID },
          { type: 5, value: crsID },
          { type: 4, value: state.eastings },
          { type: 4, value: state.northings },
          { type: 4, value: state.orthogonalHeight },
          { type: 4, value: xAxisAbscissa },
          { type: 4, value: xAxisOrdinate },
          { type: 4, value: state.scale }
        );
      }

      // 2c. Update IfcSite for Lat/Long
      const sites = await ifc.getAllItemsOfType(modelID, WEBIFC.IFCSITE, false);
      if (sites.length > 0) {
        const siteID = sites[0];
        const site = await ifc.getItemProperties(modelID, siteID);
        
        const latDMS = decimalToDMS(state.latitude);
        const lonDMS = decimalToDMS(state.longitude);

        site.RefLatitude = { type: 4, value: latDMS.map(v => ({ type: 2, value: v })) };
        site.RefLongitude = { type: 4, value: lonDMS.map(v => ({ type: 2, value: v })) };
        site.RefElevation = { type: 2, value: state.orthogonalHeight };

        await ifc.ifcAPI.WriteLine(modelID, site);
      }

      // 3. Export as blob
      const data = (ifc.ifcAPI as any).SaveModel(modelID);

      const blob = new Blob([data], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'geospatialized_model.ifc';
      link.click();
      setLoading(false);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed. See console for details.');
      setLoading(false);
    }
  }, [model, ifcLoader, findModelContext]);

  return { model, loading, loadIFC, loadIFCFromUrl, exportIFC };
};
