import { ActionIcon, Box, Group, Paper, Stack, Text } from '@mantine/core';
import { IconEdit, IconTrash } from '@tabler/icons-react';
import type { MapLayoutResponse, MapLayoutType } from '../../api/types';
import type { MapTreeNode } from '../../utils/map-tree';

interface MapTreeProps {
  nodes: MapTreeNode[];
  selectedMapId: string | null;
  onSelect: (id: string) => void;
  onEdit: (map: MapLayoutResponse) => void;
  onDelete: (map: MapLayoutResponse) => void;
  resolveMapTypeLabel: (type?: MapLayoutType | null) => string;
  depth?: number;
}

export function MapTree({
  nodes,
  selectedMapId,
  onSelect,
  onEdit,
  onDelete,
  resolveMapTypeLabel,
  depth = 0
}: MapTreeProps) {
  return (
    <>
      {nodes.map((node) => {
        const isSelected = node.map.id === selectedMapId;
        return (
          <Box key={node.map.id}>
            <Paper
              p="xs"
              radius="md"
              withBorder
              onClick={() => onSelect(node.map.id)}
              style={{
                marginLeft: depth * 24,
                cursor: 'pointer',
                borderColor: isSelected ? 'var(--accent)' : 'var(--border-dim)',
                backgroundColor: isSelected ? 'rgba(0, 194, 255, 0.05)' : 'transparent',
                color: 'var(--t0)',
                transition: 'all 0.2s ease'
              }}
            >
              <Group justify="space-between" align="flex-start" gap="xs" wrap="nowrap">
                <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                  <Text size="sm" fw={600} truncate style={{ color: isSelected ? 'var(--accent)' : 'var(--t0)' }}>
                    {node.map.name}
                  </Text>
                  <Text size="xs" style={{ color: 'var(--t2)' }}>
                    {resolveMapTypeLabel(node.map.type)}
                  </Text>
                </Stack>
                <Group gap={4} wrap="nowrap">
                  <ActionIcon
                    variant="subtle"
                    size="sm"
                    color="blue"
                    onClick={(event) => {
                      event.stopPropagation();
                      onEdit(node.map);
                    }}
                    aria-label="Edit map"
                  >
                    <IconEdit size={14} />
                  </ActionIcon>
                  <ActionIcon
                    variant="subtle"
                    size="sm"
                    color="red"
                    onClick={(event) => {
                      event.stopPropagation();
                      onDelete(node.map);
                    }}
                    aria-label="Delete map"
                  >
                    <IconTrash size={14} />
                  </ActionIcon>
                </Group>
              </Group>
            </Paper>
            {node.children.length > 0 && (
              <Stack gap="xs" mt="xs">
                <MapTree
                  nodes={node.children}
                  selectedMapId={selectedMapId}
                  onSelect={onSelect}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  resolveMapTypeLabel={resolveMapTypeLabel}
                  depth={depth + 1}
                />
              </Stack>
            )}
          </Box>
        );
      })}
    </>
  );
}
