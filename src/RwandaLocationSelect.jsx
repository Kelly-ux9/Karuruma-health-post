import React, { useMemo } from "react";
import { rwandaLocation } from "@devrw/rwanda-location";

const selectClass = "w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500";

export default function RwandaLocationSelect({ value, onChange, t }) {
  const provinceCode = value?.provinceCode || "";
  const districtCode = value?.districtCode || "";
  const sectorCode = value?.sectorCode || "";
  const cellCode = value?.cellCode || "";
  const villageCode = value?.villageCode || "";
  const provinces = useMemo(() => rwandaLocation.getProvinces(), []);
  const districts = useMemo(() => provinceCode ? rwandaLocation.getDistricts(Number(provinceCode)) : [], [provinceCode]);
  const sectors = useMemo(() => districtCode ? rwandaLocation.getSectors(Number(districtCode)) : [], [districtCode]);
  const cells = useMemo(() => sectorCode ? rwandaLocation.getCells(String(sectorCode)) : [], [sectorCode]);
  const villages = useMemo(() => cellCode ? rwandaLocation.getVillages(Number(cellCode)) : [], [cellCode]);
  const chooseProvince = (code) => { const x = provinces.find(v => String(v.code) === String(code)); onChange({ provinceCode: code, provinceName: x?.name || "", districtCode: "", districtName: "", sectorCode: "", sectorName: "", cellCode: "", cellName: "", villageCode: "", villageName: "" }); };
  const chooseDistrict = (code) => { const x = districts.find(v => String(v.code) === String(code)); onChange({ ...value, districtCode: code, districtName: x?.name || "", sectorCode: "", sectorName: "", cellCode: "", cellName: "", villageCode: "", villageName: "" }); };
  const chooseSector = (code) => { const x = sectors.find(v => String(v.code) === String(code)); onChange({ ...value, sectorCode: code, sectorName: x?.name || "", cellCode: "", cellName: "", villageCode: "", villageName: "" }); };
  const chooseCell = (code) => { const x = cells.find(v => String(v.code) === String(code)); onChange({ ...value, cellCode: code, cellName: x?.name || "", villageCode: "", villageName: "" }); };
  const chooseVillage = (code) => { const x = villages.find(v => String(v.code) === String(code)); onChange({ ...value, villageCode: code, villageName: x?.name || "" }); };
  return <div className="grid md:grid-cols-2 gap-3 md:col-span-2">
    <FieldLike label={t("patients.province") || "Province"}><select className={selectClass} value={provinceCode} onChange={e => chooseProvince(e.target.value)}><option value="">{t("patients.selectProvince") || "Select province…"}</option>{provinces.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}</select></FieldLike>
    <FieldLike label={t("patients.district") || "District"}><select className={selectClass} value={districtCode} disabled={!provinceCode} onChange={e => chooseDistrict(e.target.value)}><option value="">{provinceCode ? (t("patients.selectDistrict") || "Select district…") : "Select province first"}</option>{districts.map(d => <option key={d.code} value={d.code}>{d.name}</option>)}</select></FieldLike>
    <FieldLike label={t("patients.sector") || "Sector"}><select className={selectClass} value={sectorCode} disabled={!districtCode} onChange={e => chooseSector(e.target.value)}><option value="">{districtCode ? (t("patients.selectSector") || "Select sector…") : "Select district first"}</option>{sectors.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}</select></FieldLike>
    <FieldLike label={t("patients.cell") || "Cell"}><select className={selectClass} value={cellCode} disabled={!sectorCode} onChange={e => chooseCell(e.target.value)}><option value="">{sectorCode ? (t("patients.selectCell") || "Select cell…") : "Select sector first"}</option>{cells.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}</select></FieldLike>
    <FieldLike label={t("patients.village") || "Village"}><select className={selectClass} value={villageCode} disabled={!cellCode} onChange={e => chooseVillage(e.target.value)}><option value="">{cellCode ? (t("patients.selectVillage") || "Select village…") : "Select cell first"}</option>{villages.map(v => <option key={v.code} value={v.code}>{v.name}</option>)}</select></FieldLike>
  </div>;
}
function FieldLike({ label, children }) { return <label className="block text-sm font-medium text-slate-600"><span className="block mb-1.5">{label}</span>{children}</label>; }
