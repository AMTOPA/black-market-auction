"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  tone?: "default" | "gold" | "danger";
}

export interface ConfirmDialogProps {
  options: ConfirmOptions;
  onConfirm: () => void;
  onCancel: () => void;
}

const toneClass: Record<NonNullable<ConfirmOptions["tone"]>, string> = {
  default: "",
  gold: "btn-gold",
  danger: "btn-danger",
};

/** 居中确认弹窗（纯展示，配合 useConfirm 使用） */
export function ConfirmDialog({ options, onConfirm, onCancel }: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmRef.current?.focus();
  }, []);

  return (
    <div
      className="confirm-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-message"
    >
      <div className="confirm-title" id="confirm-title">
        ◆ {options.title} ◆
      </div>
      <p className="confirm-message" id="confirm-message">
        {options.message}
      </p>
      <div className="confirm-actions">
        <button type="button" className="btn" onClick={onCancel}>
          {options.cancelText ?? "取消"}
        </button>
        <button
          ref={confirmRef}
          type="button"
          className={`btn ${toneClass[options.tone ?? "gold"]}`}
          onClick={onConfirm}
        >
          {options.confirmText ?? "确定"}
        </button>
      </div>
    </div>
  );
}

/** 替代 window.confirm 的居中弹窗：调用 confirm({...}) 返回 Promise<boolean> */
export function useConfirm() {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = useCallback((value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setOptions(null);
  }, []);

  useEffect(() => {
    if (!options) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [options, close]);

  const dialog: ReactNode = options ? (
    <div
      className="overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) close(false);
      }}
    >
      <ConfirmDialog options={options} onConfirm={() => close(true)} onCancel={() => close(false)} />
    </div>
  ) : null;

  return { confirm, dialog };
}
