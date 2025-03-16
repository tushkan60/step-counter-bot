export const FormatDateRange = (weekNumber: number, year: number): string => {
  // Get the first day of the year
  const firstDayOfYear = new Date(year, 0, 1);

  // Calculate the day of the week for the first day of the year (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const dayOfWeek = firstDayOfYear.getDay();

  // Calculate the start of the first week (Monday)
  // If the first day of the year is not Monday, we need to adjust to the previous Monday
  const startOfFirstWeek = new Date(firstDayOfYear);
  startOfFirstWeek.setDate(firstDayOfYear.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

  // Calculate the start of the desired week
  const firstDayOfWeek = new Date(startOfFirstWeek);
  firstDayOfWeek.setDate(startOfFirstWeek.getDate() + (weekNumber - 1) * 7);

  // Calculate the end of the desired week (Sunday)
  const lastDayOfWeek = new Date(firstDayOfWeek);
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
