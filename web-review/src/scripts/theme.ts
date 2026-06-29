// Theme toggle (persisted to localStorage) and the help dialog.

import { isDark } from "./state.ts";

export function setupTheme(): void {
  const root = document.documentElement;
  const saved = localStorage.getItem("axi-theme");
  if (saved) root.setAttribute("data-theme", saved);
  document.getElementById("theme")?.addEventListener("click", () => {
    const next = isDark() ? "light" : "dark";
    root.setAttribute("data-theme", next);
    localStorage.setItem("axi-theme", next);
  });
}

export function setupHelp(): void {
  const dlg = document.getElementById("help") as HTMLDialogElement | null;
  if (!dlg) return;
  const open = () => dlg.showModal();
  document.getElementById("help-btn")?.addEventListener("click", open);
  document.getElementById("empty-help")?.addEventListener("click", open);
}
