const { startOfWeek } = require('date-fns');

const getCustomWeekNumber = (date) => {
  const startDate = new Date(2026, 6, 27); // July 27, 2026 (Month is 0-indexed)
  const currentWeekStart = startOfWeek(date, { weekStartsOn: 1 });
  currentWeekStart.setHours(0,0,0,0);
  
  const diffTime = currentWeekStart.getTime() - startDate.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  return 1 + Math.floor(diffDays / 7);
};

console.log("July 27, 2026 =>", getCustomWeekNumber(new Date('2026-07-27T10:00:00')));
console.log("Aug 3, 2026 =>", getCustomWeekNumber(new Date('2026-08-03T10:00:00')));
console.log("Sept 9, 2026 =>", getCustomWeekNumber(new Date('2026-09-09T10:00:00')));
