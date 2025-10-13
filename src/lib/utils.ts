import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

// Combine proprement des classes Tailwind conditionnelles
export function cn(...inputs: any[]) {
  return twMerge(clsx(inputs))
}
