import { dailyLessons } from '@/content/craving-practices';
import { localDateSchema } from '@/shared/journey/domain';

export function lessonForDay(day: string) {
  localDateSchema.parse(day);
  const index = Math.floor(Date.parse(day + 'T12:00:00Z') / 86400000) % dailyLessons.length;
  return dailyLessons[index];
}
