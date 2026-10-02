'use client';
import { InputHTMLAttributes, useId } from 'react';
export function JourneyField({ label, hint, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  const id = useId();
  return <div className="nivo-field"><label htmlFor={id}>{label}</label><input {...props} id={id} aria-describedby={hint ? id + '-hint' : undefined} />{hint && <p className="nivo-caption" id={id + '-hint'}>{hint}</p>}</div>;
}
