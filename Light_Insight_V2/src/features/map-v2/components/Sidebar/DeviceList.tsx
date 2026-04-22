import { Center, Group, Loader, Paper, ScrollArea, Select, Stack, Text, TextInput } from '@mantine/core';
import { IconCheck, IconSearch } from '@tabler/icons-react';
import type { CameraResponse, ConnectorResponse } from '../../api/types';
import { useMemo } from 'react';

interface DeviceListProps {
  connectors: ConnectorResponse[];
  selectedConnectorId: string | null;
  onSelectConnector: (id: string | null) => void;
  isLoading: boolean;
  cameras: CameraResponse[];
  search: string;
  onSearchChange: (value: string) => void;
  selectedCameraId: string | null;
  onSelectCamera: (id: string) => void;
  isMapActive: boolean;
  positionsByCamera: Map<string, any>;
  t: (key: string, params?: any) => string;
}

export function DeviceList({
  connectors,
  selectedConnectorId,
  onSelectConnector,
  isLoading,
  cameras,
  search,
  onSearchChange,
  selectedCameraId,
  onSelectCamera,
  isMapActive,
  positionsByCamera,
  t
}: DeviceListProps) {
  const filteredCameras = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term 
      ? cameras.filter((c) => 
          (c.code || '').toLowerCase().includes(term) || 
          (c.name || '').toLowerCase().includes(term) ||
          c.ipAddress.toLowerCase().includes(term)
        ) 
      : cameras;
  }, [cameras, search]);

  const connectorOptions = useMemo(() => 
    connectors.map(c => ({ value: c.Id, label: c.Name })),
  [connectors]);

  return (
    <Stack gap="md" style={{ flex: 1, minHeight: 0 }}>
      <Group justify="space-between" align="center">
        <Text size="xs" fw={700} style={{ color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {t('pages.maps.sidebar.camerasTitle')}
        </Text>
        <Select
          placeholder="-- Hệ thống --"
          data={connectorOptions}
          value={selectedConnectorId}
          onChange={onSelectConnector}
          size="xs"
          searchable
          styles={{
            input: { backgroundColor: 'var(--bg3)', borderColor: 'var(--border-dim)', color: 'var(--t0)', width: '150px' },
            dropdown: { backgroundColor: 'var(--bg1)', borderColor: 'var(--border-dim)', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' },
            option: { 
              color: 'var(--t1)', 
              '&[data-selected]': { backgroundColor: 'var(--accent)', color: 'var(--bg0)' },
              '&[data-hovered]': { backgroundColor: 'rgba(255, 255, 255, 0.05)' }
            }
          }}
        />
      </Group>

      <TextInput
        placeholder={t('pages.maps.sidebar.searchCameraPlaceholder')}
        value={search}
        onChange={(event) => onSearchChange(event.currentTarget.value)}
        leftSection={<IconSearch size={14} style={{ color: 'var(--t2)' }} />}
        size="xs"
        styles={{
          input: { backgroundColor: 'var(--bg3)', borderColor: 'var(--border-dim)', color: 'var(--t0)' }
        }}
      />

      <ScrollArea type="auto" style={{ flex: 1, minHeight: 120 }}>
        {isLoading ? (
          <Center py="xl">
            <Stack align="center" gap="xs">
              <Loader size="sm" color="brand" />
              <Text size="xs" style={{ color: 'var(--t2)' }}>{t('common.loading')}</Text>
            </Stack>
          </Center>
        ) : filteredCameras.length === 0 ? (
          <Center py="xl">
            <Text size="xs" style={{ color: 'var(--t2)' }}>
              {selectedConnectorId ? t('pages.maps.sidebar.noDevicesFound') : t('pages.maps.sidebar.selectSystem')}
            </Text>
          </Center>
        ) : (
          <Stack gap="xs">
            {filteredCameras.map((camera) => {
              const isPlaced = positionsByCamera.has(camera.cameraId);
              const isSelected = selectedCameraId === camera.cameraId;
              const isDraggable = isMapActive && !isPlaced;
              
              return (
                <Paper
                  key={camera.cameraId}
                  p="xs"
                  radius="md"
                  withBorder
                  draggable={isDraggable}
                  onDragStart={(event) => {
                    if (isDraggable) {
                      event.dataTransfer.setData('camera-id', camera.cameraId);
                    }
                  }}
                  onClick={() => onSelectCamera(camera.cameraId)}
                  style={{
                    cursor: isDraggable ? 'grab' : (isPlaced ? 'not-allowed' : 'pointer'),
                    borderColor: isSelected ? 'var(--accent)' : 'var(--border-dim)',
                    backgroundColor: isSelected ? 'rgba(0, 194, 255, 0.05)' : 'transparent',
                    opacity: isPlaced ? 0.4 : 1,
                    transition: 'all 0.2s ease',
                    borderStyle: isPlaced ? 'dashed' : 'solid'
                  }}
                >
                  <Group justify="space-between" align="center" gap="xs" wrap="nowrap">
                    <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                      <Text size="sm" fw={600} truncate style={{ color: isSelected ? 'var(--accent)' : 'var(--t0)', textTransform: 'uppercase' }}>
                        {camera.name || camera.code || t('pages.maps.sidebar.unnamedCamera')}
                      </Text>
                      {camera.ipAddress && (
                        <Text size="xs" style={{ color: 'var(--t2)', fontFamily: 'monospace' }}>
                          {camera.ipAddress}
                        </Text>
                      )}
                    </Stack>
                    {isPlaced && (
                      <IconCheck size={14} style={{ color: 'var(--green)', flexShrink: 0 }} />
                    )}
                  </Group>
                </Paper>
              );
            })}
          </Stack>
        )}
      </ScrollArea>
    </Stack>
  );
}
