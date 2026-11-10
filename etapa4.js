/* Atención Nutricional APS — © 2026 Emilio Alejandro Espinoza Sotomayor, estudiante de Nutrición y Dietética, Universidad San Sebastián, sede De la Patagonia. Todos los derechos reservados. Prohibida su reproducción, distribución o modificación sin autorización escrita del autor. */
/* Etapa 4 — bloques del recordatorio de 24 horas: adecuación, distribución, grupos y conclusión. Se registran en Etapa2.live. */
(function (root) {
  "use strict";
  const isNum = (v) => typeof v === "number" && isFinite(v);
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const f = (v, d) => isNum(v) ? v.toLocaleString("es-CL", { minimumFractionDigits: d, maximumFractionDigits: d }) : (v === "" || v == null ? "—" : esc(v));
  const pill = (t, C) => { if (!t || t === "—") return "—"; const e = root.Calc.estadoColor(t, C); return e ? `<span class="estado ${e}">${esc(t)}</span>` : esc(t); };
  const tabla = (head, rows) => `<div class="tabla-w" style="padding:10px 16px 6px"><table class="pr res"><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`;
  const nota = (t) => `<p class="sec-nota">${t}</p>`;
  const L = {};
  const vacioR24 = (R) => R.Rec24_Kcal === 0;

  L.r24_adec = ({ R, ESQ }) => {
    if (vacioR24(R)) return nota("Registre los alimentos del recordatorio para ver el aporte y la adecuación.");
    const C = ESQ.colores, rq = R.R24.req;
    const fila = (n, ing, req, ad, cls, d) => `<tr><td>${n}</td><td class="num">${f(ing, d)}</td><td class="num">${req === "" ? "—" : f(req, d)}</td><td class="num">${isNum(ad) ? f(ad, 0) + " %" : "—"}</td><td>${pill(cls, C)}</td></tr>`;
    let h = tabla(["Nutriente", "Ingesta", "Requerimiento", "% adecuación", "Clasificación"], [
      fila("Energía (kcal)", R.Rec24_Kcal, rq.kcal, R.Adec24_Energia, R.Cls24_Energia, 0), fila("Proteínas (g)", R.Rec24_Prot, rq.prot, R.Adec24_Prot, R.Cls24_Prot, 1),
      fila("Lípidos (g)", R.Rec24_Lip, rq.lip, R.Adec24_Lip, R.Cls24_Lip, 1), fila("Hidratos de carbono (g)", R.Rec24_CHO, rq.cho, R.Adec24_CHO, R.Cls24_CHO, 1)]);
    if (rq.kcal === "") h += nota("Falta el requerimiento: complete el peso para calcular el GET.");
    h += `<dl class="calc"><dt>Diagnóstico alimentario (va al DNI)</dt><dd>${R.DNI_Alim ? "<b>" + esc(R.DNI_Alim.replace(/^, /, "")) + "</b>" : "—"}</dd></dl>`;
    return h + nota("Insuficiencia < 90 % · suficiencia 90-110 % · exceso > 110 % (Consenso p. 21).");
  };

  L.r24_dist = ({ R }) => {
    if (vacioR24(R)) return nota("Sin registro.");
    const t = R.R24.tiempos.filter((x) => x.n > 0).map((x) => `<tr><td>${esc(x.t)}</td><td class="num">${f(x.kcal, 0)}</td><td class="num">${isNum(x.pct) ? f(x.pct, 0) + " %" : "—"}</td><td class="num">${x.n}</td></tr>`);
    const g = R.R24.grupos.map((x) => `<tr><td>${esc(x.n)}</td><td class="num">${x.porc ? f(x.porc, 1) : "—"}</td><td class="num">${x.nd || "—"}</td><td>${x.estado === "Presente" ? '<span class="estado normal">Presente</span>' : x.txt ? '<span class="estado riesgo">Ausente</span>' : "Ausente"}</td></tr>`);
    return `<div class="dos-col">${tabla(["Tiempo de comida", "kcal", "% del total", "N° alimentos"], t.length ? t : ['<tr><td colspan="4">—</td></tr>'])}
      ${tabla(["Grupo de alimentos", "Porciones", "R24 detallado", "Estado"], g)}</div>`
      + `<dl class="calc"><dt>N° de tiempos de comida</dt><dd>${R.Rec24_NTiempos}</dd><dt>Grupos ausentes</dt><dd>${esc(R.Rec24_Ausentes || "—")}</dd></dl>`;
  };

  L.r24_concl = ({ R }) => `<p class="concl">${esc(R.Rec24_Conclusion)}</p>`;

  root.Etapa4 = { live: L };
  if (root.Etapa2) Object.assign(root.Etapa2.live, L);
})(this);
