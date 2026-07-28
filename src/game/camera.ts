export function getCoveringCameraZoom(
  viewportWidth: number,
  viewportHeight: number,
  contentWidth: number,
  contentHeight: number,
  minimumZoom = 1,
) {
  if (
    viewportWidth <= 0 ||
    viewportHeight <= 0 ||
    contentWidth <= 0 ||
    contentHeight <= 0
  ) {
    return minimumZoom;
  }

  return Math.max(
    minimumZoom,
    viewportWidth / contentWidth,
    viewportHeight / contentHeight,
  );
}
