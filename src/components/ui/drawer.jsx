import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * Drawer latéral minimaliste (compatible Tailwind)
 * - Utilisé pour les fiches produits Kinko
 * - S'ouvre à droite de l'écran
 */

export function Drawer({ open, onOpenChange, children }) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex",
        open ? "pointer-events-auto" : "pointer-events-none"
      )}
      style={{ visibility: open ? "visible" : "hidden" }}
    >
      {/* Fond semi-transparent */}
      <div
        className={cn(
          "flex-1 bg-black/30 transition-opacity",
          open ? "opacity-100" : "opacity-0"
        )}
        onClick={() => onOpenChange(false)}
      />

      {/* Contenu drawer */}
      <div
        className={cn(
          "relative w-full sm:max-w-lg bg-white shadow-xl transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function DrawerContent({ className, children }) {
  return <div className={cn("h-full flex flex-col", className)}>{children}</div>;
}

export function DrawerHeader({ children, className }) {
  return (
    <div className={cn("flex items-center justify-between p-4 border-b", className)}>
      {children}
      <Button
        size="icon"
        variant="ghost"
        className="ml-auto"
        onClick={() => {
          const evt = new CustomEvent("drawerClose");
          window.dispatchEvent(evt);
        }}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function DrawerTitle({ children, className }) {
  return <h2 className={cn("font-semibold text-lg", className)}>{children}</h2>;
}
