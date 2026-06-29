// Resizable + collapsible artifact sidebar (desktop only). The shell grid's
// first column follows --sidebar-w (see global.css); the handle drags that
// width and the toggle collapses to a narrow icon rail. Both persist.

const MIN = 140;
const MAX = 480;
const WKEY = "axi:sidebar-w";
const CKEY = "axi:sidebar-collapsed";

export function setupSidebar(): void {
  const shell = document.getElementById("shell")!;
  const handle = document.getElementById("sidebar-resize");
  const toggle = document.getElementById("sidebar-toggle");

  let expanded = Number(localStorage.getItem(WKEY)) || 0; // px; 0 = CSS default

  const applyWidth = () =>
    shell.style.setProperty("--sidebar-w", expanded ? `${expanded}px` : "15rem");

  const setCollapsed = (on: boolean) => {
    shell.toggleAttribute("data-collapsed", on);
    if (on) shell.style.setProperty("--sidebar-w", "3.25rem");
    else applyWidth();
    toggle?.setAttribute("aria-expanded", String(!on));
    toggle?.setAttribute("aria-label", on ? "Expand sidebar" : "Collapse sidebar");
    localStorage.setItem(CKEY, on ? "1" : "0");
  };

  applyWidth();
  if (localStorage.getItem(CKEY) === "1") setCollapsed(true);

  toggle?.addEventListener("click", () => setCollapsed(!shell.hasAttribute("data-collapsed")));

  handle?.addEventListener("pointerdown", (e) => {
    if (shell.hasAttribute("data-collapsed")) return;
    e.preventDefault();
    handle.setPointerCapture(e.pointerId);
    shell.setAttribute("data-resizing", "");
    const startX = e.clientX;
    const startW = expanded || handle.parentElement!.getBoundingClientRect().width;

    const move = (ev: PointerEvent) => {
      expanded = Math.max(MIN, Math.min(MAX, startW + (ev.clientX - startX)));
      shell.style.setProperty("--sidebar-w", `${expanded}px`);
    };
    const up = (ev: PointerEvent) => {
      handle.releasePointerCapture(ev.pointerId);
      shell.removeAttribute("data-resizing");
      localStorage.setItem(WKEY, String(expanded));
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", up);
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", up);
  });
}
