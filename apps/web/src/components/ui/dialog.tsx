"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface DialogContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  titleId: string;
  descriptionId: string;
}

const DialogContext = React.createContext<DialogContextValue | null>(null);

function useDialogContext() {
  const context = React.useContext(DialogContext);
  if (!context) {
    throw new Error("Dialog components must be used within a Dialog");
  }
  return context;
}

interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

/**
 * Accessible Dialog component following WAI-ARIA Dialog pattern.
 *
 * WCAG 2.1 AA Compliance:
 * - Uses role="dialog" with aria-modal="true"
 * - Properly labeled via aria-labelledby and aria-describedby
 * - Focus is trapped within the dialog when open
 * - Escape key closes the dialog
 * - Focus returns to trigger element on close
 *
 * Validates: Requirements 7.1, 7.2, 7.3
 */
function Dialog({ open = false, onOpenChange, children }: DialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(open);
  const isControlled = onOpenChange !== undefined;
  const isOpen = isControlled ? open : internalOpen;

  // Generate unique IDs for accessibility
  const id = React.useId();
  const titleId = `dialog-title-${id}`;
  const descriptionId = `dialog-description-${id}`;

  const handleOpenChange = React.useCallback(
    (newOpen: boolean) => {
      if (isControlled) {
        onOpenChange?.(newOpen);
      } else {
        setInternalOpen(newOpen);
      }
    },
    [isControlled, onOpenChange],
  );

  return (
    <DialogContext.Provider
      value={{
        open: isOpen,
        onOpenChange: handleOpenChange,
        titleId,
        descriptionId,
      }}
    >
      {children}
    </DialogContext.Provider>
  );
}

interface DialogTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
}

function DialogTrigger({ children, asChild }: DialogTriggerProps) {
  const { onOpenChange } = useDialogContext();

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(
      children as React.ReactElement<{ onClick?: () => void }>,
      {
        onClick: () => onOpenChange(true),
      },
    );
  }

  return (
    <button type="button" onClick={() => onOpenChange(true)}>
      {children}
    </button>
  );
}

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

function DialogContent({ children, className, ...props }: DialogContentProps) {
  const { open, onOpenChange, titleId, descriptionId } = useDialogContext();
  const contentRef = React.useRef<HTMLDivElement>(null);
  const previousActiveElement = React.useRef<HTMLElement | null>(null);

  // Handle escape key and focus management
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChange(false);
      }
    };

    if (open) {
      // Store the previously focused element
      previousActiveElement.current = document.activeElement as HTMLElement;

      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";

      // Focus the dialog content or first focusable element
      requestAnimationFrame(() => {
        const firstFocusable = contentRef.current?.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (firstFocusable) {
          firstFocusable.focus();
        } else {
          contentRef.current?.focus();
        }
      });
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";

      // Return focus to the previously focused element
      if (!open && previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, [open, onOpenChange]);

  // Focus trap - keep focus within dialog
  React.useEffect(() => {
    if (!open) return;

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !contentRef.current) return;

      const focusableElements =
        contentRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    };

    document.addEventListener("keydown", handleTab);
    return () => document.removeEventListener("keydown", handleTab);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/80 animate-in fade-in-0"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />
      {/* Content */}
      <div
        ref={contentRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className={cn(
          "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 animate-in fade-in-0 zoom-in-95 slide-in-from-left-1/2 slide-in-from-top-[48%] sm:rounded-lg",
          className,
        )}
        {...props}
      >
        <div className="relative">
          {children}
          <button
            type="button"
            className="absolute right-0 top-0 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none min-h-[44px] min-w-[44px] flex items-center justify-center -mr-2 -mt-2"
            onClick={() => onOpenChange(false)}
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

function DialogHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col space-y-1.5 text-center sm:text-left",
        className,
      )}
      {...props}
    />
  );
}

function DialogFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
        className,
      )}
      {...props}
    />
  );
}

function DialogTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  const { titleId } = useDialogContext();
  return (
    <h2
      id={titleId}
      className={cn(
        "text-lg font-semibold leading-none tracking-tight",
        className,
      )}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  const { descriptionId } = useDialogContext();
  return (
    <p
      id={descriptionId}
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
