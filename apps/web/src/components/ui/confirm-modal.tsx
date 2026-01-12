"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Trash2, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type ConfirmModalVariant = "danger" | "warning" | "info";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmModalVariant;
  isLoading?: boolean;
  children?: React.ReactNode;
}

const variantConfig: Record<
  ConfirmModalVariant,
  {
    icon: React.ReactNode;
    iconBg: string;
    iconColor: string;
    buttonVariant: "destructive" | "default";
  }
> = {
  danger: {
    icon: <Trash2 className="h-5 w-5" />,
    iconBg: "bg-destructive/10",
    iconColor: "text-destructive",
    buttonVariant: "destructive",
  },
  warning: {
    icon: <AlertTriangle className="h-5 w-5" />,
    iconBg: "bg-yellow-500/10",
    iconColor: "text-yellow-500",
    buttonVariant: "default",
  },
  info: {
    icon: <AlertCircle className="h-5 w-5" />,
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-500",
    buttonVariant: "default",
  },
};

/**
 * Reusable confirmation modal for destructive or important actions.
 * Validates: Requirements 9.7
 */
export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  isLoading = false,
  children,
}: ConfirmModalProps) {
  const [isConfirming, setIsConfirming] = React.useState(false);
  const config = variantConfig[variant];

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm();
    } finally {
      setIsConfirming(false);
    }
  };

  const loading = isLoading || isConfirming;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !loading && onClose()}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center",
                config.iconBg
              )}
            >
              <span className={config.iconColor}>{config.icon}</span>
            </div>
            <div>
              <DialogTitle>{title}</DialogTitle>
              {description && (
                <DialogDescription>{description}</DialogDescription>
              )}
            </div>
          </div>
        </DialogHeader>

        {children && <div className="py-4">{children}</div>}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={config.buttonVariant}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook to manage confirmation modal state
 */
export function useConfirmModal() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [config, setConfig] = React.useState<{
    title: string;
    description?: string;
    confirmLabel?: string;
    variant?: ConfirmModalVariant;
    onConfirm: () => void | Promise<void>;
  } | null>(null);

  const confirm = React.useCallback(
    (options: {
      title: string;
      description?: string;
      confirmLabel?: string;
      variant?: ConfirmModalVariant;
      onConfirm: () => void | Promise<void>;
    }) => {
      setConfig(options);
      setIsOpen(true);
    },
    []
  );

  const close = React.useCallback(() => {
    setIsOpen(false);
    setConfig(null);
  }, []);

  const handleConfirm = React.useCallback(async () => {
    if (config?.onConfirm) {
      await config.onConfirm();
    }
    close();
  }, [config, close]);

  const ConfirmModalComponent = React.useMemo(() => {
    if (!config) return null;

    return (
      <ConfirmModal
        isOpen={isOpen}
        onClose={close}
        onConfirm={handleConfirm}
        title={config.title}
        description={config.description}
        confirmLabel={config.confirmLabel}
        variant={config.variant}
      />
    );
  }, [config, isOpen, close, handleConfirm]);

  return {
    confirm,
    close,
    ConfirmModal: ConfirmModalComponent,
    isOpen,
  };
}

/**
 * Pre-configured confirmation modals for common actions
 */
export const confirmPresets = {
  delete: (itemName: string, onConfirm: () => void | Promise<void>) => ({
    title: `Delete ${itemName}`,
    description: "This action cannot be undone.",
    confirmLabel: "Delete",
    variant: "danger" as const,
    onConfirm,
  }),

  archive: (itemName: string, onConfirm: () => void | Promise<void>) => ({
    title: `Archive ${itemName}`,
    description: "This item will be archived and no longer active.",
    confirmLabel: "Archive",
    variant: "warning" as const,
    onConfirm,
  }),

  logout: (onConfirm: () => void | Promise<void>) => ({
    title: "Sign Out",
    description: "Are you sure you want to sign out?",
    confirmLabel: "Sign Out",
    variant: "info" as const,
    onConfirm,
  }),

  execute: (actionName: string, onConfirm: () => void | Promise<void>) => ({
    title: `Execute ${actionName}`,
    description: "Please confirm you want to proceed with this action.",
    confirmLabel: "Execute",
    variant: "warning" as const,
    onConfirm,
  }),
};
