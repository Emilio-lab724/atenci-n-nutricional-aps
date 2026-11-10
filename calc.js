/* Atención Nutricional APS — © 2026 Emilio Alejandro Espinoza Sotomayor, estudiante de Nutrición y Dietética, Universidad San Sebastián, sede De la Patagonia. Todos los derechos reservados. Prohibida su reproducción, distribución o modificación sin autorización escrita del autor. */
/* Motor de cálculo — réplica de las fórmulas de Planilla_Nutricional.xlsx (etapa 1).
   Cada valor lleva el nombre definido de la planilla (Edad_Anios, Ciclo, Social_Deriv…). */
(function (root) {
  "use strict";
  const vacio = (v) => v === undefined || v === null || v === "";
  const S = (v) => (vacio(v) ? "" : String(v));

  // ---------- Fechas (mismo comportamiento que DATEDIF de Excel) ----------
  function parseFecha(s) {
    if (vacio(s)) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s));
    if (!m) return null;
    const y = +m[1], mo = +m[2], d = +m[3];
    const t = Date.UTC(y, mo - 1, d);
    const chk = new Date(t);
    if (chk.getUTCMonth() !== mo - 1) return null;
    return { y, m: mo, d, t };
  }
  const DIA = 86400000;
  function datedif(a, b, u) {
    if (!a || !b || b.t < a.t) return null; // Excel: #¡NUM!
    let anios = b.y - a.y; if (b.m < a.m || (b.m === a.m && b.d < a.d)) anios--;
    let meses = (b.y - a.y) * 12 + (b.m - a.m); if (b.d < a.d) meses--;
    if (u === "y") return anios;
    if (u === "m") return meses;
    if (u === "ym") return meses % 12;
    if (u === "md") {
      if (b.d >= a.d) return b.d - a.d;
      // Excel: fin − FECHA(AÑO(fin); MES(fin) − 1; DÍA(inicio)), con desborde de mes
      return Math.round((b.t - Date.UTC(b.y, b.m - 2, a.d)) / DIA);
    }
    return null;
  }

  // ---------- Color por palabras clave (formato condicional de la planilla) ----------
  function estadoColor(texto, reglas) {
    if (vacio(texto) || !reglas) return "";
    const t = String(texto).toLowerCase();
    for (const r of reglas) if (r.claves.some((k) => t.includes(k.toLowerCase()))) return r.estado;
    return "";
  }

  // ---------- Cálculo principal ----------
  // =====================================================================
  // ETAPA 2 — réplica de PREMATURO, EVAL_ANTROPOMETRICA (+ Brooks de Planilla_NNA) y COMPOSICION_CORPORAL
  // =====================================================================
  const isNum = (v) => typeof v === "number" && isFinite(v);
  const lt = (x, n) => isNum(x) && x < n;            // Excel: "" < n es FALSO
  const xround = (x, d) => { const f = Math.pow(10, d || 0); return Math.sign(x) * Math.round(Math.abs(x) * f + 1e-9) / f; };
  const sexoTxt = (R) => R.SexoC;
  function fechaDe(t) { const d = new Date(t); return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), t }; }
  function isoDe(t) { const d = new Date(t); return d.toISOString().slice(0, 10); }
  // NORMSINV / NORMSDIST
  function normsdist(z) { const t = 1 / (1 + 0.2316419 * Math.abs(z)); const d = 0.3989422804014327 * Math.exp(-z * z / 2);
    let p = d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
    // refinamiento con erf de alta precisión
    p = 0.5 * erfc(Math.abs(z) / Math.SQRT2); return z > 0 ? 1 - p : p; }
  function erfc(x) { // Numerical Recipes erfc (precisión ~1e-7) mejorada por serie
    const z = Math.abs(x), t = 1 / (1 + 0.5 * z);
    const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
    return x >= 0 ? r : 2 - r; }
  function normsinv(p) { // Acklam
    const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
    const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
    const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
    const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
    const pl = 0.02425; let q, r;
    if (p < pl) { q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    if (p > 1 - pl) { q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    q = p - 0.5; r = q * q; return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1); }

  function prematuro(D, R, T, fnac, feval, opts) {
    const P = {}, t2 = T && T.t2;
    P.SG = isNum(D.so_sgnac) ? D.so_sgnac : "";
    P.PN = isNum(D.so_pnac) ? D.so_pnac : "";
    const sgd = isNum(D.pr_sg_dias) ? D.pr_sg_dias : 0;
    P.EGDias = P.SG === "" ? "" : P.SG * 7 + sgd;
    P.ClsEG = P.SG === "" ? "Sin dato" : P.SG < 32 ? "Prematuro extremo (< 32 sem)" : P.SG < 34 ? "Prematuro moderado (32-33+6 sem)" : P.SG < 37 ? "Prematuro tardío (34-36+6 sem)" : "De término (≥ 37 sem)";
    P.ClsPN = P.PN === "" ? "Sin dato" : P.PN < 1000 ? "Extremo bajo peso (EBPN, < 1.000 g)" : P.PN < 1500 ? "Muy bajo peso (MBPN, < 1.500 g)" : P.PN < 2500 ? "Bajo peso (BPN, < 2.500 g)" : "Peso de nacimiento ≥ 2.500 g";
    P.Es = P.SG === "" ? "Sin dato" : P.SG < 37 ? "Sí" : "No";
    // Adecuación peso/EG con la tabla de peso de Alarcón-Pittaluga (Rev Chil Pediatr 2010, Tabla 2): reemplaza el ingreso manual de la planilla
    const AP = t2 && t2.alarcon ? t2.alarcon.peso[P.SG] : null;
    P.APfila = AP || null;
    P.PEGAuto = !isNum(P.SG) || !isNum(P.PN) ? "" : !AP ? "Fuera de tabla (24-42 semanas)" : P.PN < AP[1] ? "PEG" : P.PN > AP[5] ? "GEG" : "AEG";
    P.PEG = !vacio(D.pr_peg) ? D.pr_peg : (["PEG", "AEG", "GEG"].includes(P.PEGAuto) ? P.PEGAuto : "");
    P.PEGManual = !vacio(D.pr_peg);
    P.LimCorr = P.Es !== "Sí" ? "" : (P.SG < 32 || (isNum(P.PN) && P.PN < 1500)) ? 24 : P.SG < 34 ? 12 : 6;
    P.DDV = fnac && feval ? Math.round((feval.t - fnac.t) / DIA) : "";
    P.EPM = P.EGDias === "" || P.DDV === "" ? "" : (P.EGDias + P.DDV) / 7;
    P.EPMTxt = P.EPM === "" ? "" : Math.floor(P.EPM) + "+" + xround((P.EPM - Math.floor(P.EPM)) * 7, 0) + " sem";
    P.ECSem = P.EGDias === "" || P.DDV === "" ? "" : (P.DDV - (280 - P.EGDias)) / 7;
    P.FNacCorr = P.EGDias === "" || !fnac ? null : fechaDe(fnac.t + (280 - P.EGDias) * DIA);
    P.FNacCorrISO = P.FNacCorr ? isoDe(P.FNacCorr.t) : "";
    if (!P.FNacCorr || !feval) { P.ECTexto = ""; P.ECMeses = ""; }
    else if (feval.t < P.FNacCorr.t) { P.ECTexto = "Aún no cumple 40 semanas (EPM " + P.EPMTxt + ")"; P.ECMeses = ""; }
    else { const m = datedif(P.FNacCorr, feval, "m"), md = datedif(P.FNacCorr, feval, "md"); P.ECTexto = m + " meses y " + md + " días"; P.ECMeses = m + (md >= 16 ? 1 : 0); }
    P.UsaEC = P.Es !== "Sí" ? "No (no es prematuro/a)" : P.EPM === "" ? "Falta dato" : P.EPM < 40 ? "No: antes de las 40 semanas se evalúa con la curva intrauterina" :
      (isNum(P.ECMeses) && P.ECMeses <= P.LimCorr) ? "Sí" : "No: ya cumplió " + P.LimCorr + " meses de edad corregida";
    // transición
    const pmin = isNum(D.pr_pmin) ? D.pr_pmin : "";
    P.Baja = isNum(P.PN) && isNum(pmin) ? (P.PN - pmin) / P.PN * 100 : "";
    P.BajaInvalida = isNum(P.Baja) && P.Baja < 0;
    P.BajaCls = P.BajaInvalida ? "Revise los datos: el peso mínimo no puede ser mayor que el peso de nacimiento" : !isNum(P.Baja) ? "Sin dato" : P.Baja > 15 ? "Excesiva (> 15 %)" : P.Baja > 10 ? "Mayor a la esperada (> 10 %)" : "Esperada (hasta 7-10 %; PEG 4-7 %)";
    // crecimiento (control anterior: ingresado o tomado del control previo)
    const prev = (opts && opts.prev) || {};
    P.FAnt = !vacio(D.pr_fant) ? D.pr_fant : (prev.feval || "");
    P.PAnt = isNum(D.pr_pant) ? D.pr_pant : (isNum(prev.peso) ? prev.peso * 1000 : "");
    P.TAnt = isNum(D.pr_tant) ? D.pr_tant : (isNum(prev.talla) ? prev.talla : "");
    P.PCAnt = isNum(D.pr_pcant) ? D.pr_pcant : (isNum(prev.pcef) ? prev.pcef : "");
    P.AntAuto = vacio(D.pr_fant) && !!prev.feval;
    const fant = parseFecha(P.FAnt);
    P.Dias = fant && feval ? Math.round((feval.t - fant.t) / DIA) : "";
    return P;
  }
  function prematuroCrec(D, R, P, T) {
    const peso = R.Peso, ok = isNum(P.Dias) && P.Dias > 0;
    P.GDia = isNum(P.PAnt) && isNum(peso) && ok ? (peso * 1000 - P.PAnt) / P.Dias : "";
    P.GKgDia = isNum(P.GDia) ? P.GDia / (P.PAnt / 1000) : "";
    P.TSem = isNum(P.TAnt) && isNum(R.Talla_cm) && ok ? (R.Talla_cm - P.TAnt) / P.Dias * 7 : "";
    P.PCSem = isNum(P.PCAnt) && isNum(R.PCef) && ok ? (R.PCef - P.PCAnt) / P.Dias * 7 : "";
    P.TMes = isNum(P.TSem) ? xround(P.TSem * 30.4 / 7, 1) : "";
    P.PCMes = isNum(P.PCSem) ? xround(P.PCSem * 30.4 / 7, 1) : "";
    const ec = P.ECMeses;
    P.RangoTxt = P.Es !== "Sí" || !isNum(P.EPM) ? "" : P.EPM < 40 ? "15-20 g/kg/día (catch-up 20-25; > 25 excesivo: descartar edema)" :
      lt(ec, 2.5) ? "26-40 g/día (EC 1 mes)" : lt(ec, 6) ? "15-25 g/día (EC 4 meses)" : lt(ec, 10) ? "12-17 g/día (EC 8 meses)" : lt(ec, 18) ? "9-12 g/día (EC 1 año)" : "4-10 g/día (EC 2 años)";
    if (P.Es !== "Sí" || !isNum(P.GDia)) P.IncCls = "Sin dato";
    else if (P.EPM < 40) { const g = P.GKgDia; P.IncCls = g < 15 ? "Bajo lo esperado (< 15 g/kg/día)" : g <= 20 ? "Esperado (15-20 g/kg/día)" : g <= 25 ? "Catch-up (20-25 g/kg/día)" : "Excesivo (> 25 g/kg/día): descartar edema"; }
    else { const lo = lt(ec, 2.5) ? 26 : lt(ec, 6) ? 15 : lt(ec, 10) ? 12 : lt(ec, 18) ? 9 : 4, hi = lt(ec, 2.5) ? 40 : lt(ec, 6) ? 25 : lt(ec, 10) ? 17 : lt(ec, 18) ? 12 : 10;
      P.IncCls = P.GDia < lo ? "Bajo lo esperado" : P.GDia > hi ? "Sobre lo esperado" : "Esperado"; }
    // requerimientos enterales
    const pr = T && T.t2 && T.t2.prem;
    P.Ref = vacio(D.pr_ref) ? "Teoría 10 (Koletzko, Rev Chil Pediatr 2016)" : D.pr_ref;
    P.Sit = vacio(D.pr_sit) ? "Estándar" : D.pr_sit;
    const teor = P.Ref.slice(0, 4) === "Teor", s = P.Sit;
    const dbp = (a, b, c, x) => s === "DBP crecimiento" ? a : s === "DBP transición" ? b : s === "DBP fase aguda" ? c : x;
    P.req = [
      ["Líquidos", "mL", dbp(110, 120, 130, teor ? 135 : 150), dbp(130, 140, 150, teor ? 200 : 180)],
      ["Energía", "kcal", dbp(70, 110, 120, teor ? 110 : 115), dbp(120, 120, 150, teor ? 130 : 140)],
      ["Proteínas", "g", dbp(2.5, 2.5, 4, 3.5), dbp(3, 4, 4, teor ? 4.5 : 4.0)],
      ["Lípidos", "g", 4.8, teor ? 6.6 : 8.1], ["Hidratos de carbono", "g", teor ? 11.6 : 11, teor ? 13.2 : 15],
      ["Calcio", "mg", 120, 200], ["Fósforo", "mg", teor ? 60 : 70, teor ? 140 : 115], ["Hierro (desde las 2 semanas)", "mg", 2, 3],
      ["Zinc", "mg", teor ? 1.4 : 2, teor ? 2.5 : 3], ["Sodio", "mg", 69, teor ? 115 : 184], ["Potasio", "mg", teor ? 78 : 90, teor ? 195 : 180]
    ].map(([n, u, mi, ma]) => ({ n, u, mi, ma, dmi: isNum(R.Peso) ? mi * R.Peso : "", dma: isNum(R.Peso) ? ma * R.Peso : "" }));
    P.LMin = P.req[0].mi; P.LMax = P.req[0].ma; P.EMin = P.req[1].mi; P.EMax = P.req[1].ma; P.PMinReq = P.req[2].mi; P.PMaxReq = P.req[2].ma;
    // aporte actual
    const okA = !vacio(D.pr_leche) && isNum(D.pr_vol) && isNum(D.pr_tomas) && pr;
    const li = okA ? pr.leche.indexOf(D.pr_leche) : -1, fi = pr && !vacio(D.pr_fort) ? pr.fort.indexOf(D.pr_fort) : -1;
    const fortOn = fi >= 0 && isNum(D.pr_sobres);
    P.VolDia = okA ? D.pr_vol * D.pr_tomas : "";
    P.mLkg = okA && isNum(R.Peso) ? P.VolDia / R.Peso : "";
    P.Kcal100 = okA && li >= 0 ? pr.leche_kcal[li] + (fortOn ? pr.fort_kcal[fi] * D.pr_sobres : 0) : "";
    P.Prot100 = okA && li >= 0 && isNum(R.Peso) ? pr.leche_prot[li] + (fortOn ? pr.fort_prot[fi] * D.pr_sobres : 0) : "";
    P.KcalDia = isNum(P.Kcal100) ? P.Kcal100 * P.VolDia / 100 : "";
    P.KcalKg = isNum(P.KcalDia) && isNum(R.Peso) ? P.KcalDia / R.Peso : "";
    P.ProtDia = isNum(P.Prot100) ? P.Prot100 * P.VolDia / 100 : "";
    P.ProtKg = isNum(P.ProtDia) && isNum(R.Peso) ? P.ProtDia / R.Peso : "";
    P.PE = isNum(P.ProtDia) && isNum(P.KcalDia) && P.KcalDia > 0 ? P.ProtDia / P.KcalDia * 100 : "";
    const adec = (v, mi, ma) => !isNum(v) ? "Sin dato" : v < mi ? "Insuficiente (bajo " + mi + ")" : v > ma ? "Excesivo (sobre " + ma + ")" : "Adecuado (" + mi + "-" + ma + ")";
    P.AdecLiqPct = isNum(P.mLkg) ? P.mLkg / ((P.LMin + P.LMax) / 2) * 100 : ""; P.AdecLiq = adec(P.mLkg, P.LMin, P.LMax);
    P.AdecKcalPct = isNum(P.KcalKg) ? P.KcalKg / ((P.EMin + P.EMax) / 2) * 100 : ""; P.AdecKcal = adec(P.KcalKg, P.EMin, P.EMax);
    P.AdecProtPct = isNum(P.ProtKg) ? P.ProtKg / ((P.PMinReq + P.PMaxReq) / 2) * 100 : ""; P.AdecProt = adec(P.ProtKg, P.PMinReq, P.PMaxReq);
    P.DNI = P.Es !== "Sí" ? "" : ", " + P.ClsEG.slice(0, P.ClsEG.indexOf(" (")).toLowerCase() + " de " + P.SG + (sgdVal(D) ? "+" + D.pr_sg_dias : "") + " semanas" +
      (P.PEG ? ", " + P.PEG : "") + (P.UsaEC === "Sí" ? ", evaluado/a con edad corregida de " + P.ECTexto : "");
  }
  const sgdVal = (D) => isNum(D.pr_sg_dias) && D.pr_sg_dias !== 0;

  // ---------- tablas LMS ----------
  function lmsRow(T, key) { const r = T && T.cre && T.cre.lms[key]; return r ? { x: r[0], L: r[1], M: r[2], S: r[3] } : null; }
  const zLMS = (y, r) => (Math.pow(y / r.M, r.L) - 1) / (r.L * r.S);
  const vLMS = (z, r) => r.M * Math.pow(1 + r.L * r.S * z, 1 / r.L);
  function indicador(T, aplica, valor, key) {
    const I = { valor, aplica: aplica ? "Sí" : "No" };
    const r = aplica ? lmsRow(T, key) : null;
    I.fila = aplica ? (r ? key : "fuera de tabla") : "";
    I.r = r; I.L = r ? r.L : ""; I.M = r ? r.M : ""; I.S = r ? r.S : "";
    I.Z = r ? zLMS(valor, r) : "—";
    return I;
  }

  function antropometria(D, R, T, opts) {
    const t2 = T && T.t2, A = t2 && t2.antro;
    const C = R.Ciclo, sx = R.SexoC, aprox = R.Edad_Meses_Aprox, edad = R.Edad_Anios;
    const peso = isNum(D.peso) ? D.peso : "", tallaIn = isNum(D.talla) ? D.talla : "";
    R.Peso = peso; R.PCef = isNum(D.pcef) ? D.pcef : ""; const CC = isNum(D.cc) ? D.cc : "", CB = isNum(D.cb) ? D.cb : "";
    // edema / ascitis
    let desc = 0;
    if (C !== "NNA" && A) { const gi = (g) => vacio(g) ? 0 : A.grados.indexOf(g); const ia = gi(D.ascitis), ie = gi(D.edema);
      desc = (ia > 0 || ia === 0 ? A.desc_asc[ia] || 0 : 0) + (ie >= 0 ? A.desc_ede[ie] || 0 : 0); }
    R.Desc_Edema = desc;
    R.TallaRodilla = !isNum(D.alt_rodilla) || edad === "" ? "—" : sx === "M" ? 64.19 - 0.04 * edad + 2.02 * D.alt_rodilla : 84.88 - 0.24 * edad + 1.83 * D.alt_rodilla;
    R.Talla_cm = D.usar_talla_rodilla === "Sí" && isNum(R.TallaRodilla) ? R.TallaRodilla : tallaIn;
    R.Talla_m = R.Talla_cm === "" ? "" : R.Talla_cm / 100;
    R.IMC = peso === "" || R.Talla_m === "" ? "" : (peso - desc) / (R.Talla_m * R.Talla_m);
    R.IMC_Nota = desc > 0 ? "IMC con peso seco (descontados " + desc + " kg por edema/ascitis)" : "";
    R.TipoMedicion = C !== "NNA" ? "No aplica" : lt(aprox, 24) ? "Longitud" : "Talla";
    // indicadores OMS
    const nna = C === "NNA", le = (x, n) => isNum(x) && x <= n, ge = (x, n) => isNum(x) && x >= n;
    const PE = indicador(T, nna && le(aprox, 120) && peso !== "", peso, "PE|" + sx + "|" + aprox);
    PE.cls = !isNum(PE.Z) ? (PE.aplica === "Sí" ? "Falta dato" : "No aplica") : PE.Z <= -2 ? "Desnutrición" : PE.Z <= -1 ? "Riesgo de desnutrir" : PE.Z < 1 ? "Normal" : PE.Z < 2 ? "Sobre +1 DE" : "Sobre +2 DE";
    const TE = indicador(T, nna && le(aprox, 228) && R.Talla_cm !== "", R.Talla_cm, "TE|" + sx + "|" + aprox);
    TE.cls = !isNum(TE.Z) ? (TE.aplica === "Sí" ? "Falta dato" : "No aplica") : (lt(aprox, 24) ? "Longitud" : "Talla") + (TE.Z <= -2 ? " baja" : TE.Z <= -1 ? " normal baja" : TE.Z < 1 ? " normal" : TE.Z < 2 ? " normal alta" : " alta");
    const ptKey = (t) => xround(xround(t * 2, 0) / 2 * 10, 0);
    const PT = indicador(T, nna && le(aprox, 60) && peso !== "" && R.Talla_cm !== "", peso, (lt(aprox, 24) ? "PT_L|" : "PT_T|") + sx + "|" + (R.Talla_cm === "" ? "" : ptKey(R.Talla_cm)));
    PT.cls = !isNum(PT.Z) ? (PT.aplica === "Sí" ? "Falta dato / fuera de tabla" : "No aplica") : PT.Z <= -2 ? "Desnutrición" : PT.Z <= -1 ? "Riesgo de desnutrir" : PT.Z < 1 ? "Normal" : PT.Z < 2 ? "Sobrepeso" : "Obesidad";
    const IE = indicador(T, nna && ge(aprox, 61) && le(aprox, 228) && R.IMC !== "", R.IMC, "IMC|" + sx + "|" + aprox);
    IE.cls = !isNum(IE.Z) ? (IE.aplica === "Sí" ? "Falta dato" : "No aplica") : IE.Z <= -2 ? "Desnutrición" : IE.Z <= -1 ? "Riesgo de desnutrir" : IE.Z < 1 ? "Normal" : IE.Z < 2 ? "Sobrepeso" : IE.Z < 3 ? "Obesidad" : "Obesidad severa";
    // perímetro cefálico (tabla −2…+2 DE)
    const PCI = { valor: R.PCef, aplica: nna && le(aprox, 36) && R.PCef !== "" ? "Sí" : "No" };
    const pcr = PCI.aplica === "Sí" && T && T.cre ? T.cre.pc["PC|" + sx + "|" + aprox] : null;
    PCI.fila = PCI.aplica === "Sí" ? (pcr ? "PC|" + sx + "|" + aprox : "fuera de tabla") : ""; PCI.sd = pcr || null;
    PCI.Z = pcr ? (R.PCef >= pcr[2] ? (R.PCef - pcr[2]) / (pcr[3] - pcr[2]) : (R.PCef - pcr[2]) / (pcr[2] - pcr[1])) : "—";
    PCI.cls = !pcr ? (PCI.aplica === "Sí" ? "Falta dato" : "No aplica") : R.PCef <= pcr[0] ? "Microcefalia" : R.PCef >= pcr[4] ? "Macrocefalia" : "Normal";
    // cintura NNA
    const CCI = { valor: CC, aplica: nna && ge(edad, 5) && CC !== "" ? "Sí" : "No" };
    const ccr = CCI.aplica === "Sí" && T && T.cre ? T.cre.cc["CC|" + sx + "|" + Math.min(edad, 18)] : null;
    CCI.p = ccr; CCI.Z = ccr ? (CC < ccr[3] ? "< p75" : CC < ccr[4] ? "p75-p90" : "≥ p90") : "—";
    CCI.cls = !ccr ? (CCI.aplica === "Sí" ? "Falta dato" : "No aplica") : CC < ccr[3] ? "Normal" : CC < ccr[4] ? "Riesgo de obesidad abdominal" : "Obesidad abdominal";
    R.ICT = CC === "" || R.Talla_cm === "" ? "—" : CC / R.Talla_cm;
    R.ICT_Cls = !isNum(R.ICT) ? "Sin dato" : (C !== "NNA" || lt(edad, 5)) ? "No aplica" : R.ICT >= 0.5 ? "Adiposidad central aumentada" : "Normal";
    R.ind = { PE, TE, PT, IMC: IE, PC: PCI, CC: CCI };
    R.EA_Z_PE = PE.Z; R.EA_Z_TE = TE.Z; R.EA_Z_PT = PT.Z; R.EA_Z_IMC = IE.Z;
    // calificación NNA
    let indRef = C !== "NNA" ? "No aplica" : lt(aprox, 12) ? (isNum(PT.Z) && PT.Z >= 1 ? "P/T" : "P/E") : le(aprox, 60) ? "P/T" : "IMC/E";
    const zDe = (i) => i === "P/E" ? PE.Z : i === "P/T" ? PT.Z : i === "IMC/E" ? IE.Z : "—";
    let zRef = zDe(indRef);
    const califDe = (i, z) => C !== "NNA" ? "No aplica" : !isNum(z) ? "Falta dato" : i === "P/E" ? (z <= -2 ? "Desnutrición" : z <= -1 ? "Riesgo de desnutrir" : "Normal") :
      z <= -2 ? "Desnutrición" : z <= -1 ? "Riesgo de desnutrir" : z < 1 ? "Normal" : z < 2 ? "Sobrepeso" : (i === "P/T" || z < 3) ? "Obesidad" : "Obesidad severa";
    let calNNA = califDe(indRef, zRef);
    let dxTalla = C !== "NNA" ? "No aplica" : TE.cls;
    const rowRef = (i) => i === "P/E" ? PE : i === "P/T" ? PT : i === "IMC/E" ? IE : null;
    const pesos = (i) => { const I = rowRef(i); if (C !== "NNA") return ["No aplica", "No aplica", "No aplica"]; if (!I || !I.r) return ["—", "—", "—"];
      const r = I.r, tm2 = isNum(R.Talla_m) ? R.Talla_m * R.Talla_m : NaN, up = vLMS(1, r), dn = vLMS(-1, r);
      if (i === "IMC/E") { if (!isFinite(tm2)) return ["—", "—", "—"]; return [xround(xround(r.M, 1) * tm2, 1), xround(xround(up, 1) * tm2, 1) - 0.1, xround(xround(dn, 1) * tm2, 1) + 0.1]; }
      return [xround(r.M, 1), xround(up, 1) - 0.1, xround(dn, 1) + 0.1]; };
    let [pIdeal, pMax, pMin] = pesos(indRef);
    // edad-talla y peso para talla baja
    let et = "—";
    if (isNum(R.Talla_cm) && T && T.cre) { const arr = T.cre.te[sx === "F" ? "F" : "M"]; for (const [x, m] of arr) { if (m <= R.Talla_cm) et = x; else break; } }
    R.EdadTalla = et;
    let pTB;
    if (C !== "NNA") pTB = "No aplica";
    else if (le(aprox, 60)) pTB = PT.r ? xround(PT.r.M, 1) : "—";
    else if (!isNum(et)) pTB = "—";
    else if (et >= 61) { const r = lmsRow(T, "IMC|" + sx + "|" + et); pTB = r && isNum(R.Talla_m) ? xround(xround(r.M, 1) * R.Talla_m * R.Talla_m, 1) : "—"; }
    else { const r = lmsRow(T, "PT_T|" + sx + "|" + ptKey(R.Talla_cm)); pTB = r ? xround(r.M, 1) : "—"; }
    // ----- parálisis cerebral (Brooks 2011, Planilla_NNA) -----
    const PC = R.PC = { activa: D.pc_base === "Sí" && C === "NNA" };
    PC.gmfcs = S(D.pc_gmfcs);
    PC.grupo = PC.gmfcs === "V" ? (S(D.pc_via).slice(0, 5) === "Sonda" ? "V-S" : "V-O") : PC.gmfcs;
    PC.grupoTxt = PC.gmfcs === "V" ? "V, " + (S(D.pc_via).slice(0, 5) === "Sonda" ? "alimentación por sonda" : "alimentación oral") : PC.gmfcs;
    PC.tablaCargada = !!(T && T.brk);
    const B = T && T.brk;
    const zP = B ? B.pct.map((p) => normsinv(p / 100)) : [];
    const brooks = (ind, val) => {
      const I = { valor: val, aplica: PC.activa && PC.gmfcs !== "" && ge(aprox, 24) && le(aprox, 240) && val !== "" ? "Sí" : "No" };
      const key = ind + "|" + sx + "|" + PC.grupo + "|" + aprox, row = I.aplica === "Sí" && B ? B.t[key] : null;
      I.fila = I.aplica === "Sí" ? (row ? key : (B ? "fuera de tabla" : "tabla no cargada")) : "";
      if (row) {
        const p = row.slice(0, 7); I.p = p; I.low = row[7];
        let j = 0; for (let k = 0; k < 7; k++) if (p[k] <= val) j = k; j = Math.max(0, Math.min(5, val < p[0] ? 0 : j));
        I.z = Math.max(-4, Math.min(4, zP[j] + (val - p[j]) * (zP[j + 1] - zP[j]) / (p[j + 1] - p[j])));
        I.pct = xround(normsdist(I.z) * 100, 1);
        I.mas1 = p[4] + (1 - zP[4]) / (zP[5] - zP[4]) * (p[5] - p[4]);
        I.menos1 = p[1] + (-1 - zP[1]) / (zP[2] - zP[1]) * (p[2] - p[1]);
      } else { I.z = ""; I.pct = "—"; }
      I.msg = I.aplica === "Sí" ? "Falta dato / fuera de tabla" : !PC.activa ? "No aplica" : PC.gmfcs === "" ? "Falta nivel GMFCS" : lt(aprox, 24) ? "No aplica (< 2 años: usar OMS)" : "No aplica";
      return I;
    };
    const k = B ? B.cortes : {};
    const bPE = brooks("PE", peso), bTE = brooks("TE", R.Talla_cm), bIM = brooks("IMC", R.IMC);
    bPE.cls = !isNum(bPE.pct) ? bPE.msg : val(bPE) < bPE.low ? "Bajo peso (zona de riesgo Brooks)" : bPE.pct < k.BRK_PE_SP ? "Normal" : bPE.pct < k.BRK_PE_OB ? "Sobre p90" : "Sobre p95";
    function val(I) { return I.valor; }
    bTE.cls = !isNum(bTE.pct) ? bTE.msg : bTE.pct < k.BRK_TE_BAJA ? "Talla baja" : bTE.pct < k.BRK_TE_NB ? "Talla normal baja" : bTE.pct < k.BRK_TE_NA ? "Talla normal" : bTE.pct < k.BRK_TE_ALTA ? "Talla normal alta" : "Talla alta";
    bIM.cls = !isNum(bIM.pct) ? bIM.msg : bIM.pct < k.BRK_IMC_DN ? "Desnutrición" : bIM.pct < k.BRK_IMC_RDN ? "Riesgo de desnutrir" : bIM.pct < k.BRK_IMC_SP ? "Normal" : bIM.pct < k.BRK_IMC_OB ? "Sobrepeso" : "Obesidad";
    PC.PE = bPE; PC.TE = bTE; PC.IMC = bIM;
    PC.limBajo = isNum(bPE.low) ? xround(bPE.low, 1) : "—";
    PC.limBajoTxt = isNum(bPE.low) ? (peso < bPE.low ? "⚠ Peso bajo el límite: mayor riesgo de morbimortalidad (Brooks 2011)" : "Peso sobre el límite de bajo peso") : "";
    PC.ind = !PC.activa ? "No aplica" : bIM.aplica === "Sí" ? "IMC/E" : bPE.aplica === "Sí" ? "P/E" : "—";
    PC.usa = PC.activa && (PC.ind === "IMC/E" || PC.ind === "P/E");
    PC.calif = PC.ind === "IMC/E" ? bIM.cls : PC.ind === "P/E" ? (bPE.cls === "Bajo peso (zona de riesgo Brooks)" ? "Desnutrición" : bPE.cls === "Sobre p90" ? "Sobrepeso" : bPE.cls === "Sobre p95" ? "Obesidad" : bPE.cls) : PC.ind;
    PC.dxTalla = !PC.activa ? "No aplica" : bTE.cls;
    if (PC.usa) {
      const I = PC.ind === "IMC/E" ? bIM : bPE, tm2 = isNum(R.Talla_m) ? R.Talla_m * R.Talla_m : NaN;
      indRef = PC.ind + " (Brooks 2011, GMFCS " + PC.grupoTxt + ")";
      zRef = I.z === "" ? "—" : I.z; calNNA = PC.calif;
      const f = (v) => PC.ind === "IMC/E" ? xround(v * tm2, 1) : xround(v, 1);
      pIdeal = I.p ? f(I.p[3]) : "—"; pMax = I.p ? f(I.mas1) - 0.1 : "—"; pMin = I.p ? f(I.menos1) + 0.1 : "—"; pTB = pIdeal;
    }
    if (C === "NNA" && PC.activa && isNum(bTE.pct)) dxTalla = bTE.cls;
    R.IndicadorNNA = indRef; R.Z_Ref = zRef; R.CalifNNA = calNNA;
    R.PesoTallaBaja = pTB;
    // trayectoria del puntaje Z
    R.Z_Previo = isNum(D.z_previo) ? D.z_previo : (opts && isNum(opts.zPrevAuto) ? opts.zPrevAuto : "");
    R.Z_PrevioAuto = !isNum(D.z_previo) && opts && isNum(opts.zPrevAuto);
    R.Z_Tray = C !== "NNA" || R.Z_Previo === "" || !isNum(zRef) ? "" : zRef - R.Z_Previo <= -1 ? "Caída ≥ 1 DE en la trayectoria" : zRef - R.Z_Previo >= 1 ? "Ascenso ≥ 1 DE en la trayectoria" : "Trayectoria estable";
    // adulto / adulto mayor
    const lookup = (x, lims, cats) => { let c = cats[0]; for (let i = 0; i < lims.length; i++) if (x >= lims[i]) c = cats[i]; return c; };
    R.IMC_AD = R.IMC === "" ? "Falta dato" : A ? lookup(xround(R.IMC, 1), A.ad_lim, A.ad_cat) : "—";
    R.IMC_AM = R.IMC === "" ? "Falta dato" : A ? lookup(xround(R.IMC, 1), A.am_lim, A.am_cat) : "—";
    R.IMC_Cls = C === "AD" ? R.IMC_AD : C === "AM" ? R.IMC_AM : "No aplica";
    R.CC_AD = C === "NNA" ? "No aplica" : CC === "" ? "Sin dato" : CC >= (sx === "M" ? 90 : 80) ? "Obesidad abdominal" : "Normal";
    R.CC_Antigua = C === "NNA" || CC === "" ? "—" : sx === "M" ? (CC >= 102 ? "Riesgo alto" : CC >= 94 ? "Riesgo moderado" : "Sin riesgo") : (CC >= 88 ? "Riesgo alto" : CC >= 80 ? "Riesgo moderado" : "Sin riesgo");
    R.CambioPeso = isNum(D.peso_hab) && peso !== "" ? (D.peso_hab - peso) / D.peso_hab * 100 : "—";
    const tc = isNum(D.tiempo_cambio) ? D.tiempo_cambio : "", cp = R.CambioPeso;
    R.CambioPeso_Cls = !isNum(cp) ? "—" : cp <= 0 ? "Sin pérdida de peso" : tc === "" ? "Falta el tiempo del cambio" :
      ((tc <= 0.25 && cp > 2) || (tc <= 1 && cp > 5) || (tc <= 3 && cp > 7.5) || (tc <= 6 && cp > 10)) ? "Pérdida de peso significativa" : "Pérdida de peso no significativa";
    R.Pantorrilla_Cls = C !== "AM" ? "No aplica" : !isNum(D.pantorrilla) ? "Sin dato" : D.pantorrilla < 31 ? "Bajo (< 31 cm)" : "Normal (≥ 31 cm)";
    const tm2 = isNum(R.Talla_m) ? R.Talla_m * R.Talla_m : null;
    const pAD = (ad, am) => tm2 === null ? (C === "AD" || C === "AM" ? "—" : "No aplica") : C === "AD" ? xround(ad * tm2, 1) : C === "AM" ? xround(am * tm2, 1) : "No aplica";
    R.PesoIdeal_AD = pAD(21.7, 25.5); R.PesoMax_AD = pAD(24.9, 27.9); R.PesoMin_AD = pAD(18.5, 23);
    R.PesoAjust_AD = C === "NNA" ? "No aplica" : isNum(R.PesoIdeal_AD) && peso !== "" ? xround(R.PesoIdeal_AD + 0.25 * (peso - R.PesoIdeal_AD), 1) : "—";
    R.PesoSeco = C === "NNA" || peso === "" ? "No aplica" : peso - desc;
    // salidas
    R.Calificacion_Nutricional = C === "NNA" ? calNNA : (C === "AD" || C === "AM") ? R.IMC_Cls : "Falta dato";
    R.Indicador_Ref = C === "NNA" ? indRef : C === "" ? "" : "IMC";
    R.Dx_Talla = C === "NNA" ? dxTalla : "No aplica";
    R.CC_NNA = C !== "NNA" ? "No aplica" : CCI.aplica === "Sí" ? CCI.cls : lt(edad, 5) ? "No aplica (< 5 años)" : "Sin dato";
    R.Riesgo_CC = C === "NNA" ? R.CC_NNA : R.CC_AD;
    const q = R.Calificacion_Nutricional;
    R.Malnutricion = (q === "Desnutrición" || q === "Riesgo de desnutrir" || q === "Bajo peso") ? "Déficit" : (q === "Sobrepeso" || q.slice(0, 8) === "Obesidad") ? "Exceso" : q === "Normal" ? "Normal" : "";
    R.Peso_Ideal = C === "NNA" ? pIdeal : R.PesoIdeal_AD;
    R.Peso_Max = C === "NNA" ? pMax : R.PesoMax_AD;
    R.Peso_Min = C === "NNA" ? pMin : R.PesoMin_AD;
    R.Peso_Ajustado = C === "NNA" ? "No aplica" : R.PesoAjust_AD;
    // NNA — decisión de la usuaria (06-11-2026): peso real en desnutrición, riesgo de desnutrir y normal; máximo aceptable en sobrepeso y obesidad;
    // peso ideal para la talla en talla baja. La planilla usaba el peso mínimo aceptable en riesgo de desnutrir.
    R.PesoTipo_Planilla = C === "NNA" ? ((R.Dx_Talla === "Talla baja" || R.Dx_Talla === "Longitud baja") ? "Ideal (talla baja)" : (q === "Desnutrición" || q === "Normal") ? "Actual" : q === "Riesgo de desnutrir" ? "Mínimo aceptable" : (q === "Sobrepeso" || q.slice(0, 8) === "Obesidad") ? "Máximo aceptable" : "Actual") : "";
    R.PesoTipo_Auto = C === "NNA" ? ((R.Dx_Talla === "Talla baja" || R.Dx_Talla === "Longitud baja") ? "Ideal (talla baja)" : (q === "Sobrepeso" || q.slice(0, 8) === "Obesidad") ? "Máximo aceptable" : "Actual")
      : (q === "Bajo peso" || q === "Normal") ? (desc > 0 ? "Seco" : "Actual") : q === "Sobrepeso" ? "Máximo aceptable" : q.slice(0, 8) === "Obesidad" ? "Ajustado" : "Actual";
    if (C !== "NNA") R.PesoTipo_Planilla = R.PesoTipo_Auto;
    R.Calif_App = R.Calificacion_Nutricional; // en gestante la reemplaza gestacion() (Atalah)
  }

  function composicion(D, R, T) {
    const C = R.Ciclo, sx = R.SexoC, edad = R.Edad_Anios, F = T && T.fri;
    const CB = isNum(D.cb) ? D.cb : "", PT = isNum(D.cc_pt) ? D.cc_pt : "";
    const K = R.CC_ = {};
    K.FRI_Edad = edad === "" || C === "" || edad < 1 ? "" : edad < 19 ? edad : edad < 25 ? 19 : edad < 35 ? 25 : edad < 45 ? 35 : edad < 55 ? 45 : edad < 65 ? 55 : 65;
    K.Nota = edad === "" ? "" : edad < 1 ? "No aplica (< 1 año)" : edad >= 75 ? "⚠ > 74,9 años: se usa el tramo 65-74,9" : "";
    const ok = isNum(CB) && isNum(PT) && isNum(K.FRI_Edad) && sx !== "";
    const p = (ind) => { const r = ok && F ? F.t[ind + "|" + sx + "|" + K.FRI_Edad] : null; return r ? [r[1], r[3], r[5]] : null; };
    const cls = (v, pp) => !isNum(v) ? "Sin dato" : !pp ? "Sin tabla" : v < pp[0] ? "Disminuido" : v > pp[2] ? "Elevado" : "Normal";
    K.CMB = ok ? CB * 10 - Math.PI * PT : ""; K.AMB = ok ? K.CMB * K.CMB / (4 * Math.PI) : ""; K.AGB = ok ? Math.pow(CB * 10, 2) / (4 * Math.PI) - K.AMB : "";
    K.pCMB = p("CMB"); K.pAMB = p("AMB"); K.pAGB = p("AGB");
    K.CMB_Cls = cls(K.CMB, K.pCMB); K.AMB_Cls = cls(K.AMB, K.pAMB); K.AGB_Cls = cls(K.AGB, K.pAGB);
    K.MuscAuto = K.AMB_Cls === "Sin dato" ? "No evaluado" : K.AMB_Cls; K.GrasoAuto = K.AGB_Cls === "Sin dato" ? "No evaluado" : K.AGB_Cls;
    R.CMB = K.CMB; R.AMB = K.AMB; R.AGB = K.AGB;
    R.Comp_Musc = vacio(D.comp_musc) || D.comp_musc === "Automático" ? K.MuscAuto : D.comp_musc;
    R.Comp_Graso = vacio(D.comp_graso) || D.comp_graso === "Automático" ? K.GrasoAuto : D.comp_graso;
    // Durnin-Womersley + Siri
    const pl = [D.cc_pt, D.cc_pb, D.cc_pse, D.cc_psi];
    K.DW = edad === "" || sx === "" ? "Falta dato" : (edad < (sx === "M" ? 17 : 16) || edad > 72) ? "No aplica" : pl.every(isNum) ? "Sí" : "Faltan pliegues";
    if (K.DW === "Sí") {
      K.Suma = pl.reduce((a, b) => a + b, 0);
      const cM = [1.162, 1.1631, 1.1422, 1.162, 1.1715], cF = [1.1549, 1.1599, 1.1423, 1.1333, 1.1339], mM = [0.063, 0.0632, 0.0544, 0.07, 0.0779], mF = [0.0678, 0.0717, 0.0632, 0.0612, 0.0645];
      const i = edad < 20 ? 0 : edad < 30 ? 1 : edad < 40 ? 2 : edad < 50 ? 3 : 4;
      K.c = sx === "M" ? cM[i] : cF[i]; K.m = sx === "M" ? mM[i] : mF[i];
      K.Dens = K.c - K.m * Math.log10(K.Suma); K.GC = (4.95 / K.Dens - 4.5) * 100;
      K.MG = isNum(R.Peso) ? R.Peso * K.GC / 100 : ""; K.MLG = isNum(K.MG) ? R.Peso - K.MG : "";
    } else { K.Suma = K.c = K.m = K.Dens = K.GC = K.MG = K.MLG = ""; }
    R.GC_Pct = K.GC;
    R.GC_Cls = !isNum(K.GC) ? (K.DW === "Sí" ? "Sin dato" : K.DW) : sx === "M" ? (K.GC < 12 ? "Bajo (< 12 %)" : K.GC < 21 ? "Adecuado (12-20 %)" : K.GC <= 25 ? "Exceso (21-25 %)" : "Obeso (> 25 %)")
      : (K.GC < 20 ? "Bajo (< 20 %)" : K.GC < 31 ? "Adecuado (20-30 %)" : K.GC <= 33 ? "Exceso (31-33 %)" : "Obeso (> 33 %)");
    K.Deurenberg = R.IMC === "" || edad === "" || edad < 16 ? "" : 1.2 * R.IMC - 10.8 * (sx === "M" ? 1 : 0) + 0.23 * edad - 5.4;
    // contextura
    K.R = isNum(R.Talla_cm) && isNum(D.cc_carpo) ? R.Talla_cm / D.cc_carpo : "";
    R.Contextura = !isNum(K.R) ? "Sin dato" : C === "NNA" ? "No aplica (NNA)" : sx === "M" ? (K.R > 10.4 ? "Pequeña" : K.R >= 9.6 ? "Mediana" : "Grande") : (K.R > 11 ? "Pequeña" : K.R >= 10.1 ? "Mediana" : "Grande");
    K.PesoIdealCtx = C !== "AM" || !isNum(K.R) ? "No aplica" : xround(R.Talla_m * R.Talla_m * (R.Contextura === "Pequeña" ? 23 : R.Contextura === "Mediana" ? 26 : 28), 1);
  }
  function actividadPC(D, R, T) {
    const pc = T && T.t2 && T.t2.pc, lst = ["Postrado / encamado", "Dependiente en silla de ruedas", "Gatea", "Deambula"];
    const inn = S(D.actividad);
    if (D.pc_base === "Sí") R.Actividad = lst.includes(inn) ? inn : D.pc_gmfcs === "V" ? "Postrado / encamado" : D.pc_gmfcs === "IV" ? "Dependiente en silla de ruedas" : "Deambula";
    else R.Actividad = inn === "" || lst.includes(inn) ? "Ligera" : inn;
    const tonos = ["Normal", "Hipertonía (espasticidad)", "Hipotonía"];
    R.Tono_Factor = vacio(D.pc_tono) ? 1 : pc ? (pc.krick_tono[tonos.indexOf(D.pc_tono)] ?? 1) : 1;
    const i = lst.indexOf(R.Actividad); R.Krick_FA = pc && i >= 0 ? pc.krick_fa[i] : "";
  }

  // PLANILLA = true reproduce las reglas originales de la planilla (solo para las pruebas de validación).
  // Decisiones docentes del 07-11-2026 que cambian con PLANILLA = false: PA del adulto (pre-HTA desde 130/85) y energía NNA (± 15 % desde 5 años; PAL en adolescentes).
  let PLANILLA = false;
  function calcular(D, opts) {
    opts = opts || {};
    PLANILLA = !!opts.planilla;
    const R = {};
    const fnac = parseFecha(D.fnac), feval = parseFecha(D.feval);
    R.errorFechas = fnac && feval && feval.t < fnac.t ? "La fecha de evaluación es anterior a la de nacimiento." : "";

    // DATOS_PACIENTE
    R.Sexo = S(D.sexo);
    R.SexoC = R.Sexo === "Femenino" ? "F" : R.Sexo === "Masculino" ? "M" : "";
    const ok = fnac && feval && !R.errorFechas;
    R.Edad_Anios = ok ? datedif(fnac, feval, "y") : "";
    R.Edad_MesRest = ok ? datedif(fnac, feval, "ym") : "";
    R.Edad_DiaRest = ok ? datedif(fnac, feval, "md") : "";
    R.Edad_Meses = ok ? datedif(fnac, feval, "m") : "";
    // B17: prematuro (edad corregida) se agrega en la etapa 2
    const T = (opts && opts.T) || null;
    R.PR = prematuro(D, R, T, fnac && !R.errorFechas ? fnac : null, feval && !R.errorFechas ? feval : null, opts);
    R.PR_UsaEC = R.PR.UsaEC;
    R.Edad_Meses_Aprox = !ok ? "" : R.PR.UsaEC === "Sí" ? R.PR.ECMeses : R.Edad_Meses + (R.Edad_DiaRest >= 16 ? 1 : 0);
    R.Edad_Dec = ok ? (feval.t - fnac.t) / DIA / 365.25 : "";
    if (ok) {
      const a = R.Edad_Anios, m = R.Edad_MesRest, d = R.Edad_DiaRest;
      R.Edad_Texto = (a > 0 ? a + (a === 1 ? " año" : " años") + ", " : "") +
        m + (m === 1 ? " mes" : " meses") + " y " + d + (d === 1 ? " día" : " días");
    } else R.Edad_Texto = "";
    R.Ciclo_Auto = R.Edad_Anios === "" ? "" : R.Edad_Anios < 19 ? "NNA" : R.Edad_Anios < 65 ? "AD" : "AM";
    R.Ciclo_Manual = S(D.ciclo_manual);
    R.Ciclo = R.Ciclo_Manual === "" || R.Ciclo_Manual === "Automático" ? R.Ciclo_Auto : R.Ciclo_Manual;
    const C = R.Ciclo;
    R.GrupoEtario = C === "" ? "" : C === "AD" ? "Adulto" : C === "AM" ? "Adulto mayor" :
      R.Edad_Meses < 12 ? "Lactante menor" : R.Edad_Meses < 24 ? "Lactante mayor" :
      R.Edad_Anios < 6 ? "Preescolar" : R.Edad_Anios < 10 ? "Escolar" : "Adolescente";
    R.Actividad = vacio(D.actividad) ? "Ligera" : D.actividad;
    actividadPC(D, R, T);
    R.Alim_Lact = vacio(D.alim_lact) ? "Lactancia materna" : D.alim_lact;
    const ap = D.fam_apgar;
    R.APGAR_Cls = vacio(ap) ? "" : ap >= 7 ? "Altamente funcional" : ap >= 4 ? "Moderadamente funcional" : "Severamente disfuncional";

    // ANAMNESIS_SOCIAL!B71 (texto idéntico a la planilla)
    const SO_Dinero = S(D.so_dinero), SO_Vivienda = S(D.so_vivienda), SO_Red = S(D.so_red), SO_Vive = S(D.so_vive),
      SO_Ayuda = S(D.so_ayuda), SO_Dent = S(D.so_dent), SO_Lee = S(D.so_lee), SO_Retira = S(D.so_prog_retira),
      SO_Estres = S(D.so_estres), SO_Emb = R.Sexo === "Femenino" ? S(D.so_emb) : "", SO_Purita = S(D.so_purita),
      SO_Cuerpo = S(D.so_cuerpo), SO_Compara = S(D.so_compara), SO_RRSS = S(D.so_rrss);
    const num = (v) => typeof v === "number" && isFinite(v);
    const al = [];
    if (SO_Dinero === "A veces no alcanza" || SO_Dinero === "Frecuentemente no alcanza")
      al.push("• Posible inseguridad alimentaria: derivar a asistente social y priorizar alimentos de bajo costo");
    if (SO_Vivienda.slice(0, 5) === "Falta")
      al.push("• Vivienda sin servicios básicos completos: adaptar el plan (conservación y preparación de alimentos)");
    if (SO_Red === "No" && !(C === "AM" && SO_Vive === "Solo/a"))
      al.push("• Sin red de apoyo: fortalecer redes (asistente social, organizaciones comunitarias)");
    if (C === "AM" && SO_Vive === "Solo/a" && SO_Red === "No")
      al.push("• Persona mayor que vive sola y sin red de apoyo: derivar a asistente social");
    if (C === "AM" && SO_Ayuda === "Sí, siempre")
      al.push("• Necesita ayuda para comprar o preparar alimentos: incluir al cuidador en la educación");
    if (C === "AM" && SO_Dent === "Sí, sin prótesis")
      al.push("• Problemas de dentadura sin prótesis: ajustar la consistencia y derivar a odontología");
    if (SO_Lee === "No") al.push("• No sabe leer: usar material educativo gráfico");
    if (SO_Retira === "No") al.push("• No retira su programa alimentario: reforzar el retiro");
    if (SO_Estres === "Sí") al.push("• Situación de estrés reciente: considerarla en la adherencia; evaluar derivación a salud mental");
    if (SO_Emb === "Sí")
      al.push("• Gestante: evaluar con la curva de Atalah en el control prenatal" + (SO_Purita === "No" ? "; reforzar retiro de Purita Mamá" : ""));
    if (C === "NNA" && num(D.so_sgnac) && D.so_sgnac < 37) al.push("• Antecedente de prematurez (< 37 semanas)");
    if (C === "NNA" && num(D.so_pnac) && D.so_pnac < 2500) al.push("• Bajo peso al nacer (< 2.500 g)");
    else if (C === "NNA" && num(D.so_pnac) && D.so_pnac >= 4000) al.push("• Macrosomía al nacer (≥ 4.000 g)");
    if (C === "NNA" && ((SO_Cuerpo !== "" && SO_Cuerpo !== "Conforme") ? 1 : 0) + (SO_Compara === "Sí" ? 1 : 0) + (SO_RRSS === "Sí" ? 1 : 0) >= 2)
      al.push("• Preocupación por la imagen corporal: explorar conductas de riesgo de TCA y coordinar con psicología");
    R.Social_Deriv = al.map((x) => x + "\n").join("");
    R.Social_Estado = R.Social_Deriv === "" ? "Sin alertas" : "";
    // Agregado del portafolio (decisión docente ⚠): tamizaje de conducta alimentaria del adolescente
    R.TCA_Si = 0;
    for (let i = 1; i <= 9; i++) if (D["px_tca" + i] === "Sí") R.TCA_Si++;
    R.Alerta_TCA = R.GrupoEtario === "Adolescente" && R.TCA_Si >= 1
      ? "• Tamizaje de conducta alimentaria con respuesta de riesgo: explorar TCA y derivar a psicólogo y médico" : "";

    // Tabaco: cantidad (portafolio 2.ª entrega p. 3) y derivación de SEGUIMIENTO!B78
    R.Tabaco = S(D.tabaco);
    R.Cig_Dia = R.Tabaco === "Sí" && num(D.px_cig) ? (D.px_cig_unidad === "A la semana" ? D.px_cig / 7 : D.px_cig) : "";
    R.Deriv_Tabaco = R.Tabaco === "Sí" ? "• Consejería breve antitabaco" + (C === "AM" ? " y derivación a sala IRA (Clase 8 p. 20)" : "") : "";

    // AUDIT: réplica de SEGUIMIENTO!B63:B66. Solo se considera si «Consumo de alcohol» = Sí (decisión de la app).
    const aud = [];
    for (let i = 1; i <= 10; i++) { const v = D["audit_" + String(i).padStart(2, "0")]; aud.push(S(D.alcohol) === "Sí" && num(v) ? v : null); }
    const cnt = (a) => a.filter((v) => v !== null).length, sum = (a) => a.reduce((x, v) => x + (v || 0), 0);
    R.Audit_C = sum(aud.slice(0, 3));
    R.Audit_C_Cls = cnt(aud.slice(0, 3)) === 0 ? "" : R.Audit_C >= (R.SexoC === "M" ? 5 : 4) ? "Consumo de riesgo (continuar 4-10)" : "Bajo riesgo (intervención mínima)";
    R.Audit_Score = sum(aud);
    R.Audit_Riesgo = (R.Edad_Anios !== "" && R.Edad_Anios < 15) ? "No aplica (< 15 años)" : cnt(aud) === 0 ? "Sin aplicar" :
      R.Audit_Score <= 7 ? "Consumo de bajo riesgo" : R.Audit_Score <= 15 ? "Consumo de riesgo" : "Posible consumo problema o dependencia";
    R.Audit_Interv = R.Audit_Riesgo === "Consumo de bajo riesgo" ? "Intervención mínima" : R.Audit_Riesgo === "Consumo de riesgo" ? "Intervención breve" :
      R.Audit_Riesgo === "Posible consumo problema o dependencia" ? "Derivación asistida para evaluación completa + intervención breve" : "";
    R.Deriv_Alcohol = R.Audit_Interv ? "• Alcohol: " + R.Audit_Interv : "";

    // Fármacos y suplementos (texto equivalente a DATOS_PACIENTE «Fármacos y suplementos»)
    const nombres = (a) => (Array.isArray(a) ? a : []).map((x) => S(x && x.nombre).trim()).filter(Boolean);
    R.Farmacos = [...(D.px_farm_si === "Sí" ? nombres(D.px_farm_lista) : []), ...(D.px_supl_si === "Sí" ? nombres(D.px_supl_lista) : [])].join(", ") || S(D.farmacos);

    R.alertas = al.slice();
    if (R.Alerta_TCA) R.alertas.push(R.Alerta_TCA);
    if (R.Deriv_Tabaco) R.alertas.push(R.Deriv_Tabaco);
    if (R.Deriv_Alcohol) R.alertas.push(R.Deriv_Alcohol);

    // Morisky-Green-Levine (portafolio 2.ª entrega p. 3): adherente si No / Sí / No / No
    const mor = [D.px_mor1, D.px_mor2, D.px_mor3, D.px_mor4];
    R.Morisky = D.px_farm_si !== "Sí" || mor.some(vacio) ? "" :
      (mor[0] === "No" && mor[1] === "Sí" && mor[2] === "No" && mor[3] === "No") ? "Adherente" : "No adherente";
    // Actividad física semanal (meta ≥ 150 min, portafolio 2.ª entrega p. 3)
    R.AF_MinSem = num(D.px_af_veces) && num(D.px_af_min) ? D.px_af_veces * D.px_af_min : "";
    // Tanner: edad biológica según Anexo 1
    R.Tanner = vacio(D.px_tanner) ? "" : String(D.px_tanner);
    // GPA
    R.GPA = [D.px_g, D.px_p, D.px_a].some((v) => !vacio(v)) ? `G${S(D.px_g) || "–"} P${S(D.px_p) || "–"} A${S(D.px_a) || "–"}` : S(D.so_gpa);
    R.SG = num(D.so_sg) ? D.so_sg : "";
    R.Embarazada = SO_Emb === "Sí";
    antropometria(D, R, T, opts);
    prematuroCrec(D, R, R.PR, T);
    composicion(D, R, T);
    gestacion(D, R, T);
    laboratorio(D, R, T);
    presionArterial(D, R, T);
    riesgoCV(D, R, T);
    funcionalidadAM(D, R, T);
    r24Detallado(D, R, T);
    requerimientos(D, R, T);
    r24(D, R, T);
    dni(D, R);
    prescripcion(D, R, T);
    tfc(D, R);
    seguimiento(D, R);
    return R;
  }

  // =====================================================================
  // ETAPA 7 — gestante y nodriza (reglas docentes del proyecto; tablas en data/tablas7.json)
  // =====================================================================
  function gestacion(D, R, T) {
    const t7 = (T && T.t7) || null;
    const G = R.GES = { es: !!R.Embarazada };
    G.nod = !R.Embarazada && R.Sexo === "Femenino" && S(D.so_lact) === "Sí" && (R.Ciclo === "AD" || (R.Ciclo === "NNA" && GE(R.Edad_Anios, 10) && isNum(R.Edad_Anios)));
    R.Nodriza = G.nod;
    G.nodMeses = isNum(D.nod_meses) ? D.nod_meses : "";
    const tm2 = isNum(R.Talla_m) ? R.Talla_m * R.Talla_m : null;
    // Peso ideal: IMC 21,7 × talla² (decisión de la usuaria 07-11-2026, «peso ideal preconcepcional»; mismo cálculo que el peso ideal del adulto de la planilla)
    G.pesoIdeal = tm2 ? xround(21.7 * tm2, 1) : "";
    if (!G.es) return;
    const pp = isNum(D.ges_peso_preg) ? D.ges_peso_preg : "", pa = R.Peso, sg = R.SG;
    G.pp = pp; G.mult = S(D.px_multiple) === "Sí";
    G.imcPre = pp !== "" && tm2 ? pp / tm2 : "";
    G.enPre = !isNum(G.imcPre) ? "Falta dato" : G.imcPre < 18.5 ? "Bajo peso" : G.imcPre < 25 ? "Normal" : G.imcPre < 30 ? "Sobrepeso" : "Obesidad";
    const inc = t7 && t7.inc[G.enPre];
    G.inc = inc || null;
    G.rango = !inc ? null : G.mult ? inc.mult : inc.tot;
    G.rangoTxt = !inc ? "—" : G.mult ? inc.multTxt : inc.tot[0] + " a " + inc.tot[1];
    // Atalah: IMC actual según semana gestacional
    G.sgEnt = isNum(sg) ? Math.floor(sg) : "";
    const A = t7 && isNum(sg) && sg >= 6 ? t7.atalah[String(Math.min(42, G.sgEnt))] : null;
    G.atalahFila = A;
    G.imcAct = R.IMC;
    G.atalah = !isNum(sg) ? "Falta SG" : sg < 6 ? "No aplica (< 6 SG)" : !isNum(R.IMC) ? "Falta dato" : !A ? "Falta tabla" : R.IMC < A[0] ? "Bajo peso" : R.IMC <= A[1] ? "Normal" : R.IMC <= A[2] ? "Sobrepeso" : "Obesidad";
    // Incremento de peso actual = (peso actual − peso pregestacional) / (SG − 11)
    G.ganancia = pa !== "" && pp !== "" ? pa - pp : "";
    G.incSemKg = isNum(G.ganancia) && isNum(sg) && sg > 11 ? G.ganancia / (sg - 11) : "";
    G.incSemG = isNum(G.incSemKg) ? G.incSemKg * 1000 : "";
    G.incCls = !isNum(sg) || !isNum(G.ganancia) ? "Falta dato" : sg <= 11 ? "No aplica (desde la semana 12)" : !inc ? "Falta dato" : G.incSemG < inc.sem[0] ? "Insuficiente" : G.incSemG > inc.sem[1] ? "Excesivo" : "Adecuado";
    // Kcal extra por embarazo (método docente): solo con estado nutricional pregestacional bajo peso o normal
    G.aplicaExtra = G.enPre === "Bajo peso" || G.enPre === "Normal";
    G.metaSug = G.rango ? (G.rango[0] + G.rango[1]) / 2 : "";
    G.meta = isNum(D.ges_meta) ? D.ges_meta : G.metaSug;
    G.metaFuera = isNum(D.ges_meta) && G.rango ? (D.ges_meta < Math.min(...G.rango) || D.ges_meta > Math.max(...G.rango)) : false;
    G.faltan = isNum(G.meta) && isNum(G.ganancia) ? G.meta - G.ganancia : "";
    G.kcalTot = isNum(G.faltan) ? G.faltan * 7000 : "";
    G.semFaltan = isNum(sg) ? 40 - sg : "";
    G.kcalSem = isNum(G.kcalTot) && isNum(G.semFaltan) && G.semFaltan > 0 ? G.kcalTot / G.semFaltan : "";
    G.kcalDia = isNum(G.kcalSem) ? G.kcalSem / 7 : "";
    G.aviso = !G.aplicaExtra ? (G.enPre === "Falta dato" ? "Falta el peso pregestacional o la talla." : "Estado nutricional pregestacional " + G.enPre.toLowerCase() + ": no se agregan kcal extra (protocolo).")
      : !isNum(sg) || !isNum(G.ganancia) ? "Faltan datos (SG, peso actual o peso pregestacional)." : sg >= 40 ? "SG ≥ 40: el extra es 0." : isNum(G.faltan) && G.faltan <= 0 ? "Ya alcanzó la ganancia meta: el extra es 0." : "";
    G.extra = G.aplicaExtra && isNum(G.kcalDia) && G.faltan > 0 && sg < 40 ? xr(G.kcalDia, 0) : 0;
    G.multKcal = G.mult && isNum(sg) && sg >= 20 ? 1000 : 0;
    G.multProt = G.mult && isNum(sg) && sg >= 20 ? 50 : 0;
    // La calificación nutricional de la gestante es la de Atalah
    R.Calificacion_Nutricional = ["Bajo peso", "Normal", "Sobrepeso", "Obesidad"].includes(G.atalah) ? G.atalah : "Falta dato";
    R.Indicador_Ref = "IMC/SG (Atalah)";
    const q = R.Calificacion_Nutricional;
    R.Malnutricion = q === "Bajo peso" ? "Déficit" : q === "Sobrepeso" || q === "Obesidad" ? "Exceso" : q === "Normal" ? "Normal" : "";
    R.Calif_App = q;
  }

  // =====================================================================
  // ETAPA 3 — réplica de REQ_ENERGIA, MACRONUTRIENTES, NUTRIENTES_CRITICOS e HIDRATACION
  // (Planilla_Nutricional; filas de parálisis cerebral de Planilla_NNA). Tablas: data/tablas3.json.
  // =====================================================================
  // Excel guarda 15 cifras significativas: se redondea primero a 15 cifras y luego a d decimales
  const xr = (x, d) => xround(+(+x).toPrecision(15), d);
  // Comparación de Excel: un texto siempre es «mayor» que cualquier número
  const LT = (a, n) => isNum(a) ? a < n : false, LE = (a, n) => isNum(a) ? a <= n : false, GE = (a, n) => isNum(a) ? a >= n : true;
  const num0 = (v) => (isNum(v) ? v : NaN);
  const LISTA_FORMULAS = ["TEE + costo de crecimiento (< 1 año)", "Método rápido kcal/kg (< 1 año)", "TEE + costo de crecimiento (≥ 1 año)", "GEB OMS × PAL + costo de crecimiento",
    "Método rápido kcal/kg (1-17 años)", "Schofield (peso) × PAL + costo de crecimiento", "Schofield (peso y talla) × PAL + costo de crecimiento",
    "PC – Krick: GEB OMS × (FA + tono − 1) + crecimiento", "PC – Krick: GEB Schofield (P-T) × (FA + tono − 1) + crecimiento", "PC – Culley: kcal/cm de talla (5-11 años)",
    "FAO/OMS 2004 GEB × actividad × factor patológico", "Factorial kcal/kg × peso (AD/AM, predeterminado)"];
  const LISTA_HID = ["Mahan (ml/kg/día)", "Holliday-Segar", "RDI 2005 (agua total)", "ILSI 50-60 ml/kg", "35 ml/kg/día (peso real)", "1 ml/kcal"];
  const MICROS = [["Hierro", "mg", "hierro"], ["Calcio", "mg", "calcio"], ["Zinc", "mg", "zinc"], ["Vitamina D", "µg", "vitamina_d"], ["Vitamina B12", "µg", "vitamina_b12"],
    ["Vitamina A", "µg", "vitamina_a"], ["Vitamina C", "mg", "vitamina_c"], ["Folato", "µg", "folato"], ["Magnesio", "mg", "magnesio"], ["Fósforo", "mg", "fosforo"], ["Fibra", "g", "fibra"], ["Sodio", "mg", "sodio"]];
  const DET24 = { Hierro: "Det24_Hierro", Calcio: "Det24_Calcio", Zinc: "Det24_Zinc", "Vitamina D": "Det24_VitD", "Vitamina B12": "Det24_B12", "Vitamina A": "Det24_VitA",
    "Vitamina C": "Det24_VitC", Folato: "Det24_Folato", Magnesio: "Det24_Magnesio", "Fósforo": "Det24_Fosforo", Fibra: "Det24_Fibra", Sodio: "Det24_Sodio" };

  function requerimientos(D, R, T) {
    const t3 = (T && T.t3) || null;
    const C = R.Ciclo, sx = R.SexoC, M = sx === "M", aprox = R.Edad_Meses_Aprox, edad = R.Edad_Anios, Peso = R.Peso, Act = R.Actividad, AL = R.Alim_Lact;
    const nna = C === "NNA", adam = C === "AD" || C === "AM";
    const E = R.EN = {};
    // --- peso y factores ---
    E.PesoTipo = vacio(D.req_peso_tipo) || D.req_peso_tipo === "Automático" ? R.PesoTipo_Auto : D.req_peso_tipo;
    const pt = E.PesoTipo, sel = (v) => (isNum(v) ? v : Peso);
    R.PesoTipo = pt;
    R.Peso_Usado = Peso === "" ? "" : pt === "Ideal (talla baja)" ? sel(R.PesoTallaBaja) : pt === "Ideal" ? sel(R.Peso_Ideal) : pt === "Mínimo aceptable" ? sel(R.Peso_Min) :
      pt === "Máximo aceptable" ? sel(R.Peso_Max) : pt === "Ajustado" ? sel(R.Peso_Ajustado) : pt === "Seco" ? Peso - R.Desc_Edema : Peso;
    const GS = R.GES || {}, gn = !!(GS.es || GS.nod);
    if (GS.es && (vacio(D.req_peso_tipo) || D.req_peso_tipo === "Automático") && isNum(GS.pesoIdeal)) { R.PesoTipo = E.PesoTipo = "Ideal (IMC 21,7)"; R.Peso_Usado = GS.pesoIdeal; }
    const P = R.Peso_Usado, hayP = P !== "";
    R.Factor_AF = isNum(D.req_factor) ? D.req_factor : Act === "Moderada" ? 1.7 : Act === "Intensa" ? 2 : 1.4;
    const ci = Act === "Moderada" ? 3 : Act === "Intensa" ? 5 : 1;
    // Decisión de la usuaria (06-11-2026): factor de actividad estandarizado para todos (ligera 1,4 · moderada 1,7 · intensa 2,0), también en NNA,
    // en vez de la tabla PAL OMS 2004 por edad y sexo de la planilla. El método rápido ≥ 6 años mantiene su ajuste de −15 % / +15 %.
    R.PAL_OMS = !nna || LT(edad, 1) || !isNum(edad) || !t3 ? "—" : (t3.pal[Math.min(edad, 17)] || [])[ci - 1 + (sx === "F" ? 1 : 0)] ?? "—";
    R.PAL_NNA = !nna || LT(edad, 1) || !isNum(edad) ? "—" : R.Factor_AF;
    R.Ajuste_Rapido = nna && GE(edad, PLANILLA ? 6 : 5) && isNum(edad) ? (Act === "Intensa" ? 1.15 : Act === "Moderada" ? 1 : 0.85) : 1;
    R.Costo_Crec = (() => {
      if (!nna) return 0; if (!t3) return 0;
      let k; if (LT(aprox, 12)) k = "M" + (aprox < 3 ? 0 : aprox < 6 ? 3 : aprox < 9 ? 6 : 9);
      else { if (!isNum(edad) || edad > 17) return 0; k = "A" + Math.max(1, edad); }
      const r = t3.gro[k]; if (!r) return 0; const v = M ? r[0] * r[1] : r[2] * r[3]; return isNum(v) ? v : 0;
    })();
    E.AlimLact = nna && LT(aprox, 12) ? AL : "No aplica";
    E.Ajuste = isNum(D.req_ajuste) ? D.req_ajuste : 0;
    R.KcalKg_Fact = nna ? "" : isNum(D.req_kcalkg) ? D.req_kcalkg : R.Malnutricion === "Déficit" ? 30 : R.Malnutricion === "Exceso" ? 25 : 27.5;
    R.Factor_Pat = vacio(D.req_factor_pat) || D.req_factor_pat === "Sin factor patológico" || !t3 ? 1 : (t3.fp[D.req_factor_pat] ? t3.fp[D.req_factor_pat][M ? 0 : 1] : 1);
    // --- parálisis cerebral (Planilla_NNA REQ_ENERGIA B16-B21) ---
    const pc = !!(R.PC && R.PC.activa);
    E.PC = { activa: pc };
    if (pc) {
      const fa = R.Krick_FA;
      R.Krick_Factor = fa === "" || !isNum(fa) ? "—" : fa + (R.Tono_Factor - 1);
      const meta = isNum(D.req_pc_meta_meses) ? D.req_pc_meta_meses : "";
      E.PC.meta = meta;
      E.PC.ideal = isNum(R.Peso_Ideal) ? R.Peso_Ideal : "—"; E.PC.real = Peso === "" ? "—" : Peso;
      E.PC.dif = isNum(E.PC.ideal) && isNum(E.PC.real) ? xr((E.PC.ideal - E.PC.real) * 1000, 0) : "—";
      E.PC.gdia = isNum(E.PC.dif) && meta !== "" ? (E.PC.dif > 0 ? xr(E.PC.dif / (meta * 30), 1) : 0) : "—";
      R.Krick_Crec = isNum(E.PC.gdia) && E.PC.gdia > 0 ? xr(E.PC.gdia * 5, 0) : xr(R.Costo_Crec, 0);
    } else { R.Krick_Factor = "No aplica"; R.Krick_Crec = "No aplica"; }
    // --- tabla comparativa de fórmulas ---
    const F = [];
    const fila = (nombre, aplica, c, d, e, get, fuente) => {
      let g; if (!aplica) g = "No aplica"; else { try { g = get(); if (!isNum(g)) g = "—"; } catch (x) { g = "—"; } }
      F.push({ nombre, aplica: aplica ? "Sí" : "No", c: aplica ? c : "", d: aplica ? d : "", e: aplica ? e : "", get: g, fuente });
    };
    const lact = nna && LT(aprox, 12) && hayP, may1 = nna && GE(aprox, 12) && isNum(aprox) && hayP;
    const Pn = num0(P), Tm = num0(R.Talla_m);
    // TEE < 1 año
    { const c = AL === "Fórmula láctea" ? 82.6 * Pn - 29 : AL === "Mixta" ? 88.3 * Pn - 95.4 : 92.8 * Pn - 152;
      fila(LISTA_FORMULAS[0], lact, c, 1, R.Costo_Crec, () => xr(c * 1 + R.Costo_Crec, 0), "Consenso p. 22-23"); }
    // Método rápido < 1 año
    { const r = t3 && lact ? t3.rap1[Math.max(1, Math.min(12, aprox))] : null, j = (AL === "Fórmula láctea" ? 3 : AL === "Mixta" ? 5 : 1) - 1 + (sx === "F" ? 1 : 0);
      const c = r ? r[j] : NaN; fila(LISTA_FORMULAS[1], lact, c, P, "", () => xr(c * Pn, 0), "Consenso p. 24; Clase 4 p. 33"); }
    // TEE ≥ 1 año
    { const c = M ? 310.2 + 63.3 * Pn - 0.263 * Pn * Pn : 263.4 + 65.3 * Pn - 0.454 * Pn * Pn;
      fila(LISTA_FORMULAS[2], may1, c, 1, R.Costo_Crec, () => xr(c * 1 + R.Costo_Crec, 0), "Consenso p. 25-26"); }
    // GEB OMS × PAL
    const gebOMS = LT(edad, 3) ? (M ? 59.512 * Pn - 30.4 : 58.317 * Pn - 31.1) : LT(edad, 10) ? (M ? 22.706 * Pn + 504.3 : 20.315 * Pn + 485.9) : (M ? 17.686 * Pn + 658.2 : 13.384 * Pn + 692.6);
    fila(LISTA_FORMULAS[3], may1, gebOMS, R.PAL_NNA, R.Costo_Crec, () => xr(gebOMS * num0(R.PAL_NNA) + R.Costo_Crec, 0), "Consenso p. 27-30");
    // Método rápido 1-17
    const rap2 = nna && GE(aprox, 12) && isNum(aprox) && LT(edad, 18) && hayP;
    { const r = t3 && rap2 ? t3.rap2[Math.min(Math.max(edad, 1), 17)] : null, c = r ? r[M ? 0 : 1] : NaN;
      fila(LISTA_FORMULAS[4], rap2, c, R.Ajuste_Rapido, "", () => xr(c * Pn * R.Ajuste_Rapido, 0), "Consenso p. 30-31; Clase 4 p. 51"); }
    // Schofield peso
    { const c = LT(edad, 3) ? (M ? 59.48 * Pn - 30.33 : 58.29 * Pn - 31.05) : LT(edad, 10) ? (M ? 22.7 * Pn + 505 : 20.3 * Pn + 486) : (M ? 13.4 * Pn + 693 : 17.7 * Pn + 659);
      fila(LISTA_FORMULAS[5], may1, c, R.PAL_NNA, R.Costo_Crec, () => xr(c * num0(R.PAL_NNA) + R.Costo_Crec, 0), "Consenso p. 36"); }
    // Schofield peso y talla
    const schPT = LT(edad, 3) ? (M ? 0.167 * Pn + 1517.4 * Tm - 617.6 : 16.25 * Pn + 1023.2 * Tm - 413.5) : LT(edad, 10) ? (M ? 19.6 * Pn + 130.3 * Tm + 414.9 : 16.97 * Pn + 161.8 * Tm + 371.2) : (M ? 16.25 * Pn + 137.2 * Tm + 515.5 : 8.365 * Pn + 465 * Tm + 200);
    const ptA = may1 && R.Talla_m !== "";
    fila(LISTA_FORMULAS[6], ptA, schPT, R.PAL_NNA, R.Costo_Crec, () => xr(schPT * num0(R.PAL_NNA) + R.Costo_Crec, 0), "Consenso p. 36");
    // Parálisis cerebral (Planilla_NNA)
    const kA = hayP && pc && GE(aprox, 12) && isNum(aprox);
    fila(LISTA_FORMULAS[7], kA, gebOMS, R.Krick_Factor, R.Krick_Crec, () => xr(gebOMS * num0(R.Krick_Factor) + num0(R.Krick_Crec), 0), "Krick 1992: (MB × tono × actividad) + crecimiento. ⚠ MB = GEB OMS; tono sumado al FA (indicación docente)");
    fila(LISTA_FORMULAS[8], kA && R.Talla_m !== "", schPT, R.Krick_Factor, R.Krick_Crec, () => xr(schPT * num0(R.Krick_Factor) + num0(R.Krick_Crec), 0), "Krick 1992 con MB por Schofield peso-talla (Consenso p. 36)");
    { const cA = R.Talla_cm !== "" && pc && GE(edad, 5) && LE(edad, 11), c = Act === "Deambula" ? 13.9 : 11.1;
      fila(LISTA_FORMULAS[9], cA, c, R.Talla_cm, "", () => xr(c * R.Talla_cm, 0), "Culley 1969: 13,9 kcal/cm (deambula con disfunción motora) · 11,1 kcal/cm (no deambula)"); }
    // Adulto y adulto mayor
    const ad = hayP && adam;
    { const c = LT(edad, 30) ? (M ? 15.057 * Pn + 692.2 : 14.818 * Pn + 486.6) : LT(edad, 60) ? (M ? 11.472 * Pn + 873.1 : 8.126 * Pn + 845.6) : (M ? 11.711 * Pn + 587.7 : 9.082 * Pn + 658.5);
      const d = R.Factor_AF * R.Factor_Pat;
      fila(LISTA_FORMULAS[10], ad, c, d, "", () => xr(c * d, 0), "Consenso p. 7 y 37; Consenso Nutrición Clínica Adulto USS 2018 (Documento de trabajo n° 42) p. 6-8 (indica peso ideal)"); }
    fila(LISTA_FORMULAS[11], ad, R.KcalKg_Fact, P, "", () => xr(R.KcalKg_Fact * Pn, 0), "Consenso Nutrición Clínica Adulto USS 2018 (Documento de trabajo n° 42) p. 6");
    E.formulas = F;
    const fx = (n) => F.find((f) => f.nombre === n);
    // --- requerimiento seleccionado ---
    // Decisión docente (07-11-2026): de 5 a 9 años, método rápido kcal/kg ± 15 % según actividad; adolescentes (≥ 10 años), GEB OMS × PAL
    const rapido59 = !PLANILLA && !pc && GE(edad, 5) && LT(edad, 10) && isNum(edad) && F[4].aplica === "Sí";
    E.Sugerida = nna ? (LT(aprox, 12) ? F[0].nombre : pc ? (F[7].aplica === "Sí" ? F[7].nombre : F[3].nombre) : rapido59 ? F[4].nombre : F[3].nombre) : C === "" ? "" : F[11].nombre;
    const fin = S(D.req_formula);
    R.Formula_Usada = fin !== "" && fx(fin) && fx(fin).aplica === "Sí" ? fin : E.Sugerida;
    R.GET_Calc = fx(R.Formula_Usada) ? fx(R.Formula_Usada).get : "—";
    R.GET_Final = isNum(R.GET_Calc) ? xr(R.GET_Calc + E.Ajuste, 0) : "";
    // Gestante y nodriza: GEB FAO/OMS/UNU 2004 × PAL (< 18 años: tramo 18-30) + kcal extra por embarazo / + 1.000 kcal múltiple desde la semana 20 / + 500 kcal nodriza
    if (gn && hayP) {
      const e = R.Edad_Anios, Pg = num0(P);
      GS.gebEc = LT(e, 30) || e === "" ? "14,818 × kg + 486,6 (18-30 años" + (LT(e, 18) ? "; se usa en < 18 años" : "") + ")" : LT(e, 60) ? "8,126 × kg + 845,6 (30-60 años)" : "9,082 × kg + 658,5 (> 60 años)";
      GS.geb = LT(e, 30) || e === "" ? 14.818 * Pg + 486.6 : LT(e, 60) ? 8.126 * Pg + 845.6 : 9.082 * Pg + 658.5;
      GS.gebPal = xr(GS.geb * R.Factor_AF, 0);
      GS.nodKcal = GS.nod ? 500 : 0;
      R.Formula_Usada = GS.es ? "Gestante: GEB FAO/OMS/UNU 2004 × PAL + kcal extra" : "Nodriza: GEB FAO/OMS/UNU 2004 × PAL + 500 kcal";
      R.GET_Calc = GS.gebPal + (GS.es ? GS.extra + GS.multKcal : GS.nodKcal);
      R.GET_Final = xr(R.GET_Calc + E.Ajuste, 0);
    }
    R.Kcal_Kg = isNum(R.GET_Final) && isNum(P) && P !== 0 ? R.GET_Final / P : "—";
    R.Kcal_Kg_Ref = (() => {
      if (nna) { if (LT(aprox, 12)) return F[1].c === "" ? "" : num0(F[1].c); if (LT(edad, 18)) return F[4].aplica === "Sí" ? F[4].c * F[4].d : "—"; return isNum(F[3].get) && isNum(P) ? F[3].get / P : "—"; }
      return isNum(F[10].get) && isNum(P) ? F[10].get / P : "—";
    })();
    if (!isNum(R.Kcal_Kg_Ref) && R.Kcal_Kg_Ref !== "") R.Kcal_Kg_Ref = "—";
    R.Adec_Kcal = isNum(R.Kcal_Kg) && isNum(R.Kcal_Kg_Ref) && R.Kcal_Kg_Ref !== 0 ? R.Kcal_Kg / R.Kcal_Kg_Ref * 100 : "—";
    R.Kcal_Kg_Real = nna || Peso === "" || !isNum(R.GET_Final) ? "—" : R.GET_Final / Peso;
    R.Nom_Kcal = nna ? (!isNum(R.Adec_Kcal) ? "—" : R.Adec_Kcal < 90 ? "Hipocalórico" : R.Adec_Kcal <= 110 ? "Normocalórico" : "Hipercalórico")
      : (!isNum(R.Kcal_Kg_Real) ? "—" : xr(R.Kcal_Kg_Real, 1) < 25 ? "Hipocalórico" : xr(R.Kcal_Kg_Real, 1) <= 30 ? "Normocalórico" : "Hipercalórico");
    if (gn && isNum(GS.gebPal) && isNum(R.GET_Final)) R.Nom_Kcal = R.GET_Final > GS.gebPal ? "Hipercalórico" : R.GET_Final < GS.gebPal ? "Hipocalórico" : "Normocalórico"; // ⚠ regla de la app: respecto de GEB × PAL
    const GET = R.GET_Final, hayG = isNum(GET), Pnum = isNum(P) && P !== 0;

    // --- MACRONUTRIENTES ---
    const Mc = R.MAC = {};
    Mc.ProtAuto = nna && LT(edad, 1) ? "Normoproteico" : (R.Malnutricion === "Exceso" || (!nna && R.Malnutricion === "Déficit")) ? "Hiperproteico" : "Normoproteico";
    R.Prot_Tipo = vacio(D.mac_prot_tipo) || D.mac_prot_tipo === "Automático" ? Mc.ProtAuto : D.mac_prot_tipo;
    const pr = t3 ? t3.prot : {};
    Mc.RefNormo = nna ? (LT(aprox, 6) ? 2.2 : LT(aprox, 12) ? 1.6 : LT(edad, 4) ? 1.2 : hayG && Pnum ? GET * 0.15 / 4 / P : "—") : (C === "AM" ? pr.PROT_AM : pr.PROT_AD);
    R.Prot_NSI = (() => {
      if (!nna || !t3) return "";
      let k; if (LT(aprox, 6)) k = "PI|" + aprox; else if (LT(edad, 11)) k = "PC|" + (LT(aprox, 12) ? 6 : LT(aprox, 18) ? 12 : LT(aprox, 24) ? 18 : Math.min(edad, 10) * 12);
      else k = "PA|" + sx + "|" + Math.min(edad, 18);
      const v = t3.pro[k]; return isNum(v) ? v * (GE(aprox, 6) ? 1.2 : 1) : "";
    })();
    const rn = Mc.RefNormo, ptp = R.Prot_Tipo;
    Mc.GkgTipo = nna ? (ptp === "Hiperproteico" ? (GE(edad, 1) && isNum(edad) ? (hayG && Pnum ? GET * 0.2 / 4 / P : "—") : rn) : ptp === "Hipoproteico" ? R.Prot_NSI : rn)
      : (ptp === "Hiperproteico" ? (isNum(rn) ? Math.max(C === "AM" ? pr.PROT_HIPER_AM : pr.PROT_HIPER, rn) : "—") : ptp === "Hipoproteico" ? pr.PROT_HIPO : rn);
    R.Prot_Gkg = isNum(D.mac_prot_gkg) ? D.mac_prot_gkg : isNum(Mc.GkgTipo) ? Mc.GkgTipo : "";
    // ERC: decisión de la usuaria (06-11-2026): KDIGO 2024. Adultos con ERC G3-G5 sin diálisis: 0,8 g/kg/d. En NNA no se restringe.
    const etapa = S(D.ant_erc_etapa);
    Mc.ERC = !nna && S(D.ant_erc) === "Sí" && ["G3a", "G3b", "G4", "G5"].includes(etapa) ? "Sí" : "No";
    Mc.ERCNota = S(D.ant_erc) !== "Sí" ? "" : nna ? "ERC en NNA: no se restringe la proteína; meta en el rango alto normal para la edad (KDIGO 2024)."
      : etapa === "Diálisis" ? "Diálisis: KDIGO 2024 no fija meta proteica para diálisis; definir con el equipo." : Mc.ERC === "Sí" ? "" : "ERC " + (etapa || "sin etapa") + ": KDIGO 2024 sugiere no superar 1,3 g/kg/d si hay riesgo de progresión.";
    R.Prot_g = isNum(R.Prot_Gkg) && Pnum ? xr((Mc.ERC === "Sí" ? Math.min(R.Prot_Gkg, 0.8) : R.Prot_Gkg) * P, 1) : "";
    // Gestante: 0,8-1,0 g/kg + 20 % digestibilidad + 25 g (+ 50 g múltiple ≥ 20 SG). Nodriza: + 15 g los primeros 6 meses o + 12,5 g después (FAO 2007 + MINSAL 2015)
    if (gn) {
      GS.protGkg = isNum(D.mac_prot_gkg) ? D.mac_prot_gkg : 1;
      GS.protBase = Pnum ? GS.protGkg * P : "";
      GS.protDig = isNum(GS.protBase) ? GS.protBase * 0.2 : "";
      GS.protExtra = GS.es ? 25 : (isNum(GS.nodMeses) && GS.nodMeses > 6 ? 12.5 : 15);
      R.Prot_Gkg = GS.protGkg;
      R.Prot_g = isNum(GS.protBase) ? xr(GS.protBase * 1.2 + GS.protExtra + (GS.es ? GS.multProt : 0), 1) : "";
    }
    R.Prot_kcal = isNum(R.Prot_g) ? R.Prot_g * 4 : "";
    R.Prot_Pct = isNum(R.Prot_kcal) && hayG && GET !== 0 ? R.Prot_kcal / GET * 100 : "";
    const pp = R.Prot_Pct;
    R.Prot_Nom = nna ? (LT(aprox, 6) ? (LT(pp, 6) ? "Hipoproteico" : LE(pp, 8) ? "Normoproteico" : "Hiperproteico") : LT(aprox, 12) ? (LT(pp, 6) ? "Hipoproteico" : LE(pp, 10) ? "Normoproteico" : "Hiperproteico")
      : (LT(pp, 10) ? "Hipoproteico" : LE(pp, 18) ? "Normoproteico" : "Hiperproteico"))
      : (!isNum(R.Prot_g) || !Pnum ? "—" : (() => { const g = xr(R.Prot_g / P, 2); return g < (C === "AM" ? 1 : 0.8) ? "Hipoproteico" : g <= (C === "AM" ? 1.2 : 1) ? "Normoproteico" : "Hiperproteico"; })());
    if (nna && !isNum(aprox)) R.Prot_Nom = "—";
    if (gn && isNum(R.Prot_g)) R.Prot_Nom = GS.es && GS.multProt ? "Hiperproteico" : "Normoproteico"; // protocolo: «calcular normoproteico» (+ 50 g múltiple ⚠)
    R.Prot_Sel = S(D.mac_prot_sel);
    Mc.Alerta = !isNum(pp) ? "" : Mc.ERC === "Sí" ? "Ajustado por ERC " + etapa + " (KDIGO 2024: 0,8 g/kg/d)" : nna && isNum(R.Prot_NSI) && isNum(R.Prot_Gkg) && R.Prot_Gkg < R.Prot_NSI ? "Bajo el nivel seguro de ingesta (NSI) ⚠ revisar"
      : (pp < 10 || pp > 35) ? "Fuera de 10-35 % de la DMC ⚠ revisar" : "OK";
    // Lípidos
    Mc.LipSug = !nna ? 30 : LT(aprox, 6) ? (AL === "Fórmula láctea" ? 40 : 50) : LT(aprox, 12) ? 35 : 30;
    R.Lip_Pct = isNum(D.mac_lip_pct) ? D.mac_lip_pct : (!vacio(D.mac_lip_pct) && isFinite(+D.mac_lip_pct) ? +D.mac_lip_pct : Mc.LipSug);
    R.Lip_g = hayG ? xr(GET * R.Lip_Pct / 100 / 9, 1) : "";
    R.Lip_kcal = isNum(R.Lip_g) ? R.Lip_g * 9 : "";
    Mc.AGS_Pct = !nna ? 10 : GE(edad, 2) && isNum(edad) ? 8 : "—";
    Mc.AGS_g = hayG && isNum(Mc.AGS_Pct) ? xr(GET * Mc.AGS_Pct / 100 / 9, 1) : "—";
    Mc.AGPI_Pct = !nna ? "6-11" : GE(edad, 2) && isNum(edad) ? "11" : GE(aprox, 6) && isNum(aprox) ? "< 15" : "—";
    Mc.AGPI_g = !hayG ? (!nna || (GE(edad, 2) && isNum(edad)) ? "—" : "") : !nna ? [xr(GET * 0.06 / 9, 1), xr(GET * 0.11 / 9, 1)] : GE(edad, 2) && isNum(edad) ? [xr(GET * 0.11 / 9, 1)] : "";
    Mc.AGMI_g = isNum(R.Lip_g) && isNum(Mc.AGS_g) ? xr(R.Lip_g - Mc.AGS_g - (!nna ? GET * 0.085 / 9 : GE(edad, 2) && isNum(edad) ? GET * 0.11 / 9 : 0), 1) : "—";
    const lp = R.Lip_Pct;
    R.Lip_Nom = !isNum(lp) ? "—" : !nna ? (lp < 20 ? "Hipolipídico" : lp <= 35 ? "Normolipídico" : "Hiperlipídico")
      : LT(aprox, 6) ? (AL === "Fórmula láctea" ? (lp < 40 ? "Hipolipídico" : lp <= 45 ? "Normolipídico" : "Hiperlipídico") : (lp < 50 ? "Hipolipídico" : lp <= 55 ? "Normolipídico" : "Hiperlipídico"))
      : LT(aprox, 12) ? (lp < 35 ? "Hipolipídico" : lp <= 40 ? "Normolipídico" : "Hiperlipídico") : (lp < 25 ? "Hipolipídico" : lp <= 35 ? "Normolipídico" : "Hiperlipídico");
    R.Lip_Sel = !vacio(D.mac_lip_sel) ? D.mac_lip_sel : (S(D.ant_dlp) === "Sí" || S(D.ant_ecv) === "Sí") ? "AGMI y AGPI" : "";
    // Hidratos de carbono: control metabólico (antecedentes + laboratorio)
    const glic = isNum(D.lab_glic) ? D.lab_glic : null, a1c = isNum(D.lab_hba1c) ? D.lab_hba1c : null, ptgo = isNum(D.lab_ptgo) ? D.lab_ptgo : null;
    R.Lab_HOMA = glic !== null && isNum(D.lab_insul) ? glic * D.lab_insul / 405 : "";
    R.HOMA_Corte = 2.5;
    R.Meta_HbA1c = edad === "" ? 7 : edad >= 80 ? 8 : 7;
    Mc.CtrlAuto = S(D.ant_dm2) === "Sí" ? (a1c !== null ? (a1c < R.Meta_HbA1c ? "DM2 compensada" : "DM2 descompensada") : "DM2 compensada")
      : ((glic !== null && glic >= 126) || (a1c !== null && a1c >= 6.5) || (ptgo !== null && ptgo >= 200)) ? "Sugerente de DM2"
      : ((glic !== null && glic >= 100) || (ptgo !== null && ptgo >= 140)) ? "Prediabetes (GAA/ITG)"
      : (isNum(R.Lab_HOMA) && R.Lab_HOMA >= R.HOMA_Corte) ? "Resistencia a la insulina" : "Sin alteración";
    R.Control_Met = vacio(D.mac_cho_ctrl) || D.mac_cho_ctrl === "Automático" ? Mc.CtrlAuto : D.mac_cho_ctrl;
    R.Cho_Modo = vacio(D.mac_cho_modo) ? "Por diferencia" : D.mac_cho_modo;
    Mc.ChoCtrlPct = t3 && isNum(t3.cho[R.Control_Met]) ? t3.cho[R.Control_Met] : "—";
    R.CHO_Pct_Usado = R.Cho_Modo === "Según control metabólico" ? Mc.ChoCtrlPct : (isNum(pp) && isNum(lp) ? 100 - pp - lp : "");
    if (!isNum(R.CHO_Pct_Usado)) R.CHO_Pct_Usado = "";
    R.CHO_g = hayG && isNum(R.CHO_Pct_Usado) ? xr(GET * R.CHO_Pct_Usado / 100 / 4, 1) : "";
    R.CHO_kcal = isNum(R.CHO_g) ? R.CHO_g * 4 : "";
    R.Fibra_g = nna ? (!isNum(edad) ? "—" : edad < 1 ? "—" : edad < 2 ? 19 : edad + 5) : hayG ? xr(14 * GET / 1000, 0) : "—";
    R.Azuc_Max = hayG ? xr(GET * 0.1 / 4, 0) : "—";
    const cp = R.CHO_Pct_Usado;
    R.CHO_Nom = LT(aprox, 6) ? (LT(cp, 45) ? "Hipoglucídico" : LE(cp, 48) ? "Normoglucídico" : "Hiperglucídico") : (LT(cp, 50) ? "Hipoglucídico" : LE(cp, nna ? 55 : 60) ? "Normoglucídico" : "Hiperglucídico");
    if (!isNum(cp)) R.CHO_Nom = "—";
    R.CHO_Sel = D.mac_cho_sel === "Sin selección" ? "" : !vacio(D.mac_cho_sel) ? D.mac_cho_sel : R.Control_Met !== "Sin alteración" ? "CHO complejos y fibra" : "";
    R.Suma_Pct = [pp, lp, cp].reduce((a, v) => a + (isNum(v) ? v : 0), 0);
    Mc.Validacion = Math.abs(R.Suma_Pct - 100) < 0.5 ? "OK: suma 100 %" : "Revisar: suma = " + String(xr(R.Suma_Pct, 1)).replace(".", ",") + " %";

    // --- NUTRIENTES CRÍTICOS ---
    R.Grupo_RDI = edad === "" ? "" : R.Edad_Meses < 7 ? "0-6m" : R.Edad_Meses < 12 ? "7-12m" : edad < 4 ? "1-3" : edad < 9 ? "4-8" : edad < 14 ? "9-13" : edad < 19 ? "14-18" : edad < 31 ? "19-30" : edad < 51 ? "31-50" : edad < 71 ? "51-70" : ">70";
    R.Sexo_RDI = edad === "" ? "" : edad < 9 ? "N" : sx;
    const odin = S(R.Lab_ODIN).toLowerCase(), pacls = S(R.PA_Clasificacion).toLowerCase();
    const NC = R.NC = [];
    for (const [n, u, k] of MICROS) {
      const key = n + "|" + R.Grupo_RDI + "|" + R.Sexo_RDI, m = t3 && t3.mic[key];
      const o = { n, u, k };
      o.critico = n === "Hierro" ? (nna || (C === "AD" && sx === "F")) : n === "Calcio" || n === "Vitamina D" || n === "Fibra" ? C !== "" : n === "Zinc" ? nna : n === "Vitamina B12" ? C === "AM" : n === "Sodio" ? GE(aprox, 12) && isNum(aprox) : false;
      if (n === "Fibra") { o.rec = R.Fibra_g; o.tipo = nna ? "Consenso" : "MINSAL"; o.ul = "ND"; }
      else if (n === "Sodio") { o.rec = LT(aprox, 12) ? "—" : 2000; o.tipo = "Máximo ⚠"; o.ul = "—"; }
      else { o.rec = m && isNum(m.rec) ? m.rec : "—"; o.tipo = m ? m.tipo : "—"; o.ul = m ? (vacio(m.ul) ? "ND" : m.ul) : "—"; }
      const t7m = gn && T && T.t7 ? T.t7.micro[n] : null;
      if (t7m) { o.rec = t7m[GS.es ? 1 : 2]; o.tipo = "GP 2015 T3"; }
      if (GS.es && (n === "Hierro" || n === "Folato" || n === "Calcio")) o.critico = true;
      if (GS.nod && (n === "Calcio" || n === "Hierro")) o.critico = true;
      o.det = isNum(R[DET24[n]]) ? R[DET24[n]] : 0;
      o.manual = isNum(D["nc_" + k]) ? D["nc_" + k] : "";
      o.ing = o.manual !== "" ? o.manual : o.det > 0 ? o.det : "";
      o.adec = o.ing === "" || !isNum(o.rec) ? "—" : o.ing / o.rec * 100;
      o.cls = !isNum(o.adec) ? "—" : n === "Sodio" ? (o.ing > o.rec ? "Exceso" : "Adecuado") : (isNum(o.ul) && o.ing > o.ul) ? "Sobre UL" : o.adec < 90 ? "Insuficiencia" : o.adec <= 110 ? "Suficiencia" : "Exceso";
      const pdm = S(D["nc_" + k + "_pd"]);
      o.pdManual = pdm;
      o.pd = pdm === "Normal" ? "" : pdm !== "" ? pdm : n === "Hierro" ? (odin.includes("anemia") ? "Alto en" : "") : n === "Calcio" ? (isNum(o.adec) && o.adec < 90 ? "Alto en" : "")
        : n === "Vitamina D" ? (odin.includes("vitamina d") ? "Alto en" : "") : n === "Sodio" ? ((S(D.ant_hta) === "Sí" || S(D.ant_erc) === "Sí" || pacls.includes("hta") || pacls.includes("elevada")) ? "Bajo en" : "") : "";
      NC.push(o);
    }
    const lista = (t) => NC.filter((o) => o.pd === t).map((o) => o.n.toLowerCase()).join(", ");
    const altos = lista("Alto en"), bajos = lista("Bajo en");
    R.Micro_PD_Alto = altos ? "alto en " + altos : ""; R.Micro_PD_Bajo = bajos ? "bajo en " + bajos : "";
    R.Micro_PD = R.Micro_PD_Alto + (R.Micro_PD_Alto && R.Micro_PD_Bajo ? ", " : "") + R.Micro_PD_Bajo;
    const ele = t3 && t3.ele[R.Grupo_RDI + "|" + R.Sexo_RDI];
    R.K_AI = ele && isNum(ele.K) ? ele.K : "—"; R.Na_AI = ele && isNum(ele.Na) ? ele.Na : "—";
    for (const o of NC) { if (o.n === "Calcio") R.Rec_Calcio = o.rec; if (o.n === "Vitamina D") R.Rec_VitD = o.rec; if (o.n === "Calcio") R.NC_Ingesta_Calcio = o.ing; if (o.n === "Hierro") R.NC_Ingesta_Hierro = o.ing; }

    // --- HIDRATACIÓN ---
    const H = R.HID = [], hP = Peso !== "";
    const push = (n, ap, f, fuente) => { let v = "No aplica"; if (ap) { try { v = f(); if (!isNum(v)) v = "—"; } catch (x) { v = "—"; } } H.push({ n, aplica: ap ? "Sí" : "No", ml: v, vasos: isNum(v) ? xr(v / 200, 1) : "", fuente }); };
    push(LISTA_HID[0], hP && nna, () => { const mh = t3.mah; let i = -1; for (let j = 0; j < mh.m.length; j++) if (mh.m[j] <= R.Edad_Meses) i = j; if (i < 0) return NaN; return xr((mh.min[i] + mh.max[i]) / 2 * Pn, 0); }, "Clase 4 p. 35/53; Clase 5 p. 20 (punto medio; peso usado en requerimientos, Consenso p. 6)");
    push(LISTA_HID[1], hP && nna, () => xr(Pn < 10 ? 100 * Pn : Pn <= 20 ? 1000 + 50 * (Pn - 10) : 1500 + 20 * (Pn - 20), 0), "Consenso p. 39 (peso usado)");
    push(LISTA_HID[2], hP && nna && LT(edad, 19), () => xr(t3.agua[R.Grupo_RDI][M ? 0 : 1] * 1000, 0), "Consenso p. 38");
    push(LISTA_HID[3], hP && nna && GE(edad, 1) && isNum(edad), () => xr(55 * Pn, 0), "Consenso p. 39 (punto medio 55 ml/kg; peso usado)");
    push(LISTA_HID[4], hP && adam, () => xr(35 * Peso, 0), "Clase 9 p. 73 (Mahan 2012)");
    push(LISTA_HID[5], hP && hayG, () => xr(GET, 0), "Clase 9 p. 73 (MINSAL 2013)");
    const hin = S(D.hid_metodo), hx = H.find((h) => h.n === hin);
    R.Hid_Metodo = hin !== "" && hx && hx.aplica === "Sí" ? hin : nna ? LISTA_HID[0] : LISTA_HID[5];
    R.Hid_Sugerido = nna ? LISTA_HID[0] : LISTA_HID[5];
    const hu = H.find((h) => h.n === R.Hid_Metodo);
    R.VHT = hu ? hu.ml : "—";
    R.VHT_Vasos = isNum(R.VHT) ? xr(R.VHT / 200, 1) : "—";
  }

  // =====================================================================
  // ETAPA 4 — réplica de R24 (porciones de intercambio) y del cálculo de R24_DETALLADO (CARHE)
  // Tablas: data/tablas4.json (TAB_INTERCAMBIO, TAB_MEDIDAS_CASERAS) y data/carhe.json (TAB_CARHE)
  // =====================================================================
  const TIEMPOS = ["Desayuno", "Colación AM", "Almuerzo", "Once", "Cena", "Colación PM"];
  const DET_KEYS = ["Kcal", "Prot", "CHO", "Azucar", "Fibra", "Lip", "AGS", "AGMI", "AGPI", "Colesterol", "Calcio", "Hierro", "Magnesio", "Fosforo", "Potasio", "Sodio", "Zinc", "Selenio",
    "VitC", "Tiamina", "Riboflavina", "Niacina", "B6", "Folato", "B12", "VitA", "VitE", "VitD"];
  const GRUPOS_R24 = [["Lácteos", ["Lácteos altos en grasa", "Lácteos medios en grasa", "Lácteos bajos en grasa", "Lácteos procesados (altos en CHO)"], "lácteos"],
    ["Verduras", ["Verduras en general", "Verduras libre consumo"], "verduras"], ["Frutas", ["Frutas"], "frutas"],
    ["Cereales, papas y pan", ["Cereales, papas y leguminosas frescas", "Cereales procesados bajos en grasa", "Cereales procesados altos en grasa"], "cereales, papas y pan"],
    ["Carnes, pescados y huevos", ["Carnes altas en grasa", "Carnes bajas en grasa"], "carnes, pescados y huevos"], ["Leguminosas", ["Leguminosas secas"], "leguminosas"],
    ["Aceites y ricos en lípidos", ["Aceites y grasas", "Alimentos ricos en lípidos"], null], ["Azúcares y procesados dulces", ["Azúcares", "Azúcares procesados (helados)", "Azúcares procesados (chocolates y masas dulces)"], null],
    ["Bebidas alcohólicas", ["Bebidas alcohólicas altas en CHO", "Bebidas alcohólicas medias en CHO"], null]];
  const N_R24 = 30, N_DET = 40;
  const pad2 = (i) => (i < 10 ? "0" : "") + i;
  let MED_IDX = null, CARHE_IDX = null;
  const lc = (s) => String(s).toLowerCase();

  // R24 detallado: se calcula antes de los requerimientos porque su total llena la ingesta de nutrientes críticos
  function r24Detallado(D, R, T) {
    const ch = T && T.carhe;
    if (ch && (!CARHE_IDX || CARHE_IDX.src !== ch)) { CARHE_IDX = new Map(); CARHE_IDX.src = ch; ch.a.forEach((r, i) => { const k = lc(r[0]); if (!CARHE_IDX.has(k)) CARHE_IDX.set(k, i); }); }
    const filas = [], tot = DET_KEYS.map(() => 0);
    let pendiente = false;
    for (let i = 0; i < N_DET; i++) {
      const p = "rc_" + pad2(i) + "_", alim = S(D[p + "alim"]), n = D[p + "n"], g = D[p + "g"], tiempo = S(D[p + "tiempo"]);
      if (alim === "" && tiempo === "" && vacio(n) && vacio(g)) continue;
      const f = { i, tiempo, alim, grupo: S(D[p + "grupo"]), hora: S(D[p + "hora"]), prep: S(D[p + "prep"]), fila: "" };
      if (alim !== "") { if (!ch) pendiente = true; else { const x = CARHE_IDX.get(lc(alim)); if (x !== undefined) f.fila = x; } }
      if (f.fila !== "") {
        const r = ch.a[f.fila];
        f.medida = r[3]; f.gmed = r[4]; f.si = vacio(r[5]) ? 0 : String(r[5]); f.grpR24 = r[2]; // INDEX de celda vacía = 0, como en Excel
        f.g = !vacio(g) ? +g : !vacio(n) ? (isNum(+n) ? n * r[4] : "") : "";
        if (f.g !== "" && isNum(f.g)) { f.nut = r[6].map((v) => f.g / 100 * (isNum(v) ? v : 0)); f.nut.forEach((v, k) => (tot[k] += v)); }
      }
      filas.push(f);
    }
    R.R24D = { filas, pendiente, tot, porFila: Object.fromEntries(filas.map((f) => [f.i, f])) };
    DET_KEYS.forEach((k, j) => (R["Det24_" + k] = tot[j]));
  }

  function r24(D, R, T) {
    const t4 = T && T.t4;
    if (t4 && (!MED_IDX || MED_IDX.src !== t4)) { MED_IDX = new Map(); MED_IDX.src = t4; t4.med.forEach((m) => { if (!MED_IDX.has(lc(m[0]))) MED_IDX.set(lc(m[0]), m); }); }
    const filas = [];
    let sL = 0, sM = 0, sN = 0, sO = 0;
    for (let i = 0; i < N_R24; i++) {
      const p = "r24_" + pad2(i) + "_", alim = S(D[p + "alim"]), tiempo = S(D[p + "tiempo"]), AS = D[p + "n"], AT = D[p + "g"];
      if (alim === "" && tiempo === "" && vacio(AS) && vacio(AT)) continue;
      const f = { i, tiempo, alim, hora: S(D[p + "hora"]), prep: S(D[p + "prep"]), medida: "", gpor: "", grupo: "", porc: "", g: "", kcal: "", prot: "", lip: "", cho: "" };
      if (alim !== "" && t4) {
        const m = MED_IDX.get(lc(alim));
        if (m) { f.medida = m[2] ?? ""; f.gpor = m[3] ?? ""; f.grupo = m[1] ?? ""; }
        const otro = alim.slice(0, 4) === "Otro";
        if (!vacio(AT) && !otro) f.porc = isNum(f.gpor) && f.gpor !== 0 ? AT / f.gpor : "";
        else f.porc = !vacio(AS) ? +AS : "";
        if (f.porc !== "") {
          f.g = !vacio(AT) ? +AT : otro ? "" : (isNum(f.gpor) ? f.porc * f.gpor : "");
          const it = t4.int[f.grupo];
          if (it) { f.kcal = f.porc * it.kcal; f.prot = f.porc * it.prot; f.lip = f.porc * it.lip; f.cho = f.porc * it.cho; sL += f.kcal; sM += f.prot; sN += f.lip; sO += f.cho; }
        }
      }
      filas.push(f);
    }
    const Q = R.R24 = { filas, porFila: Object.fromEntries(filas.map((f) => [f.i, f])), int: { kcal: sL, prot: sM, lip: sN, cho: sO } };
    R.Rec24_Kcal = sL + (R.Det24_Kcal || 0); R.Rec24_Prot = sM + (R.Det24_Prot || 0); R.Rec24_Lip = sN + (R.Det24_Lip || 0); R.Rec24_CHO = sO + (R.Det24_CHO || 0);
    const cls = (d) => !isNum(d) ? "—" : d < 90 ? "Insuficiencia" : d <= 110 ? "Suficiencia" : "Exceso";
    const adec = (ing, req) => ing === 0 ? "—" : isNum(req) && req !== 0 ? ing / req * 100 : "—";
    Q.req = { kcal: isNum(R.GET_Final) ? R.GET_Final : "", prot: isNum(R.Prot_g) ? R.Prot_g : "", lip: isNum(R.Lip_g) ? R.Lip_g : "", cho: isNum(R.CHO_g) ? R.CHO_g : "" };
    R.Adec24_Energia = adec(R.Rec24_Kcal, R.GET_Final); R.Cls24_Energia = cls(R.Adec24_Energia);
    R.Adec24_Prot = adec(R.Rec24_Prot, R.Prot_g); R.Cls24_Prot = cls(R.Adec24_Prot);
    R.Adec24_Lip = adec(R.Rec24_Lip, R.Lip_g); R.Cls24_Lip = cls(R.Adec24_Lip);
    R.Adec24_CHO = adec(R.Rec24_CHO, R.CHO_g); R.Cls24_CHO = cls(R.Adec24_CHO);
    // distribución por tiempo de comida (cuenta filas con ese tiempo, como COUNTIF)
    const det = (R.R24D && R.R24D.filas) || [];
    Q.tiempos = TIEMPOS.map((t) => {
      const kc = filas.filter((f) => lc(f.tiempo) === lc(t)).reduce((a, f) => a + (isNum(f.kcal) ? f.kcal : 0), 0) + det.filter((f) => lc(f.tiempo) === lc(t)).reduce((a, f) => a + (f.nut ? f.nut[0] : 0), 0);
      const n = filas.filter((f) => lc(f.tiempo) === lc(t)).length + det.filter((f) => lc(f.tiempo) === lc(t)).length;
      return { t, kcal: kc, pct: R.Rec24_Kcal === 0 ? "—" : kc / R.Rec24_Kcal * 100, n };
    });
    R.Rec24_NTiempos = Q.tiempos.filter((x) => x.n > 0).length;
    Q.grupos = GRUPOS_R24.map(([n, gs, txt]) => {
      const porc = filas.filter((f) => gs.includes(f.grupo)).reduce((a, f) => a + (isNum(f.porc) ? f.porc : 0), 0);
      const nd = det.filter((f) => lc(f.grpR24 || "") === lc(n)).length;
      return { n, porc, nd, estado: porc > 0 || nd > 0 ? "Presente" : "Ausente", txt };
    });
    const aus = Q.grupos.filter((x) => x.txt && x.estado === "Ausente").map((x) => x.txt);
    R.Rec24_Ausentes = R.Rec24_Kcal === 0 ? "" : aus.length ? aus.join(", ") : "ninguno";
    // análisis cualitativo
    const q = (k) => S(D["r24_q_" + k]);
    const Qh = q("horarios"), Qd = q("desayuno"), Qu = q("ultra"), Qb = q("bebidas"), Qs = q("sal"), Qp = q("pantallas"), Qa = D.r24_q_agua;
    const TXT0 = (v) => isNum(v) ? String(xround(v, 0)) : String(v);
    const numTxt = (v) => isNum(v) ? String(+v.toPrecision(15)).replace(".", ",") : S(v);
    R.Rec24_Conclusion = (R.Rec24_Kcal === 0 ? "Recordatorio sin datos." : "Recordatorio de 24 h con " + R.Rec24_NTiempos + " tiempos de comida. Aporte de energía con " + lc(R.Cls24_Energia) + " (" + TXT0(R.Adec24_Energia) +
      " %), proteínas con " + lc(R.Cls24_Prot) + " (" + TXT0(R.Adec24_Prot) + " %), lípidos con " + lc(R.Cls24_Lip) + " (" + TXT0(R.Adec24_Lip) + " %) e hidratos de carbono con " + lc(R.Cls24_CHO) + " (" + TXT0(R.Adec24_CHO) +
      " %). Grupos ausentes: " + R.Rec24_Ausentes + ".")
      + (Qu === "Frecuente (1-4 veces/semana)" || Qu === "Diario" ? " Consumo " + (Qu === "Diario" ? "diario" : "frecuente") + " de ultraprocesados." : "")
      + (Qb === "Frecuente (1-4 veces/semana)" || Qb === "Diario" ? " Consumo " + (Qb === "Diario" ? "diario" : "frecuente") + " de bebidas azucaradas." : "")
      + (Qs === "Sí" ? " Agrega sal a las comidas." : "") + (Qd === "No" ? " No desayuna." : "") + (Qh === "No" ? " Horarios irregulares." : "") + (Qp === "Sí" ? " Come frente a pantallas." : "")
      + (!vacio(Qa) ? " Agua: " + numTxt(Qa) + " vasos/día." : "");
    // fragmento del DNI (hoja DNI B9-B11): diagnóstico alimentario
    const ex = [["proteínas", R.Cls24_Prot], ["lípidos", R.Cls24_Lip], ["hidratos de carbono", R.Cls24_CHO]];
    const b9 = ex.filter(([, c]) => c === "Exceso").map(([n]) => n).join(", "), b10 = ex.filter(([, c]) => c === "Insuficiencia").map(([n]) => n).join(", ");
    R.DNI_ExcesoMacros = b9 ? b9 + ", " : ""; R.DNI_InsufMacros = b10 ? b10 + ", " : "";
    R.DNI_Alim = R.Rec24_Kcal === 0 || !isNum(R.Adec24_Energia) ? "" : ", con " + (R.Cls24_Energia === "Exceso" ? "exceso alimentario" : R.Cls24_Energia === "Suficiencia" ? "suficiencia alimentaria" : "insuficiencia alimentaria")
      + (!b9 && !b10 ? "" : " (" + (b9 ? "exceso de " + b9 : "") + (b9 && b10 ? "; " : "") + (b10 ? "insuficiencia de " + b10 : "") + ")");
  }

  // =====================================================================
  // ETAPA 5 — réplica de LABORATORIO, PRESION_ARTERIAL, RIESGO_CV y FUNCIONALIDAD_AM (Planilla_Nutricional)
  // Tablas: data/tablas5.json (TAB_PA_NNA, TAB_FRAMINGHAM, TAB_EMPAM)
  // =====================================================================
  const LAB = [["hb", "Hemoglobina", "g/dL"], ["hto", "Hematocrito", "%"], ["vcm", "VCM", "fl"], ["hcm", "HCM", "pg"], ["ferr", "Ferritina", "ng/mL"], ["fe", "Hierro sérico", "µg/dL"],
    ["glic", "Glicemia en ayunas", "mg/dL"], ["ptgo", "Glicemia 2 h post carga (PTGO)", "mg/dL"], ["hba1c", "Hemoglobina glicosilada (HbA1c)", "%"], ["insul", "Insulina en ayunas ⚠", "µUI/mL"],
    ["ct", "Colesterol total", "mg/dL"], ["hdl", "Colesterol HDL", "mg/dL"], ["ldl", "Colesterol LDL (vacío = Friedewald)", "mg/dL"], ["tg", "Triglicéridos", "mg/dL"], ["creat", "Creatinina", "mg/dL"],
    ["rac", "Razón albúmina/creatinina (RAC)", "mg/g"], ["bun", "Nitrógeno ureico (BUN)", "mg/dL"], ["au", "Ácido úrico", "mg/dL"], ["alb", "Albúmina", "g/dL"], ["prealb", "Prealbúmina", "mg/dL"],
    ["prott", "Proteínas totales", "g/dL"], ["tsh", "TSH", "µUI/mL"], ["t4l", "T4 libre", "ng/dL"], ["vitd", "Vitamina D (25-OH)", "ng/mL"], ["b12", "Vitamina B12", "pg/mL"], ["got", "GOT / AST", "U/L"], ["gpt", "GPT / ALT", "U/L"]];
  const numD = (v) => (vacio(v) ? "" : isNum(v) ? v : isFinite(+v) ? +v : "");
  const minmax = (v, mn, mx) => v === "" ? "Sin dato" : (isNum(mn) && v < mn) ? "Bajo" : (isNum(mx) && v > mx) ? "Alto" : "Normal";

  function laboratorio(D, R, T) {
    const gest = !!R.Embarazada, t7 = (T && T.t7) || null;
    const C = R.Ciclo, nna = C === "NNA" && !gest, sx = R.SexoC, F = sx === "F", M = sx === "M", em = R.Edad_Meses, ea = R.Edad_Anios;
    const fn = parseFecha(D.fnac), fe = parseFecha(D.feval), dias = fn && fe ? Math.round((fe.t - fn.t) / 86400000) : NaN;
    const LTe = (n) => LT(em, n), LTa = (n) => LT(ea, n);
    const v = {}; for (const [k] of LAB) v[k] = numD(D["lab_" + k]);
    const rg = {}, cls = {};
    const nnaRango = (arr) => { // arr: [≤3 días, <1m, <2m, <6m, <9m, <12m, <3a, <6a, <9a, <12a, M adolescente, F adolescente]
      if (dias <= 3) return arr[0]; if (LTe(1)) return arr[1]; if (LTe(2)) return arr[2]; if (LTe(6)) return arr[3]; if (LTe(9)) return arr[4]; if (LTe(12)) return arr[5];
      if (LTa(3)) return arr[6]; if (LTa(6)) return arr[7]; if (LTa(9)) return arr[8]; if (LTa(12)) return arr[9]; return M ? arr[10] : arr[11]; };
    const ok = C !== "" || true;
    rg.hb = nna ? [nnaRango([14.5, 13.4, 10.7, 9.4, 11.1, 11.4, 10.7, 10.9, 11, 11.4, 12, 11.5]), nnaRango([22.5, 19.8, 17.1, 13, 14.1, 14, 13.8, 14.4, 14.3, 14.8, 16, 15])] : [F ? 12 : 14, F ? 16 : 18];
    rg.hto = nna ? [nnaRango([45, 41, 33, 28, 31, 32, 32, 32, 33, 34, 35, 34]), nnaRango([67, 65, 55, 42, 41, 40, 40, 42, 41, 43, 45, 44])] : [F ? 37 : 42, F ? 47 : 50];
    rg.vcm = nna ? [nnaRango([95, 88, 91, 84, 68, 70, 71, 73, 74, 76, 77, 73]), nnaRango([121, 122.6, 111.6, 105.6, 84.6, 85.4, 88, 91, 92, 94, 94, 95])] : [80, 95];
    rg.hcm = [27, 31];
    rg.ferr = nna ? [LTe(1) ? 25 : LTe(2) ? 200 : LTe(6) ? 50 : LTa(16) ? 7 : 15, LTe(1) ? 200 : LTe(2) ? 600 : LTe(6) ? 200 : LTa(16) ? 140 : 200] : [F ? 10 : 12, F ? 150 : 300];
    rg.fe = nna ? [LTe(1) ? 100 : LTe(24) ? 40 : 50, LTe(1) ? 250 : LTe(24) ? 100 : 120] : [50, 150];
    const dm = S(D.ant_dm2) === "Sí";
    R.Meta_HbA1c = ea === "" ? 7 : ea >= 80 ? 8 : 7;
    rg.glic = [70, dm ? 130 : 99]; rg.ptgo = ["", 139]; rg.hba1c = ["", dm ? R.Meta_HbA1c : 6]; rg.insul = [2, 25];
    rg.ct = ["", nna ? 169 : 199]; rg.hdl = [nna ? 45 : F ? 50 : 40, ""]; rg.ldl = ["", nna ? 109 : 99]; rg.tg = ["", nna ? (LTa(10) ? 74 : 89) : 149];
    rg.creat = nna ? [LTe(1) ? 0.3 : LTe(24) ? 0.2 : LTa(10) ? 0.3 : 0.5, LTe(1) ? 1 : LTe(24) ? 0.4 : LTa(10) ? 0.7 : 1.1] : [F ? 0.5 : 0.6, F ? 1.1 : 1.2];
    rg.rac = ["", 29]; rg.bun = nna ? [LTe(1) ? 3 : 5, LTe(1) ? 12 : 18] : [10, 20];
    rg.au = nna ? [LTe(1) ? 2 : 3.5, LTe(1) ? 6.2 : 7] : [F ? 2.7 : 4, F ? 7.3 : 8.5];
    rg.alb = nna ? [LTe(1) ? 2.5 : LTa(5) ? 3.9 : 4, LTe(1) ? 3.4 : LTa(5) ? 5 : 5.3] : [3.5, 5.5];
    rg.prealb = [10, 40]; rg.prott = nna ? [LTe(1) ? 4.6 : LTe(12) ? 6.1 : 6.4, LTe(1) ? 7.4 : LTe(12) ? 7.9 : 8.1] : [6.4, 8.3];
    rg.tsh = [0.5, 4]; rg.t4l = [0.8, 1.8]; rg.vitd = [30, 60]; rg.b12 = [200, 800];
    rg.got = nna ? [LTe(1) ? 0 : 10, LTe(1) ? 90 : 50] : [0, 35]; rg.gpt = [nna ? 5 : 4, nna ? 45 : 36];
    // Gestante: rangos de la Guía Perinatal 2015 (Anexo 2, unidades corregidas); los exámenes «sin cambios» usan el rango de adulto
    if (gest && t7) { for (const k in t7.lab) rg[k] = t7.lab[k]; rg.fe = ["", ""]; }
    for (const [k] of LAB) cls[k] = minmax(v[k], rg[k][0], rg[k][1]);
    const g = v.glic, p = v.ptgo, a = v.hba1c, ct = v.ct, hdl = v.hdl, tg = v.tg, alb = v.alb;
    cls.glic = g === "" ? "Sin dato" : dm ? (g >= 70 && g <= 130 ? "En meta (70-130)" : "Fuera de meta (70-130)") : g < 70 ? "Bajo" : g < 100 ? "Normal" : g < 126 ? "Alterada (GAA 100-125)" : "Sugerente de DM (≥ 126)";
    cls.ptgo = p === "" ? "Sin dato" : p < 140 ? "Normal" : p < 200 ? "ITG (140-199)" : "Sugerente de DM (≥ 200)";
    cls.hba1c = a === "" ? "Sin dato" : dm ? (a < R.Meta_HbA1c ? "En meta (< " + R.Meta_HbA1c + " %)" : "Fuera de meta (≥ " + R.Meta_HbA1c + " %)") : a <= 6 ? "Normal" : a < 6.5 ? "Sobre rango normal (6,1-6,4)" : "Sugerente de DM (≥ 6,5 %)";
    cls.ct = ct === "" ? "Sin dato" : nna ? (ct < 170 ? "Aceptable" : ct < 200 ? "Limítrofe" : "Alto") : ct < 200 ? "Deseable" : ct < 240 ? "Límite alto (200-239)" : "Muy alto (≥ 240)";
    cls.hdl = hdl === "" ? "Sin dato" : nna ? (hdl < 35 ? "Bajo" : hdl <= 45 ? "Limítrofe" : "Normal") : hdl < (F ? 50 : 40) ? "Bajo" : "Normal";
    cls.ldl = "(ver LDL usado)";
    cls.tg = tg === "" ? "Sin dato" : nna ? (tg < (LTa(10) ? 75 : 90) ? "Aceptable" : tg < (LTa(10) ? 100 : 130) ? "Limítrofe" : "Alto") : tg < 150 ? "Normal" : "Alto (≥ 150)";
    cls.rac = v.rac === "" ? "Sin dato" : v.rac < 30 ? "A1 (normal o levemente elevada)" : v.rac <= 300 ? "A2 (moderadamente elevada)" : "A3 (gravemente elevada)";
    cls.alb = alb === "" ? "Sin dato" : nna ? (alb < rg.alb[0] ? "Bajo" : alb > rg.alb[1] ? "Alto" : "Normal") : alb < 2.5 ? "Bajo – desnutrición proteica visceral severa" : alb < 3 ? "Bajo – desnutrición proteica visceral moderada" : alb < 3.5 ? "Bajo – desnutrición proteica visceral leve" : alb > rg.alb[1] ? "Alto" : "Normal";
    if (gest) {
      const sg = R.SG, t1 = isNum(sg) && sg < 14;
      cls.glic = g === "" ? "Sin dato" : g < 70 ? "Bajo" : g <= 100 ? "Normal" : t1 ? (g < 126 ? "Sugerente de DG precoz (> 100 y < 126)" : "Alterada (≥ 126) ⚠ evaluar") : "Sugerente de DG (> 100)";
      cls.ptgo = p === "" ? "Sin dato" : p <= 140 ? "Normal" : "Sugerente de DG (> 140)";
      cls.ct = ct === "" ? "Sin dato" : minmax(ct, rg.ct[0], rg.ct[1]);
      cls.tg = tg === "" ? "Sin dato" : minmax(tg, rg.tg[0], rg.tg[1]);
      cls.alb = alb === "" ? "Sin dato" : minmax(alb, rg.alb[0], rg.alb[1]);
      cls.fe = v.fe === "" ? "Sin dato" : "Referencia 90 µg/dL";
    }
    cls.vitd = v.vitd === "" ? "Sin dato" : v.vitd < 30 ? "Bajo (< 30)" : v.vitd <= 60 ? "Normal (30-60)" : "Alto (> 60)";
    R.LAB = LAB.map(([k, n, u]) => ({ k, n, u, v: v[k], min: rg[k][0], max: rg[k][1], cls: cls[k] }));
    // Exámenes propios de la gestante (Guía Perinatal 2015, Anexo 2)
    R.LABG = !gest || !t7 ? [] : t7.labg.map(([k, n, u, mn, mx, nota]) => { const x = numD(D["lab_" + k]); return { k, n, u, v: x, min: mn, max: mx, nota, cls: k === "eritro" ? (x === "" ? "Sin dato" : "Referencia 4,0") : minmax(x, mn, mx) }; });
    // valores derivados
    R.Lab_LDL = v.ldl !== "" ? v.ldl : (isNum(ct) && isNum(hdl) && isNum(tg)) ? (tg < 400 ? ct - hdl - tg / 5 : "TG ≥ 400: no calcular") : "";
    R.Lab_LDL_Cls = !isNum(R.Lab_LDL) ? "Sin dato" : nna ? (R.Lab_LDL < 110 ? "Aceptable" : R.Lab_LDL < 130 ? "Limítrofe" : "Alto") : R.Lab_LDL < 100 ? "Óptimo" : R.Lab_LDL < 130 ? "Cerca del óptimo (100-129)" : R.Lab_LDL < 160 ? "Límite alto (130-159)" : R.Lab_LDL < 190 ? "Alto (160-189)" : "Muy alto (≥ 190)";
    R.Lab_NoHDL = isNum(ct) && isNum(hdl) ? ct - hdl : "";
    R.Lab_NoHDL_Cls = !isNum(R.Lab_NoHDL) ? "Sin dato" : R.Lab_NoHDL < (nna ? 120 : 130) ? "Normal ⚠" : "Alto ⚠";
    R.Lab_VLDL = isNum(tg) ? tg / 5 : ""; R.Lab_VLDL_Cls = !isNum(R.Lab_VLDL) ? "Sin dato" : R.Lab_VLDL < 32 ? "Normal" : "Alto (≥ 32)";
    R.HOMA_Corte = 2.5;
    R.Lab_HOMA = isNum(g) && isNum(v.insul) ? g * v.insul / 405 : "";
    R.Lab_HOMA_Cls = !isNum(R.Lab_HOMA) ? "Sin dato" : R.Lab_HOMA >= R.HOMA_Corte ? "Sugerente de resistencia a la insulina" : "Normal";
    const cr = v.creat;
    R.Lab_VFG = cr === "" || ea === "" ? "" : ea < 18 ? (R.Talla_cm === "" || !isNum(R.Talla_cm) ? "" : 0.413 * R.Talla_cm / cr)
      : 142 * Math.pow(Math.min(cr / (F ? 0.7 : 0.9), 1), F ? -0.241 : -0.302) * Math.pow(Math.max(cr / (F ? 0.7 : 0.9), 1), -1.2) * Math.pow(0.9938, ea) * (F ? 1.012 : 1);
    if (!isNum(R.Lab_VFG)) R.Lab_VFG = "";
    R.Lab_EtapaG = !isNum(R.Lab_VFG) ? "Sin dato" : R.Lab_VFG >= 90 ? "G1" : R.Lab_VFG >= 60 ? "G2" : R.Lab_VFG >= 45 ? "G3a" : R.Lab_VFG >= 30 ? "G3b" : R.Lab_VFG >= 15 ? "G4" : "G5";
    R.Lab_EtapaG_Cls = R.Lab_EtapaG === "Sin dato" ? "Sin dato" : (R.Lab_EtapaG === "G1" || R.Lab_EtapaG === "G2") ? "Normal / levemente disminuida" : R.Lab_EtapaG + " (disminuida)";
    R.Lab_DPV = nna || C === "" || !isNum(alb) ? "" : alb < 2.5 ? "severa" : alb < 3 ? "moderada" : alb < 3.5 ? "leve" : "";
    // ODIN de laboratorio (Consenso p. 21)
    const lc4 = (k) => cls[k].slice(0, 4).toLowerCase();
    const sr = (t, x) => t.indexOf(x) >= 0;
    let o = "";
    if (lc4("hb") === "bajo") o += "sugerente de anemia, ";
    if (lc4("ferr") === "bajo") o += "sugerente de déficit de hierro, ";
    if (gest && (sr(cls.glic, "DG") || sr(cls.ptgo, "DG"))) o += "sugerente de diabetes gestacional, ";
    if (gest) for (const x of R.LABG) if (x.cls === "Alto" || x.cls === "Bajo") o += lower(x.n) + " " + (x.cls === "Alto" ? "aumentado" : "disminuido") + ", ";
    if (!dm && !gest) { if (sr(cls.glic, "DM (") || sr(cls.hba1c, "DM (") || sr(cls.ptgo, "DM (")) o += "sugerente de diabetes mellitus, "; else if (sr(cls.glic, "GAA") || sr(cls.ptgo, "ITG")) o += "sugerente de prediabetes, "; }
    if (isNum(R.Lab_HOMA) && R.Lab_HOMA >= R.HOMA_Corte) o += "sugerente de resistencia a la insulina, ";
    if (S(D.ant_dlp) !== "Sí" && (sr(cls.ct.toLowerCase(), "alto") || sr(cls.hdl.toLowerCase(), "bajo") || sr(cls.tg.toLowerCase(), "alto") || (isNum(R.Lab_LDL) && R.Lab_LDL >= (nna ? 130 : 160)))) o += "sugerente de dislipidemia, ";
    if (S(D.ant_erc) !== "Sí" && ((isNum(R.Lab_VFG) && R.Lab_VFG < 60) || (isNum(v.rac) && v.rac >= 30))) o += "sugerente de enfermedad renal crónica, ";
    if (isNum(v.vitd) && v.vitd < 30) o += "sugerente de déficit de vitamina D, ";
    if (lc4("b12") === "bajo") o += "sugerente de déficit de vitamina B12, ";
    if (lc4("tsh") === "alto") o += "sugerente de hipotiroidismo, "; else if (lc4("tsh") === "bajo") o += "sugerente de hipertiroidismo, ";
    if (lc4("au") === "alto") o += "hiperuricemia, ";
    if (nna && lc4("alb") === "bajo") o += "hipoalbuminemia, ";
    R.Lab_ODIN_Raw = o; R.Lab_ODIN = o.length ? o.slice(0, -2) : "";
    R.LABV = v;
  }

  function presionArterial(D, R, T) {
    const t5 = T && T.t5, C = R.Ciclo, ea = R.Edad_Anios, sx = R.SexoC, Tc = R.Talla_cm;
    const PAS = numD(D.pa_pas), PAD = numD(D.pa_pad);
    R.PAS = PAS; R.PAD = PAD;
    const P = R.PA = { filas: [] };
    for (const [comp, val, lims] of [["PAS", PAS, [120, 130, 140]], ["PAD", PAD, [80, 80, 90]]]) {
      const f = { comp, fila: "", col: "", talla: "", p90: "", p95: "", p95x: "", h: "", i: "", j: "", nivel: "" };
      if (C === "NNA" && GE(ea, 1) && isNum(ea) && ea <= 17 && t5) {
        const ix = t5.pa.key.indexOf(comp + "|" + sx + "|" + ea);
        if (ix >= 0) {
          f.fila = ix + 1; const row = t5.pa.tallas[ix];
          let L = 1; if (isNum(Tc)) { let m = 0; row.forEach((x, j) => { if (x <= Tc) m = j + 1; }); L = m || 1; } else L = "";
          if (L !== "") {
            f.col = L < 7 && Math.abs(Tc - row[L]) < Math.abs(Tc - row[L - 1]) ? L + 1 : L;
            f.talla = row[f.col - 1]; f.p90 = t5.pa.p90[ix][f.col - 1]; f.p95 = t5.pa.p95[ix][f.col - 1]; f.p95x = t5.pa.p95x[ix][f.col - 1];
            f.h = Math.min(f.p90, lims[0]); f.i = Math.min(f.p95, lims[1]); f.j = Math.min(f.p95x, lims[2]);
            f.nivel = val === "" ? "" : val >= f.j ? 3 : val >= f.i ? 2 : val >= f.h ? 1 : 0;
          } else { f.col = ""; }
        }
      }
      P.filas.push(f);
    }
    R.PA_p90_PAS = P.filas[0].p90; R.PA_p95_PAS = P.filas[0].p95;
    const nivel = (() => {
      if (C !== "NNA" || PAS === "" || PAD === "" || LT(ea, 1)) return "";
      if (ea < 13) { const a = P.filas[0].nivel, b = P.filas[1].nivel; const ns = [a, b].filter(isNum); return ns.length ? Math.max(...ns) : (a === "" && b === "" ? "" : 0); }
      return Math.max(PAS >= 140 ? 3 : PAS >= 130 ? 2 : PAS >= 120 ? 1 : 0, PAD >= 90 ? 3 : PAD >= 80 ? 2 : 0);
    })();
    R.PA_NivelNNA = nivel;
    const riesgo = S(D.ant_dm2) === "Sí" || S(D.ant_erc) === "Sí" || S(D.ant_ecv) === "Sí";
    R.PA_Meta = C === "NNA" ? "No aplica" : GE(ea, 80) ? "< 150/90 (y > 120/60)" : riesgo ? "< 130/80" : "< 140/90";
    R.PA_MetaS = GE(ea, 80) ? 150 : riesgo ? 130 : 140; R.PA_MetaD = GE(ea, 80) ? 90 : riesgo ? 80 : 90;
    R.PA_Clasificacion = PAS === "" || PAD === "" ? "Sin dato" : C === "NNA" ? (LT(ea, 1) ? "No aplica (< 1 año)" : nivel === "" ? "Sin dato" : ["Normal", "Presión arterial elevada", "HTA etapa 1", "HTA etapa 2"][nivel])
      : S(D.ant_hta) === "Sí" ? (PAS < R.PA_MetaS && PAD < R.PA_MetaD ? "HTA compensada (en meta)" : "HTA no compensada (fuera de meta)")
      : (PAS >= 180 || PAD >= 110) ? "HTA (PA ≥ 180/110)" : (PAS >= 140 || PAD >= 90) ? "PA elevada ≥ 140/90: sospecha de HTA (realizar perfil)" : PLANILLA ? ((PAS >= 120 || PAD >= 80) ? "Pre-hipertensión (120-139/80-89)" : "Normal")
      : (PAS >= 130 || PAD >= 85) ? "Pre-hipertensión (130-139/85-89)" : "Normal"; // decisión docente 07-11-2026: pre-HTA desde 130/85
    const pc = R.PA_Clasificacion;
    R.PA_Conducta = pc === "Sin dato" ? "" : C === "NNA" ? (pc === "Normal" ? "Control según calendario" : "Repetir 2 mediciones (≥ 3 min entre tomas), promediar; si persiste, derivar a médico (Clase 4 p. 45)")
      : pc.toLowerCase().includes("sospecha") ? "Perfil de PA y derivación a médico (Clase 7 p. 18)" : pc.toLowerCase().includes("pre-hiper") ? "Cambios en el estilo de vida (Clase 7 p. 18)"
      : pc.toLowerCase().includes("no compensada") ? "Intensificar tratamiento según Vía Clínica HTA (HEARTS)" : "Mantener control";
  }

  function riesgoCV(D, R, T) {
    const t5 = T && T.t5, C = R.Ciclo, ea = R.Edad_Anios, sx = R.SexoC, si = (k) => S(D[k]) === "Sí";
    const RC = R.RCV = {};
    RC.ecv = si("ant_ecv") ? "Sí" : "No"; RC.dm = si("ant_dm2") ? "Sí" : "No";
    const et = S(D.ant_erc_etapa);
    RC.erc = (si("ant_erc") && ["G3b", "G4", "G5", "Diálisis"].includes(et)) || (isNum(R.LABV.rac) && R.LABV.rac >= 30) || (isNum(R.Lab_VFG) && R.Lab_VFG < 45) ? "Sí" : "No";
    RC.htaref = si("ant_htaref") ? "Sí" : "No"; RC.dlpsev = isNum(R.Lab_LDL) && R.Lab_LDL > 190 ? "Sí" : "No";
    R.RCV_AltoDirecto = [RC.ecv, RC.dm, RC.erc, RC.htaref, RC.dlpsev].includes("Sí") ? "Sí" : "No";
    RC.aplica = C === "" || ea === "" || sx === "" ? "Falta dato" : "Sí";
    RC.tramo = RC.aplica !== "Sí" ? "—" : ea < 45 ? 35 : ea < 55 ? 45 : ea < 65 ? 55 : 65;
    RC.fuma = R.Tabaco === "Sí" ? 1 : 0;
    const PAS = R.PAS, PAD = R.PAD;
    RC.filaPA = PAS === "" || PAD === "" ? "Falta PA" : Math.min(PAS >= 160 ? 1 : PAS >= 140 ? 2 : PAS >= 130 ? 3 : PAS >= 120 ? 4 : 5, PAD >= 100 ? 1 : PAD >= 90 ? 2 : PAD >= 85 ? 3 : PAD >= 80 ? 4 : 5);
    const ct = R.LABV.ct, hdl = R.LABV.hdl;
    RC.colCT = !isNum(ct) ? "Falta CT" : ct < 160 ? 1 : ct < 200 ? 2 : ct < 240 ? 3 : ct < 280 ? 4 : 5;
    RC.tabla = (() => { if (RC.aplica !== "Sí" || !t5 || !isNum(RC.filaPA) || !isNum(RC.colCT)) return "—"; const ix = t5.fra.key.indexOf(sx + "|" + RC.fuma + "|" + RC.tramo + "|" + RC.filaPA); return ix < 0 ? "—" : t5.fra.val[ix][RC.colCT - 1] ?? "—"; })();
    RC.fHDL = !isNum(hdl) ? 1 : hdl < 35 ? 1.5 : hdl >= 60 ? 0.5 : 1;
    R.RCV_Pct = isNum(RC.tabla) ? RC.tabla * RC.fHDL : "—";
    RC.cat = !isNum(R.RCV_Pct) ? "—" : R.RCV_Pct >= 10 ? "Alto" : R.RCV_Pct >= 5 ? "Moderado" : "Bajo";
    R.RCV_NotaEdad = RC.aplica !== "Sí" ? "" : C === "NNA" ? "⚠ NNA: tabla validada en 35-74 años; se aplica por indicación docente homologando a 35-44 años (como en adultos < 35 a). Interpretar con criterio clínico."
      : ea < 35 ? "Adulto < 35 años: riesgo homologado al de 35-44 años (Enfoque 2014 p. 23 y 50)." : ea < 75 ? "Edad dentro del rango de la tabla (35-74 años)."
      : ea < 80 ? "75-79 años: homologado a 65-74 años tras excluir criterios de alto riesgo (Enfoque 2014 p. 50)." : "⚠ ≥ 80 años: el Enfoque 2014 (p. 50) indica clasificar por criterio clínico; aquí se extrapola el tramo 65-74 años.";
    // síndrome metabólico
    const cc = numD(D.cc), tg = R.LABV.tg, gl = R.LABV.glic;
    RC.sm = [C === "NNA" ? (R.Riesgo_CC === "Obesidad abdominal" ? 1 : 0) : (isNum(cc) ? (cc >= (sx === "M" ? 90 : 80) ? 1 : 0) : 0),
      (si("ant_trathta") || (isNum(PAS) && PAS >= 130) || (isNum(PAD) && PAD >= 85)) ? 1 : 0, (si("ant_tratlip") || (isNum(tg) && tg >= 150)) ? 1 : 0,
      (isNum(hdl) && hdl < ((sx === "M" || (C === "NNA" && LT(ea, 16))) ? 40 : 50)) ? 1 : 0, (si("ant_dm2") || (isNum(gl) && gl >= 100)) ? 1 : 0];
    const s4 = RC.sm.slice(1).reduce((a, b) => a + b, 0), s5 = s4 + RC.sm[0];
    R.SindMet = C === "NNA" && LT(ea, 10) ? "No se diagnostica (< 10 años)" : C === "NNA" && LT(ea, 16) ? (RC.sm[0] === 1 && s4 >= 2 ? "Sí" : "No") + " (IDF 2007: CC ≥ p90 + " + s4 + " criterios)"
      : s5 >= 3 ? "Sí (" + s5 + " criterios)" : "No (" + s5 + " criterios)";
    RC.famecv = si("ant_famecv") ? "Sí" : "No";
    RC.sube = R.SindMet.slice(0, 2) === "Sí" || RC.famecv === "Sí" ? "Sí" : "No";
    R.RCV_Cat = C === "" ? "Falta dato" : R.RCV_AltoDirecto === "Sí" ? "Alto" : RC.aplica !== "Sí" ? "Falta dato" : RC.cat === "—" ? "Falta dato (CT y PA)" : RC.sube === "Sí" ? (RC.cat === "Bajo" ? "Moderado" : "Alto") : RC.cat;
    const cat = R.RCV_Cat, dm = si("ant_dm2");
    R.RCV_Metas = C === "NNA" ? "Metas pediátricas: LDL < 110, CT < 170, TG < " + (LT(ea, 10) ? 75 : 90) + " mg/dL, HDL > 45 (DMIA I Clase 16 p. 9); PA < p90 para edad, sexo y talla"
      : cat === "Alto" ? "LDL < 70 mg/dL (o reducción > 50 %); PA " + R.PA_Meta + (dm ? "; HbA1c < " + R.Meta_HbA1c + " %" : "") : cat === "Moderado" ? "LDL < 100 mg/dL; PA " + R.PA_Meta : cat === "Bajo" ? "LDL < 130 mg/dL; PA " + R.PA_Meta : "—";
    R.RCV_Control = C === "NNA" ? "No aplica (NNA)" : cat === "Alto" ? "Cada 3 meses" : cat === "Moderado" ? "Cada 6 meses" : cat === "Bajo" ? "Cada 6-12 meses" : "—";
    R.RCV_Meses = cat === "Alto" ? 3 : cat === "Moderado" ? 6 : cat === "Bajo" ? 6 : "";
  }

  function funcionalidadAM(D, R, T) {
    const t5 = T && T.t5, L = (T && T.listas) || {}, sx = R.SexoC;
    const pts = (lista, v) => { if (vacio(v) || !t5) return ""; const ops = L[lista] || [], ix = ops.indexOf(String(v)); return ix < 0 ? "" : t5.empam[lista][ix] ?? ""; };
    const cnt = (a) => a.filter(isNum).length, sum = (a) => a.filter(isNum).reduce((x, y) => x + y, 0);
    const F = R.FAM = {};
    const mm = [1, 2, 3, 4, 5, 6].map((i) => numD(D["mmse_" + i]));
    R.MMSE = cnt(mm) < 6 ? "" : sum(mm);
    R.MMSE_Cls = R.MMSE === "" ? "Sin aplicar" : R.MMSE <= 13 ? "Alterado (≤ 13): aplicar Pfeffer al acompañante" : "Normal (≥ 14)";
    const mmA = R.MMSE === "" ? "" : R.MMSE < 13 ? 0 : R.MMSE <= 14 ? 3 : R.MMSE <= 17 ? 4 : 6;
    const esc = numD(D.efa_esc), escP = esc === "" ? "" : esc <= 1 ? 0 : esc <= 3 ? 1 : esc <= 5 ? 2 : esc <= 8 ? 3 : esc <= 10 ? 4 : esc <= 12 ? 5 : 6;
    F.a = [pts("Lista_EFAM_Ayuda", D.efa_1), pts("Lista_EFAM_Ayuda", D.efa_2), pts("Lista_EFAM_Ayuda", D.efa_3), pts("Lista_EFAM_Ayuda", D.efa_4), pts("Lista_EFAM_Ayuda", D.efa_5), mmA, escP,
      pts("Lista_EFAM_Brazos", D.efa_8), pts("Lista_EFAM_Suelo", D.efa_9)];
    R.EFAM_A = cnt(F.a) < 9 ? "" : sum(F.a);
    R.EFAM_A_Cls = R.EFAM_A === "" ? (cnt(F.a) === 0 ? "Sin aplicar" : "Incompleto (" + cnt(F.a) + " de 9 ítems)") : R.EFAM_A <= 42 ? "Riesgo de dependencia (≤ 42): no corresponde parte B; aplicar Barthel" : "Autovalente (≥ 43): aplicar parte B ↓";
    const mmB = R.MMSE === "" ? "" : R.MMSE < 13 ? 0 : R.MMSE <= 14 ? 5 : R.MMSE <= 18 ? 7 : 9;
    F.b = [pts("Lista_EFAM_PA", D.efb_1), pts("Lista_EFAM_DM", D.efb_2), pts("Lista_EFAM_Lee", D.efb_3), mmB, pts("Lista_EFAM_Animo", D.efb_5), pts("Lista_EFAM_Animo", D.efb_6)];
    const noB = R.EFAM_A === "" || R.EFAM_A <= 42;
    R.EFAM_B = noB ? "" : cnt(F.b) < 6 ? "" : sum(F.b);
    R.EFAM_B_Cls = noB ? "No corresponde" : R.EFAM_B === "" ? "Pendiente: complete la parte B" : R.EFAM_B <= 45 ? "Autovalente con riesgo (≤ 45)" : "Autovalente sin riesgo (≥ 46)";
    R.EFAM_Yesavage = noB ? "" : isNum(F.b[4]) && F.b[4] <= 2 ? "Sí: aplicar Yesavage ↓" : isNum(F.b[4]) ? "No" : "";
    const BA = ["Lista_BA_Comer", "Lista_BA_Lavarse", "Lista_BA_Vestirse", "Lista_BA_Arreglarse", "Lista_BA_Depos", "Lista_BA_Miccion", "Lista_BA_Retrete", "Lista_BA_Traslado", "Lista_BA_Deambular", "Lista_BA_Escalones"];
    F.bar = BA.map((l, i) => pts(l, D["bar_" + pad2(i + 1)]));
    R.Barthel = cnt(F.bar) < 10 ? "" : sum(F.bar);
    R.Barthel_Cls = R.Barthel === "" ? (cnt(F.bar) === 0 ? "Sin aplicar" : "Incompleto") : R.Barthel >= 100 ? "Independiente" : R.Barthel >= 60 ? "Dependencia leve" : R.Barthel >= 40 ? "Dependencia moderada" : R.Barthel >= 20 ? "Dependencia severa" : "Dependencia total";
    const inv = [1, 5, 7, 11, 13];
    F.yes = Array.from({ length: 15 }, (_, i) => { const v = S(D["yes_" + pad2(i + 1)]); return v === "" ? "" : inv.includes(i + 1) ? (v === "No" ? 1 : 0) : (v === "Sí" ? 1 : 0); });
    R.Yesavage = cnt(F.yes) < 15 ? "" : sum(F.yes);
    R.Yesavage_Cls = R.Yesavage === "" ? (cnt(F.yes) === 0 ? "Sin aplicar" : "Incompleto (" + cnt(F.yes) + " de 15)") : R.Yesavage <= 5 ? "Normal (0-5)" : R.Yesavage <= 9 ? "Depresión leve (6-9): derivar a médico" : "Depresión establecida (≥ 10): derivar a médico";
    R.Pfeffer_Aplica = R.MMSE === "" ? "Falta MMSE" : R.MMSE <= 13 ? "Sí (MMSE alterado)" : "No (MMSE normal)";
    F.pfe = Array.from({ length: 11 }, (_, i) => pts("Lista_Pfeffer", D["pfe_" + pad2(i + 1)]));
    R.Pfeffer = cnt(F.pfe) < 11 ? "" : sum(F.pfe);
    R.Pfeffer_Cls = R.Pfeffer === "" ? (cnt(F.pfe) === 0 ? "Sin aplicar" : "Incompleto") : R.Pfeffer >= 6 ? "Screening positivo (≥ 6): sospecha de deterioro cognitivo" : "Screening negativo (< 6)";
    const uni = numD(D.fa_unipodal), tug = numD(D.fa_tug), tugA = S(D.fa_tug_ayuda);
    R.Unipodal_Cls = uni === "" ? "Sin dato" : uni >= 5 ? "Normal (≥ 5 s)" : uni < 4 ? "Alterado (< 4 s)" : "Limítrofe (4-5 s) ⚠";
    R.TUG_Cls = tugA === "Sí" ? "Alto riesgo de caída (requiere ayuda)" : tug === "" ? "Sin dato" : tug <= 10 ? "Normal (≤ 10 s)" : tug <= 20 ? "Riesgo leve de caída (11-20 s)" : "Alto riesgo de caída (> 20 s)";
    R.Caidas_Cls = uni === "" && tug === "" && tugA !== "Sí" ? "Sin evaluar" : R.TUG_Cls.slice(0, 4) === "Alto" ? "Alto riesgo de caída" : (R.TUG_Cls.slice(0, 11) === "Riesgo leve" || R.Unipodal_Cls.slice(0, 8) === "Alterado") ? "Riesgo de caída" : "Sin riesgo de caída";
    R.Funcional_EMPAM = isNum(R.Barthel) && R.Barthel < 100 ? R.Barthel_Cls : R.EFAM_A === "" ? (R.Barthel_Cls === "Independiente" ? "Independiente (Barthel 100)" : "Sin evaluar")
      : R.EFAM_A <= 42 ? "Riesgo de dependencia" : R.EFAM_B === "" ? "Autovalente (falta parte B)" : R.EFAM_B <= 45 ? "Autovalente con riesgo" : "Autovalente sin riesgo";
    // MNA-SF
    const imc = isNum(R.IMC) ? R.IMC : "", pant = numD(D.pantorrilla);
    F.mnaF1 = imc === "" ? "" : imc < 19 ? 0 : imc < 21 ? 1 : imc < 23 ? 2 : 3;
    F.mnaF2 = imc !== "" || pant === "" ? "" : pant < 31 ? 0 : 3;
    const mna = ["a", "b", "c", "d", "e"].map((k) => numD(D["mna_" + k]));
    R.MNA_Score = cnt(mna) < 5 ? "" : sum(mna) + (F.mnaF1 !== "" ? F.mnaF1 : F.mnaF2 !== "" ? F.mnaF2 : 0);
    R.MNA_Cls = R.MNA_Score === "" ? "Sin aplicar" : F.mnaF1 === "" && F.mnaF2 === "" ? "Falta IMC o pantorrilla" : R.MNA_Score >= 12 ? "Estado nutricional normal" : R.MNA_Score >= 8 ? "Riesgo de malnutrición" : "Malnutrición";
    const din = numD(D.fa_dina), vm = numD(D.fa_marcha), sp = numD(D.fa_sppb), lim = sx === "M" ? 27 : 15;
    R.Fuerza_Cls = din === "" ? "Sin dato" : din <= lim ? "Fuerza de prensión disminuida (≤ " + lim + " kg)" : "Normal";
    R.Marcha_Cls = vm === "" ? "Sin dato" : vm <= 0.8 ? "Velocidad de marcha baja (≤ 0,8 m/s)" : "Normal";
    R.SPPB_Cls = sp === "" ? "Sin dato" : sp < 8 ? "Bajo rendimiento físico (< 8)" : "Normal";
    const se = numD(D.fa_semienv);
    R.Talla_Bassey = se === "" || sx === "" ? "" : sx === "M" ? 1.4 * se + 57.8 : 1.35 * se + 60.1;
    const cb = numD(D.cb), pse = numD(D.cc_pse), ar = numD(D.alt_rodilla);
    R.Peso_Chumlea = cb === "" || pant === "" || pse === "" || ar === "" || sx === "" ? "" : sx === "M" ? 1.73 * cb + 0.98 * pant + 0.37 * pse + 1.16 * ar - 62.35 : 0.98 * cb + 1.27 * pant + 0.4 * pse + 0.87 * ar - 81.69;
  }

  // =====================================================================
  // ETAPA 6 — réplica de DNI, PRESCRIPCION y SEGUIMIENTO (Planilla_Nutricional)
  // =====================================================================
  const lower = (s) => String(s ?? "").toLowerCase();
  const ymd = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  // EDATE de Excel: mismo día del mes, ajustado al último día si no existe
  const edate = (d, m) => { m = Math.trunc(m); const y = d.getFullYear(), mo = d.getMonth() + m, last = new Date(y, mo + 1, 0).getDate(); return new Date(y, mo, Math.min(d.getDate(), last)); };
  const numTxt = (v) => (isNum(v) ? String(+(+v).toPrecision(15)).replace(".", ",") : String(v));
  // reemplaza la ocurrencia n (1-based) de «sub» por «rep», como SUBSTITUTE(texto; sub; rep; n)
  const substN = (t, sub, rep, n) => { let i = -1; for (let k = 0; k < n; k++) { i = t.indexOf(sub, i + 1); if (i < 0) return t; } return t.slice(0, i) + rep + t.slice(i + sub.length); };

  function dni(D, R) {
    const C = R.Ciclo, nna = C === "NNA", X = R.DNIP = {};
    X.b4 = C === "" ? "" : R.GrupoEtario + ", género " + (R.SexoC === "F" ? "femenino" : "masculino") + " de " + R.Edad_Texto + (nna ? ((R.PR && R.PR.DNI) || "") : "")
      + (R.Nodriza ? ", nodriza" + (isNum(D.nod_meses) ? " de " + numTxt(D.nod_meses) + (D.nod_meses === 1 ? " mes" : " meses") + " posparto" : "") : "");
    const cal = R.Calificacion_Nutricional;
    X.b5 = (cal === "Falta dato" || cal === "" || cal == null ? ", con estado nutricional sin evaluar (falta dato)"
      : (cal === "Normal" ? ", con estado nutricional normal" : ", con " + lower(cal).replace("grado iii", "grado III").replace("grado ii", "grado II").replace("grado i", "grado I")) + " según " + R.Indicador_Ref)
      + (!nna && R.Lab_DPV ? (R.Malnutricion === "Déficit" ? " y desnutrición proteica visceral " + R.Lab_DPV + " según albúmina (desnutrición mixta)" : ", con desnutrición proteica visceral " + R.Lab_DPV + " según albúmina") : "");
    X.b6 = !nna || R.Dx_Talla === "Falta dato" || R.Dx_Talla === "No aplica" ? "" : ", " + (PLANILLA ? lower(R.Dx_Talla) : lower(R.Dx_Talla).replace(/^longitud/, "talla")) + " según " + (R.PC && R.PC.activa && R.PC.TE && isNum(R.PC.TE.pct) ? "T/E (Brooks 2011)" : PLANILLA && LT(R.Edad_Meses_Aprox, 24) ? "L/E" : "T/E") /* decisión docente 10-11-2026: en NNA siempre «T/E» */;
    const cm = S(R.Comp_Musc), cg = S(R.Comp_Graso), ne = (x) => x === "" || x === "No evaluado";
    const fa = (x) => lower(x).replace("elevado", "elevada").replace("disminuido", "disminuida");
    X.b7 = ne(cm) && ne(cg) ? "" : nna ? (cm === cg ? ", con compartimento muscular y graso " + lower(cm) : ne(cm) ? ", con compartimento graso " + lower(cg) : ne(cg) ? ", con compartimento muscular " + lower(cm) : ", con compartimento muscular " + lower(cm) + " y graso " + lower(cg))
      : (cm === cg ? ", con composición muscular y grasa " + lower(cm).replace("elevado", "elevadas").replace("disminuido", "disminuidas").replace("normal", "normales") + " según Frisancho 1981"
        : ne(cm) ? ", con composición grasa " + fa(cg) + " según Frisancho 1981" : ne(cg) ? ", con composición muscular " + fa(cm) + " según Frisancho 1981" : ", con composición muscular " + fa(cm) + " y grasa " + fa(cg) + " según Frisancho 1981");
    X.b8 = (R.Riesgo_CC === "Riesgo de obesidad abdominal" ? ", con riesgo de obesidad abdominal (CC ≥ p75)" : R.Riesgo_CC === "Obesidad abdominal" ? (nna ? ", con obesidad abdominal (CC ≥ p90)" : ", con obesidad abdominal (CC " + numTxt(D.cc) + " cm)") : "")
      + (!nna && (R.RCV_Cat === "Alto" || R.RCV_Cat === "Moderado") ? ", con riesgo cardiovascular " + lower(R.RCV_Cat) + (R.RCV_AltoDirecto === "Sí" ? "" : " según Framingham") : "");
    X.b12 = C === "" ? "" : D.pc_base === "Sí" // Planilla_NNA DNI!B12 (parálisis cerebral)
      ? ", con parálisis cerebral GMFCS " + (S(D.pc_gmfcs) === "" ? "(sin nivel)" : R.PC.grupoTxt) + " (" + lower(R.Actividad) + (vacio(D.pc_tono) || D.pc_tono === "Normal" ? ", tono normal" : ", " + lower(D.pc_tono)) + ")"
      : ", con actividad física " + lower(R.Actividad);
    X.b13 = X.b4 === "" ? "" : X.b4 + X.b5 + X.b6 + X.b7 + X.b8 + R.DNI_Alim + X.b12 + ".";
    const si = (k) => S(D[k]) === "Sí", pa = S(R.PA_Clasificacion);
    const o = [];
    o.push(si("ant_dm2") ? "diabetes mellitus tipo 2" + (isNum(D.lab_hba1c) ? (R.Control_Met === "DM2 descompensada" ? " descompensada" : " compensada") : "") + ", " : "");
    o.push(si("ant_hta") ? "hipertensión arterial" + (lower(pa).includes("no compensada") ? " no compensada" : lower(pa).includes("en meta") ? " compensada" : "") + ", " : "");
    o.push(si("ant_dlp") ? "dislipidemia, " : "");
    o.push(si("ant_erc") ? "enfermedad renal crónica" + (S(D.ant_erc_etapa) !== "" ? " etapa " + D.ant_erc_etapa : "") + ", " : "");
    o.push(si("ant_ecv") ? "enfermedad cardiovascular aterosclerótica, " : "");
    o.push(S(D.otras_pat) !== "" ? lower(D.otras_pat) + ", " : "");
    o.push(si("ant_hta") || pa === "Sin dato" || pa === "Normal" || pa.slice(0, 8) === "No aplic" ? "" : (nna ? (pa === "Presión arterial elevada" ? "presión arterial elevada" : "presión arterial sugerente de " + pa)
      : lower(pa).includes("sospecha") ? "presión arterial elevada (sospecha de HTA)" : pa.includes("180") ? "sugerente de hipertensión arterial" : "pre-hipertensión") + ", ");
    o.push(nna && (R.RCV_Cat === "Alto" || R.RCV_Cat === "Moderado") ? "riesgo cardiovascular " + lower(R.RCV_Cat) + (R.RCV_AltoDirecto === "Sí" ? "" : " según Framingham (homologado a 35-44 años)") + ", " : "");
    o.push(S(R.SindMet).slice(0, 2) === "Sí" ? "síndrome metabólico, " : "");
    o.push(R.ICT_Cls === "Adiposidad central aumentada" ? "adiposidad central aumentada según índice cintura/talla, " : "");
    o.push(R.Z_Tray === "Caída ≥ 1 DE en la trayectoria" ? "caída ≥ 1 DE en la trayectoria de " + R.Indicador_Ref + ", " : "");
    o.push(C === "AM" && (R.MNA_Cls === "Riesgo de malnutrición" || R.MNA_Cls === "Malnutrición") ? lower(R.MNA_Cls) + " según MNA-SF, " : "");
    const fe = S(R.Funcional_EMPAM);
    o.push(C !== "AM" || fe === "Sin evaluar" || fe === "Autovalente sin riesgo" || fe.slice(0, 13) === "Independiente" ? "" : lower(fe) + (fe.slice(0, 11) === "Dependencia" ? " según Barthel" : " según EFAM") + ", ");
    const ys = S(R.Yesavage_Cls);
    o.push(C !== "AM" ? "" : (ys.slice(0, 9) === "Depresión" ? "sospecha de " + lower(ys.slice(0, ys.indexOf(" ("))) + " según Yesavage, " : "")
      + (S(R.Pfeffer_Cls).slice(0, 19) === "Screening positivo" ? "sospecha de deterioro cognitivo según Pfeffer, " : S(R.MMSE_Cls).slice(0, 8) === "Alterado" ? "MMSE abreviado alterado, " : ""));
    o.push(C === "AM" && (R.Caidas_Cls === "Riesgo de caída" || R.Caidas_Cls === "Alto riesgo de caída") ? lower(R.Caidas_Cls) + ", " : "");
    o.push(C !== "AM" ? "" : (S(R.Fuerza_Cls).slice(0, 6) === "Fuerza" ? "fuerza de prensión disminuida, " : "") + (S(R.Marcha_Cls).slice(0, 9) === "Velocidad" ? "velocidad de marcha baja, " : "") + (S(R.SPPB_Cls).slice(0, 4) === "Bajo" ? "bajo rendimiento físico según SPPB, " : ""));
    o.push(R.Lab_ODIN === "" ? "" : (R.Lab_ODIN.includes("sugerente") ? "exámenes sugerentes de " + R.Lab_ODIN.split("sugerente de ").join("") : R.Lab_ODIN) + ", ");
    o.push(S(R.Pantorrilla_Cls).slice(0, 4) === "Bajo" ? "perímetro de pantorrilla bajo (< 31 cm), " : "");
    const pcc = R.ind && R.ind.PC ? S(R.ind.PC.cls) : "";
    o.push(pcc === "Microcefalia" || pcc === "Macrocefalia" ? lower(pcc) + ", " : "");
    o.push(R.CambioPeso_Cls === "Pérdida de peso significativa" ? "pérdida de peso significativa, " : "");
    o.push(R.Tabaco === "Sí" ? "tabaquismo, " : "");
    o.push(R.Audit_Riesgo === "Consumo de riesgo" || R.Audit_Riesgo === "Posible consumo problema o dependencia" ? lower(R.Audit_Riesgo) + " de alcohol, " : "");
    X.odin = o; X.b39 = o.join("");
    X.b38 = X.b39.length ? X.b39.slice(0, -2) : "";
    const n = (X.b38.length - X.b38.split(", ").join("").length) / 2;
    X.b40 = X.b38 === "" ? "" : " Con " + (n > 0 ? substN(X.b38, ", ", " y ", n) : X.b38) + ".";
    R.DNI_Auto = X.b13 + X.b40;
    // Gestante: molde del protocolo (Portafolio INSC 1.ª entrega p. 3)
    if (R.Embarazada && R.GES) {
      const G = R.GES, pat = o.slice(0, 6).join("");
      const resto = o.slice(6).join(""), r2 = resto.length ? resto.slice(0, -2) : "";
      const nr = (r2.length - r2.split(", ").join("").length) / 2;
      X.ges = "Gestante de " + (isNum(R.SG) ? numTxt(R.SG) : "___") + " SG" + (R.Edad_Anios !== "" ? " (" + R.Edad_Anios + " años)" : "") + (G.mult ? ", con embarazo múltiple" : "")
        + (pat ? ", con patologías de base " + pat.slice(0, -2) : ", sin patologías de base")
        + ", con un estado nutricional pregestacional " + (G.enPre === "Falta dato" ? "sin evaluar (falta dato)" : lower(G.enPre)) + " (MINSAL 2018)"
        + " y actual " + (["Bajo peso", "Normal", "Sobrepeso", "Obesidad"].includes(G.atalah) ? lower(G.atalah) : "sin evaluar") + " (Atalah 2020)"
        + (["Insuficiente", "Adecuado", "Excesivo"].includes(G.incCls) ? ", con un incremento de peso " + lower(G.incCls) + " para la SG" : "")
        + R.DNI_Alim + ".";
      X.gesOdin = r2 === "" ? "" : " Con " + (nr > 0 ? substN(r2, ", ", " y ", nr) : r2) + ".";
      R.DNI_Auto = X.ges + X.gesOdin;
    }
    R.DNI_Manual = S(D.dni_manual);
    R.DNI = R.DNI_Manual !== "" ? R.DNI_Manual : R.DNI_Auto;
  }

  const PAUTA = [["Cereales, papas y leguminosas frescas", [3, 1, 3, 3, 3, 0]], ["Verduras en general", [0, 0, 1, 0, 1, 0]], ["Verduras libre consumo", [0, 0, 1, 0, 1, 0]], ["Frutas", [0, 1, 1, 0, 1, 0]],
    [null, [1, 0, 0, 1, 0, 1]], ["Carnes bajas en grasa", [0, 0, 1, 0, 1, 0]], ["Carnes altas en grasa", [0, 0, 1, 0, 1, 0]], ["Leguminosas secas", [0, 0, 1, 0, 0, 0]], ["Aceites y grasas", [0, 0, 1, 0, 1, 0]],
    ["Alimentos ricos en lípidos", [1, 0, 0, 1, 0, 0]], ["Azúcares", [1, 0, 0, 1, 0, 0]]];
  const DIST0 = [20, 5, 25, 20, 25, 5];

  function prescripcion(D, R, T) {
    const t4 = T && T.t4, C = R.Ciclo, nna = C === "NNA", ea = R.Edad_Anios, P = R.PD = {};
    R.PD_Consist = vacio(D.pd_consist) ? "Normal" : D.pd_consist; R.PD_Digest = vacio(D.pd_digest) ? "Común" : D.pd_digest; R.PD_Vol = vacio(D.pd_vol) ? "Normales" : D.pd_vol;
    P.dist = DIST0.map((d, i) => (isNum(numD(D["pd_dist_" + i])) ? numD(D["pd_dist_" + i]) : d));
    R.PD_NCol = (P.dist[1] > 0 ? 1 : 0) + (P.dist[5] > 0 ? 1 : 0);
    R.PD_Horario = !vacio(D.pd_horario) ? D.pd_horario : R.PD_NCol === 0 ? "Normal (4 tiempos)" : R.PD_NCol === 1 ? "Normal con 1 colación" : "Normal con 2 colaciones";
    R.PD_Temp = vacio(D.pd_temp) ? "No especificar" : D.pd_temp;
    R.PD_Restr = !vacio(D.pd_restr) ? D.pd_restr : (S(D.ant_dm2) === "Sí" || R.Control_Met !== "Sin alteración") ? "restringido en sacarosa" : "";
    const supl = S(D.pd_supl), fracH = S(D.pd_frac_h);
    // Decisión de la usuaria (07-11-2026): la PD siempre nombra proteínas, lípidos y CHO (también normoproteico / normolipídico / normoglucídico).
    // PD_Texto_Planilla conserva el texto original de la planilla (omite la normalidad) para las pruebas.
    const textoPD = (planilla) => {
      try {
        const rnd = (v) => { if (!isNum(v)) throw 0; return String(xround(+v.toPrecision(15), 0)); };
        const get = isNum(R.GET_Final) ? String(xround(R.GET_Final, 0)) : String(R.GET_Final ?? "");
        const ps = S(R.Prot_Sel);
        return "Régimen de consistencia " + lower(R.PD_Consist) + ", digestibilidad " + lower(R.PD_Digest) + ", " + lower(R.Nom_Kcal) + " (" + get + " kcal/día)"
          + ((planilla && R.Prot_Nom === "Normoproteico") ? (ps !== "" ? ", con selección de " + ps : "") : ", " + lower(R.Prot_Nom) + " (" + rnd(R.Prot_g) + " g)" + (ps !== "" ? " con selección de " + ps : ""))
          + ((planilla && R.Lip_Nom === "Normolipídico") ? (R.Lip_Sel !== "" ? ", con selección de " + R.Lip_Sel : "") : ", " + lower(R.Lip_Nom) + " (" + numTxt(R.Lip_Pct) + " %)" + (R.Lip_Sel !== "" ? " con selección de " + R.Lip_Sel : ""))
          + ((planilla && R.CHO_Nom === "Normoglucídico") ? (R.CHO_Sel !== "" ? ", con selección de " + R.CHO_Sel : "") : ", " + lower(R.CHO_Nom) + " (" + rnd(R.CHO_Pct_Usado) + " %)" + (R.CHO_Sel !== "" ? " con selección de " + R.CHO_Sel : ""))
          + (R.Micro_PD !== "" ? ", " + R.Micro_PD : "") + (R.PD_Restr !== "" ? ", " + R.PD_Restr : "") + ", volúmenes " + lower(R.PD_Vol)
          + ", horario " + (R.PD_Horario === "Fraccionado" ? "fraccionado cada " + fracH + " horas" : lower(R.PD_Horario)) + (R.PD_Temp === "No especificar" ? "" : ", temperatura " + lower(R.PD_Temp))
          + (supl !== "" ? ", suplementación: " + supl : "") + ".";
      } catch (e) { return "Faltan datos para la prescripción"; }
    };
    R.PD_Texto = textoPD(false); R.PD_Texto_Planilla = textoPD(true);
    // pauta en porciones de intercambio
    const GET = R.GET_Final, gl = isNum(GET);
    P.kcalObj = P.dist.map((c) => (gl ? xround(GET * c / 100, 0) : "—"));
    P.sumDist = P.dist.reduce((a, b) => a + b, 0);
    P.distOK = P.sumDist === 100 ? "OK" : "Revisar: suma = " + numTxt(P.sumDist) + " %";
    const nombre = (i) => i === 4 ? (nna && LT(ea, 2) ? "Lácteos altos en grasa" : (!nna && (R.Malnutricion === "Exceso" || S(D.ant_dlp) === "Sí" || S(D.ant_dm2) === "Sí")) ? "Lácteos bajos en grasa" : "Lácteos medios en grasa") : PAUTA[i][0];
    const it = (i) => (t4 && t4.int[nombre(i)]) || null;
    const g = PAUTA.map((p, i) => ({ grupo: nombre(i), sug: 0, man: numD(D["pd_por_" + i]), usado: 0, kcal: 0, prot: 0, lip: 0, cho: 0, kpp: it(i) ? it(i).kcal : 0 }));
    const fill = (i) => { const x = g[i], q = it(i); x.usado = x.man !== "" ? x.man : x.sug; x.kcal = q ? x.usado * q.kcal : 0; x.prot = q ? x.usado * q.prot : 0; x.lip = q ? x.usado * q.lip : 0; x.cho = q ? x.usado * q.cho : 0; };
    g[1].sug = LT(ea, 2) ? 1 : 2; g[2].sug = 1; g[3].sug = LT(ea, 2) ? 1 : 2; g[4].sug = 3; g[6].sug = 0; g[7].sug = LT(ea, 1) ? 0 : 0.5; g[9].sug = R.Lip_Sel !== "" ? 1 : 0; g[10].sug = 0;
    [1, 2, 3, 4, 6, 7, 9, 10].forEach(fill);
    const sumK = (k, idx) => idx.reduce((a, i) => a + g[i][k], 0), rest = [1, 2, 3, 4, 6, 7, 9, 10];
    const half = (v) => Math.max(0, xround(+(v * 2).toPrecision(15), 0) / 2);
    g[0].sug = isNum(R.CHO_g) ? half((R.CHO_g - sumK("cho", rest)) / 30) : 0; fill(0);
    g[5].sug = isNum(R.Prot_g) ? half((R.Prot_g - sumK("prot", rest) - g[0].prot) / 11) : 0; fill(5);
    g[8].sug = isNum(R.Lip_g) ? half((R.Lip_g - sumK("lip", rest) - g[0].lip - g[5].lip) / 20) : 0; fill(8);
    P.grupos = g;
    P.tot = { kcal: sumK("kcal", g.map((_, i) => i)), prot: sumK("prot", g.map((_, i) => i)), lip: sumK("lip", g.map((_, i) => i)), cho: sumK("cho", g.map((_, i) => i)) };
    P.req = { kcal: gl ? GET : S(GET), prot: R.Prot_g, lip: R.Lip_g, cho: R.CHO_g };
    P.adec = {}; P.ok = {};
    for (const k of ["kcal", "prot", "lip", "cho"]) { const rq = P.req[k]; P.adec[k] = isNum(rq) && rq !== 0 ? P.tot[k] / rq * 100 : "—"; P.ok[k] = !isNum(P.adec[k]) ? "—" : P.adec[k] >= 90 && P.adec[k] <= 110 ? "OK" : "Revisar"; }
    // reparto por tiempo de comida
    P.tiempos = g.map((x, i) => { const w = PAUTA[i][1], den = w.reduce((a, wi, t) => a + wi * (P.dist[t] > 0 ? 1 : 0), 0);
      const fila = w.map((wi, t) => (den === 0 ? 0 : xround(+(x.usado * wi * (P.dist[t] > 0 ? 1 : 0) / den * 2).toPrecision(15), 0) / 2));
      const suma = fila.reduce((a, b) => a + b, 0); return { fila, suma, ok: Math.abs(suma - x.usado) < 0.01 ? "OK" : "Revisar" }; });
    P.kcalT = [0, 1, 2, 3, 4, 5].map((t) => P.tiempos.reduce((a, r, i) => a + r.fila[t] * g[i].kpp, 0));
    P.difT = P.kcalT.map((k, t) => (isNum(P.kcalObj[t]) && P.kcalObj[t] !== 0 ? (k - P.kcalObj[t]) / P.kcalObj[t] * 100 : "—"));
  }

  const PSI = [1, 2, 3, 4, 5, 6, 8, 12, 18, 24, 36, 42, 48, 60, 72, 84, 96, 108];
  const VAC_M = [0, 0, 2, 2, 2, 4, 4, 4, 6, 12, 12, 12, 18, 18, 18, 18, 36, 36, 72, 108, 156, 780];
  const PREV = [[12, (e, s) => e >= 15 && e < 65], [12, (e) => e >= 65], [12, (e) => e >= 15], [12, (e) => e >= 15], [12, (e) => e >= 15], [12, (e, s, R, D) => e >= 40 || (e >= 15 && (S(R.Calificacion_Nutricional).slice(0, 8) === "Obesidad" || S(D.ant_famdm) === "Sí"))],
    [12, (e) => e >= 40], [36, (e, s) => s === "F" && e >= 25 && e <= 64], [24, (e, s) => s === "F" && e >= 50 && e <= 59], [12, (e) => e >= 65]];

  // ETAPA 8 — réplica de la hoja TFC (tendencia de frecuencia de consumo)
  const TFC_FILAS = [["Lácteos", 3, "día", "min", "≥ 3 porciones/día"], ["Verduras", 3, "día", "min", "≥ 3 porciones/día"], ["Frutas", 2, "día", "min", "≥ 2 porciones/día"],
    ["Leguminosas", 2, "semana", "min", "≥ 2 veces/semana ⚠"], ["Pescados y mariscos", 2, "semana", "min", "≥ 2 veces/semana ⚠"], ["Cereales, pan y papas", "cer", "día", "rango", "Según pauta prescrita"],
    ["Carnes, huevos", "car", "día", "rango", "Según pauta prescrita"], ["Aceites y grasas", "ace", "día", "rango", "Según pauta prescrita"], ["Frutos secos y palta", "ric", "día", "rango", "Según pauta prescrita"],
    ["Agua (vasos de 200 ml)", 6, "día", "min", "6-8 vasos/día ⚠"], ["Bebidas azucaradas y jugos", 0, "día", "evitar", "Evitar (reemplazar por agua)"],
    ["Ultraprocesados / sellos 'ALTO EN'", 0, "día", "evitar", "Evitar"], ["Azúcar y dulces", 0, "día", "evitar", "Evitar / mínimo"]];
  function tfc(D, R) {
    const g = (R.PD && R.PD.grupos) || [], u = (i) => (g[i] && isNum(g[i].usado) ? g[i].usado : "");
    const pauta = { cer: u(0), car: isNum(u(5)) || isNum(u(6)) ? num0z(u(5)) + num0z(u(6)) : "", ace: u(8), ric: u(9) };
    const filas = TFC_FILAS.map(([n, rec, unidad, tipo, txt], i) => {
      const p = "tfc_" + pad2(i) + "_", fr = S(D[p + "frec"]), ve = D[p + "veces"], po = D[p + "porc"];
      const E = fr === "" ? "" : fr === "Nunca" ? 0 : (vacio(ve) ? 1 : +ve) * (vacio(po) ? 1 : +po) / (fr === "Diaria" ? 1 : fr === "Semanal" ? 7 : 30);
      const F = E === "" ? "" : E * 7;
      const H = typeof rec === "string" ? pauta[rec] : rec;
      const J = E === "" ? "—" : (isNum(H) && H !== 0 ? (unidad === "semana" ? F : E) / H * 100 : "—");
      const K = tipo === "evitar" ? (E === "" ? "Sin dato" : E > 0 ? "Excesivo" : "Adecuado") : !isNum(J) ? "Sin dato" : J < 90 ? "Insuficiente" : tipo === "rango" && J > 110 ? "Excesivo" : "Adecuado";
      return { n, frec: fr, dia: E, sem: F, unidad, txt, rec: H, pct: J, cls: K };
    });
    const lista = (c) => { const t = filas.filter((x) => x.cls === c).map((x) => lower(x.n)).join(", "); return t || "ninguno"; };
    R.TFC = filas;
    R.TFC_Conclusion = filas.every((x) => x.cls === "Sin dato") ? "TFC sin datos." : "Consumo insuficiente de: " + lista("Insuficiente") + ". Consumo excesivo de: " + lista("Excesivo") + ".";
  }
  const num0z = (v) => (isNum(v) ? v : 0);

  function seguimiento(D, R) {
    const C = R.Ciclo, nna = C === "NNA", ea = R.Edad_Anios, em = R.Edad_Meses, si = (k) => S(D[k]) === "Sí", G = R.SEG = {};
    const pa = S(R.PA_Clasificacion), ct = numD(D.lab_ct);
    G.motivos = nna || LT(ea, 15) ? "" : (si("ant_ecv") ? "ECV aterosclerótica, " : "") + (si("ant_hta") ? "HTA, " : pa.includes("HTA (PA") ? "HTA (PA ≥ 180/110), " : "")
      + (si("ant_dm2") ? "DM2, " : lower(R.Lab_ODIN).includes("diabetes") ? "sospecha de DM2 (confirmar), " : "")
      + (si("ant_dlp") || (isNum(ct) && ct >= 240) || (isNum(R.Lab_LDL) && R.Lab_LDL >= 160) ? "dislipidemia (CT ≥ 240 o LDL ≥ 160), " : "") + (R.Tabaco === "Sí" && GE(ea, 55) ? "tabaquismo ≥ 55 años, " : "");
    R.PSCV_Ingreso = nna || C === "" ? "No aplica" : G.motivos === "" ? "No cumple criterios de ingreso" : "Cumple criterios: " + G.motivos.slice(0, -2);
    R.PSCV_Flag = R.PSCV_Ingreso.slice(0, 6) === "Cumple" ? "Sí" : "No";
    R.Prox_Programa = nna ? (LT(ea, 10) ? "Programa de Salud Infantil (PSI)" : "Programa de Salud Integral Adolescente") : (C === "AD" ? "EMP (anual)" : "EMPAM (anual)") + (R.PSCV_Flag === "Sí" ? " + PSCV (" + R.RCV_Control + ")" : "");
    G.psi = !nna ? "No aplica" : LT(em, 1) ? 1 : (() => { let ix = -1; PSI.forEach((m, j) => { if (isNum(em) && m <= em) ix = j; }); return ix >= 0 && ix + 1 < PSI.length ? PSI[ix + 1] : "anual"; })();
    const cal = R.Calificacion_Nutricional;
    G.porDx = cal === "Desnutrición" ? "Mensual + derivación a médico (plazo máx. 7 días)" : cal === "Riesgo de desnutrir" ? "Mensual + derivación a médico (plazo máx. 1 mes)" : nna && R.Malnutricion === "Exceso" ? "Mensual (malnutrición por exceso)" : "Según calendario";
    G.meses = (() => { if (nna) { const a = isNum(G.psi) ? G.psi - em : 12; if (!isNum(a)) return "—"; return Math.min(a, G.porDx.slice(0, 7) === "Mensual" ? 1 : 12); } return R.PSCV_Flag === "Sí" ? (isNum(R.RCV_Meses) ? Math.min(12, R.RCV_Meses) : 12) : 12; })();
    const fe0 = parseFecha(D.feval), fe = fe0 ? new Date(fe0.y, fe0.m - 1, fe0.d) : null;
    R.Prox_Control = fe && isNum(G.meses) ? ymd(edate(fe, G.meses)) : "";
    G.vac = VAC_M.map((m, i) => { const v = S(D["vac_" + pad2(i)]); if (i === 21 ? C !== "AM" : !nna) return "No aplica"; if (em < m) return "Aún no corresponde"; return v === "Sí" ? "Al día" : v === "No" ? "Pendiente" : "Corresponde: verificar en carnet"; });
    G.prev = PREV.map(([per, cond], i) => { const d0 = parseFecha(D["prev_" + pad2(i)]), d = d0 ? new Date(d0.y, d0.m - 1, d0.d) : null, vence = d ? edate(d, per) : null;
      const est = ea === "" ? "—" : !cond(ea, R.SexoC, R, D) ? "No aplica" : !d ? "Pendiente" : fe && vence >= fe ? "Vigente" : "Pendiente (vencido)"; return { est, vence: vence ? ymd(vence) : "" }; });
    R.Programa_Alim = nna && LT(em, 72) ? (R.Malnutricion === "Déficit" ? "PNAC Refuerzo (< 6 años con riesgo de desnutrir o desnutrición)" : "PNAC Básico (< 6 años con estado nutricional normal, sobrepeso u obesidad)") + (LT(em, 12) ? "; fórmula de inicio solo si cumple criterios de inclusión" : "")
      : C === "AM" ? (ea >= 70 ? "PACAM (≥ 70 años): Bebida láctea y Crema Años Dorados/Nutramax 1 kg/mes c/u" : "PACAM solo si 60-69 años en tratamiento TBC o en ELEAM autorizado") : "No corresponde";
    const r1 = (v) => (isNum(v) ? numTxt(xround(v, 1)) : null);
    R.Meta_Peso = R.Malnutricion === "Exceso" ? (r1(R.Peso_Max) !== null ? "Acercarse al peso máximo aceptable (" + r1(R.Peso_Max) + " kg)" : "—") : R.Malnutricion === "Déficit" ? "Alcanzar el peso mínimo aceptable (" + (r1(R.Peso_Min) !== null ? r1(R.Peso_Min) + " kg)" : "—)") : "Mantener canal de crecimiento / peso";
    const lim = R.SexoC === "M" ? 90 : 80;
    R.Meta_CC = nna ? (R.Riesgo_CC === "Riesgo de obesidad abdominal" || R.Riesgo_CC === "Obesidad abdominal" ? "Bajar a < p75 para la edad" : "Mantener < p75") : R.Riesgo_CC === "Obesidad abdominal" ? "Reducir CC a < " + lim + " cm" : "Mantener CC < " + lim + " cm";
    R.Meta_Lab = nna ? (R.Lab_ODIN !== "" ? "Controlar: " + R.Lab_ODIN : "—") : R.RCV_Metas;
    const L = [];
    if (!nna && R.Malnutricion === "Exceso") L.push("• Consejería en alimentación saludable y derivar a Programa Vida Sana (Clase 7 p. 13)");
    if (nna && R.Malnutricion === "Exceso") L.push("• Educar en estilos de vida saludable; seguimiento nutricional mensual; taller grupal si pauta FRME alterada (Clase 4 p. 45)");
    if (nna && (cal === "Obesidad" || cal === "Obesidad severa" || R.Riesgo_CC === "Obesidad abdominal") && GE(ea, 5) && isNum(ea)) L.push("• Derivar a médico para evaluación y exámenes (obesidad o CC ≥ p90 – Clase 4 p. 64; Clase 5 p. 13)");
    if (cal === "Desnutrición") L.push("• Derivar a médico en plazo máx. 7 días; analizar historia y contexto psicosocial" + (nna && LT(em, 72) ? "; ingresar a PNAC Refuerzo" : ""));
    if (cal === "Riesgo de desnutrir") L.push("• Derivar a médico en plazo máx. 1 mes" + (nna && LT(em, 72) ? "; ingresar a PNAC Refuerzo" : ""));
    if (R.Dx_Talla === "Talla baja" || R.Dx_Talla === "Longitud baja") L.push("• Talla baja: derivar a médico (Clase 4 p. 25)");
    if (!nna && lower(R.Lab_ODIN).includes("diabetes")) L.push("• Glicemia alterada: toma de exámenes y derivación a médico (Clase 7 p. 19)");
    if (!nna && S(D.ant_dlp) !== "Sí" && isNum(ct) && ct >= 200) L.push("• Colesterol ≥ 200: perfil lipídico y derivación a médico (Clase 7 p. 20; Clase 8 p. 20)");
    if (lower(pa).includes("sospecha") || pa.includes("180")) L.push("• PA ≥ 140/90: perfil de PA y derivación a médico");
    if (nna && (pa === "Presión arterial elevada" || pa.slice(0, 3) === "HTA")) L.push("• PA alterada: repetir 2 mediciones y, si persiste, derivar a médico");
    if (lower(R.Lab_ODIN).includes("anemia")) L.push("• Sugerente de anemia: derivar a médico");
    if (lower(R.Lab_ODIN).includes("renal")) L.push("• Sugerente de ERC: repetir VFGe/RAC en 3 meses y notificar GES si persiste (Vía ERC)");
    if (R.Tabaco === "Sí") L.push("• Consejería breve antitabaco" + (C === "AM" ? " y derivación a sala IRA (Clase 8 p. 20)" : ""));
    if (S(R.Audit_Interv) !== "") L.push("• Alcohol: " + R.Audit_Interv);
    if (R.PSCV_Flag === "Sí") L.push("• Evaluar ingreso / control en PSCV");
    if (R.Programa_Alim !== "No corresponde") L.push("• Programa alimentario: " + R.Programa_Alim);
    // Gestante y nodriza (Portafolio INSC p. 4; Clase 2 p. 19): próximo control en el siguiente trimestre, Purita Mamá y derivaciones elegidas
    if (R.Embarazada || R.Nodriza) {
      const sg = R.SG, G = R.GES || {};
      if (R.Embarazada) {
        const prox = isNum(sg) ? (sg < 14 ? 14 : sg < 28 ? 28 : null) : null;
        G.proxSG = prox;
        R.Prox_Programa = "Programa de Salud de la Mujer: control prenatal";
        R.Prox_Control = fe && prox !== null ? ymd(new Date(fe.getFullYear(), fe.getMonth(), fe.getDate() + Math.round((prox - sg) * 7))) : "";
        G.proxTxt = prox !== null ? "Inicio del " + (prox === 14 ? "2.º" : "3.er") + " trimestre (" + prox + " SG)" : isNum(sg) ? "3.er trimestre: siguiente control en el puerperio / clínica de lactancia" : "Falta SG";
        const sem = prox !== null ? Math.round((prox - sg) * 7) : null;
        R.SEG.meses = sem !== null ? (sem >= 7 ? numTxt(xround(sem / 7, 1)) + " semanas" : sem + " días") : "—";
        R.SEG.porDx = G.proxTxt + " (portafolio p. 4: se agenda para el siguiente trimestre)";
        R.Meta_Peso = isNum(G.meta) ? "Ganancia total meta " + numTxt(xround(G.meta, 1)) + " kg al término" + (isNum(G.faltan) ? " (faltan " + numTxt(xround(G.faltan, 1)) + " kg)" : "") : "—";
        R.Meta_CC = "";
      } else { R.Prox_Programa = "Programa de Salud de la Mujer: control de puerperio / clínica de lactancia"; }
      const cel = S(D.ant_celiaca) === "Sí" || S(R.PD_Restr).includes("sacarosa");
      R.Programa_Alim = "PNAC: " + (cel ? "Purita +Pro2 (enfermedad celíaca o restricción de sacarosa)" : "Purita Mamá") + (S(D.so_purita) === "No" ? " · reforzar el retiro" : "");
      for (let i = L.length - 1; i >= 0; i--) if (L[i].includes("Vida Sana") || L[i].includes("Clase 4") || L[i].startsWith("• Programa alimentario") || L[i].startsWith("• Talla baja")) L.splice(i, 1);
      L.push("• Programa alimentario: " + R.Programa_Alim);
      if (lower(R.Lab_ODIN).includes("diabetes gestacional")) L.push("• Sugerente de diabetes gestacional: derivar a médico / matrón(a) (Clase 2 p. 18)");
      const dv = Array.isArray(D.ges_deriv) ? D.ges_deriv : [];
      for (const x of dv) L.push("• Derivar a " + x);
    }
    R.Derivaciones = L.map((x) => x + "\n").join("") + R.Social_Deriv;
  }

  // Búsqueda de la función de un fármaco o suplemento por nombre (diccionario de la app, ⚠ verificar)
  const norm = (x) => String(x || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
  function buscarFuncion(nombre, dic) {
    const n = norm(nombre); if (!n || !dic) return null;
    let mejor = null, largo = 0;
    for (const k in dic) {
      const kn = norm(k);
      if ((n === kn || n.startsWith(kn + " ")) && kn.length > largo) { mejor = k; largo = kn.length; }
    }
    return mejor ? { nombre: mejor, funcion: dic[mejor] } : null;
  }

  const api = { TIEMPOS, GRUPOS_R24, N_R24, N_DET, DET_KEYS, LISTA_FORMULAS, LISTA_HID, calcular, datedif, parseFecha, estadoColor, buscarFuncion, vLMS, zLMS, normsinv, normsdist };
  if (typeof module !== "undefined") module.exports = api; else root.Calc = api;
})(this);
