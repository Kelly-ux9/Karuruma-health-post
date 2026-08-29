import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import RwandaLocationSelect from "./RwandaLocationSelect";

function findAddressField() {
  const labels = Array.from(document.querySelectorAll("label"));
  const label = labels.find(l => /address\s*\/\s*location|aho atuye/i.test(l.textContent || ""));
  return label?.querySelector("input, textarea") || null;
}

function Bridge() {
  const [value, setValue] = useState({});
  const inputRef = useRef(null);
  const lastAddress = useRef("");

  useEffect(() => {
    const sync = () => {
      const input = findAddressField();
      if (!input || input.dataset.khpLocationBridge === "1") return;
      inputRef.current = input;
      input.dataset.khpLocationBridge = "1";
      input.readOnly = true;
      input.placeholder = "Select Province, District, Sector, Cell and Village";
      const host = document.createElement("div");
      host.dataset.khpLocationSelectors = "1";
      host.className = "mb-3";
      input.parentElement?.insertBefore(host, input);
      const root = createRoot(host);
      root.render(<RwandaLocationSelect value={value} onChange={setValue} t={(k) => k.split(".").pop()} />);
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [value]);

  useEffect(() => {
    const input = inputRef.current;
    if (!input || !value.provinceName) return;
    const address = [value.provinceName, value.districtName, value.sectorName, value.cellName, value.villageName].filter(Boolean).join(" → ");
    if (!address || address === lastAddress.current) return;
    lastAddress.current = address;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set || Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
    if (setter) setter.call(input, address); else input.value = address;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, [value]);
  return null;
}
export default function LocationBridge() { return <Bridge />; }
