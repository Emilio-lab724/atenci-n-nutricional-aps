/* Etapa 7 — gestante y nodriza: evaluación gestacional (IMC pregestacional, Atalah, incremento de peso), kcal extra paso a paso,
   requerimientos de gestante/nodriza y clínica de lactancia. Se registran en Etapa2.live. */
(function (root) {
  "use strict";
  const isNum = (v) => typeof v === "number" && isFinite(v);
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const f = (v, d) => isNum(v) ? v.toLocaleString("es-CL", { minimumFractionDigits: d, maximumFractionDigits: d }) : (v === "" || v == null ? "—" : esc(v));
  const fm = (v, d) => isNum(v) ? v.toLocaleString("es-CL", { maximumFractionDigits: d }) : "—";
  let C = null;
  const pill = (t) => { if (t === "" || t == null || t === "—") return "—"; const e = root.Calc.estadoColor(String(t), C); return e ? `<span class="estado ${e}">${esc(t)}</span>` : esc(t); };
  const est = (t, tipo) => `<span class="estado ${tipo}">${esc(t)}</span>`;
  const clsEN = (t) => t === "Normal" || t === "Adecuado" ? est(t, "normal") : t === "Bajo peso" || t === "Sobrepeso" || t === "Insuficiente" ? est(t, "riesgo") : t === "Obesidad" || t === "Excesivo" ? est(t, "alterado") : esc(t);
  const dl = (rows) => `<dl class="calc">${rows.filter(Boolean).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`).join("")}</dl>`;
  const nota = (t) => `<p class="sec-nota">${t}</p>`;
  const kpis = (items) => `<div class="kpis">${items.map(([k, v, s]) => `<div class="kpi"><span>${esc(k)}</span><b class="num">${v}</b>${s ? `<small>${s}</small>` : ""}</div>`).join("")}</div>`;
  const L = {};
  const G0 = (R) => R.GES || {};

  // ---------------- Evaluación gestacional ----------------
  L.ges_pre = ({ R, ESQ, T }) => {
    C = ESQ.colores; const G = G0(R), t7 = T && T.t7;
    if (!isNum(G.imcPre)) return nota("Ingrese el <b>peso pregestacional</b> (y la talla en Medidas antropométricas) para clasificar el estado nutricional inicial.");
    const filas = t7 ? Object.entries(t7.inc).map(([k, x]) => `<tr class="${k === G.enPre ? "sel" : ""}"><td>${esc(k)}</td><td class="num">${x.tot[0]} a ${x.tot[1]}</td><td class="num">${x.sem[0]} a ${x.sem[1]}</td><td class="num">${esc(x.multTxt)}</td></tr>`).join("") : "";
    return kpis([["IMC pregestacional", f(G.imcPre, 1) + " kg/m²", "Peso " + fm(G.pp, 1) + " kg"], ["Estado nutricional inicial", clsEN(G.enPre), "Cortes 18,5 · 25 · 30 ⚠"],
      ["Incremento total recomendado", esc(G.rangoTxt) + " kg", G.mult ? "Embarazo múltiple (columna MINSAL)" : "Embarazo único"], ["Peso ideal (IMC 21,7)", fm(G.pesoIdeal, 1) + " kg", "Se usa para GEB y proteínas"]])
      + `<div class="tabla-w" style="padding:4px 16px 8px"><table class="pr res"><thead><tr><th>Estado nutricional inicial</th><th>Incremento total (kg)</th><th>Semanal desde 2.º trimestre (g/sem)</th><th>Embarazo múltiple (kg)</th></tr></thead><tbody>${filas}</tbody></table></div>`
      + nota("Guía Perinatal MINSAL 2015, Tabla 1, p. 43 (bajo peso 12 a 18 kg, regla docente). La columna de embarazo múltiple va tal como la publicó el MINSAL.");
  };
  L.ges_atalah = ({ R, ESQ }) => {
    C = ESQ.colores; const G = G0(R), A = G.atalahFila;
    if (!isNum(R.SG)) return nota("Ingrese las <b>semanas de gestación (SG)</b> en Datos del paciente.");
    if (!isNum(R.IMC)) return nota("Ingrese peso y talla actuales en Medidas antropométricas.");
    return kpis([["IMC actual", f(R.IMC, 1) + " kg/m²", "SG " + fm(R.SG, 1) + (G.sgEnt !== R.SG ? " (se usa la semana " + G.sgEnt + ")" : "")], ["Estado nutricional actual (Atalah)", clsEN(G.atalah), ""]])
      + (A ? dl([["Bajo peso", "IMC &lt; " + fm(A[0], 1)], ["Normal", fm(A[0], 1) + " – " + fm(A[1], 1)], ["Sobrepeso", "&gt; " + fm(A[1], 1) + " – " + fm(A[2], 1)], ["Obesidad", "&gt; " + fm(A[2], 1)]]) : "")
      + nota("Gráfico de evaluación nutricional de la gestante según IMC y edad gestacional 2018-2019 (portafolio, anexo 3, p. 6). <span class=\"verif\">⚠ verificar: cortes leídos del gráfico (± 0,1)</span>.");
  };
  L.ges_inc = ({ R, ESQ }) => {
    C = ESQ.colores; const G = G0(R);
    if (!isNum(G.ganancia)) return nota("Faltan el peso actual o el peso pregestacional.");
    const inc = G.inc;
    return kpis([["Ganancia lograda", fm(G.ganancia, 1) + " kg", "Peso actual − pregestacional"],
      ["Incremento semanal actual", isNum(G.incSemG) ? f(G.incSemG, 0) + " g/sem" : "—", isNum(R.SG) && R.SG > 11 ? "(" + fm(G.ganancia, 1) + " kg) / (" + fm(R.SG, 1) + " − 11)" : "Desde la semana 12"],
      ["Esperado", inc ? inc.sem[0] + " a " + inc.sem[1] + " g/sem" : "—", G.mult ? "⚠ la tabla semanal es de embarazo único" : ""], ["Clasificación", clsEN(G.incCls), ""]])
      + nota("Incremento de peso = (peso actual − peso pregestacional) / (SG − 11) (MINSAL 2020, portafolio p. 3).");
  };
  L.ges_kcal = ({ R, ESQ, D }) => {
    C = ESQ.colores; const G = G0(R);
    const rango = G.rango ? Math.min(...G.rango) + " a " + Math.max(...G.rango) + " kg" : "—";
    const paso = (n, t, v) => `<li><span class="n">${n}</span><span class="t">${t}</span><b class="num">${v}</b></li>`;
    let h = `<ol class="pasos">`
      + paso(1, "Ganancia meta total al término (rango " + esc(rango) + ")", isNum(G.meta) ? fm(G.meta, 1) + " kg" + (G.metaFuera ? " ⚠ fuera del rango" : "") : "—")
      + paso(2, "Ganancia lograda = peso actual − pregestacional", isNum(G.ganancia) ? fm(G.ganancia, 1) + " kg" : "—")
      + paso(3, "kg faltantes = meta − lograda", isNum(G.faltan) ? fm(G.faltan, 1) + " kg" : "—")
      + paso(4, "kcal totales = kg faltantes × 7.000", isNum(G.kcalTot) ? fm(G.kcalTot, 0) + " kcal" : "—")
      + paso(5, "Semanas faltantes = 40 − SG", isNum(G.semFaltan) ? fm(G.semFaltan, 1) : "—")
      + paso(6, "kcal por semana = kcal totales ÷ semanas faltantes", isNum(G.kcalSem) ? fm(G.kcalSem, 1) + " kcal/sem" : "—")
      + paso(7, "kcal extra por día = kcal por semana ÷ 7", isNum(G.kcalDia) ? fm(G.kcalDia, 1) + " kcal/día" : "—")
      + `</ol>`;
    h += kpis([["Kcal extra que se suman al GET", f(G.extra, 0) + " kcal/día", G.aplicaExtra ? "" : "Solo con estado inicial bajo peso o normal"],
      ["Embarazo múltiple (≥ 20 SG)", G.multKcal ? "+ 1.000 kcal · + 50 g proteína" : "No aplica", ""]]);
    if (G.aviso) h += `<p class="aviso-g">${esc(G.aviso)}</p>`;
    if (!isNum(D.ges_meta) && isNum(G.metaSug)) h += nota("Meta sugerida = punto medio del rango (" + fm(G.metaSug, 1) + " kg). Escriba la meta que elija dentro del rango.");
    return h + nota("Método docente (reglas del proyecto). No se usa el + 350 / + 450 kcal por trimestre de la Guía.");
  };
  L.gestante = ({ R }) => R.Embarazada ? nota("La calificación nutricional de la gestante se hace con Atalah según la SG. Vea <b>Evaluación gestacional</b>: " + esc(G0(R).atalah || "—") + ".") : "";

  // ---------------- Requerimiento de energía (gestante y nodriza) ----------------
  const base = root.Etapa2 && root.Etapa2.live.req_energia;
  L.req_energia = (ctx) => {
    const { R } = ctx, G = G0(R);
    if (!(G.es || G.nod)) return base ? base(ctx) : "";
    C = ctx.ESQ.colores;
    if (!isNum(R.Peso_Usado)) return nota("Faltan peso y talla.");
    const filas = [["Peso usado", fm(R.Peso_Usado, 1) + " kg · " + esc(R.PesoTipo)], ["GEB FAO/OMS/UNU 2004", esc(G.gebEc) + " = " + fm(G.geb, 1) + " kcal"],
      ["× PAL (FAO 2004)", fm(R.Factor_AF, 2) + " → " + fm(G.gebPal, 0) + " kcal"]];
    if (G.es) { filas.push(["+ kcal extra por embarazo", fm(G.extra, 0) + " kcal (ver Evaluación gestacional)"]); if (G.multKcal) filas.push(["+ embarazo múltiple (≥ 20 SG)", "1.000 kcal"]); }
    else filas.push(["+ nodriza", "500 kcal <span class=\"verif\">⚠ decisión docente</span>"]);
    const aj = ctx.D && isNum(ctx.D.req_ajuste) ? ctx.D.req_ajuste : 0;
    if (aj) filas.push(["Ajuste manual", fm(aj, 0) + " kcal"]);
    return kpis([["GET final", f(R.GET_Final, 0) + " kcal/día", ""], ["Peso usado", fm(R.Peso_Usado, 1) + " kg", esc(R.PesoTipo)], ["kcal/kg de peso usado", f(R.Kcal_Kg, 1), ""], ["Nomenclatura (PD)", pill(R.Nom_Kcal), "Respecto de GEB × PAL ⚠"]])
      + dl(filas.map(([k, v]) => [k, v]))
      + nota((G.es ? "Gestante" : "Nodriza") + ": GEB FAO/OMS/UNU 2004 × PAL" + (G.es ? " + kcal extra por embarazo (solo bajo peso o normal) + 1.000 kcal en embarazo múltiple desde la semana 20" : " + 500 kcal")
        + ". Menor de 18 años: tramo 18-30. Peso: " + (G.es ? "ideal (IMC 21,7 × talla²)." : "el de la planilla según el estado nutricional.") + " Fórmulas del adulto en «Ajustar el cálculo» no se aplican.");
  };
  L.nod_info = ({ R, D }) => {
    const G = G0(R);
    if (!G.nod) return nota("Esta página aplica a mujeres que están amamantando (marque «¿Está amamantando actualmente?» en Anamnesis social).");
    return kpis([["Proteína extra", G.protExtra === 12.5 ? "+ 12,5 g" : "+ 15 g", isNum(D.nod_meses) ? (D.nod_meses > 6 ? "Después de los 6 meses" : "Primeros 6 meses") : "Sin meses: se asumen los primeros 6"],
      ["Energía extra", "+ 500 kcal/día", "⚠ decisión docente"], ["Micronutrientes", "Columna «Lactancia»", "Guía Perinatal 2015, Tabla 3"]]);
  };

  if (root.Etapa2) Object.assign(root.Etapa2.live, L);
  root.Etapa7 = { live: L };
})(this);
/* Etapa 8 — conclusión de la tendencia de frecuencia de consumo (hoja TFC, celda B19) */
(function (root) {
  "use strict";
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const L = { tfc_concl: ({ R }) => `<p class="concl">${esc(R.TFC_Conclusion)}</p>` };
  if (root.Etapa2) Object.assign(root.Etapa2.live, L);
})(this);
