'use client';
import dynamic from 'next/dynamic';
import { ChartSkeleton } from './chart-skeleton';

export const TrendArea = dynamic(() => import('./trend-area').then(module => module.TrendArea), { ssr: false, loading: ChartSkeleton });
export const HourBars = dynamic(() => import('./bars').then(module => module.HourBars), { ssr: false, loading: ChartSkeleton });
export const TriggerBars = dynamic(() => import('./bars').then(module => module.TriggerBars), { ssr: false, loading: ChartSkeleton });
