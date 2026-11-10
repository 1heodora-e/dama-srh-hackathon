import { useEffect, useRef } from "react";

/**
 * Brand cursor: terracotta dot + trailing ring. Grows over links/buttons and
 * shows a label over elements with data-cursor="...". Mouse/trackpad only.
 */
export default function Cursor() {
  const dotRef = useRef(null);
  const ringRef = useRef(null);
  const labelRef = useRef(null);

  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return undefined;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dot = dotRef.current;
    const ring = ringRef.current;
    const label = labelRef.current;
    const body = document.body;
    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let rx = mx;
    let ry = my;
    let frame = 0;

    body.classList.add("dm-has-cursor", "dm-cursor-out");

    const onMove = (e) => {
      mx = e.clientX;
      my = e.clientY;
      body.classList.remove("dm-cursor-out");
      dot.style.transform = `translate(${mx}px, ${my}px)`;
      if (reduce) ring.style.transform = dot.style.transform;
    };
    const onLeave = () => body.classList.add("dm-cursor-out");
    const onDown = () => ring.classList.add("is-down");
    const onUp = () => ring.classList.remove("is-down");
    const onOver = (e) => {
      const target = e.target.closest?.("[data-cursor], a, button, select, label, .leaflet-interactive");
      ring.classList.remove("is-hover", "is-label");
      if (!target) return;
      if (target.dataset?.cursor) {
        label.textContent = target.dataset.cursor;
        ring.classList.add("is-label");
      } else {
        ring.classList.add("is-hover");
      }
    };
    const loop = () => {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      ring.style.transform = `translate(${rx}px, ${ry}px)`;
      frame = requestAnimationFrame(loop);
    };

    window.addEventListener("mousemove", onMove);
    document.addEventListener("mouseleave", onLeave);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    document.addEventListener("mouseover", onOver);
    if (!reduce) frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      document.removeEventListener("mouseover", onOver);
      body.classList.remove("dm-has-cursor", "dm-cursor-out");
    };
  }, []);

  return (
    <>
      <div ref={ringRef} className="dm-cur-ring" aria-hidden="true">
        <span ref={labelRef} />
      </div>
      <div ref={dotRef} className="dm-cur-dot" aria-hidden="true" />
    </>
  );
}
