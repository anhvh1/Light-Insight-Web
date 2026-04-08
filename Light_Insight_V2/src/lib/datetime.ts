export function toApiTimeFromDisplay(date: Date, displayOffsetMinutes: number): string {
  const apiDate = new Date(date.getTime() - displayOffsetMinutes * 60_000);
  return apiDate.toISOString();
}

