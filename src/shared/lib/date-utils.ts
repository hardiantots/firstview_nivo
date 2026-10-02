/**
 * Utility functions for date calculations and formatting
 */

import { differenceInDays, format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';

/**
 * Calculate days since a given date
 */
export function calculateDaysSince(dateString: string | null): number {
  if (!dateString) return 0;
  
  try {
    const startDate = parseISO(dateString);
    const today = new Date();
    return Math.max(0, differenceInDays(today, startDate));
  } catch (error) {
    console.error('Error calculating days since:', error);
    return 0;
  }
}

/**
 * Calculate days until a given date
 */
export function calculateDaysUntil(dateString: string | null): number {
  if (!dateString) return 0;
  
  try {
    const targetDate = parseISO(dateString);
    const today = new Date();
    return Math.max(0, differenceInDays(targetDate, today));
  } catch (error) {
    console.error('Error calculating days until:', error);
    return 0;
  }
}

/**
 * Format date to Indonesian locale
 */
export function formatDateIndonesian(dateString: string | null): string {
  if (!dateString) return '-';
  
  try {
    const date = parseISO(dateString);
    return format(date, 'd MMMM yyyy', { locale: id });
  } catch (error) {
    console.error('Error formatting date:', error);
    return '-';
  }
}

/**
 * Format date for display (short format)
 */
export function formatDateShort(dateString: string | null): string {
  if (!dateString) return '-';
  
  try {
    const date = parseISO(dateString);
    return format(date, 'dd/MM/yyyy');
  } catch (error) {
    console.error('Error formatting date:', error);
    return '-';
  }
}

/**
 * Get today's date in ISO format
 */
export function getTodayISO(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Check if a date is today
 */
export function isToday(dateString: string | null): boolean {
  if (!dateString) return false;
  
  try {
    const date = parseISO(dateString);
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  } catch (error) {
    return false;
  }
}
