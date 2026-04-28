import { Button, Center, Group, Modal, Select, Stack, Text, TextInput } from '@mantine/core';
import { IconTrash, IconAlertCircle, IconCircleCheck } from '@tabler/icons-react';
import type { MapLayoutType } from '../../api/types';

interface MapModalsProps {
  // Create Modal
  createOpened: boolean;
  onCreateClose: () => void;
  newMapName: string;
  onNewMapNameChange: (value: string) => void;
  newMapCode: string;
  onNewMapCodeChange: (value: string) => void;
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
  editMapCode: string;
  onEditMapCodeChange: (value: string) => void;
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

  // Response Modal
  responseOpened: boolean;
  onResponseClose: () => void;
  responseStatus: 'success' | 'error';
  responseText: string;

  t: (key: string, params?: any) => string;
}

export function MapModals({
  createOpened,
  onCreateClose,
  newMapName,
  onNewMapNameChange,
  newMapCode,
  onNewMapCodeChange,
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
  editMapCode,
  onEditMapCodeChange,
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

  responseOpened,
  onResponseClose,
  responseStatus,
  responseText,

  t
}: MapModalsProps) {
  const modalStyles = {
    content: { backgroundColor: '#161b2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' },
    header: { backgroundColor: '#161b2e', color: 'var(--t0)', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '16px 20px' },
    title: { fontWeight: 800, fontSize: '14px', textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
    close: { color: 'var(--t2)', '&:hover': { backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--t0)' } }
  };

  const inputStyles = { 
    label: { color: 'var(--t2)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' as const, marginBottom: '6px', letterSpacing: '0.03em' },
    input: { backgroundColor: 'rgba(0,0,0,0.2)', borderColor: 'rgba(255,255,255,0.1)', color: 'var(--t0)', fontSize: '13px', borderRadius: '8px', height: '42px', '&:focus': { borderColor: 'var(--accent)' } },
    dropdown: { backgroundColor: '#161b2e', borderColor: 'rgba(255,255,255,0.1)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' },
    option: { 
      fontSize: '13px', 
      color: 'var(--t1)',
      '&[data-selected]': { backgroundColor: 'var(--accent)', color: 'var(--bg0)' },
      '&[data-hovered]': { backgroundColor: 'rgba(255, 255, 255, 0.05)', color: 'var(--t0)' }
    }
  };

  return (
    <>
      {/* Create Modal */}
      <Modal
        opened={createOpened}
        onClose={onCreateClose}
        title={t('pages.maps.modals.create.title')}
        size="md"
        centered
        styles={modalStyles}
      >
        <Stack gap="xl" py="sm">
          <TextInput
            label={t('pages.maps.fields.name')}
            placeholder={t('pages.maps.placeholders.mapName')}
            value={newMapName}
            onChange={(event) => onNewMapNameChange(event.currentTarget.value)}
            styles={inputStyles}
            autoFocus
          />
          <TextInput
            label={t('pages.maps.fields.code')}
            placeholder="Mã bản đồ"
            value={newMapCode}
            onChange={(event) => onNewMapCodeChange(event.currentTarget.value)}
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
            styles={inputStyles}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="subtle" color="gray" onClick={onCreateClose} styles={{ root: { color: 'var(--t2)', fontWeight: 700 } }}>
              {t('common.actions.cancel')}
            </Button>
            <Button
              onClick={onCreateSubmit}
              disabled={newMapName.trim().length === 0 || newMapCode.trim().length === 0}
              loading={isCreateLoading}
              styles={{ root: { backgroundColor: 'var(--accent)', color: 'var(--bg0)', padding: '0 24px', height: '42px', borderRadius: '8px', fontWeight: 800, textTransform: 'uppercase' } }}
            >
              {t('common.actions.create')}
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Edit Modal */}
      <Modal
        opened={editOpened}
        onClose={onEditClose}
        title={t('pages.maps.modals.edit.title')}
        size="md"
        centered
        styles={modalStyles}
      >
        <Stack gap="xl" py="sm">
          <TextInput
            label={t('pages.maps.fields.name')}
            value={editMapName}
            onChange={(event) => onEditMapNameChange(event.currentTarget.value)}
            styles={inputStyles}
          />
          <TextInput
            label={t('pages.maps.fields.code')}
            value={editMapCode}
            onChange={(event) => onEditMapCodeChange(event.currentTarget.value)}
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
            styles={inputStyles}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="subtle" color="gray" onClick={onEditClose} styles={{ root: { color: 'var(--t2)', fontWeight: 700 } }}>
              {t('common.actions.cancel')}
            </Button>
            <Button
              onClick={onEditSubmit}
              disabled={!hasEditMap || editMapName.trim().length === 0}
              loading={isEditLoading}
              styles={{ root: { backgroundColor: 'var(--accent)', color: 'var(--bg0)', padding: '0 24px', height: '42px', borderRadius: '8px', fontWeight: 800, textTransform: 'uppercase' } }}
            >
              {t('common.actions.save')}
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        opened={deleteOpened}
        onClose={onDeleteClose}
        withCloseButton={false}
        size="sm"
        centered
        styles={{
          content: { ...modalStyles.content, padding: '24px' }
        }}
      >
        <Stack align="center" gap="lg">
          <Center w={64} h={64} style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: '100%', border: '2px solid rgba(239, 68, 68, 0.2)' }}>
            <IconTrash size={32} color="var(--red)" style={{ animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
          </Center>
          
          <Stack gap={4} align="center">
            <Text fw={800} size="lg" style={{ color: 'var(--t0)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {t('pages.maps.modals.delete.title')}
            </Text>
            <Text size="sm" style={{ color: 'var(--t2)', textAlign: 'center' }}>
              {t('pages.maps.modals.delete.message', { name: deleteTargetName })}
            </Text>
          </Stack>

          <Group grow w="100%" gap="md">
            <Button variant="subtle" onClick={onDeleteClose} styles={{ root: { color: 'var(--t2)', fontWeight: 700, '&:hover': { backgroundColor: 'rgba(255,255,255,0.05)' } } }}>
              {t('common.actions.cancel')}
            </Button>
            <Button
              onClick={onDeleteConfirm}
              loading={isDeleteLoading}
              styles={{ root: { backgroundColor: 'var(--red)', color: 'var(--t0)', fontWeight: 800, textTransform: 'uppercase', borderRadius: '8px', height: '42px' } }}
            >
              {t('common.actions.delete')}
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Response Modal (Success/Error) */}
      <Modal
        opened={responseOpened}
        onClose={onResponseClose}
        withCloseButton={false}
        size="sm"
        centered
        styles={{
          content: { ...modalStyles.content, padding: '32px' }
        }}
      >
        <Stack align="center" gap="xl">
          <Center w={80} h={80} style={{ 
            backgroundColor: responseStatus === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
            borderRadius: '100%',
            border: `2px solid ${responseStatus === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
          }}>
            {responseStatus === 'success' ? (
              <IconCircleCheck size={48} color="var(--green)" />
            ) : (
              <IconAlertCircle size={48} color="var(--red)" />
            )}
          </Center>

          <Stack gap={8} align="center">
            <Text fw={900} size="xl" style={{ 
              color: responseStatus === 'success' ? 'var(--green)' : 'var(--red)', 
              textTransform: 'uppercase', 
              letterSpacing: '0.1em' 
            }}>
              {responseStatus === 'success' ? 'THÀNH CÔNG' : 'THẤT BẠI'}
            </Text>
            <Text size="sm" fw={600} style={{ color: 'var(--t1)', textAlign: 'center', lineHeight: 1.5 }}>
              {responseText}
            </Text>
          </Stack>

          <Button 
            onClick={onResponseClose} 
            fullWidth 
            styles={{ 
              root: { 
                backgroundColor: 'rgba(255,255,255,0.05)', 
                color: 'var(--t0)', 
                fontWeight: 800, 
                textTransform: 'uppercase', 
                borderRadius: '8px', 
                height: '48px',
                border: '1px solid rgba(255,255,255,0.1)',
                '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' }
              } 
            }}
          >
            {t('pages.maps.modals.response.confirm')}
          </Button>
        </Stack>
      </Modal>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: .7; transform: scale(1.05); }
        }
      `}} />
    </>
  );
}
