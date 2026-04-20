import { Button, Group, Modal, Select, Stack, Text, TextInput } from '@mantine/core';
import type { MapLayoutType } from '../../api/types';

interface MapModalsProps {
  // Create Modal
  createOpened: boolean;
  onCreateClose: () => void;
  newMapName: string;
  onNewMapNameChange: (value: string) => void;
  newMapType: MapLayoutType;
  onNewMapTypeChange: (value: MapLayoutType) => void;
  newMapParentId: string | null;
  onNewMapParentIdChange: (value: string | null) => void;
  parentOptions: { value: string; label: string }[];
  onCreateSubmit: () => void;
  isCreateLoading: boolean;

  // Edit Modal
  editOpened: boolean;
  onEditClose: () => void;
  editMapName: string;
  onEditMapNameChange: (value: string) => void;
  editMapType: MapLayoutType;
  onEditMapTypeChange: (value: MapLayoutType) => void;
  editMapParentId: string | null;
  onEditMapParentIdChange: (value: string | null) => void;
  editParentOptions: { value: string; label: string }[];
  onEditSubmit: () => void;
  isEditLoading: boolean;
  hasEditMap: boolean;

  // Delete Modal
  deleteOpened: boolean;
  onDeleteClose: () => void;
  deleteTargetName: string;
  onDeleteConfirm: () => void;
  isDeleteLoading: boolean;

  t: (key: string, params?: any) => string;
}

export function MapModals({
  createOpened,
  onCreateClose,
  newMapName,
  onNewMapNameChange,
  newMapType,
  onNewMapTypeChange,
  newMapParentId,
  onNewMapParentIdChange,
  parentOptions,
  onCreateSubmit,
  isCreateLoading,

  editOpened,
  onEditClose,
  editMapName,
  onEditMapNameChange,
  editMapType,
  onEditMapTypeChange,
  editMapParentId,
  onEditMapParentIdChange,
  editParentOptions,
  onEditSubmit,
  isEditLoading,
  hasEditMap,

  deleteOpened,
  onDeleteClose,
  deleteTargetName,
  onDeleteConfirm,
  isDeleteLoading,

  t
}: MapModalsProps) {
  const modalStyles = {
    content: { backgroundColor: 'var(--bg1)', border: '1px solid var(--border-dim)' },
    header: { backgroundColor: 'var(--bg1)', color: 'var(--t0)' }
  };

  const inputStyles = { 
    input: { backgroundColor: 'var(--bg3)', borderColor: 'var(--border-dim)', color: 'var(--t0)' } 
  };

  return (
    <>
      <Modal
        opened={createOpened}
        onClose={onCreateClose}
        title={t('pages.maps.modals.create.title')}
        size="md"
        styles={modalStyles}
      >
        <Stack gap="md">
          <TextInput
            label={t('pages.maps.fields.name')}
            placeholder={t('pages.maps.placeholders.mapName')}
            value={newMapName}
            onChange={(event) => onNewMapNameChange(event.currentTarget.value)}
            styles={inputStyles}
          />
          <Select
            label={t('pages.maps.fields.type')}
            data={[
              { value: 'Image', label: t('pages.maps.types.imageLabel') },
              { value: 'Geo', label: t('pages.maps.types.geoLabel') }
            ]}
            value={newMapType}
            onChange={(value) => onNewMapTypeChange((value as MapLayoutType) ?? 'Image')}
            styles={inputStyles}
          />
          <Select
            label={t('pages.maps.fields.parent')}
            placeholder={t('pages.maps.placeholders.rootMap')}
            data={parentOptions}
            value={newMapParentId}
            onChange={onNewMapParentIdChange}
            clearable
            styles={inputStyles}
          />
          <Group justify="flex-end" mt="md">
            <Button
              variant="filled"
              onClick={onCreateSubmit}
              disabled={newMapName.trim().length === 0}
              loading={isCreateLoading}
              style={{ backgroundColor: 'var(--accent)', color: 'var(--bg0)', fontWeight: 700 }}
            >
              {t('common.actions.create')}
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={editOpened}
        onClose={onEditClose}
        title={t('pages.maps.modals.edit.title')}
        size="md"
        styles={modalStyles}
      >
        <Stack gap="md">
          <TextInput
            label={t('pages.maps.fields.name')}
            value={editMapName}
            onChange={(event) => onEditMapNameChange(event.currentTarget.value)}
            styles={inputStyles}
          />
          <Select
            label={t('pages.maps.fields.type')}
            data={[
              { value: 'Image', label: t('pages.maps.types.imageLabel') },
              { value: 'Geo', label: t('pages.maps.types.geoLabel') }
            ]}
            value={editMapType}
            onChange={(value) => onEditMapTypeChange((value as MapLayoutType) ?? 'Image')}
            styles={inputStyles}
          />
          <Select
            label={t('pages.maps.fields.parent')}
            placeholder={t('pages.maps.placeholders.rootMap')}
            data={editParentOptions}
            value={editMapParentId}
            onChange={onEditMapParentIdChange}
            clearable
            styles={inputStyles}
          />
          <Group justify="flex-end" mt="md">
            <Button
              variant="filled"
              onClick={onEditSubmit}
              disabled={!hasEditMap || editMapName.trim().length === 0}
              loading={isEditLoading}
              style={{ backgroundColor: 'var(--accent)', color: 'var(--bg0)', fontWeight: 700 }}
            >
              {t('common.actions.save')}
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={deleteOpened}
        onClose={onDeleteClose}
        title={t('pages.maps.modals.delete.title')}
        size="md"
        styles={modalStyles}
      >
        <Stack gap="md">
          <Text size="sm" style={{ color: 'var(--t0)' }}>
            {t('pages.maps.modals.delete.message', { name: deleteTargetName })}
          </Text>
          <Group justify="flex-end" mt="md">
            <Button variant="subtle" color="gray" onClick={onDeleteClose}>
              {t('common.actions.cancel')}
            </Button>
            <Button
              color="red"
              onClick={onDeleteConfirm}
              loading={isDeleteLoading}
              style={{ backgroundColor: 'var(--red)', color: 'var(--t0)', fontWeight: 700 }}
            >
              {t('common.actions.delete')}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
