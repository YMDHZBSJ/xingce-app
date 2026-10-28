"use client";

/**
 * 沉浸模式：做题/考试进行中隐藏底部 Tab 栏。
 * 通过 body dataset + 自定义事件通知 TabBar。
 */
const EVENT = "xc-immersive";

export function setImmersive(on: boolean): void {
  if (typeof document === "undefined") return;
  if (on) document.body.dataset.immersive = "1";
  else delete document.body.dataset.immersive;
  window.dispatchEvent(new CustomEvent(EVENT, { detail: on }));
}

export function onImmersiveChange(cb: (on: boolean) => void): () => void {
  const handler = (e: Event) => cb(Boolean((e as CustomEvent).detail));
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
