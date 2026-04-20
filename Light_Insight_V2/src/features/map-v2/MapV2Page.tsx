import { useQuery } from '@tanstack/react-query';
import { MapLayoutManagerPanel } from './components/MapLayoutManagerPanel';
import { listCameras } from './api/ingestor';
import { I18nProvider } from './i18n/I18nProvider';
import { Center, Loader, Stack, Text } from '@mantine/core';

export default function MapV2Page() {
  const { data: cameras, isLoading, error } = useQuery({
    queryKey: ['cameras'],
    queryFn: listCameras
  });

  if (isLoading) {
    return (
      <Center h="100vh">
        <Stack align="center" gap="md">
          <Loader size="lg" color="brand" />
          <Text size="sm" className="muted-text">Loading map resources...</Text>
        </Stack>
      </Center>
    );
  }

  const safeCameras = Array.isArray(cameras) ? cameras : [];

  if (error) {
    console.error('Error loading cameras:', error);
  }

  return (
    <I18nProvider>
      <MapLayoutManagerPanel cameras={safeCameras} />
    </I18nProvider>
  );
}
