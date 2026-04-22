import { ActionIcon, Group, Paper, ScrollArea, Stack, Tabs, Text, TextInput } from '@mantine/core';
import { IconFilter, IconMap, IconRefresh, IconVideo } from '@tabler/icons-react';
import type { CameraResponse, ConnectorResponse, MapLayoutResponse, MapLayoutType } from '../../api/types';
import type { MapTreeNode } from '../../utils/map-tree';
import { MapTree } from './MapTree';
import { DeviceList } from './DeviceList';

interface MapSidebarProps {
  mapTree: MapTreeNode[];
  selectedMapId: string | null;
  onSelectMap: (id: string) => void;
  onRefreshMaps: () => void;
  mapSearch: string;
  onMapSearchChange: (value: string) => void;
  onEditMap: (map: MapLayoutResponse) => void;
  onDeleteMap: (map: MapLayoutResponse) => void;
  resolveMapTypeLabel: (type?: MapLayoutType | null) => string;
  
  connectors: ConnectorResponse[];
  selectedConnectorId: string | null;
  onSelectConnector: (id: string | null) => void;
  isDevicesLoading: boolean;

  cameras: CameraResponse[];
  cameraSearch: string;
  onCameraSearchChange: (value: string) => void;
  selectedCameraId: string | null;
  onSelectCamera: (id: string) => void;
  isMapActive: boolean;
  positionsByCamera: Map<string, any>;
  
  t: (key: string, params?: any) => string;
}

export function MapSidebar({
  mapTree,
  selectedMapId,
  onSelectMap,
  onRefreshMaps,
  mapSearch,
  onMapSearchChange,
  onEditMap,
  onDeleteMap,
  resolveMapTypeLabel,
  connectors,
  selectedConnectorId,
  onSelectConnector,
  isDevicesLoading,
  cameras,
  cameraSearch,
  onCameraSearchChange,
  selectedCameraId,
  onSelectCamera,
  isMapActive,
  positionsByCamera,
  t
}: MapSidebarProps) {
  return (
    <Paper
      radius="lg"
      withBorder
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        minHeight: 0, 
        overflow: 'hidden',
        backgroundColor: 'var(--bg1)',
        borderColor: 'var(--border-dim)'
      }}
      w={320}
    >
      <Tabs defaultValue="maps" variant="pills" color="brand" styles={{
        root: { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 },
        panel: { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '16px' },
        list: { 
          padding: '8px', 
          borderBottom: '1px solid var(--border-dim)',
          backgroundColor: 'rgba(0,0,0,0.1)' 
        },
        tab: {
          fontWeight: 600,
          color: 'var(--t1)',
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: 'var(--bg3)',
            color: 'var(--t0)'
          },
          '&[data-active]': {
            backgroundColor: 'var(--accent)',
            color: 'var(--bg0)'
          }
        }
      }}>
        <Tabs.List grow>
          <Tabs.Tab value="maps" leftSection={<IconMap size={14} />}>
            {t('pages.maps.sidebar.mapsTitle')}
          </Tabs.Tab>
          <Tabs.Tab value="devices" leftSection={<IconVideo size={14} />}>
            {t('pages.maps.sidebar.camerasTitle')}
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="maps">
          <Stack gap="md" style={{ flex: 1, minHeight: 0 }}>
            <Group justify="space-between" align="center">
              <Text size="xs" fw={700} style={{ color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {t('pages.maps.sidebar.mapsTitle')}
              </Text>
              <ActionIcon
                variant="subtle"
                size="sm"
                color="gray"
                onClick={onRefreshMaps}
                aria-label={t('common.actions.refresh')}
              >
                <IconRefresh size={14} />
              </ActionIcon>
            </Group>
            <TextInput
              placeholder={t('pages.maps.sidebar.searchMapPlaceholder')}
              value={mapSearch}
              onChange={(event) => onMapSearchChange(event.currentTarget.value)}
              leftSection={<IconFilter size={14} style={{ color: 'var(--t2)' }} />}
              size="xs"
              styles={{
                input: { backgroundColor: 'var(--bg3)', borderColor: 'var(--border-dim)', color: 'var(--t0)' }
              }}
            />
            <ScrollArea type="auto" style={{ flex: 1, minHeight: 120 }}>
              <Stack gap="xs">
                {mapTree.length === 0 ? (
                  <Text size="xs" style={{ color: 'var(--t2)' }}>
                    {t('pages.maps.sidebar.emptyMaps')}
                  </Text>
                ) : (
                  <MapTree
                    nodes={mapTree}
                    selectedMapId={selectedMapId}
                    onSelect={onSelectMap}
                    onEdit={onEditMap}
                    onDelete={onDeleteMap}
                    resolveMapTypeLabel={resolveMapTypeLabel}
                  />
                )}
              </Stack>
            </ScrollArea>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="devices">
          <DeviceList
            connectors={connectors}
            selectedConnectorId={selectedConnectorId}
            onSelectConnector={onSelectConnector}
            isLoading={isDevicesLoading}
            cameras={cameras}
            search={cameraSearch}
            onSearchChange={onCameraSearchChange}
            selectedCameraId={selectedCameraId}
            onSelectCamera={onSelectCamera}
            isMapActive={isMapActive}
            positionsByCamera={positionsByCamera}
            t={t}
          />
        </Tabs.Panel>
      </Tabs>
    </Paper>
  );
}
