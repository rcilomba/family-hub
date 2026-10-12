function parseDateString(date: string) {
  const [year, month, day] = date.split('-').map(Number);

  return new Date(year, month - 1, day);
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat('sv-SE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(parseDateString(date));
}

export function formatDateRange(startDate: string, endDate: string) {
  if (startDate === endDate) {
    return formatDate(startDate);
  }

  return `${formatDate(startDate)} till ${formatDate(endDate)}`;
}
