const capturedAtFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric"
});

export function formatCapturedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Captured time unavailable";
  }
  return capturedAtFormatter.format(date);
}
