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

        return {
          eastings: mc.Eastings?.value || 0,
          northings: mc.Northings?.value || 0,
          orthogonalHeight: mc.OrthogonalHeight?.value || 0,
          rotation: rotationInDegrees,
          scale: mc.Scale?.value || 1.0,
        };
      }

      // Fallback: Look for IFCSITE (Common in IFC2x3/4 for simple lat/long/alt)
      const sites = await ifc.getAllItemsOfType(modelID, WEBIFC.IFCSITE, false);
      if (sites.length > 0) {
        const site = await ifc.getItemProperties(modelID, sites[0]);
        // Note: site.RefLatitude and site.RefLongitude are arrays [deg, min, sec, microsec]
        // This is not a projected coordinate system, but we can treat elevation as height
        return {
          ...defaultGeospatialState,
          orthogonalHeight: site.RefElevation?.value || 0,
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

      // 2. We need to find or create the IfcMapConversion entity
      // For simplicity in this tool, we will try to update an existing one or just notify the complexity
      // Updating the raw model memory:
      const mapConversions = await ifc.getAllItemsOfType(modelID, WEBIFC.IFCMAPCONVERSION, false);
      
      if (mapConversions.length > 0) {
        const mcID = mapConversions[0];
        const mc = await ifc.getItemProperties(modelID, mcID);
        
        // Update values
        mc.Eastings = { type: 4, value: state.eastings };
        mc.Northings = { type: 4, value: state.northings };
        mc.OrthogonalHeight = { type: 4, value: state.orthogonalHeight };
        mc.XAxisAbscissa = { type: 4, value: xAxisAbscissa };
        mc.XAxisOrdinate = { type: 4, value: xAxisOrdinate };
        mc.Scale = { type: 4, value: state.scale };

        await ifc.ifcAPI.WriteLine(modelID, mc);
      } else {
        // Here we would normally create a new IfcMapConversion and IfcProjectedCRS
        // This requires deep knowledge of the IFC hierarchy (Project -> Context -> Conversion)
        // For this version, let's warn that we only update existing records or we'd need more complex logic
        console.log("No existing MapConversion found to update. New creation logic would go here.");
        alert("This version only updates existing MapConversion records. Future versions will support creating new georeferencing contexts.");
      }

      // 3. Export as blob
      const data = await ifc.ifcAPI.ExportModelAsIFC(modelID);
      const blob = new Blob([data], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'spatialized_model.ifc';
      link.click();
      setLoading(false);
    } catch (err) {
      console.error('Export failed:', err);
      setLoading(false);
    }
  }, [model, ifcLoader]);

  return { model, loading, loadIFC, loadIFCFromUrl, exportIFC };
};
