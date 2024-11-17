export const FormatDateRange = (weekNumber: number, year: number): string => {
  // Get first day of the year
  const firstDayOfYear = new Date(year, 0, 1);
  // Get first day of the week
  const firstDayOfWeek = new Date(firstDayOfYear.getTime());
  firstDayOfWeek.setDate(firstDayOfYear.getDate() + (weekNumber - 1) * 7);
  // Get last day of the week
  const lastDayOfWeek = new Date(firstDayOfWeek.getTime());
  lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6);

  // Format dates
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
    });
  };

  return `${formatDate(firstDayOfWeek)} - ${formatDate(lastDayOfWeek)}`;
};
