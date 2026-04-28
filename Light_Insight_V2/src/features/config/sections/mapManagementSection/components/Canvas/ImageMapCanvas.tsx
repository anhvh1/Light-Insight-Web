import { ActionIcon, Box, Group, Paper, Stack, Text } from '@mantine/core';
import { IconFocus2, IconMapPin, IconX, IconZoomIn, IconZoomOut } from '@tabler/icons-react';
import { useMemo, type CSSProperties, type DragEvent } from 'react';
import type { MapCameraPositionRequest, MapLayoutResponse } from '../../api/types';
import * as Constants from '../../utils/constants';
import * as Geometry from '../../utils/geometry';

const {
  BASE_ICON_SIZE,
  ICON_ROTATION_OFFSET,
  HANDLE_SIZE,
  ROTATE_HANDLE_OFFSET,
  DEFAULT_ANGLE_DEGREES,
  DEFAULT_FOV_DEGREES,
  DEFAULT_ICON_SCALE,
  DEFAULT_RANGE_IMAGE,
  CAMERA_ICON_MAP
} = Constants;

const {
  clamp01,
  normalizeAngle,
  clampFov,
  buildImageSectorPoints,
  getImageSectorEdges
} = Geometry;

interface ImageMapCanvasProps {
  activeMap: MapLayoutResponse | null;
  resolvedImageUrl: string | null;
  isFullscreen: boolean;
  setIsFullscreen: (v: boolean) => void;
  imageNaturalSize: { width: number; height: number };
  setImageNaturalSize: (size: { width: number; height: number }) => void;
  imageView: { scale: number; translateX: number; translateY: number };
  setImageViewportNode: (node: HTMLDivElement | null) => void;

  positions: MapCameraPositionRequest[];
  selectedCameraId: string | null;

  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  onWheel: (event: React.WheelEvent<HTMLDivElement>) => void;

  startCameraDrag: (event: React.PointerEvent<HTMLDivElement>, id: string) => void;
  startRotateDrag: (event: React.PointerEvent<HTMLDivElement>, id: string) => void;
  startScaleDrag: (event: React.PointerEvent<HTMLDivElement>, id: string) => void;
  startFovDrag: (event: React.PointerEvent<HTMLDivElement>, id: string, side: 'left' | 'right') => void;
  removePosition: (id: string) => void;

  zoomImage: (factor: number, x: number, y: number) => void;
  resetImageView: () => void;
  viewportWidth: number;
  viewportHeight: number;

  resolveCameraLabel: (id: string) => string;
  t: (key: string, params?: any) => string;
}

export function ImageMapCanvas({
  activeMap,
  resolvedImageUrl,
  isFullscreen,
  setIsFullscreen,
  imageNaturalSize,
  setImageNaturalSize,
  imageView,
  setImageViewportNode,
  positions,
  selectedCameraId,
  onDrop,
  onPointerDown,
  onWheel,
  startCameraDrag,
  startRotateDrag,
  startScaleDrag,
  startFovDrag,
  removePosition,
  zoomImage,
  resetImageView,
  viewportWidth,
  viewportHeight,
  resolveCameraLabel,
  t
}: ImageMapCanvasProps) {
  const mapHasImage = Boolean(resolvedImageUrl);

  const imageFovShapes = useMemo(() => {
    if (!activeMap || imageNaturalSize.width <= 0 || imageNaturalSize.height <= 0) return [];
    const scale = Math.min(imageNaturalSize.width, imageNaturalSize.height);
    return positions
      .filter((p) => p.x != null && p.y != null)
      .map((p) => {
        const rangeValue = typeof p.range === 'number' ? p.range : DEFAULT_RANGE_IMAGE;
        const iconScale = p.iconScale ?? DEFAULT_ICON_SCALE;
        const angle = p.angleDegrees ?? DEFAULT_ANGLE_DEGREES;
        const fov = typeof p.fovDegrees === 'number' ? clampFov(p.fovDegrees) : DEFAULT_FOV_DEGREES;
        return {
          cameraId: p.cameraId,
          points: buildImageSectorPoints(
            (p.x ?? 0) * imageNaturalSize.width,
            (p.y ?? 0) * imageNaturalSize.height,
            angle,
            clamp01(rangeValue) * scale * iconScale,
            fov
          )
        };
      });
  }, [activeMap, imageNaturalSize, positions]);

  const containerStyles: CSSProperties = {
    position: 'relative',
    borderRadius: 16,
    border: '1px solid var(--border-dim)',
    background: 'var(--bg0)',
    overflow: 'hidden',
    height: isFullscreen ? 'calc(100vh - 160px)' : '100%',
    width: '100%',
    minHeight: 360
  };

  if (isFullscreen) {
    containerStyles.position = 'fixed';
    containerStyles.inset = '80px 64px';
    containerStyles.zIndex = 200;
    containerStyles.boxShadow = '0 16px 50px rgba(0,0,0,0.6)';
  }

  return (
    <>
      {isFullscreen && (
        <Box
          onClick={() => setIsFullscreen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
            zIndex: 199
          }}
        />
      )}
      <Box
        ref={setImageViewportNode}
        onDragOver={(event) => event.preventDefault()}
        onDrop={onDrop}
        onPointerDown={onPointerDown}
        onWheel={onWheel}
        style={containerStyles}
      >
        {!mapHasImage && (
          <Group h="100%" align="center" justify="center">
            <Stack gap={4} align="center">
              <IconMapPin size={32} style={{ color: 'var(--t2)' }} />
              <Text size="sm" style={{ color: 'var(--t2)' }}>
                Upload a floorplan image to start placing cameras.
              </Text>
            </Stack>
          </Group>
        )}
        {mapHasImage && (
          <>
            {/* The actual image container that pans and zooms */}
            <Box
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: imageNaturalSize.width,
                height: imageNaturalSize.height,
                transform: `translate(${imageView.translateX}px, ${imageView.translateY}px) scale(${imageView.scale})`,
                transformOrigin: 'top left',
                border: '1px solid var(--accent)', // Border hugs the image
                boxShadow: '0 0 20px rgba(0,0,0,0.3)',
                pointerEvents: 'none'
              }}
            >
              <img
                src={resolvedImageUrl ?? ''}
                alt={activeMap?.name ?? t('pages.maps.panel.mapAlt')}
                onLoad={(event) => {
                  const img = event.currentTarget;
                  if (img.naturalWidth && img.naturalHeight) {
                    setImageNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
                  }
                }}
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'block',
                  objectFit: 'fill'
                }}
                draggable={false}
              />

              {/* SVG Layer for FOVs */}
              <svg
                width="100%"
                height="100%"
                style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
              >
                {imageFovShapes.map((shape) => (
                  <polygon
                    key={shape.cameraId}
                    points={shape.points}
                    fill="rgba(0, 194, 255, 0.15)"
                    stroke="var(--accent)"
                    strokeWidth="1"
                  />
                ))}
              </svg>
            </Box>

            {/* Cameras Layer - Separate Box to avoid pointerEvents: none on icons */}
            <Box
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: imageNaturalSize.width,
                height: imageNaturalSize.height,
                transform: `translate(${imageView.translateX}px, ${imageView.translateY}px) scale(${imageView.scale})`,
                transformOrigin: 'top left',
                pointerEvents: 'none'
              }}
            >
              {positions.map((position) => {
                if (position.x == null || position.y == null) return null;
                const currentW = imageNaturalSize.width;
                const currentH = imageNaturalSize.height;

                const left = position.x * currentW;
                const top = position.y * currentH;
                const angle = position.angleDegrees ?? DEFAULT_ANGLE_DEGREES;
                const scale = position.iconScale ?? DEFAULT_ICON_SCALE;
                const fov = typeof position.fovDegrees === 'number' ? clampFov(position.fovDegrees) : DEFAULT_FOV_DEGREES;
                const iconSize = BASE_ICON_SIZE * scale;
                const label = resolveCameraLabel(position.cameraId);
                const isSelected = selectedCameraId === position.cameraId;
                const rangeValue = typeof position.range === 'number' ? position.range : DEFAULT_RANGE_IMAGE;
                const rangePixels = clamp01(rangeValue) * Math.min(currentW, currentH) * scale;
                const edges = getImageSectorEdges(left, top, angle, rangePixels, fov);
                const labelOffset = isSelected ? iconSize + ROTATE_HANDLE_OFFSET + HANDLE_SIZE + 8 : iconSize + 6;

                return (
                  <Box key={position.cameraId} style={{ position: 'relative', zIndex: isSelected ? 100 : 1 }}>
                    {isSelected && (<>
                      <Box
                        data-no-pan="true"
                        onPointerDown={(e) => startFovDrag(e, position.cameraId, 'left')}
                        style={{
                          position: 'absolute',
                          left: edges.left.x,
                          top: edges.left.y,
                          width: HANDLE_SIZE,
                          height: HANDLE_SIZE,
                          borderRadius: '50%',
                          background: 'var(--orange)',
                          border: '2px solid var(--bg0)',
                          transform: 'translate(-50%, -50%)',
                          cursor: 'pointer',
                          boxShadow: '0 0 10px var(--orange)',
                          pointerEvents: 'auto'
                        }}
                      />
                      <Box
                        data-no-pan="true"
                        onPointerDown={(e) => startFovDrag(e, position.cameraId, 'right')}
                        style={{
                          position: 'absolute',
                          left: edges.right.x,
                          top: edges.right.y,
                          width: HANDLE_SIZE,
                          height: HANDLE_SIZE,
                          borderRadius: '50%',
                          background: 'var(--orange)',
                          border: '2px solid var(--bg0)',
                          transform: 'translate(-50%, -50%)',
                          cursor: 'pointer',
                          boxShadow: '0 0 10px var(--orange)',
                          pointerEvents: 'auto'
                        }}
                      />
                    </>
                    )}
                    <Box
                      data-no-pan="true"
                      onPointerDown={(e) => startCameraDrag(e, position.cameraId)}
                      style={{
                        position: 'absolute',
                        left,
                        top,
                        transform: 'translate(-50%, -50%)',
                        cursor: 'grab',
                        pointerEvents: 'auto'
                      }}
                    >
                      {isSelected && (
                        <ActionIcon
                          data-no-pan="true"
                          size="sm"
                          color="red"
                          variant="filled"
                          style={{
                            position: 'absolute',
                            top: -ROTATE_HANDLE_OFFSET - HANDLE_SIZE - 8,
                            right: -ROTATE_HANDLE_OFFSET,
                            zIndex: 2,
                            backgroundColor: 'var(--red)',
                            pointerEvents: 'auto'
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            removePosition(position.cameraId);
                          }}
                        >
                          <IconX size={12} />
                        </ActionIcon>
                      )}
                      <Box style={{ position: 'relative', width: iconSize, height: iconSize }}>
                        <Box
                          key="icon-main"
                          data-no-pan="true"
                          onPointerDown={(e) => startCameraDrag(e, position.cameraId)}
                          style={{
                            width: iconSize,
                            height: iconSize,
                            background: `url(/${CAMERA_ICON_MAP[position.Icon || 'ipro-camera.svg'] || position.Icon || 'ipro-camera.svg'}) center / contain no-repeat`,
                            filter: isSelected ? 'drop-shadow(0 0 8px var(--accent))' : 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.45))',
                            transform: `rotate(${normalizeAngle(angle + ICON_ROTATION_OFFSET)}deg)`,
                            transformOrigin: 'center'
                          }}
                        />
                        {isSelected && (
                          <>
                            <Box style={{ position: 'absolute', inset: -4, border: '1.5px dashed var(--accent)', borderRadius: 8 }} />
                            <Box
                              data-no-pan="true"
                              onPointerDown={(e) => startRotateDrag(e, position.cameraId)}
                              style={{
                                position: 'absolute',
                                top: -ROTATE_HANDLE_OFFSET - HANDLE_SIZE,
                                left: iconSize / 2 - HANDLE_SIZE / 2,
                                width: HANDLE_SIZE,
                                height: HANDLE_SIZE,
                                borderRadius: '50%',
                                background: 'var(--accent)',
                                border: '2px solid var(--bg0)',
                                cursor: 'grab',
                                boxShadow: '0 0 8px var(--accent)',
                                pointerEvents: 'auto'
                              }}
                            />
                            {[0, 1, 2, 3].map((h) => {
                              const isLeft = h === 0 || h === 2;
                              const isTop = h === 0 || h === 1;
                              return (
                                <Box
                                  key={h}
                                  data-no-pan="true"
                                  onPointerDown={(e) => startScaleDrag(e, position.cameraId)}
                                  style={{
                                    position: 'absolute',
                                    width: HANDLE_SIZE,
                                    height: HANDLE_SIZE,
                                    background: 'var(--orange)',
                                    border: '2px solid var(--bg0)',
                                    borderRadius: 2,
                                    left: isLeft ? -HANDLE_SIZE / 2 : iconSize - HANDLE_SIZE / 2,
                                    top: isTop ? -HANDLE_SIZE / 2 : iconSize - HANDLE_SIZE / 2,
                                    cursor: 'nwse-resize',
                                    pointerEvents: 'auto'
                                  }}
                                />
                              );
                            })}
                          </>
                        )}
                      </Box>
                      {label && (
                        <Box
                          style={{
                            position: 'absolute',
                            bottom: labelOffset,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            padding: '2px 8px',
                            borderRadius: 4,
                            background: '#ffffff',
                            border: '1px solid rgba(0, 0, 0, 0.1)',
                            color: '#000000',
                            fontSize: 10,
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
                          }}
                        >
                          {label}
                        </Box>
                      )}
                    </Box>
                  </Box>
                );
              })}
            </Box>
            <Box style={{ position: 'absolute', top: 10, right: 10, zIndex: 10 }} data-no-pan="true">
              <Paper
                radius="sm"
                withBorder
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  backgroundColor: '#ffffff',
                  borderColor: '#cccccc',
                  overflow: 'hidden',
                  boxShadow: '0 1px 5px rgba(0,0,0,0.2)'
                }}
              >
                <ActionIcon
                  variant="subtle"
                  size={29}
                  onClick={() => zoomImage(1.1, (viewportWidth || 0) / 2, (viewportHeight || 0) / 2)}
                  style={{ color: '#000000', borderRadius: 0, borderBottom: '1px solid #eeeeee' }}
                  aria-label={t('components.map.zoomIn')}
                >
                  <IconZoomIn size={18} />
                </ActionIcon>
                <ActionIcon
                  variant="subtle"
                  size={29}
                  onClick={() => zoomImage(0.9, (viewportWidth || 0) / 2, (viewportHeight || 0) / 2)}
                  style={{ color: '#000000', borderRadius: 0, borderBottom: '1px solid #eeeeee' }}
                  aria-label={t('components.map.zoomOut')}
                >
                  <IconZoomOut size={18} />
                </ActionIcon>
                <ActionIcon
                  variant="subtle"
                  size={29}
                  onClick={resetImageView}
                  style={{ color: '#000000', borderRadius: 0 }}
                  aria-label={t('components.map.resetView')}
                >
                  <IconFocus2 size={18} />
                </ActionIcon>
              </Paper>
            </Box>
          </>
        )}
      </Box>
    </>
  );
}
