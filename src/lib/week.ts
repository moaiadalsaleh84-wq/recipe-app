/** The current Monday-to-Sunday week, used by the meal plan. */
export const weekDays = (() => {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return {
      index: i,
      short: d.toLocaleDateString('en-US', { weekday: 'short' }),
      long: d.toLocaleDateString('en-US', { weekday: 'long' }),
      date: d.getDate(),
      full: d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
      isToday: d.toDateString() === now.toDateString(),
    };
  });
})();
