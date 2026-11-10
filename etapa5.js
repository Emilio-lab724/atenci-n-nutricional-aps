/* Atención Nutricional APS — © 2026 Emilio Alejandro Espinoza Sotomayor, estudiante de Nutrición y Dietética, Universidad San Sebastián, sede De la Patagonia. Todos los derechos reservados. Prohibida su reproducción, distribución o modificación sin autorización escrita del autor. */
/* Etapa 5 — bloques de laboratorio, presión arterial, riesgo cardiovascular y funcionalidad del adulto mayor. Se registran en Etapa2.live. */
(function (root) {
  "use strict";
  const isNum = (v) => typeof v === "number" && isFinite(v);
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const f = (v, d) => isNum(v) ? v.toLocaleString("es-CL", { minimumFractionDigits: d, maximumFractionDigits: d }) : (v === "" || v == null ? "—" : esc(v));
  let C = null;
  const pill = (t) => { if (t === "" || t == null || t === "—") return "—"; const e = root.Calc.estadoColor(String(t), C); return e ? `<span class="estado ${e}">${esc(t)}</span>` : esc(t); };
  const dl = (rows) => `<dl class="calc">${rows.filter(Boolean).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`).join("")}</dl>`;
  const nota = (t) => `<p class="sec-nota">${t}</p>`;
  const verif = (l) => (l.length ? `<p class="sec-nota verif-n">${l.map(esc).join("<br>")}</p>` : "");
  const tabla = (head, rows) => `<div class="tabla-w" style="padding:10px 16px 6px"><table class="pr res"><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`;
  const V = (ctx, g, k) => ((ctx.ESQ.verificar[g] || {})[k]);
  const L = {};
  const pts = (n) => n + (n === 1 ? " punto" : " puntos");

  // ---------------- Laboratorio ----------------
  L.lab_deriv = (ctx) => {
    const { R } = ctx; C = ctx.ESQ.colores;
    const nna = R.Ciclo === "NNA";
    let h = dl([
      ["LDL usado (ingresado o Friedewald)", isNum(R.Lab_LDL) ? f(R.Lab_LDL, 0) + " mg/dL · " + pill(R.Lab_LDL_Cls) : esc(R.Lab_LDL || "—")],
      ["Colesterol no-HDL ⚠", isNum(R.Lab_NoHDL) ? f(R.Lab_NoHDL, 0) + " mg/dL · " + pill(R.Lab_NoHDL_Cls) : "—"],
      ["VLDL (TG/5)", isNum(R.Lab_VLDL) ? f(R.Lab_VLDL, 0) + " mg/dL · " + pill(R.Lab_VLDL_Cls) : "—"],
      ["HOMA-IR (corte 2,5)", isNum(R.Lab_HOMA) ? f(R.Lab_HOMA, 2) + " · " + pill(R.Lab_HOMA_Cls) : "—"],
      ["VFG estimada" + (R.Edad_Anios !== "" && R.Edad_Anios < 18 ? " (Schwartz)" : " (CKD-EPI 2021 ⚠)"), isNum(R.Lab_VFG) ? f(R.Lab_VFG, 1) + " mL/min/1,73 m² · " + esc(R.Lab_EtapaG) + " · " + pill(R.Lab_EtapaG_Cls) : "—"],
      ["Meta de HbA1c en DM", f(R.Meta_HbA1c, 0) + " %"],
      !nna && R.Lab_DPV ? ["Desnutrición proteica visceral (albúmina)", pill("desnutrición proteica visceral " + R.Lab_DPV)] : null,
      ["Alteraciones que pasan al DNI (ODIN)", R.Lab_ODIN ? `<b>${esc(R.Lab_ODIN)}</b>` : "Ninguna"],
    ]);
    if (R.Embarazada) h += nota(esc(V(ctx, "lab", "gestante")));
    const v = [];
    if (isNum(R.Lab_VFG) && R.Edad_Anios >= 18) v.push(V(ctx, "lab", "ckd"));
    if (isNum(R.Lab_NoHDL)) v.push(V(ctx, "lab", "nohdl"));
    if (R.LABV && isNum(R.LABV.insul)) v.push(V(ctx, "lab", "insul"));
    return h + nota("Sin diagnóstico previo, las alteraciones se escriben como «sugerente de…» (Consenso p. 21). «Alto en hierro / vitamina D» de la PD sale de aquí.") + verif(v.filter(Boolean));
  };

  // ---------------- Presión arterial ----------------
  L.pa_res = (ctx) => {
    const { R } = ctx; C = ctx.ESQ.colores;
    if (R.PAS === "" || R.PAD === "") return nota("Ingrese la PA sistólica y diastólica (promedio de las mediciones).");
    let h = "";
    if (R.Ciclo === "NNA" && R.Edad_Anios !== "" && R.Edad_Anios >= 1 && R.Edad_Anios < 13) {
      const fl = R.PA.filas;
      if (fl[0].fila === "" || fl[0].col === "") h += nota("Falta la talla para elegir el percentil de talla de la tabla de PA.");
      else h += tabla(["", "Talla ref. (cm)", "p90", "p95", "p95 + 12", "Elevada desde", "HTA 1 desde", "HTA 2 desde", "Nivel"], fl.map((x) => `<tr><td>${x.comp}</td><td class="num">${f(x.talla, 1)}</td><td class="num">${f(x.p90, 0)}</td><td class="num">${f(x.p95, 0)}</td><td class="num">${f(x.p95x, 0)}</td><td class="num">${f(x.h, 0)}</td><td class="num">${f(x.i, 0)}</td><td class="num">${f(x.j, 0)}</td><td class="num">${x.nivel === "" ? "—" : x.nivel}</td></tr>`))
        + nota("Percentil de talla con la talla más cercana a la del niño; se usa el menor entre el percentil y el valor absoluto (120/80, 130/80, 140/90).");
    } else if (R.Ciclo === "NNA" && R.Edad_Anios >= 13) h += nota("≥ 13 años: valores absolutos (elevada ≥ 120/< 80, HTA 1 ≥ 130/80, HTA 2 ≥ 140/90).");
    h += dl([
      ["Clasificación", `<b>${pill(R.PA_Clasificacion)}</b>`],
      R.Ciclo !== "NNA" ? ["Meta de PA", esc(R.PA_Meta)] : null,
      R.PA_Conducta ? ["Conducta", esc(R.PA_Conducta)] : null,
    ]);
    return h;
  };

  // ---------------- Riesgo cardiovascular ----------------
  L.rcv_res = (ctx) => {
    const { R } = ctx; C = ctx.ESQ.colores; const X = R.RCV;
    if (R.Ciclo === "") return nota("Ingrese las fechas en <b>Datos del paciente</b>.");
    const si = (v) => (v === "Sí" ? '<span class="estado alterado">Sí</span>' : "No");
    let h = `<h4 class="sub">Paso 1 · alto riesgo directo</h4>` + dl([["ECV aterosclerótica documentada", si(X.ecv)], ["Diabetes mellitus", si(X.dm)], ["ERC 3b-5 o albuminuria ≥ 30 mg/g", si(X.erc)],
      ["HTA refractaria", si(X.htaref)], ["Dislipidemia severa (LDL > 190)", si(X.dlpsev)]]);
    h += `<h4 class="sub">Paso 2 · tabla de Framingham</h4>` + dl([
      ["Tramo de edad · fumador", (isNum(X.tramo) ? X.tramo + "-" + (X.tramo === 65 ? 74 : X.tramo + 9) + " años" : esc(X.tramo)) + " · " + (X.fuma ? "fuma" : "no fuma")],
      ["Fila de PA / columna de CT", `${esc(X.filaPA)} / ${esc(X.colCT)}`],
      ["Riesgo de la tabla × factor HDL", `${isNum(X.tabla) ? f(X.tabla, 0) + " %" : "—"} × ${f(X.fHDL, 1)} = ${isNum(R.RCV_Pct) ? "<b>" + f(R.RCV_Pct, 1) + " %</b>" : "—"}`],
      ["Categoría según tabla", pill(X.cat)],
      R.RCV_NotaEdad ? ["Nota sobre la edad", esc(R.RCV_NotaEdad)] : null,
    ]);
    h += `<h4 class="sub">Paso 3 · factores que suben una categoría</h4>` + dl([["Síndrome metabólico", pill(R.SindMet)], ["ECV prematura en familiar de 1er grado", si(X.famecv)], ["¿Sube una categoría?", esc(X.sube)]]);
    h += `<h4 class="sub">Resultado</h4>` + dl([["RIESGO CARDIOVASCULAR", `<b>${pill(R.RCV_Cat)}</b>`], ["Metas", esc(R.RCV_Metas)], ["Control PSCV", esc(R.RCV_Control)]]);
    return h + verif([V(ctx, "rcv", "edad")].filter(Boolean));
  };

  // ---------------- Funcionalidad del adulto mayor ----------------
  const res = (t) => dl([["Resultado", `<b>${pill(t)}</b>`]]);
  L.fam_mna = (ctx) => { const { R } = ctx; C = ctx.ESQ.colores; const F = R.FAM;
    return dl([["F. IMC (automático)", F.mnaF1 !== "" ? pts(F.mnaF1) : F.mnaF2 !== "" ? "Sin IMC: pantorrilla → " + pts(F.mnaF2) + " ⚠" : "Falta IMC o pantorrilla"],
      ["Puntaje MNA-SF (máx. 14)", R.MNA_Score === "" ? "—" : `<b>${R.MNA_Score}</b>`], ["Resultado", `<b>${pill(R.MNA_Cls)}</b>`]])
      + nota("12-14 normal · 8-11 riesgo de malnutrición · 0-7 malnutrición.") + (F.mnaF2 !== "" ? verif([V(ctx, "funcam", "mna")]) : ""); };
  L.fam_fuerza = (ctx) => { const { R } = ctx; C = ctx.ESQ.colores; return dl([["Dinamometría", pill(R.Fuerza_Cls)], ["Velocidad de marcha", pill(R.Marcha_Cls)], ["SPPB", pill(R.SPPB_Cls)]]); };
  L.fam_mmse = (ctx) => { const { R } = ctx; C = ctx.ESQ.colores; return dl([["Puntaje (máx. 19)", R.MMSE === "" ? "—" : `<b>${R.MMSE}</b>`], ["Resultado", pill(R.MMSE_Cls)]]); };
  L.fam_efa = (ctx) => { const { R } = ctx; C = ctx.ESQ.colores; return dl([["Ítem 6 · MMSE (automático)", R.FAM.a[5] === "" ? "Falta MMSE" : pts(R.FAM.a[5])], ["Puntaje EFAM A (máx. 54)", R.EFAM_A === "" ? "—" : `<b>${R.EFAM_A}</b>`], ["Resultado", pill(R.EFAM_A_Cls)]]); };
  L.fam_efb = (ctx) => { const { R } = ctx; C = ctx.ESQ.colores; return dl([["Ítem 4 · MMSE (automático)", R.FAM.b[3] === "" ? "Falta MMSE" : pts(R.FAM.b[3])], ["Puntaje EFAM B (máx. 62)", R.EFAM_B === "" ? "—" : `<b>${R.EFAM_B}</b>`], ["Resultado", pill(R.EFAM_B_Cls)], R.EFAM_Yesavage ? ["Pregunta 5 alterada", esc(R.EFAM_Yesavage)] : null]); };
  L.fam_bar = (ctx) => { const { R } = ctx; C = ctx.ESQ.colores; return dl([["Puntaje Barthel (máx. 100)", R.Barthel === "" ? "—" : `<b>${R.Barthel}</b>`], ["Grado de dependencia", pill(R.Barthel_Cls)]]) + nota("< 20 total · 20-35 severo · 40-55 moderado · ≥ 60 leve · 100 independiente."); };
  L.fam_yes = (ctx) => { const { R } = ctx; C = ctx.ESQ.colores; return dl([["Puntaje Yesavage (máx. 15)", R.Yesavage === "" ? "—" : `<b>${R.Yesavage}</b>`], ["Resultado", pill(R.Yesavage_Cls)]]) + nota("Preguntas 1, 5, 7, 11 y 13: suman 1 punto si responde NO; el resto, si responde SÍ."); };
  L.fam_pfe = (ctx) => { const { R } = ctx; C = ctx.ESQ.colores; return dl([["¿Corresponde aplicarlo?", esc(R.Pfeffer_Aplica)], ["Puntaje Pfeffer (máx. 33)", R.Pfeffer === "" ? "—" : `<b>${R.Pfeffer}</b>`], ["Resultado", pill(R.Pfeffer_Cls)]]); };
  L.fam_caidas = (ctx) => { const { R } = ctx; C = ctx.ESQ.colores; return dl([["Estación unipodal", pill(R.Unipodal_Cls)], ["Timed Up and Go", pill(R.TUG_Cls)], ["RIESGO DE CAÍDAS", `<b>${pill(R.Caidas_Cls)}</b>`]]) + (String(R.Unipodal_Cls).includes("⚠") ? verif([V(ctx, "funcam", "uni")]) : ""); };
  L.fam_empam = (ctx) => { const { R } = ctx; C = ctx.ESQ.colores; return res(R.Funcional_EMPAM) + nota("Autovalente sin riesgo · autovalente con riesgo · riesgo de dependencia · dependencia leve, moderada o severa (Barthel)."); };
  L.fam_estim = (ctx) => { const { R } = ctx; return dl([["Talla por semienvergadura (Bassey)", isNum(R.Talla_Bassey) ? f(R.Talla_Bassey, 1) + " cm" : "—"], ["Talla por altura de rodilla (Chumlea)", isNum(R.TallaRodilla) ? f(R.TallaRodilla, 1) + " cm" : "—"],
    ["Peso estimado (Chumlea, 65-90 a)", isNum(R.Peso_Chumlea) ? f(R.Peso_Chumlea, 1) + " kg" : "Faltan CB, pantorrilla, PSE o altura de rodilla"]]); };

  root.Etapa5 = { live: L };
  if (root.Etapa2) Object.assign(root.Etapa2.live, L);
})(this);
