export function formatMillimetersAsCentimeters(millimeters) {
  const centimeters = millimeters / 10;
  return String(Number(centimeters.toFixed(2)));
}
