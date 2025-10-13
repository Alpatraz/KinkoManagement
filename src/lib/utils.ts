import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

// Combine proprement des classes Tailwind conditionnelles
export function cn(...inputs: any[]) {
  return twMerge(clsx(inputs))
}

// === Vérifie si un chemin correspond à une image ===
export function isImagePath(path?: string): boolean {
  if (!path) return false;
  const lower = path.toLowerCase();
  return (
    lower.endsWith(".png") ||
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".webp") ||
    lower.endsWith(".gif")
  );
}
