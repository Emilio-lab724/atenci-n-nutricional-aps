/* Etapa 2 — bloques de resultados y curvas de crecimiento.
   Cada renderer recibe ctx = { R, D, T, ESQ, hist, ui } y devuelve HTML. */
(function (root) {
  "use strict";
  const isNum = (v) => typeof v === "number" && isFinite(v);
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const fmt = (v, d = 1) => isNum(v) ? v.toLocaleString("es-CL", { minimumFractionDigits: d, maximumFractionDigits: d }) : (v === "" || v == null ? "—" : String(v).replace(/(\d)\.(\d{1,2})(?!\d)/g, "$1,$2"));
  const txt = (v) => (v === "" || v == null ? "—" : String(v).replace(/(\d)\.(\d{1,2})(?!\d)/g, "$1,$2"));
  function estado(t) {
    const s = String(t || "").toLowerCase();
    if (!s || s === "—" || /no aplica|sin dato|falta|no evaluado|sin tabla|fuera de tabla/.test(s)) return "";
    if (/desnutrición|obesidad|microcefalia|macrocefalia|talla baja|longitud baja|baja$|bajo|disminuid|insuficiente|excesiv|caída|significativa|alto|obeso|mayor a la|bajo lo|⚠/.test(s) && !/no significativa|sin pérdida/.test(s)) return "alterado";
    if (/riesgo|sobrepeso|sobre|normal baja|normal alta|elevad|exceso|aumentad|ascenso|moderad|limítrofe|catch-up|p75-p90/.test(s)) return "riesgo";
    if (/normal|adecuad|esperad|estable|sin pérdida|no significativa|sí$/.test(s)) return "normal";
    return "";
  }
  const pill = (t) => { const e = estado(t); return e ? `<span class="estado ${e}">${esc(txt(t))}</span>` : esc(txt(t)); };
  const zPill = (z) => { if (!isNum(z)) return esc(txt(z)); const a = Math.abs(z); return `<span class="estado ${a < 1 ? "normal" : a < 2 ? "riesgo" : "alterado"} num">${fmt(z, 2)}</span>`; };
  const dl = (rows) => `<dl class="calc">${rows.filter(Boolean).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`).join("")}</dl>`;
  const nota = (t) => `<p class="sec-nota">${t}</p>`;
  const tabla = (head, rows) => `<div class="tabla-w" style="padding:10px 16px 6px"><table class="pr res"><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;

  // =============== curvas de crecimiento (SVG) ===============
  const IND = {
    PE: { t: "Peso para la edad", y: "Peso (kg)", x: "Edad", pref: "PE", max: 120, ejeX: "meses" },
    TE: { t: "Talla para la edad", y: "Talla (cm)", x: "Edad", pref: "TE", max: 228, ejeX: "meses" },
    PT: { t: "Peso para la talla", y: "Peso (kg)", x: "Talla (cm)", ejeX: "cm" },
    IMC: { t: "IMC para la edad", y: "IMC (kg/m²)", x: "Edad", pref: "IMC", min: 61, max: 228, ejeX: "meses" },
    PC: { t: "Perímetro cefálico para la edad", y: "PCe (cm)", x: "Edad", max: 36, ejeX: "meses" },
  };
  function rangoEdad(ind, edadMeses) {
    const I = IND[ind], lo = I.min || 0, hi = I.max;
    if (ind === "IMC") return [61, 228];
    if (ind === "PC") return [0, 36];
    if (edadMeses <= 24) return [0, Math.min(24, hi)];
    if (edadMeses <= 60) return [0, Math.min(60, hi)];
    return [lo, hi];
  }
  function niceTicks(a, b, n) { const span = b - a, step0 = span / n, mag = Math.pow(10, Math.floor(Math.log10(step0))), f = step0 / mag;
    const step = (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * mag; const out = []; for (let v = Math.ceil(a / step) * step; v <= b + 1e-9; v += step) out.push(+v.toFixed(6)); return out; }
  // Construye series por z a partir de las filas de la tabla
  function seriesLMS(T, ind, sx, R) {
    const cre = T.cre, zs = [-3, -2, -1, 0, 1, 2, 3], pts = [];
    if (ind === "PC") {
      for (let m = 0; m <= 36; m++) { const r = cre.pc["PC|" + sx + "|" + m]; if (r) pts.push({ x: m, v: { "-2": r[0], "-1": r[1], "0": r[2], "1": r[3], "2": r[4] } }); }
      return { zs: [-2, -1, 0, 1, 2], pts };
    }
    if (ind === "PT") {
      const pref = (isNum(R.Edad_Meses_Aprox) && R.Edad_Meses_Aprox < 24) ? "PT_L" : "PT_T";
      const xs = Object.keys(cre.lms).filter((k) => k.startsWith(pref + "|" + sx + "|")).map((k) => +k.split("|")[2]).sort((a, b) => a - b);
      for (const x of xs) { const r = cre.lms[pref + "|" + sx + "|" + x]; const o = {}; zs.forEach((z) => (o[z] = Calc.vLMS(z, { L: r[1], M: r[2], S: r[3] }))); pts.push({ x: x / 10, v: o }); }
      return { zs, pts, pref };
    }
    const [a, b] = rangoEdad(ind, R.Edad_Meses_Aprox);
    for (let m = a; m <= b; m++) { const r = cre.lms[IND[ind].pref + "|" + sx + "|" + m]; if (!r) continue; const o = {}; zs.forEach((z) => (o[z] = Calc.vLMS(z, { L: r[1], M: r[2], S: r[3] }))); pts.push({ x: m, v: o }); }
    return { zs, pts };
  }
  function seriesBrooks(T, ind, sx, grupo) {
    const B = T.brk, pts = [];
    for (let m = 24; m <= 240; m++) { const r = B.t[ind + "|" + sx + "|" + grupo + "|" + m]; if (!r) continue; const o = {}; B.pct.forEach((p, i) => (o[p] = r[i])); o.low = r[7]; pts.push({ x: m, v: o }); }
    return { zs: B.pct, pts };
  }
  function grafico(opts) {
    const { series, puntos, ejeX, yLab, banda, etiquetaZ } = opts;
    const W = 680, H = 380, m = { l: 52, r: 44, t: 14, b: 42 }, pw = W - m.l - m.r, ph = H - m.t - m.b;
    const xs = series.pts.map((p) => p.x); let x0 = Math.min(...xs), x1 = Math.max(...xs);
    if (opts.xr) { x0 = opts.xr[0]; x1 = opts.xr[1]; }
    const vis = series.pts.filter((p) => p.x >= x0 && p.x <= x1);
    let y0 = Infinity, y1 = -Infinity;
    vis.forEach((p) => series.zs.forEach((z) => { const v = p.v[z]; if (isNum(v)) { y0 = Math.min(y0, v); y1 = Math.max(y1, v); } }));
    puntos.forEach((p) => { if (isNum(p.y) && p.x >= x0 && p.x <= x1) { y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); } });
    const pad = (y1 - y0) * 0.04; y0 = Math.max(0, y0 - pad); y1 = y1 + pad;
    const sx = (x) => m.l + (x - x0) / (x1 - x0) * pw, sy = (y) => m.t + ph - (y - y0) / (y1 - y0) * ph;
    const path = (z) => vis.map((p, i) => (i ? "L" : "M") + sx(p.x).toFixed(1) + " " + sy(p.v[z]).toFixed(1)).join("");
    const area = (za, zb) => { const up = vis.map((p, i) => (i ? "L" : "M") + sx(p.x).toFixed(1) + " " + sy(p.v[zb]).toFixed(1)).join("");
      const dn = vis.slice().reverse().map((p) => "L" + sx(p.x).toFixed(1) + " " + sy(p.v[za]).toFixed(1)).join(""); return up + dn + "Z"; };
    let g = "";
    banda.forEach(([za, zb, cls]) => { if (vis.length && isNum(vis[0].v[za]) && isNum(vis[0].v[zb])) g += `<path d="${area(za, zb)}" class="gb ${cls}"/>`; });
    const yt = niceTicks(y0, y1, 6), xtRaw = ejeX === "meses" ? (x1 - x0 > 60 ? niceTicks(x0, x1, 8).filter((v) => v % 12 === 0).concat([]) : niceTicks(x0, x1, 8)) : niceTicks(x0, x1, 8);
    let xt = xtRaw; if (ejeX === "meses" && x1 - x0 > 60) { xt = []; for (let v = Math.ceil(x0 / 12) * 12; v <= x1; v += (x1 - x0 > 150 ? 24 : 12)) xt.push(v); }
    yt.forEach((v) => (g += `<line x1="${m.l}" x2="${m.l + pw}" y1="${sy(v)}" y2="${sy(v)}" class="gg"/><text x="${m.l - 6}" y="${sy(v) + 4}" class="gt" text-anchor="end">${fmt(v, v % 1 ? 1 : 0)}</text>`));
    xt.forEach((v) => (g += `<line y1="${m.t}" y2="${m.t + ph}" x1="${sx(v)}" x2="${sx(v)}" class="gg"/><text x="${sx(v)}" y="${m.t + ph + 16}" class="gt" text-anchor="middle">${ejeX === "meses" ? (x1 - x0 > 60 ? v / 12 + " a" : v + " m") : fmt(v, 0)}</text>`));
    series.zs.forEach((z) => { g += `<path d="${path(z)}" class="gl ${String(z) === "0" || z === 50 ? "g0" : ""}"/>`;
      const last = vis[vis.length - 1]; if (last) g += `<text x="${m.l + pw + 4}" y="${sy(last.v[z]) + 4}" class="gt gz">${esc(etiquetaZ(z))}</text>`; });
    if (opts.low) g += `<path d="${path("low")}" class="gl glow"/>`;
    const pv = puntos.filter((p) => isNum(p.x) && isNum(p.y) && p.x >= x0 && p.x <= x1);
    if (pv.length > 1) g += `<path d="${pv.map((p, i) => (i ? "L" : "M") + sx(p.x).toFixed(1) + " " + sy(p.y).toFixed(1)).join("")}" class="gtray"/>`;
    pv.forEach((p) => (g += `<circle cx="${sx(p.x).toFixed(1)}" cy="${sy(p.y).toFixed(1)}" r="${p.actual ? 5.5 : 4}" class="${p.actual ? "gp" : "gpa"}"><title>${esc(p.tip)}</title></circle>`));
    const fuera = puntos.find((p) => p.actual && isNum(p.x) && (p.x < x0 || p.x > x1));
    g += `<text x="${m.l + pw / 2}" y="${H - 6}" class="gt gax" text-anchor="middle">${esc(opts.xLab)}</text>`;
    g += `<text transform="translate(14 ${m.t + ph / 2}) rotate(-90)" class="gt gax" text-anchor="middle">${esc(yLab)}</text>`;
    return `<div class="grafico"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.aria)}">${g}</svg>${fuera ? `<p class="sec-nota">El punto actual queda fuera del rango de la curva.</p>` : ""}</div>`;
  }
  const BANDAS_Z = [[-3, -2, "gbad"], [-2, -1, "gwarn"], [-1, 1, "gok"], [1, 2, "gwarn"], [2, 3, "gbad"]];
  function curvaOMS(ctx, ind) {
    const { R, T, hist } = ctx, sx = R.SexoC || "M";
    const series = seriesLMS(T, ind, sx, R);
    const I = IND[ind];
    const xy = (h) => { const r = h.R; const xv = ind === "PT" ? r.Talla_cm : r.Edad_Meses_Aprox;
      const yv = ind === "PE" ? r.Peso : ind === "TE" ? r.Talla_cm : ind === "PT" ? r.Peso : ind === "IMC" ? r.IMC : r.PCef; return [xv, yv]; };
    const puntos = hist.map((h) => { const [x, y] = xy(h); const z = h.R.ind && h.R.ind[ind === "IMC" ? "IMC" : ind] ? h.R.ind[ind === "IMC" ? "IMC" : ind].Z : "";
      return { x, y, actual: h.actual, tip: `${h.fecha}: ${fmt(y, 1)}${isNum(z) ? " · Z " + fmt(z, 2) : ""}` }; });
    const banda = ind === "PC" ? [[-2, -1, "gwarn"], [-1, 1, "gok"], [1, 2, "gwarn"]] : BANDAS_Z;
    return grafico({ series, puntos, ejeX: I.ejeX, yLab: I.y, xLab: ind === "PT" ? "Talla (cm)" : "Edad", banda, etiquetaZ: (z) => (z > 0 ? "+" : "") + z,
      aria: `${I.t}: curvas de −3 a +3 DE con el punto del paciente` });
  }
  function curvaBrooks(ctx, ind) {
    const { R, T, hist } = ctx, sx = R.SexoC || "M";
    const series = seriesBrooks(T, ind, sx, R.PC.grupo);
    const puntos = hist.map((h) => { const r = h.R, y = ind === "PE" ? r.Peso : ind === "TE" ? r.Talla_cm : r.IMC; return { x: r.Edad_Meses_Aprox, y, actual: h.actual, tip: `${h.fecha}: ${fmt(y, 1)}` }; });
    return grafico({ series, puntos, ejeX: "meses", yLab: IND[ind === "IMC" ? "IMC" : ind].y, xLab: "Edad", xr: [24, 240], low: ind === "PE",
      banda: [[5, 10, "gwarn"], [10, 90, "gok"], [90, 95, "gwarn"]], etiquetaZ: (p) => "p" + p, aria: `Curva Brooks ${ind} GMFCS ${R.PC.grupoTxt}` });
  }

  // =============== bloques ===============
  const L = {};
  L.pc_info = ({ R, D, T }) => {
    if (D.pc_base !== "Sí") return "";
    const pc = T.t2 && T.t2.pc, i = ["I", "II", "III", "IV", "V"].indexOf(D.pc_gmfcs);
    return dl([["GMFCS", i >= 0 && pc ? esc(D.pc_gmfcs + ": " + pc.gmfcs_desc[i]) : '<span class="estado riesgo">Indique el nivel GMFCS</span>'],
      ["Curva Brooks", R.PC.gmfcs ? esc(R.PC.gmfcs === "V" ? "GMFCS " + R.PC.grupoTxt : "GMFCS " + R.PC.gmfcs + " (I-IV usan una sola curva)") : "—"],
      ["Actividad (Krick)", esc(R.Actividad) + (isNum(R.Krick_FA) ? ` · factor ${fmt(R.Krick_FA + R.Tono_Factor - 1, 2)} (FA + tono − 1)` : "")]]) +
      nota("Krick: postrado 1,15 · silla de ruedas 1,2 · gatea 1,25 · deambula 1,3. Si la actividad queda vacía se asigna según GMFCS (I-III deambula, IV silla, V postrado). Tono: hipertonía 1,1 · hipotonía 0,9.");
  };
  L.derivadas = ({ R, D }) => dl([
    R.Ciclo === "AM" && isNum(R.TallaRodilla) ? ["Talla por altura de rodilla (Chumlea)", fmt(R.TallaRodilla, 1) + " cm"] : null,
    ["Talla usada", isNum(R.Talla_cm) ? fmt(R.Talla_cm, 1) + " cm" + (D.usar_talla_rodilla === "Sí" && isNum(R.TallaRodilla) ? " (estimada por rodilla)" : "") : "—"],
    ["IMC", isNum(R.IMC) ? `<span class="num">${fmt(R.IMC, 2)}</span> kg/m²` + (R.IMC_Nota ? ` · ${esc(R.IMC_Nota)}` : "") : "—"],
    R.Ciclo === "NNA" ? ["Tipo de medición", esc(R.TipoMedicion)] : null,
    R.Ciclo === "NNA" ? ["Edad usada en tablas", isNum(R.Edad_Meses_Aprox) ? fmt(R.Edad_Meses_Aprox, 0) + " meses" + (R.PR_UsaEC === "Sí" ? " (edad corregida)" : "") : "—"] : null]);
  L.gestante = () => nota("La planilla no evalúa gestantes con el IMC de adulto. La calificación nutricional se hace con la curva de Atalah según IMC y semanas de gestación (etapa 8). Las medidas quedan registradas.");
  // Motivo por el que un indicador NNA no tiene puntaje Z: edad fuera del rango, dato faltante o medida fuera de la tabla
  const RANGO = { PE: [0, 120, "P/E: hasta los 10 años"], TE: [0, 228, "T/E: hasta los 19 años"], PT: [0, 60, "P/T: hasta los 5 años"],
    IMC: [61, 228, "IMC/E: desde 5 años 1 mes hasta 19 años"], PC: [0, 36, "PCe/E: hasta los 3 años"] };
  const NECESITA = { PE: [["peso", "peso"]], TE: [["talla", "talla"]], PT: [["peso", "peso"], ["talla", "talla"]], IMC: [["peso", "peso"], ["talla", "talla"]], PC: [["pcef", "perímetro cefálico"]] };
  function faltantes(R, D, k) {
    const f = [];
    if (!R.SexoC) f.push("sexo");
    if (!isNum(R.Edad_Meses_Aprox)) f.push("fechas de nacimiento y evaluación");
    (NECESITA[k] || []).forEach(([c, n]) => { if (c === "talla" ? !isNum(R.Talla_cm) : !isNum(D[c])) f.push(n); });
    return f;
  }
  const lista = (a) => a.length > 1 ? a.slice(0, -1).join(", ") + " y " + a[a.length - 1] : a[0];
  function motivo(R, D, k, i) {
    if (isNum(i.Z)) return pill(i.cls);
    const m = R.Edad_Meses_Aprox, rg = RANGO[k];
    if (isNum(m) && rg && (m < rg[0] || m > rg[1])) return `<span class="ayuda">No aplica (${esc(rg[2])})</span>`;
    const f = faltantes(R, D, k);
    if (f.length) return `<span class="estado riesgo">Falta ${esc(lista(f))}</span>`;
    if (k === "PT") return `<span class="estado riesgo">${R.TipoMedicion === "Longitud" ? "Longitud fuera de la tabla (45-110 cm)" : "Talla fuera de la tabla (65-120 cm)"}</span>`;
    return `<span class="estado riesgo">Fuera de la tabla</span>`;
  }
  function motivoCC(R, D) {
    const I = R.ind.CC;
    if (I.p) return pill(I.cls);
    if (isNum(R.Edad_Anios) && R.Edad_Anios < 5) return `<span class="ayuda">No aplica (desde los 5 años)</span>`;
    const f = []; if (!R.SexoC) f.push("sexo"); if (!isNum(R.Edad_Anios)) f.push("fechas"); if (!isNum(D.cc)) f.push("circunferencia de cintura");
    return f.length ? `<span class="estado riesgo">Falta ${esc(lista(f))}</span>` : pill(I.cls);
  }
  L.zscore = (ctx) => {
    const { R, D, ui } = ctx, I = R.ind;
    const filas = [["P/E (peso para la edad)", "PE", I.PE, "kg"], ["T/E (talla para la edad)", "TE", I.TE, "cm"], ["P/T (peso para la talla)", "PT", I.PT, "kg"],
      ["IMC/E (IMC para la edad)", "IMC", I.IMC, ""], ["PCe/E (perímetro cefálico)", "PC", I.PC, "cm"]];
    const rows = filas.map(([n, k, i]) => [esc(n) + (R.IndicadorNNA === (k === "IMC" ? "IMC/E" : k === "PE" ? "P/E" : k === "PT" ? "P/T" : "") ? ' <span class="chip acc">manda</span>' : ""),
      isNum(i.valor) && i.aplica === "Sí" ? fmt(i.valor, 1) : "—", isNum(i.Z) ? zPill(i.Z) : "—", motivo(R, D, k, i)]);
    rows.push(["PC/E (cintura, 5-19 a)", isNum(I.CC.valor) && I.CC.aplica === "Sí" ? fmt(I.CC.valor, 1) : "—", esc(txt(I.CC.Z)) + (I.CC.p ? ` <span class="ayuda">(p75 ${fmt(I.CC.p[3], 1)} · p90 ${fmt(I.CC.p[4], 1)})</span>` : ""), motivoCC(R, D)]);
    const fICT = []; if (!isNum(D.cc)) fICT.push("circunferencia de cintura"); if (!isNum(R.Talla_cm)) fICT.push("talla");
    rows.push(["Índice cintura/talla (≥ 0,5)", isNum(R.ICT) ? fmt(R.ICT, 2) : "—", "", isNum(R.ICT) ? pill(R.ICT_Cls) : isNum(R.Edad_Anios) && R.Edad_Anios < 5 ? `<span class="ayuda">No aplica (desde los 5 años)</span>` : `<span class="estado riesgo">Falta ${esc(lista(fICT))}</span>`]);
    const disp = filas.filter(([, k, i]) => isNum(i.Z)).map(([n, k]) => k);
    let sel = ui.chart && disp.includes(ui.chart) ? ui.chart : ({ "P/E": "PE", "P/T": "PT", "IMC/E": "IMC" }[R.IndicadorNNA] || disp[0]);
    const tabs = disp.length ? `<div class="tabs" role="tablist">${disp.map((k) => `<button type="button" role="tab" aria-selected="${k === sel}" data-a="chart" data-ind="${k}">${esc(IND[k].t)}</button>`).join("")}</div>` : "";
    return tabla(["Indicador", "Valor", "Puntaje Z", "Clasificación"], rows) +
      (sel ? `<div class="chart-box">${tabs}${curvaOMS(ctx, sel)}<p class="sec-nota leyenda"><span class="sw gok"></span> −1 a +1 DE <span class="sw gwarn"></span> ±1 a ±2 DE <span class="sw gbad"></span> más allá de ±2 DE · <span class="dot"></span> control actual · <span class="dot a"></span> controles anteriores</p></div>`
        : nota("Las curvas aparecen cuando al menos un indicador tiene puntaje Z (vea qué falta en la tabla)."));
  };
  L.brooks = (ctx) => {
    const { R, T, ESQ, ui } = ctx, P = R.PC;
    if (!T.brk) return nota("Cargando curvas Brooks…");
    if (!P.gmfcs) return nota("Indique el nivel GMFCS en Datos del paciente.");
    const f = (n, i) => [esc(n), isNum(i.valor) && i.aplica === "Sí" ? fmt(i.valor, 1) : "—", i.p ? `${fmt(i.p[0], 1)} · ${fmt(i.p[3], 1)} · ${fmt(i.p[6], 1)}` : "—", isNum(i.pct) ? "p" + fmt(i.pct, 1) : "—", pill(i.cls)];
    const disp = [["PE", P.PE], ["TE", P.TE], ["IMC", P.IMC]].filter(([, i]) => isNum(i.pct)).map(([k]) => k);
    const sel = ui.chartB && disp.includes(ui.chartB) ? ui.chartB : (P.ind === "IMC/E" ? "IMC" : disp[0]);
    return tabla(["Indicador", "Valor", "p5 · p50 · p95", "Percentil", "Clasificación"], [f("P/E (peso)", P.PE), f("T/E (talla)", P.TE), f("IMC/E", P.IMC)]) +
      dl([["Límite de bajo peso (P/E)", isNum(P.limBajo) ? fmt(P.limBajo, 1) + " kg · " + pill(P.limBajoTxt) : "—"], ["Indicador que manda (PC)", esc(P.ind)]]) +
      (sel ? `<div class="chart-box"><div class="tabs">${disp.map((k) => `<button type="button" data-a="chartB" data-ind="${k}" aria-selected="${k === sel}">${{ PE: "Peso", TE: "Talla", IMC: "IMC" }[k]}</button>`).join("")}</div>${curvaBrooks(ctx, sel)}<p class="sec-nota leyenda">Líneas p5, p10, p25, p50, p75, p90 y p95${sel === "PE" ? "; línea roja: límite de bajo peso («Low weight»)" : ""}.</p></div>` : "") +
      nota(esc(ESQ.brooks_nota));
  };
  L.calif_nna = ({ R, D }) => {
    const isPC = R.PC && R.PC.usa;
    const kRef = { "P/E": "PE", "P/T": "PT", "IMC/E": "IMC" }[R.IndicadorNNA];
    const falta = !isNum(R.Z_Ref) && kRef ? faltantes(R, D, kRef) : [];
    const califTxt = falta.length ? `<span class="estado riesgo">Falta ${esc(lista(falta))} para el ${esc(R.IndicadorNNA)}</span>` : pill(R.CalifNNA);
    return dl([["Indicador que manda", esc(R.IndicadorNNA) + (isPC ? "" : ' <span class="ayuda">(&lt; 1 a: P/E, o P/T si ≥ +1 DE · 1-5 a: P/T · &gt; 5 a: IMC/E)</span>')],
      ["Puntaje Z del indicador", zPill(R.Z_Ref)], ["Calificación nutricional", califTxt], ["Diagnóstico de talla", isNum(R.ind.TE.Z) || isPC ? pill(R.Dx_Talla) : motivo(R, D, "TE", R.ind.TE)],
      ["Perímetro de cintura", pill(R.CC_NNA)],
      ["Peso ideal (mediana)", isNum(R.Peso_Ideal) ? fmt(R.Peso_Ideal, 1) + " kg" : esc(txt(R.Peso_Ideal))],
      ["Peso máximo aceptable (+1 DE − 0,1)", isNum(R.Peso_Max) ? fmt(R.Peso_Max, 1) + " kg" : esc(txt(R.Peso_Max))],
      ["Peso mínimo aceptable (−1 DE + 0,1)", isNum(R.Peso_Min) ? fmt(R.Peso_Min, 1) + " kg" : esc(txt(R.Peso_Min))],
      ["Edad-talla", isNum(R.EdadTalla) ? fmt(R.EdadTalla, 0) + " meses (talla actual = mediana)" : "—"],
      ["Peso ideal para talla baja (Consenso p. 38)", isNum(R.PesoTallaBaja) ? fmt(R.PesoTallaBaja, 1) + " kg" : esc(txt(R.PesoTallaBaja))],
      ["Trayectoria del puntaje Z", R.Z_Tray ? pill(R.Z_Tray) + (R.Z_PrevioAuto ? ` <span class="ayuda">(Z previo ${fmt(R.Z_Previo, 2)}, del control anterior)</span>` : "") : "—"]]) +
      nota("Una caída ≥ 1 DE puede indicar compromiso nutricional temprano (DMIA I Clase 8 p. 5).");
  };
  L.adulto = ({ R }) => dl([
    ["Clasificación IMC " + (R.Ciclo === "AM" ? "adulto mayor (≥ 65 a)" : "adulto (< 65 a)"), pill(R.IMC_Cls)],
    ["Circunferencia de cintura (≥ 90 H / ≥ 80 M)", pill(R.CC_AD)], ["CC referencia antigua EMP (informativa)", esc(txt(R.CC_Antigua))],
    ["Cambio de peso", isNum(R.CambioPeso) ? fmt(R.CambioPeso, 1) + " % " + (R.CambioPeso > 0 ? "de pérdida" : "") + " · " + pill(R.CambioPeso_Cls) : "—"],
    R.Ciclo === "AM" ? ["Perímetro de pantorrilla (< 31 cm)", pill(R.Pantorrilla_Cls)] : null,
    ["Peso ideal (" + (R.Ciclo === "AM" ? "IMC 25,5" : "IMC 21,7") + ")", isNum(R.PesoIdeal_AD) ? fmt(R.PesoIdeal_AD, 1) + " kg" : "—"],
    ["Peso máximo aceptable (IMC " + (R.Ciclo === "AM" ? "27,9" : "24,9") + ")", isNum(R.PesoMax_AD) ? fmt(R.PesoMax_AD, 1) + " kg" : "—"],
    ["Peso mínimo aceptable (IMC " + (R.Ciclo === "AM" ? "23" : "18,5") + ")", isNum(R.PesoMin_AD) ? fmt(R.PesoMin_AD, 1) + " kg" : "—"],
    ["Peso ajustado = ideal + 0,25 × (real − ideal)", isNum(R.PesoAjust_AD) ? fmt(R.PesoAjust_AD, 1) + " kg" : "—"],
    R.Desc_Edema > 0 ? ["Peso seco (descuento por edema/ascitis)", fmt(R.PesoSeco, 1) + " kg (−" + fmt(R.Desc_Edema, 1) + " kg)"] : null]) +
    nota("Pérdida significativa: > 2 % en 1 semana, > 5 % en 1 mes, > 7,5 % en 3 meses, > 10 % en 6 meses (Dietoterapia Clase 3 p. 64). Descuento por edema/ascitis: Consenso USS 2018 p. 4.");
  L.salida = ({ R }) => {
    const pt = R.PesoTipo_Auto, val = { "Actual": R.Peso, "Seco": R.PesoSeco, "Máximo aceptable": R.Peso_Max, "Mínimo aceptable": R.Peso_Min, "Ajustado": R.Peso_Ajustado, "Ideal (talla baja)": R.PesoTallaBaja }[pt];
    return dl([["Calificación nutricional", pill(R.Calif_App)], ["Indicador de referencia", esc(txt(R.Indicador_Ref))], ["Malnutrición", pill(R.Malnutricion || "—")],
      ["Riesgo por cintura", pill(R.Riesgo_CC)], ["Peso para requerimientos (automático)", esc(pt) + (isNum(val) ? ` · <b class="num">${fmt(val, 1)} kg</b>` : "")]]) +
      nota("Peso a usar: NNA (Consenso p. 38) desnutrido → real; riesgo → mínimo aceptable; normal → actual; sobrepeso/obesidad → máximo aceptable; talla baja → ideal. AD/AM (Clase 9 p. 72, ⚠ asignación): bajo peso/normal → actual (seco si hay edema); sobrepeso → máximo aceptable; obesidad → ajustado. Se confirma en Requerimiento de energía (etapa 4).");
  };
  L.frisancho = ({ R, D }) => {
    const K = R.CC_, row = (n, v, p, c) => [esc(n), isNum(v) ? fmt(v, 1) : "—", p ? fmt(p[0], 0) : "—", p ? fmt(p[1], 0) : "—", p ? fmt(p[2], 0) : "—", pill(c)];
    const falta = [];
    if (!R.SexoC) falta.push("el sexo (Datos del paciente)");
    if (R.Edad_Anios === "") falta.push("las fechas de nacimiento y evaluación (Datos del paciente)");
    if (!isNum(D.cb)) falta.push("la circunferencia braquial");
    if (!isNum(D.cc_pt)) falta.push("el pliegue tricipital");
    const aviso = isNum(R.Edad_Anios) && R.Edad_Anios < 1 ? `<p class="sec-nota" style="color:var(--warn)">Frisancho no aplica en menores de 1 año: las tablas parten al año de edad (Frisancho 1981, tramos 1 a 74,9 años).</p>`
      : falta.length ? `<p class="sec-nota" style="color:var(--warn)">Para calcular Frisancho falta ${falta.join(", ").replace(/, ([^,]*)$/, " y $1")}.</p>` : (K.Nota ? nota(esc(K.Nota)) : "");
    return aviso + tabla(["Indicador", "Valor", "p10", "p50", "p90", "Clasificación"], [
      row("CMB (mm) = CB − π·PT", K.CMB, K.pCMB, K.CMB_Cls), row("AMB (mm²) = CMB²/4π", K.AMB, K.pAMB, K.AMB_Cls), row("AGB (mm²) = CB²/4π − AMB", K.AGB, K.pAGB, K.AGB_Cls)]) +
      dl([["Tramo de edad de la tabla", isNum(K.FRI_Edad) ? fmt(K.FRI_Edad, 0) + " años" : "—"], ["Composición muscular usada", pill(R.Comp_Musc)], ["Composición grasa usada", pill(R.Comp_Graso)]]) +
      nota("< p10 disminuido · p10-p90 normal · > p90 elevado (Consenso nutrición clínica USS 2018). CMB, AMB y AGB no indican desnutrición: se expresan como composición muscular o grasa.");
  };
  L.grasa = ({ R }) => {
    const K = R.CC_;
    return dl([["Durnin-Womersley (H ≥ 17 a, M ≥ 16 a, hasta 72 a)", pill(K.DW)],
      K.DW === "Sí" ? ["Suma de 4 pliegues", fmt(K.Suma, 1) + " mm"] : null, K.DW === "Sí" ? ["Densidad corporal", fmt(K.Dens, 4) + ` <span class="ayuda">(c ${fmt(K.c, 4)} · m ${fmt(K.m, 4)})</span>`] : null,
      ["% de grasa (Siri)", isNum(R.GC_Pct) ? fmt(R.GC_Pct, 1) + " %" : "—"], ["Clasificación", pill(R.GC_Cls)],
      isNum(K.MG) ? ["Masa grasa / masa libre de grasa", fmt(K.MG, 1) + " kg / " + fmt(K.MLG, 1) + " kg"] : null,
      ["% de grasa Deurenberg (informativo)", isNum(K.Deurenberg) ? fmt(K.Deurenberg, 1) + " %" : "—"]]) +
      nota("Cortes H: 12-20 % adecuado, 21-25 % exceso, > 25 % obeso · M: 20-30 %, 31-33 %, > 33 % (Dietoterapia Clase 3 p. 30). ⚠ Deurenberg: la diapositiva (Clase 5-6 p. 52) codifica mujer = 2; se usa 0 (ecuación original).");
  };
  L.contextura = ({ R }) => {
    const K = R.CC_;
    return dl([["R = talla / carpo", isNum(K.R) ? fmt(K.R, 2) : "—"], ["Contextura", pill(R.Contextura)],
      R.Ciclo === "AM" ? ["Peso ideal por contextura (informativo)", isNum(K.PesoIdealCtx) ? fmt(K.PesoIdealCtx, 1) + " kg" : esc(txt(K.PesoIdealCtx))] : null]) +
      nota("H: > 10,4 pequeña; 9,6-10,4 mediana; < 9,6 grande · M: > 11 pequeña; 10,1-11 mediana; < 10,1 grande (Dietoterapia Clase 5-6 p. 47). Para requerimientos se usa el peso ideal con IMC 25,5.");
  };
  L.pr_clasif = ({ R }) => { const P = R.PR, ap = P.APfila; return dl([["Semanas al nacer", isNum(P.SG) ? fmt(P.SG, 0) + " semanas" : "—"], ["Peso de nacimiento", isNum(P.PN) ? fmt(P.PN, 0) + " g" : "—"],
    ["Adecuación peso/EG (Alarcón-Pittaluga)", P.PEGAuto ? pill(P.PEGAuto === "AEG" ? "AEG (adecuado)" : P.PEGAuto === "PEG" ? "PEG (pequeño)" : P.PEGAuto === "GEG" ? "GEG (grande)" : P.PEGAuto) + (ap ? ` <span class="ayuda">p10 ${fmt(ap[1], 0)} g · p50 ${fmt(ap[3], 0)} g · p90 ${fmt(ap[5], 0)} g${isNum(P.PN) && P.PN < ap[0] ? " · bajo p3 (" + fmt(ap[0], 0) + " g)" : ""}</span>` : "") : "—"],
    P.PEGManual ? ["Adecuación usada", esc(P.PEG) + " (ajuste manual)"] : null,
    ["Clasificación por edad gestacional", pill(P.ClsEG)], ["Clasificación por peso de nacimiento", pill(P.ClsPN)],
    ["Corregir la edad hasta", isNum(P.LimCorr) ? P.LimCorr + " meses de edad corregida" : "—"]]) +
    nota("Extremo < 32 sem · moderado 32-33+6 · tardío 34-36+6 (Norma Técnica 2021). Corregir: MBPN o < 32 sem hasta 24 m; 32-33+6 sem y > 1.500 g hasta 12 m; 34-36+6 sem y ≥ 1.500 g hasta 6 m."); };
  L.pr_edades = ({ R }) => { const P = R.PR; return dl([["Edad cronológica", isNum(P.DDV) ? fmt(P.DDV, 0) + " días de vida" : "—"], ["Edad posmenstrual", esc(P.EPMTxt || "—")],
    ["Fecha de nacimiento corregida (40 semanas)", P.FNacCorrISO ? P.FNacCorrISO.split("-").reverse().join("-") : "—"], ["Edad corregida", esc(P.ECTexto || "—")],
    ["Edad corregida para tablas", isNum(P.ECMeses) ? P.ECMeses + " meses" : "—"], ["¿Se usa la edad corregida en las curvas OMS?", pill(P.UsaEC)]]) +
    nota("Si dice «Sí», la evaluación antropométrica y los requerimientos usan la edad corregida. Vacunas y controles siguen con la edad cronológica."); };
  L.pr_baja = ({ R }) => (R.PR.BajaInvalida ? `<p class="sec-nota" style="color:var(--bad)">El peso mínimo es mayor que el peso de nacimiento: un recién nacido no puede bajar a un peso mayor que el de nacimiento. Revise ambos valores.</p>` : "") + dl([["% de baja de peso = (PN − peso mínimo) / PN", isNum(R.PR.Baja) ? fmt(R.PR.Baja, 1) + " %" : "—"], ["Evaluación", pill(R.PR.BajaCls)]]);
  L.pr_crec = ({ R }) => { const P = R.PR; return (P.AntAuto ? nota(`Datos tomados del control anterior (${esc(String(P.FAnt).split("-").reverse().join("-"))}). Escriba otros valores si corresponde.`) : "") +
    dl([["Días entre controles", isNum(P.Dias) ? fmt(P.Dias, 0) : "—"], ["Incremento de peso", isNum(P.GDia) ? fmt(P.GDia, 1) + " g/día · " + fmt(P.GKgDia, 1) + " g/kg/día" : "—"],
      ["Incremento de talla / PC", (isNum(P.TMes) ? fmt(P.TMes, 1) + " cm/mes talla" : "—") + " · " + (isNum(P.PCMes) ? fmt(P.PCMes, 1) + " cm/mes PC" : "—")],
      ["Rango esperado de peso", esc(P.RangoTxt || "—")], ["Evaluación del incremento de peso", pill(P.IncCls)]]) +
    nota("Antes de 40 sem: talla 1 cm/sem y PC 0,8-1 cm/sem. Desde el término (EC): 1 m talla 3-4,5 y PC 1,6-2,5 cm/mes; 4 m 2,3-3,6 / 0,8-1,4; 8 m 1-2 / 0,3-0,8; 1 a 0,8-1,5 / 0,2-0,4; 2 a 0,7-1,3 / 0,1-0,4 (Teoría 10 p. 16-17, 22-24)."); };
  L.pr_req = ({ R }) => { const P = R.PR;
    return tabla(["Nutriente", "Unidad/kg", "Mín./kg", "Máx./kg", "Mín. día", "Máx. día"], P.req.map((r) => [esc(r.n), esc(r.u), fmt(r.mi, r.mi % 1 ? 1 : 0), fmt(r.ma, r.ma % 1 ? 1 : 0), isNum(r.dmi) ? fmt(r.dmi, 1) : "—", isNum(r.dma) ? fmt(r.dma, 1) : "—"])) +
      nota(`Referencia: ${esc(P.Ref)} · situación: ${esc(P.Sit)}. Vitamina D: Teoría 10 400-1.000 UI; ESPGHAN 2022 400-700 UI/kg/día, máx. 1.000 UI/día. Relación proteína/energía 2,8-3,6 g/100 kcal.`); };
  L.pr_aporte = ({ R }) => { const P = R.PR;
    return dl([["Volumen total", isNum(P.VolDia) ? fmt(P.VolDia, 0) + " mL/día · " + fmt(P.mLkg, 1) + " mL/kg/día" : "—"],
      ["Energía y proteína por 100 mL", isNum(P.Kcal100) ? fmt(P.Kcal100, 1) + " kcal · " + (isNum(P.Prot100) ? fmt(P.Prot100, 2) + " g" : "—") : "—"],
      ["Energía aportada", isNum(P.KcalDia) ? fmt(P.KcalDia, 1) + " kcal/día · " + fmt(P.KcalKg, 1) + " kcal/kg/día" : "—"],
      ["Proteína aportada", isNum(P.ProtDia) ? fmt(P.ProtDia, 2) + " g/día · " + fmt(P.ProtKg, 2) + " g/kg/día" : "—"],
      ["Relación proteína/energía", isNum(P.PE) ? fmt(P.PE, 2) + " g/100 kcal" : "—"],
      ["Adecuación de líquidos", pill(P.AdecLiq)], ["Adecuación de energía", pill(P.AdecKcal)], ["Adecuación de proteínas", pill(P.AdecProt)],
      ["Texto para el DNI", esc(P.DNI || "—")]]) + nota("Composición: Teoría 10 p. 58 (leche materna), 61 (fortificadores), 63 y 65 (fórmulas)."); };

  // Ayudamemoria de vacunas del lactante (TAB_VACUNAS, calendario PNI); usa la edad cronológica
  L.vacunas = ({ R, T }) => {
    const V = T.t2 && T.t2.vacunas; if (!V) return "";
    const m = R.Edad_Meses; if (!isNum(m)) return nota("Ingrese las fechas para ver las vacunas que corresponden.");
    const grupos = {}; V.nna.forEach(([n, e]) => { (grupos[e] = grupos[e] || []).push(n); });
    const edadTxt = (e) => e === 0 ? "Recién nacido" : e < 24 ? e + " meses" : e / 12 + " años";
    const filas = Object.keys(grupos).map(Number).sort((a, b) => a - b).filter((e) => e <= Math.max(m + 6, 24));
    return `<div style="padding:4px 16px 14px"><p class="sec-nota" style="padding:0 0 8px">Ayudamemoria: vacunas del calendario PNI que debería tener según su edad cronológica (${fmt(m, 0)} meses). Coteje con el carné de vacunas.</p>
      <ul class="vac">${filas.map((e) => `<li class="${e <= m ? "toca" : "prox"}"><b>${edadTxt(e)}</b><span>${grupos[e].map(esc).join(" · ")}</span><em>${e <= m ? "Debería tenerla" : "Próxima"}</em></li>`).join("")}</ul>
      <p class="sec-nota" style="padding:6px 0 0">Fuente: ${esc(V.fuente)}.</p></div>`;
  };

  root.Etapa2 = { live: L, fmt, estado };
})(this);
