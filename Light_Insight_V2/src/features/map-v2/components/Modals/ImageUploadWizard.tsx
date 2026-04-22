import React, { useState, useRef, useEffect } from 'react';
import { 
  Modal, 
  Button, 
  Group, 
  Stack, 
  Text, 
  Center, 
  Box, 
  Paper, 
  SimpleGrid
} from '@mantine/core';
import { 
  IconUpload, 
  IconPhoto, 
  IconPalette, 
  IconCheck, 
  IconAlertTriangle,
  IconRefresh
} from '@tabler/icons-react';

interface ImageUploadWizardProps {
  opened: boolean;
  onClose: () => void;
  onConfirm: (file: File) => void;
  isUploading: boolean;
  t: (key: string, params?: any) => string;
}

interface ValidationResult {
  id: string;
  label: string;
  passed: boolean;
  message: string;
  isLoading: boolean;
}

export function ImageUploadWizard({ opened, onClose, onConfirm, isUploading }: ImageUploadWizardProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [checks, setChecks] = useState<ValidationResult[]>([
    { id: 'size', label: 'Dung lượng file', passed: false, message: 'Đang kiểm tra...', isLoading: false },
    { id: 'dim', label: 'Kích thước chuẩn', passed: false, message: 'Đang kiểm tra...', isLoading: false },
  ]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clear state when modal closes
  useEffect(() => {
    if (!opened) {
      setFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setChecks([
        { id: 'size', label: 'Dung lượng file', passed: false, message: 'Đang kiểm tra...', isLoading: false },
        { id: 'dim', label: 'Kích thước chuẩn', passed: false, message: 'Đang kiểm tra...', isLoading: false },
      ]);
    }
  }, [opened]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
      runValidations(selectedFile, url);
    }
  };

  const updateCheck = (id: string, updates: Partial<ValidationResult>) => {
    setChecks(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const runValidations = async (imgFile: File, url: string) => {
    setChecks(prev => prev.map(c => ({ ...c, isLoading: true })));

    // 1. Size Check
    const sizeInMB = imgFile.size / 1024 / 1024;
    const sizePassed = sizeInMB < 10;
    updateCheck('size', {
      passed: sizePassed,
      isLoading: false,
      message: sizePassed 
        ? `Hợp lệ (${sizeInMB.toFixed(2)} MB)`
        : `Vượt quá 10MB (Hiện tại: ${sizeInMB.toFixed(2)} MB)`
    });

    // 2. Dimension Check
    const img = new Image();
    img.src = url;
    img.onload = () => {
      const idealW = 2912;
      const idealH = 1472;
      const margin = 200;
      const dimPassed = Math.abs(img.naturalWidth - idealW) <= margin && Math.abs(img.naturalHeight - idealH) <= margin;
      
      updateCheck('dim', {
        passed: dimPassed,
        isLoading: false,
        message: dimPassed 
          ? `Kích thước phù hợp (${img.naturalWidth}x${img.naturalHeight}px)`
          : `Khuyến nghị ${idealW}x${idealH}px (Hiện tại: ${img.naturalWidth}x${img.naturalHeight}px)`
      });
    };
  };

  const modalStyles = {
    content: { backgroundColor: '#161b2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', overflow: 'hidden' },
    header: { backgroundColor: '#161b2e', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '20px 24px' },
    title: { color: 'var(--t0)', fontWeight: 800, textTransform: 'uppercase' as const, fontSize: '14px', letterSpacing: '0.05em' },
    body: { padding: 0 }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="md">
          <Center w={36} h={36} style={{ backgroundColor: 'rgba(255, 140, 0, 0.1)', borderRadius: '10px' }}>
            <IconUpload size={20} color="var(--orange)" />
          </Center>
          <Stack gap={0}>
            <Text fw={800} size="sm">Tải bản đồ chuyên nghiệp</Text>
            <Text size="xs" style={{ color: 'var(--t2)' }}>Kiểm tra tiêu chuẩn hình ảnh trước khi lưu.</Text>
          </Stack>
        </Group>
      }
      size="xl"
      centered
      styles={modalStyles}
    >
      <Stack gap={0}>
        <Group align="stretch" gap={0} wrap="nowrap">
          {/* Left Side: Preview & Tips */}
          <Stack p="xl" style={{ flex: 1, borderRight: '1px solid rgba(255,255,255,0.05)' }} gap="xl">
            <Box 
              style={{ 
                aspectRatio: '16/9', 
                backgroundColor: 'rgba(0,0,0,0.2)', 
                borderRadius: '12px', 
                border: '2px dashed rgba(255,255,255,0.1)',
                position: 'relative',
                overflow: 'hidden',
                cursor: 'pointer'
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              {previewUrl ? (
                <img src={previewUrl} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Preview" />
              ) : (
                <Center h="100%">
                  <Stack align="center" gap="xs" style={{ opacity: 0.3 }}>
                    <IconPhoto size={48} />
                    <Text size="xs" fw={700} style={{ textTransform: 'uppercase' }}>Chưa chọn ảnh</Text>
                  </Stack>
                </Center>
              )}
              
              <Box 
                style={{ 
                  position: 'absolute', 
                  inset: 0, 
                  backgroundColor: 'rgba(0,0,0,0.6)', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  opacity: previewUrl ? 0 : 1,
                  transition: 'opacity 0.2s',
                  '&:hover': { opacity: 1 }
                }}
              >
                <Center w={48} h={48} style={{ backgroundColor: 'var(--orange)', borderRadius: '100%', color: 'white' }}>
                  <IconUpload size={24} />
                </Center>
                <Text mt="xs" size="xs" fw={800} style={{ color: 'white', textTransform: 'uppercase' }}>
                  {previewUrl ? 'Thay đổi ảnh' : 'Chọn ảnh bản đồ'}
                </Text>
              </Box>
              
              <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleFileChange} />
            </Box>

            {file && (
               <Group justify="space-between" px="xs">
                 <Text size="xs" fw={600} style={{ color: 'var(--t2)', fontFamily: 'monospace' }} truncate maw={300}>{file.name}</Text>
                 <Text size="xs" fw={800} style={{ color: 'var(--orange)' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</Text>
               </Group>
            )}

            <Paper p="md" radius="md" style={{ backgroundColor: 'rgba(255, 140, 0, 0.03)', border: '1px solid rgba(255, 140, 0, 0.1)' }}>
              <Group gap="xs" mb="xs">
                <IconPalette size={14} color="var(--orange)" />
                <Text size="xs" fw={900} style={{ color: 'var(--orange)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hướng dẫn tối ưu bản đồ</Text>
              </Group>
              <SimpleGrid cols={2} spacing="md">
                <Stack gap={4}>
                  <Group gap={6} align="flex-start" wrap="nowrap">
                    <Text size="xs" fw={900} style={{ color: 'var(--orange)' }}>01.</Text>
                    <Text size="xs" style={{ color: 'var(--t2)', lineHeight: 1.4 }}>Dung lượng file nên <strong style={{ color: 'var(--t1)' }}>nhỏ hơn 10MB</strong>.</Text>
                  </Group>
                </Stack>
                <Stack gap={4}>
                  <Group gap={6} align="flex-start" wrap="nowrap">
                    <Text size="xs" fw={900} style={{ color: 'var(--orange)' }}>02.</Text>
                    <Text size="xs" style={{ color: 'var(--t2)', lineHeight: 1.4 }}>Kích thước khuyến nghị <strong style={{ color: 'var(--t1)' }}>2912x1472px</strong>.</Text>
                  </Group>
                </Stack>
                <Stack gap={4}>
                  <Group gap={6} align="flex-start" wrap="nowrap">
                    <Text size="xs" fw={900} style={{ color: 'var(--orange)' }}>03.</Text>
                    <Text size="xs" style={{ color: 'var(--t2)', lineHeight: 1.4 }}>Sử dụng định dạng <strong style={{ color: 'var(--t1)' }}>JPG hoặc PNG</strong>.</Text>
                  </Group>
                </Stack>
                <Stack gap={4}>
                  <Group gap={6} align="flex-start" wrap="nowrap">
                    <Text size="xs" fw={900} style={{ color: 'var(--orange)' }}>04.</Text>
                    <Text size="xs" style={{ color: 'var(--t2)', lineHeight: 1.4 }}>Ưu tiên <strong style={{ color: 'var(--t1)' }}>tông màu tối</strong>.</Text>
                  </Group>
                </Stack>
              </SimpleGrid>
            </Paper>
          </Stack>

          {/* Right Side: Analysis */}
          <Stack p="xl" w={320} style={{ backgroundColor: 'rgba(255,255,255,0.01)' }} gap="xl">
            <Text size="xs" fw={900} style={{ color: 'var(--t2)', textTransform: 'uppercase', borderLeft: '2px solid var(--orange)', paddingLeft: '12px' }}>Phân tích tiêu chuẩn</Text>
            
            <Stack gap="md">
              {checks.map(check => (
                <Paper key={check.id} p="md" radius="md" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <Group justify="space-between" mb={4}>
                    <Text size="xs" fw={700} style={{ color: 'var(--t1)' }}>{check.label}</Text>
                    {check.isLoading ? (
                      <IconRefresh size={16} className="animate-spin" color="var(--orange)" />
                    ) : check.passed ? (
                      <IconCheck size={18} color="var(--green)" />
                    ) : (
                      <IconAlertTriangle size={18} color="var(--orange)" />
                    )}
                  </Group>
                  <Text size="xs" style={{ color: check.passed ? 'var(--t2)' : 'var(--orange)', lineHeight: 1.4 }}>{check.message}</Text>
                </Paper>
              ))}
            </Stack>

            <Box mt="auto" p="md" style={{ borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.05)', backgroundColor: 'rgba(255,255,255,0.01)' }}>
               <Text size="xs" style={{ color: 'var(--t3)', fontStyle: 'italic', textAlign: 'center' }}>
                 * Lưu ý: Các cảnh báo trên mang tính chất khuyến nghị để đạt hiệu quả thẩm mỹ tốt nhất.
               </Text>
            </Box>
          </Stack>
        </Group>

        {/* Footer */}
        <Group p="xl" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', backgroundColor: 'rgba(255,255,255,0.01)' }} grow gap="md">
          <Button 
            variant="subtle" 
            h={48} 
            onClick={onClose}
            styles={{ root: { color: 'var(--t2)', fontWeight: 800, textTransform: 'uppercase' } }}
          >
            Hủy bỏ
          </Button>
          <Button 
            onClick={() => file && onConfirm(file)}
            disabled={!file || isUploading}
            loading={isUploading}
            h={48}
            styles={{ root: { backgroundColor: 'var(--orange)', color: 'white', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', borderRadius: '10px' } }}
            leftSection={<IconUpload size={18} />}
          >
            Lưu và tải lên bản đồ
          </Button>
        </Group>
      </Stack>

      <style dangerouslySetInnerHTML={{ __html: `
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}} />
    </Modal>
  );
}
