import { Badge, Group, Paper, ScrollArea, Stack, Text, TextInput } from '@mantine/core';
import { IconMap, IconSearch } from '@tabler/icons-react';
import type { CameraResponse } from '../../api/types';

interface DeviceListProps {
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
  cameras,
  search,
  onSearchChange,
  selectedCameraId,
  onSelectCamera,
  isMapActive,
  positionsByCamera,
  t
}: DeviceListProps) {
  return (
    <Stack gap="md" style={{ flex: 1, minHeight: 0 }}>
      <Group justify="space-between" align="center">
        <Text size="xs" fw={700} style={{ color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {t('pages.maps.sidebar.camerasTitle')}
        </Text>
        <Badge variant="light" color="blue" size="xs" style={{ backgroundColor: 'rgba(0, 194, 255, 0.1)', color: 'var(--accent)' }}>
          {cameras.length} {t('pages.maps.sidebar.devicesCount', { defaultValue: 'thiết bị' })}
        </Badge>
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
      <Text size="xs" style={{ color: 'var(--t2)', fontStyle: 'italic' }}>
        {t('pages.maps.sidebar.camerasHint')}
      </Text>
      <ScrollArea type="auto" style={{ flex: 1, minHeight: 120 }}>
        <Stack gap="xs">
          {cameras.map((camera) => {
            const isPlaced = positionsByCamera.has(camera.cameraId);
            const isSelected = selectedCameraId === camera.cameraId;
            const isDraggable = isMapActive;
            return (
              <Paper
                key={camera.cameraId}
                p="xs"
                radius="md"
                withBorder
                draggable={isDraggable}
                onDragStart={(event) => {
                  event.dataTransfer.setData('camera-id', camera.cameraId);
                }}
                onClick={() => onSelectCamera(camera.cameraId)}
                style={{
                  cursor: isDraggable ? 'grab' : 'pointer',
                  borderColor: isSelected ? 'var(--accent)' : 'var(--border-dim)',
                  backgroundColor: isSelected ? 'rgba(0, 194, 255, 0.05)' : (isPlaced ? 'rgba(0, 194, 255, 0.02)' : 'transparent'),
                  opacity: isPlaced ? 0.7 : 1,
                  transition: 'all 0.2s ease'
                }}
              >
                <Group justify="space-between" align="flex-start" gap="xs" wrap="nowrap">
                  <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                    <Text size="sm" fw={600} truncate style={{ color: isSelected ? 'var(--accent)' : 'var(--t0)' }}>
                      {camera.code?.trim() || t('pages.maps.sidebar.unnamedCamera')}
                    </Text>
                    <Text size="xs" style={{ color: 'var(--t2)' }}>
                      {camera.ipAddress}
                    </Text>
                  </Stack>
                  {isPlaced && (
                    <IconMap size={14} style={{ color: 'var(--accent)' }} />
                  )}
                </Group>
              </Paper>
            );
          })}
        </Stack>
      </ScrollArea>
    </Stack>
  );
}
