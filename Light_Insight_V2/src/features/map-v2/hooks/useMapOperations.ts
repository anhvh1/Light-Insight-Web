import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import {
  createMap,
  deleteMap,
  getMap,
  getMapOptions,
  listMaps,
  saveMapCameras,
  updateMap,
  updateMapView,
  uploadMapImage
} from '../api/ingestor';
import type { MapLayoutRequest, MapCameraPositionRequest, MapViewRequest } from '../api/types';
import { useI18n } from '../i18n/I18nProvider';

export function useMapOperations(selectedMapId: string | null) {
  const queryClient = useQueryClient();
  const { t } = useI18n();

  const mapsQuery = useQuery({
    queryKey: ['maps'],
    queryFn: listMaps
  });

  const mapOptionsQuery = useQuery({
    queryKey: ['maps', 'options'],
    queryFn: getMapOptions
  });

  const mapDetailQuery = useQuery({
    queryKey: ['maps', selectedMapId],
    queryFn: () => getMap(selectedMapId ?? ''),
    enabled: Boolean(selectedMapId)
  });

  const createMapMutation = useMutation({
    mutationFn: createMap,
    onSuccess: (map) => {
      queryClient.invalidateQueries({ queryKey: ['maps'] });
      notifications.show({
        title: t('pages.maps.notifications.create.title'),
        message: t('pages.maps.notifications.create.message'),
        color: 'brand'
      });
      return map;
    },
    onError: (error: Error) => {
      notifications.show({
        title: t('pages.maps.notifications.createFailed.title'),
        message: error.message,
        color: 'red'
      });
    }
  });

  const updateMapMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: MapLayoutRequest }) =>
      updateMap(id, payload),
    onSuccess: (map) => {
      queryClient.invalidateQueries({ queryKey: ['maps'] });
      queryClient.invalidateQueries({ queryKey: ['maps', map.id] });
      notifications.show({
        title: t('pages.maps.notifications.update.title'),
        message: t('pages.maps.notifications.update.message', { name: map.name }),
        color: 'brand'
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: t('pages.maps.notifications.updateFailed.title'),
        message: error.message,
        color: 'red'
      });
    }
  });

  const deleteMapMutation = useMutation({
    mutationFn: (id: string) => deleteMap(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maps'] });
      notifications.show({
        title: t('pages.maps.notifications.delete.title'),
        message: t('pages.maps.notifications.delete.message'),
        color: 'brand'
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: t('pages.maps.notifications.deleteFailed.title'),
        message: error.message,
        color: 'red'
      });
    }
  });

  const uploadImageMutation = useMutation({
    mutationFn: (file: File) => uploadMapImage(selectedMapId ?? '', file),
    onSuccess: (map) => {
      queryClient.invalidateQueries({ queryKey: ['maps', selectedMapId] });
      notifications.show({
        title: t('pages.maps.notifications.imageUploaded.title'),
        message: t('pages.maps.notifications.imageUploaded.message', { name: map.name }),
        color: 'brand'
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: t('pages.maps.notifications.uploadFailed.title'),
        message: error.message,
        color: 'red'
      });
    }
  });

  const savePositionsMutation = useMutation({
    mutationFn: (payload: MapCameraPositionRequest[]) =>
      saveMapCameras(selectedMapId ?? '', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maps', selectedMapId] });
      notifications.show({
        title: t('pages.maps.notifications.positionsSaved.title'),
        message: t('pages.maps.notifications.positionsSaved.message'),
        color: 'brand'
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: t('pages.maps.notifications.positionsFailed.title'),
        message: error.message,
        color: 'red'
      });
    }
  });

  const saveGeoViewMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: MapViewRequest }) =>
      updateMapView(id, payload),
    onSuccess: (map) => {
      queryClient.invalidateQueries({ queryKey: ['maps'] });
      queryClient.setQueryData(['maps', map.id], (prev: any) => {
        if (!prev?.map) {
          return prev;
        }
        return { ...prev, map: { ...prev.map, ...map } };
      });
    }
  });

  return {
    mapsQuery,
    mapOptionsQuery,
    mapDetailQuery,
    createMapMutation,
    updateMapMutation,
    deleteMapMutation,
    uploadImageMutation,
    savePositionsMutation,
    saveGeoViewMutation
  };
}
