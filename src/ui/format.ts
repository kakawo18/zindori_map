export function formatDistance(meters: number): string {
  return meters >= 1000 ? `${(meters / 1000).toFixed(2)} km` : `${Math.round(meters)} m`;
}

export function formatArea(squareMeters: number): string {
  return squareMeters >= 10000
    ? `${(squareMeters / 10000).toFixed(2)} ha`
    : `${Math.round(squareMeters)} ㎡`;
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes >= 60) {
    return `${Math.floor(minutes / 60)}時間${minutes % 60}分`;
  }
  return `${minutes}分${String(seconds).padStart(2, '0')}秒`;
}

export function formatPoints(points: number): string {
  return points.toLocaleString('ja-JP');
}
