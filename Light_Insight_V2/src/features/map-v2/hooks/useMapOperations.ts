import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createMap,
  deleteMap,
  deleteMapImage,
  getMap,
  getMapOptions,
  listConnectors,
  listDevicesByConnector,
  listMaps,
  saveMapCameras,
  updateMap,
  updateMapView,
  uploadMapImage
} from '../api/ingestor';
import type { MapLayoutRequest, MapCameraPositionRequest, MapViewRequest } from '../api/types';

export function useMapOperations(selectedMapId: string | null, selectedConnectorId?: string | null) {
  const queryClient = useQueryClient();

  const mapsQuery = useQuery({
    queryKey: ['maps'],
    queryFn: async () => {
      const res = await listMaps();
      return res?.Data || [];
    }
  });

  const connectorsQuery = useQuery({
    queryKey: ['connectors'],
    queryFn: async () => {
      const res = await listConnectors();
      return res?.Data || [];
    }
  });

  const devicesQuery = useQuery({
    queryKey: ['devices', selectedConnectorId],
    queryFn: async () => {
      const res = await listDevicesByConnector(selectedConnectorId!);
      return res?.Data || [];
    },
    enabled: Boolean(selectedConnectorId)
  });

  const mapOptionsQuery = useQuery({
    queryKey: ['maps', 'options'],
    queryFn: async () => {
      // API v1 trả về dữ liệu trực tiếp, không qua ApiResponse envelope
      const data = await getMapOptions();
      return data;
    }
  });

  const mapDetailQuery = useQuery({
    queryKey: ['maps', selectedMapId],
    queryFn: async () => {
      const res = await getMap(selectedMapId ?? '');
      return res?.Data;
    },
    enabled: Boolean(selectedMapId)
  });

  const createMapMutation = useMutation({
    mutationFn: createMap,
    onSuccess: (res) => {
      if (res?.Status === 1) {
        queryClient.invalidateQueries({ queryKey: ['maps'] });
      }
      return res;
    }
  });

  const updateMapMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: MapLayoutRequest }) =>
      updateMap(id, payload),
    onSuccess: (res, variables) => {
      if (res?.Status === 1) {
        queryClient.invalidateQueries({ queryKey: ['maps'] });
        queryClient.invalidateQueries({ queryKey: ['maps', variables.id] });
      }
    }
  });

  const deleteMapMutation = useMutation({
    mutationFn: (id: string) => deleteMap(id),
    onSuccess: (res) => {
      if (res?.Status === 1) {
        queryClient.invalidateQueries({ queryKey: ['maps'] });
      }
    }
  });

  const uploadImageMutation = useMutation({
    mutationFn: (file: File) => uploadMapImage(selectedMapId ?? '', file),
    onSuccess: (res) => {
      if (res?.Status === 1) {
        queryClient.invalidateQueries({ queryKey: ['maps', selectedMapId] });
      }
    }
  });

  const savePositionsMutation = useMutation({
    mutationFn: (payload: MapCameraPositionRequest[]) =>
      saveMapCameras(selectedMapId ?? '', payload),
    onSuccess: (res) => {
      if (res?.Status === 1) {
        queryClient.invalidateQueries({ queryKey: ['maps', selectedMapId] });
      }
    }
  });

  const deleteImageMutation = useMutation({
    mutationFn: () => deleteMapImage(selectedMapId ?? ''),
    onSuccess: (res) => {
      if (res?.Status === 1) {
        queryClient.invalidateQueries({ queryKey: ['maps', selectedMapId] });
      }
    }
  });

  const saveGeoViewMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: MapViewRequest }) =>
      updateMapView(id, payload),
    onSuccess: (res) => {
      if (res?.Status === 1) {
        const map = res.Data;
        queryClient.invalidateQueries({ queryKey: ['maps'] });
        queryClient.setQueryData(['maps', map.id], (prev: any) => {
          if (!prev?.map) {
            return prev;
          }
          return { ...prev, map: { ...prev.map, ...map } };
        });
      }
    }
  });

  return {
    mapsQuery,
    connectorsQuery,
    devicesQuery,
    mapOptionsQuery,
    mapDetailQuery,
    createMapMutation,
    updateMapMutation,
    deleteMapMutation,
    uploadImageMutation,
    deleteImageMutation,
    savePositionsMutation,
    saveGeoViewMutation
  };
}
