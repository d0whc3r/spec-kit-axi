import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Standard shadcn class merger: dedupe conflicting Tailwind classes so a
// `class` prop on a component can override its defaults.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
