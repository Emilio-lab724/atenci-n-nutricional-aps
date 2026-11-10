/* Atención Nutricional APS — © 2026 Emilio Alejandro Espinoza Sotomayor, estudiante de Nutrición y Dietética, Universidad San Sebastián, sede De la Patagonia. Todos los derechos reservados. Prohibida su reproducción, distribución o modificación sin autorización escrita del autor. */
/* Etapa 6 — cierre: DNI, prescripción dietética, objetivos (Bloom), seguimiento y ficha resumen. Se registran en Etapa2.live. */
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
  const fecha = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || "")); return m ? `${m[3]}-${m[2]}-${m[1]}` : "—"; };
  const L = {};

  // ---------------- DNI ----------------
  L.dni_texto = ({ R, D }) => {
    if (!R.DNI_Auto) return nota("Complete las fechas y el sexo en <b>Datos del paciente</b> para generar el DNI.");
    return `<p class="concl dni-txt">${esc(R.DNI)}</p>` + (R.DNI_Manual ? nota("Se muestra el DNI escrito a mano. Borre el ajuste manual para volver al automático.") : nota("DNI automático en el orden del Consenso: grupo etario, sexo y edad, estado nutricional, talla, composición corporal, cintura y RCV, diagnóstico alimentario y actividad física. Luego los ODIN."))
      + `<div class="acciones" style="padding:0 16px 12px"><button class="btn peq" data-a="copiar-txt" data-txt="${esc(R.DNI)}">Copiar DNI</button>${R.DNI_Manual ? "" : ` <button class="btn peq" data-a="dni-editar">Editar a partir del automático</button>`}</div>`;
  };
  L.dni_partes = ({ R }) => {
    const X = R.DNIP || {};
    const p = [["Grupo etario, sexo y edad", X.b4], ["Estado nutricional", X.b5], ["Talla", X.b6], ["Composición corporal", X.b7], ["Cintura y riesgo cardiovascular", X.b8],
      ["Diagnóstico alimentario (R24)", R.DNI_Alim], ["Actividad física", X.b12], ["Otros diagnósticos (ODIN)", X.b40]];
    return dl(p.map(([k, v]) => [k, v ? esc(String(v).replace(/^, /, "").replace(/^ Con /, "")) : '<span class="pend">—</span>']))
      + nota("Si falta un componente, revise el módulo correspondiente: por ejemplo, sin R24 no hay diagnóstico alimentario; sin CB y pliegue no hay composición corporal.");
  };

  // ---------------- Prescripción ----------------
  // ---------------- Régimen lactante menor ----------------
  L.pd_lact = ({ R, D }) => {
    const X = R.LACT; if (!X) return "";
    const f1 = (v, d) => (isNum(v) ? f(v, d) : "—");
    let h = "";
    const rows = [["Tipo de alimentación", esc(X.tipo) + (X.tipoAuto ? ' <span class="ayuda">(sugerido; cámbielo arriba)</span>' : "")]];
    if (X.hayFA) rows.push(["Dilución", isNum(X.dil) ? f1(X.dil, 1) + " %" + (isNum(X.dilCalc) ? ` <span class="ayuda">(calculadora: ${f1(X.dilCalc, 1)} %)</span>` : "") : "Ingrese la dilución o use la calculadora (medidas × g/medida ÷ ml × 100)"]);
    rows.push(["GET (kcal/kg × peso)", isNum(X.GET) ? f(X.GET, 0) + " kcal/día · " + esc(R.Formula_Usada) : "—"]);
    if (X.hayLM) rows.push(["Aporte y adecuación", "La LM es a libre demanda y no se cuantifica: no se calcula el % de adecuación total."]);
    else rows.push(["Aporte indicado", isNum(X.kcal) ? f(X.kcal, 0) + " kcal/día" : "—"], ["% de adecuación", isNum(X.adec) ? f(X.adec, 1) + " % · " + pill(X.nomKcal) : "—"]);
    if (X.hayAC) rows.push(["Energía de la alimentación complementaria", f(X.kcalAC, 0) + " kcal" + (isNum(X.pctAC) ? " (" + f(X.pctAC, 0) + " % del aporte; máx. 50 %)" : "") + (isNum(X.metaAC) ? ` <span class="ayuda">Guía p. 39: ~${X.metaAC} kcal/día de AC a esta edad</span>` : "")]);
    if (!X.hayLM) {
      rows.push(["Proteínas", isNum(X.prot) ? f(X.prot, 1) + " g · " + f(X.protKg, 2) + " g/kg · " + f(X.protPct, 1) + " % · " + pill(X.nomProt) : '<span class="ayuda">Ingrese las proteínas por 100 ml / 100 g para clasificar</span>'],
        ["Lípidos", isNum(X.lip) ? f(X.lip, 1) + " g · " + f(X.lipPct, 1) + " % · " + pill(X.nomLip) : '<span class="ayuda">Ingrese los lípidos por 100 ml / 100 g para clasificar</span>']);
    }
    rows.push(["VHT", isNum(X.VHT) ? f(X.VHT, 0) + " ml/día (" + X.VHT_mlkg + " ml/kg × peso real)" : "—"], ["Líquidos indicados (fórmula + agua)", X.liq ? f(X.liq, 0) + " ml/día" : "—"],
      ["Suplementación", "Vitamina D 400 UI/día (Guía p. 74)" + (X.fe ? " · hierro 1 mg/kg/día" + (isNum(X.feDosis) ? " = " + f(X.feDosis, 1) + " mg/día" : "") + " (LM exclusiva al pecho desde los 4 meses, Guía p. 73)" : "")]);
    h += dl(rows);
    h += nota("Nomenclatura del Consenso DMIA USS 2024: adecuación &lt; 90 % hipo · 90-110 % normo · &gt; 110 % hipercalórico. Proteínas " + esc(X.rangoProt) + ". Lípidos " + esc(X.rangoLip) + ".");
    if (X.hayAC && (!isNum(D.lm_pap_kcal) || !isNum(D.lm_pos_kcal))) h += `<p class="sec-nota verif-n">⚠ verificar: papilla y postre usan 65 kcal/100 g si no se escribe otro valor (Guía p. 39: 65-70 kcal/100 g; el Anexo 1 suma 180 kcal en 200 g de papilla).</p>`;
    if (X.avisos.length) h += `<div class="aviso-g" style="margin:6px 16px 10px">${X.avisos.map((a) => "• " + esc(a)).join("<br>")}</div>`;
    if (X.filas.length) h += `<h4 class="sub">Distribución por toma</h4><div class="tabla-w" style="padding:6px 16px 10px"><table class="pr res"><thead><tr><th>Hora</th><th>Tipo</th><th>Cantidad</th><th>kcal</th></tr></thead><tbody>`
      + X.filas.map((r) => `<tr><td class="num">${esc(r.hora || "—")}</td><td>${esc(r.tipo)}</td><td>${esc(r.cant)}</td><td class="num">${isNum(r.kcal) ? f(r.kcal, 0) : "—"}</td></tr>`).join("") + `</tbody></table></div>`;
    return h;
  };
  L.pd_texto = ({ R, D }) => R.LACT ? `<p class="concl">${esc(R.PD_Texto)}</p>` + (R.PD_Manual ? nota("Se muestra la PD escrita a mano. Borre el ajuste manual para volver a la automática.") : "")
    + `<div class="acciones" style="padding:0 16px 12px"><button class="btn peq" data-a="copiar-txt" data-txt="${esc(R.PD_Texto)}">Copiar PD</button>${R.PD_Manual ? "" : ` <button class="btn peq" data-a="pd-editar">Editar a partir de la automática</button>`}</div>` : PD_GENERAL({ R, D });
  const PD_GENERAL = ({ R, D }) => (D.ale_tiene === "Sí" || D.noc_tiene === "Sí" ? `<p class="aviso-g" style="margin:10px 16px 0"><b>Considere al prescribir:</b> ${esc([D.ale_tiene === "Sí" ? "alergias o intolerancias: " + alergiasTxt(D) : "", D.noc_tiene === "Sí" ? "no consume: " + noComeTxt(D) : ""].filter(Boolean).join(". "))}.</p>` : "") + `<p class="concl">${esc(R.PD_Texto)}</p>` + dl([
    ["Energía", isNum(R.GET_Final) ? f(R.GET_Final, 0) + " kcal/día · " + f(R.Kcal_Kg, 1) + " kcal/kg" : "—"],
    ["Proteínas", isNum(R.Prot_g) ? f(R.Prot_g, 1) + " g · " + f(R.Prot_Gkg, 2) + " g/kg · " + f(R.Prot_Pct, 0) + " %" : "—"],
    ["Lípidos", isNum(R.Lip_g) ? f(R.Lip_g, 1) + " g · " + f(+R.Lip_Pct, 0) + " %" : "—"],
    ["Hidratos de carbono", isNum(R.CHO_g) ? f(R.CHO_g, 1) + " g · " + f(R.CHO_Pct_Usado, 0) + " %" : "—"],
    ["Fibra · azúcares libres (máx.)", (isNum(R.Fibra_g) ? f(R.Fibra_g, 0) + " g" : "—") + " · " + (isNum(R.Azuc_Max) ? f(R.Azuc_Max, 0) + " g" : "—")],
    ["VHT", isNum(R.VHT) ? f(R.VHT, 0) + " ml/día (" + f(R.VHT_Vasos, 1) + " vasos)" : "—"],
  ]) + `<div class="acciones" style="padding:0 16px 12px"><button class="btn peq" data-a="copiar-txt" data-txt="${esc(R.PD_Texto)}">Copiar PD</button>${R.PD_Manual ? "" : ` <button class="btn peq" data-a="pd-editar">Editar a partir de la automática</button>`}</div>`
    + (R.PD_Manual ? nota("Se muestra la PD escrita a mano. Borre el ajuste manual para volver a la automática.") : "")
    + nota("Consenso p. 45: la normalidad se puede omitir salvo en consistencia, digestibilidad, volúmenes, horario y calorías.");

  // ---------------- Objetivos (Bloom) ----------------
  const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  function nivelBloom(txt, B) {
    const w = norm((String(txt || "").trim().split(/\s+/)[0] || "").replace(/[^a-záéíóúñü]/gi, ""));
    if (!w) return null;
    const niv = Object.entries(B).filter(([, vs]) => vs.some((v) => norm(v) === w)).map(([n]) => n);
    return { verbo: w, niv };
  }
  function sugerencias(R, D) {
    const s = [], add = (t) => { if (t && !s.includes(t)) s.push(t); };
    const minus = (t) => t.charAt(0).toLowerCase() + t.slice(1);
    const q = (k) => String(D["r24_q_" + k] || "");
    if (R.Malnutricion === "Exceso" && R.Meta_Peso && R.Meta_Peso !== "—") add(`Seleccionar las porciones indicadas en la pauta en cada tiempo de comida para ${minus(R.Meta_Peso)} al próximo control.`);
    if (R.Malnutricion === "Déficit" && R.Meta_Peso) add(`Aplicar la pauta y el horario indicados (${String(R.PD_Horario || "").toLowerCase()}) para ${minus(R.Meta_Peso)} al próximo control.`);
    if (R.Cls24_Lip === "Exceso") add("Identificar los alimentos con alto contenido de grasas de su alimentación habitual y elegir preparaciones cocidas, al horno o a la plancha.");
    if (R.Cls24_CHO === "Exceso" || /Frecuente|Diario/.test(q("bebidas")) || /Frecuente|Diario/.test(q("ultra"))) add("Reconocer los sellos «ALTO EN» y preferir alimentos sin sellos y agua en lugar de bebidas azucaradas.");
    if (R.Cls24_Prot === "Insuficiencia") add("Incluir una porción de alimentos proteicos (carnes, huevo, leguminosas o lácteos) en el almuerzo y la cena.");
    if (R.Cls24_Energia === "Insuficiencia") add(`Aplicar la pauta de porciones entregada completando los ${R.PD_NCol + 4} tiempos de comida diarios.`);
    if (/calcio/.test(R.Micro_PD || "")) add("Incluir 3 porciones de lácteos al día, según las GABAS.");
    if (/hierro/.test(R.Micro_PD || "") || /anemia|hierro/.test(R.Lab_ODIN || "")) add("Identificar los alimentos fuente de hierro y consumirlos junto a alimentos fuente de vitamina C.");
    if (/sodio/.test(R.Micro_PD || "") || q("sal") === "Sí") add("Identificar los alimentos altos en sodio y retirar el salero de la mesa.");
    if (R.CHO_Sel) add("Seleccionar hidratos de carbono complejos y fibra, distribuidos en los tiempos de comida de la pauta.");
    if (q("desayuno") === "No" || q("horarios") === "No") add("Establecer un horario regular de comidas que incluya el desayuno.");
    if (isNum(R.VHT_Vasos) && isNum(+D.r24_q_agua) && D.r24_q_agua !== "" && +D.r24_q_agua < R.VHT_Vasos) add(`Contar los vasos de agua que toma al día hasta alcanzar ${f(R.VHT_Vasos, 1)} vasos (${f(R.VHT, 0)} ml).`);
    if (q("pantallas") === "Sí") add("Establecer las comidas en familia sin pantallas.");
    if (R.Ciclo === "AM" && /Riesgo|Malnutrici/.test(R.MNA_Cls || "")) add("Planear colaciones nutritivas entre comidas para cubrir el requerimiento diario.");
    if (R.Actividad === "Ligera" && R.Malnutricion === "Exceso") add("Planear actividad física regular acorde a su edad, junto a su familia.");
    add("Reconocer los grupos de alimentos de las GABAS y su frecuencia de consumo recomendada.");
    add("Aplicar la pauta de alimentación entregada en la consulta.");
    add("Describir cómo se ve un plato saludable en el almuerzo y la cena.");
    return s;
  }
  L.obj_sug = (ctx) => {
    const { R, D, T } = ctx, B = (T.t6 || {}).bloom || {};
    const objs = [1, 2, 3, 4, 5].map((i) => String(D["obj_" + i] || "").trim()), n = objs.filter(Boolean).length;
    const est = objs.map((o, i) => { if (!o) return ""; const b = nivelBloom(o, B);
      return `<li><b>Objetivo ${i + 1}:</b> ${b && b.niv.length ? `<span class="estado normal">${esc(b.verbo)} · ${esc(b.niv.join(" / "))}</span>` : `<span class="estado riesgo">«${esc(b ? b.verbo : "")}» no es un verbo del anexo de Bloom</span>`}</li>`; }).filter(Boolean);
    const sug = sugerencias(R, D).filter((t) => !objs.includes(t)).slice(0, 7);
    return `<div style="padding:10px 16px 0"><p class="sec-nota" style="padding:0 0 6px">${n >= 3 ? `<span class="estado normal">${n} objetivos</span>` : `<span class="estado riesgo">${n} de 3 objetivos mínimos</span>`}</p>
      ${est.length ? `<ul class="obj-est">${est.join("")}</ul>` : ""}
      <h4 class="sub" style="margin:10px 0 4px">Sugerencias según los hallazgos</h4>
      <ul class="obj-sug">${sug.map((t) => `<li><span>${esc(t)}</span><button class="btn peq" data-a="obj-usar" data-txt="${esc(t)}">Usar</button></li>`).join("")}</ul></div>`
      + verif([(ctx.ESQ.verificar.obj || {}).sug].filter(Boolean));
  };
  L.obj_bloom = ({ T }) => {
    const B = (T.t6 || {}).bloom || {};
    return `<div class="bloom">${Object.entries(B).map(([n, vs]) => `<div><b>${esc(n)}</b><span>${vs.map(esc).join(" · ")}</span></div>`).join("")}</div>` + nota("Complejidad de menor (conocimiento) a mayor (evaluación). " + esc((T.t6 || {}).fuente || ""));
  };

  // ---------------- Seguimiento ----------------
  L.seg_control = ({ R }) => { const G = R.SEG || {};
    return dl([["Programa", esc(R.Prox_Programa)], R.Ciclo === "NNA" ? ["Próximo control PSI (meses de edad)", esc(G.psi)] : null, ["Seguimiento por diagnóstico", esc(G.porDx)],
      ["Meses hasta el próximo control", esc(G.meses)], ["FECHA SUGERIDA DEL PRÓXIMO CONTROL", `<b>${fecha(R.Prox_Control)}</b>`], ["PSCV", esc(R.PSCV_Ingreso)], ["Programa alimentario", esc(R.Programa_Alim)]]); };
  L.seg_metas = ({ R }) => dl([["Peso", esc(R.Meta_Peso)], ["Circunferencia de cintura", esc(R.Meta_CC)], ["Laboratorio y PA", esc(R.Meta_Lab)]]);
  L.seg_deriv = ({ R }) => { const l = String(R.Derivaciones || "").split("\n").filter(Boolean);
    return l.length ? `<ul class="deriv">${l.map((x) => `<li>${esc(x.replace(/^• /, ""))}</li>`).join("")}</ul>` : nota("Sin derivaciones automáticas."); };

  // ---------------- Ficha resumen (1 hoja carta) ----------------
  // ---------- Pauta de porciones de intercambio (hoja para adjuntar al resumen o entregar al paciente) ----------
  const PREF = { "Cereales, papas y leguminosas frescas": /^(Marraqueta|Pan integral|Arroz \(cocido\)|Fideos \(cocidos\)|Papa cocida|Avena)/, "Verduras en general": /^(Tomate|Zanahoria cruda|Betarraga|Coliflor|Porotos verdes|Zapallo)/,
    "Frutas": /^(Manzana|Naranja|Plátano|Pera|Frutillas|Uvas)/, "Carnes bajas en grasa": /^(Huevo|Pollo|Vacuno magro|Pescado blanco|Atún en agua|Pavo)/, "Carnes altas en grasa": /^(Vacuno graso|Cerdo|Salmón|Carne molida|Atún en aceite)/ };
  const ejemplos = (grupo, med) => {
    const todos = (med || []).filter((m) => m[1] === grupo && !/^Otro –/.test(m[0]));
    const pref = PREF[grupo] ? todos.filter((m) => PREF[grupo].test(m[0])) : [];
    const lista = (pref.length ? pref : todos).slice().sort((x, y) => (/^Huevo/.test(y[0]) ? 1 : 0) - (/^Huevo/.test(x[0]) ? 1 : 0)).slice(0, 6);
    return lista.map((m) => m[0] + ": " + m[2]).join(" · ");
  };
  // Alergias / intolerancias y grupos que no consume (anamnesis clínica)
  const lista = (v) => (Array.isArray(v) ? v.filter((x) => x !== "Otro") : []);
  function alergiasTxt(D) {
    const a = D.ale_tiene === "Sí" ? [lista(D.ale_cuales).join(", ").toLowerCase(), D.ale_det || ""].filter(Boolean).join("; ") || "sí (sin detalle)" : D.ale_tiene === "No" ? "No refiere" : "";
    const viejo = D.px_alergias && !a ? String(D.px_alergias) : "";
    return a || viejo;
  }
  function noComeTxt(D) {
    if (D.noc_tiene !== "Sí") return D.noc_tiene === "No" ? "Consume todos los grupos" : "";
    const g = lista(D.noc_grupos).join(", ").toLowerCase(), m = lista(D.noc_motivo).join(", ").toLowerCase();
    return [g || "sin detalle", m ? "motivo: " + m : "", D.noc_det || ""].filter(Boolean).join("; ");
  }
  const conHuevo = (grupo, med) => (med || []).some((m) => m[1] === grupo && /^Huevo/.test(m[0]));
  const nombreGrupo = (grupo, med) => grupo + (conHuevo(grupo, med) ? " (incluye huevo)" : "");
  function pautaHoja({ R, D, T }) {
    const P = R.PD, med = T && T.t4 ? T.t4.med : [];
    if (!P || !isNum(R.GET_Final)) return "";
    const TI = (root.Calc && root.Calc.TIEMPOS) || [], g = P.grupos.map((x, i) => Object.assign({ i }, x)).filter((x) => isNum(x.usado) && x.usado > 0);
    if (!g.length) return "";
    const tUsados = TI.map((t, k) => k).filter((k) => P.tiempos.some((r) => r.fila[k] > 0));
    return `<div id="hojaPauta" class="hoja hoja-pauta">
      <h2>Pauta de alimentación · porciones de intercambio</h2>
      <p class="hoja-aviso">Herramienta académica de práctica</p>
      <table class="hr"><tbody>
        <tr><th>Nombre</th><td>${esc(D.nombre || "")}</td><th>Fecha</th><td>${esc(fecha(D.feval))}</td></tr>
        <tr><th>Energía</th><td>${f(R.GET_Final, 0)} kcal/día</td><th>Agua</th><td>${isNum(R.VHT_Vasos) ? f(R.VHT_Vasos, 1) + " vasos de 200 ml al día" : ""}</td></tr>
        ${D.ale_tiene === "Sí" || D.noc_tiene === "Sí" ? `<tr><th>Evitar / no consume</th><td colspan="3"><b>${esc([D.ale_tiene === "Sí" ? "Alergias o intolerancias: " + alergiasTxt(D) : "", D.noc_tiene === "Sí" ? "No consume: " + noComeTxt(D) : ""].filter(Boolean).join(". "))}</b> · Reemplace esas porciones por otro alimento del mismo grupo o de un grupo equivalente.</td></tr>` : ""}
        <tr class="sec"><td colspan="4">Porciones al día por grupo de alimentos</td></tr>
        <tr><th>Grupo</th><th style="width:11%">Porciones al día</th><th colspan="2">1 porción equivale a (ejemplos)</th></tr>
        ${g.map((x) => `<tr><td><b>${esc(nombreGrupo(x.grupo, med))}</b></td><td class="num"><b>${f(x.usado, 1).replace(/,0$/, "")}</b></td><td colspan="2" class="txt">${esc(ejemplos(x.grupo, med))}</td></tr>`).join("")}
      </tbody></table>
      ${tUsados.length ? `<table class="hr" style="margin-top:8px"><tbody>
        <tr class="sec"><td colspan="${tUsados.length + 1}">Distribución sugerida por tiempo de comida (porciones)</td></tr>
        <tr><th>Grupo</th>${tUsados.map((k) => `<th>${esc(TI[k])}</th>`).join("")}</tr>
        ${g.map((x) => `<tr><td>${esc(nombreGrupo(x.grupo, med))}</td>${tUsados.map((k) => `<td class="num">${P.tiempos[x.i].fila[k] ? f(P.tiempos[x.i].fila[k], 1).replace(/,0$/, "") : ""}</td>`).join("")}</tr>`).join("")}
      </tbody></table>` : ""}
      ${R.PD_Texto && R.PD_Texto !== "Faltan datos para la prescripción" ? `<p class="pauta-pd"><b>Prescripción dietética:</b> ${esc(R.PD_Texto)}</p>` : ""}
      <p class="sec-nota" style="padding:6px 0 0">Medidas caseras: tabla de porciones de intercambio y medidas caseras de la planilla (TAB_INTERCAMBIO y TAB_MEDIDAS_CASERAS).</p>
      <p class="firma">Firma y timbre del nutricionista: ______________________________</p>
      ${root.AUTORIA ? `<p class="autoria">${esc(root.AUTORIA)}</p>` : ""}
    </div>`;
  }

  L.resumen = ({ R, D, ui, T }) => {
    const incSeg = D.res_seg !== "No", incPauta = D.res_pauta === "Sí";
    const pv = (R.SEG && R.SEG.prev) || [], pvN = ["EMP", "EMPAM", "AUDIT", "Presión arterial", "Peso, talla y CC", "Glicemia", "Colesterol total", "PAP", "Mamografía", "EFAM / Barthel"];
    const pvHay = pv.some((x, i) => D["prev_" + String(i).padStart(2, "0")]);
    const pvTxt = !pvHay ? "" : ["Vigente", "Pendiente"].map((e) => { const l = pv.map((x, i) => (x.est.startsWith(e) ? pvN[i] + (x.est.includes("vencido") ? " (vencido)" : "") : "")).filter(Boolean); return l.length ? (e === "Vigente" ? "Al día: " : "Pendientes: ") + l.join(", ") : ""; }).filter(Boolean).join(". ");
    const objs = [1, 2, 3, 4, 5].map((i) => String(D["obj_" + i] || "").trim()).filter(Boolean);
    const der = String(R.Derivaciones || "").split("\n").filter(Boolean).map((x) => x.replace(/^• /, "")).concat(D.deriv_libre ? [String(D.deriv_libre)] : []);
    // Solo se muestra lo evaluado: se omiten los datos vacíos, «—», «No aplica», «Falta dato» o «Sin dato»
    const vacioTxt = (v) => v == null || /^\s*(—|-|No aplica|Falta dato|Sin dato|Sin datos|Sin exámenes registrados|No corresponde|undefined)?\s*$/i.test(String(v)) || /^(—|No aplica|Falta dato)( |$)/.test(String(v));
    const tabla = (items) => { const it = items.filter(([, v]) => !vacioTxt(v)); let h = "";
      for (let k = 0; k < it.length; k += 2) { const [a, b] = it[k], c = it[k + 1]; h += `<tr><th>${esc(a)}</th><td>${esc(b)}</td>${c ? `<th>${esc(c[0])}</th><td>${esc(c[1])}</td>` : '<td colspan="2"></td>'}</tr>`; }
      return h; };
    const sec = (titulo, cuerpo) => (cuerpo ? `<tr class="sec"><td colspan="4">${esc(titulo)}</td></tr>` + cuerpo : "");
    const txt = (v) => (vacioTxt(v) ? "" : `<tr><td colspan="4" class="txt">${esc(v)}</td></tr>`);
    const nna = R.Ciclo === "NNA";
    // NNA (sin PC ni gestación): en vez del IMC se muestran los indicadores válidos con su puntaje Z y calificación; T/E siempre
    const zT = (z) => (isNum(z) ? "Z " + (z > 0 ? "+" : z < 0 ? "−" : "") + f(Math.abs(z), 2) : "");
    const indNNA = nna && !R.Embarazada && R.ind && !(R.PC && R.PC.activa) ? [["P/E", "PE", "P/E"], ["T/E", "TE", ""], ["P/T", "PT", "P/T"], ["IMC/E", "IMC", "IMC/E"], ["PCe/E", "PC", ""]]
      .filter(([, k]) => k === "TE" || (R.ind[k] && isNum(R.ind[k].Z)))
      .map(([n, k, m]) => { const i = R.ind[k] || {};
        return [n + (k === "IMC" && isNum(R.IMC) ? " (IMC " + f(R.IMC, 1) + ")" : ""), isNum(i.Z) ? zT(i.Z) + " · " + String(i.cls).replace(/^Longitud/, "Talla") + (m && R.IndicadorNNA === m ? " (indicador que manda)" : "") : (i.cls || "Falta dato")]; }) : null;
    const lab = labAlt(R);
    const metas = [R.Meta_Peso, R.Meta_CC].filter((x) => !vacioTxt(x)).map((x) => String(x).replace(/\.$/, "")).join(". ") + (D.metas_habitos ? ". " + D.metas_habitos : "");
    return `<div class="res-ops"><span>Incluir en el resumen:</span>
      <label><input type="checkbox" data-a="res-op" data-op="res_seg" ${incSeg ? "checked" : ""}> Seguimiento y derivaciones</label>
      <label><input type="checkbox" data-a="res-op" data-op="res_pauta" ${incPauta ? "checked" : ""}> Pauta de porciones de intercambio (hoja aparte)</label></div>
    <div id="hojaResumen" class="hoja">
      <h2>Ficha resumen de atención nutricional</h2>
      <p class="hoja-aviso">Herramienta académica de práctica</p>
      <table class="hr"><tbody>
        ${sec("Paciente", tabla([["Nombre", D.nombre], ["RUT", D.rut], ["Sexo / edad", (D.sexo || "") + (R.Edad_Texto ? " · " + R.Edad_Texto : "")], ["Fecha evaluación", fecha(D.feval)],
          ["Ciclo vital / grupo", R.Ciclo ? R.Ciclo + " · " + R.GrupoEtario : ""], ["Programa", R.Prox_Programa],
          ["Vive con", (D.so_vive || "") + (() => { const f = []; for (let i = 0; i < 12; i++) { const k = "fam_" + String(i).padStart(2, "0") + "_", pa = D[k + "par"], ed = D[k + "edad"]; if (pa || isNum(ed)) f.push((pa || "integrante") + (isNum(ed) ? " (" + ed + ")" : "")); } return f.length ? ": " + f.join(", ") : ""; })()]]))}
        ${sec("Evaluación", tabla([["Peso / talla", R.Peso === "" ? "" : f(R.Peso, 1) + " kg" + (R.Talla_cm === "" ? "" : " · " + f(R.Talla_cm, 1) + " cm")], ...(indNNA ? [] : [["IMC", isNum(R.IMC) ? f(R.IMC, 1) + " kg/m²" : ""]]),
          ["Calificación nutricional", vacioTxt(R.Calificacion_Nutricional) ? "" : R.Calificacion_Nutricional + (vacioTxt(R.Indicador_Ref) ? "" : " según " + R.Indicador_Ref)],
          ...(indNNA ? indNNA : [["Talla", nna && !R.Embarazada ? R.Dx_Talla : ""], ["Puntaje Z", nna && !R.Embarazada ? R.Z_Ref : ""]]),
          ...(R.Embarazada && R.GES ? [["Semanas de gestación", isNum(R.SG) ? f(R.SG, 0) + " SG" + (R.GES.mult ? " · embarazo múltiple" : "") : ""],
            ["Estado pregestacional", isNum(R.GES.imcPre) ? "IMC " + f(R.GES.imcPre, 1) + " · " + R.GES.enPre + " (incremento recomendado " + R.GES.rangoTxt + " kg)" : ""],
            ["Incremento de peso", isNum(R.GES.incSemG) ? f(R.GES.incSemG, 0) + " g/sem · " + R.GES.incCls : ""],
            ["Kcal extra por embarazo", R.GES.extra ? f(R.GES.extra, 0) + " kcal/día (meta " + f(R.GES.meta, 1) + " kg)" : ""]] : []),
          ...(R.Nodriza ? [["Nodriza", isNum(D.nod_meses) ? f(D.nod_meses, 0) + " meses posparto" : "Sí"]] : []), ["Circunferencia de cintura", D.cc ? D.cc + " cm · " + R.Riesgo_CC : ""],
          ["Presión arterial", R.PAS === "" ? "" : R.PAS + "/" + R.PAD + " mmHg"], ["Clasificación PA", R.PAS === "" ? "" : R.PA_Clasificacion],
          ["Riesgo cardiovascular", R.RCV_Cat], ["Exámenes preventivos", pvTxt],
          ["Deposiciones", [D.px_depos ? String(D.px_depos).toLowerCase() : "", D.px_bristol ? "Bristol " + String(D.px_bristol).replace("Tipo ", "tipo ") : "", D.px_depos_lact || ""].filter(Boolean).join(" · ")],
          ["Control con dentista", R.Ciclo === "NNA" && D.od_control ? D.od_control + (D.od_fecha ? " (último: " + fecha(D.od_fecha) + ")" : "") : ""],
          ["Alergias / intolerancias", alergiasTxt(D)], ["Grupos que no consume", noComeTxt(D)],
          ["Examen físico", [D.ef_conj ? "conjuntivas " + D.ef_conj.toLowerCase() : "", Array.isArray(D.ef_cuello) && D.ef_cuello.length ? "cuello: " + D.ef_cuello.join(", ").toLowerCase() : "", D.ef_pelo ? "pelo y uñas " + D.ef_pelo.toLowerCase() : "", Array.isArray(D.ef_mucosas) && D.ef_mucosas.length ? "mucosas " + D.ef_mucosas.join(", ").toLowerCase() : ""].filter(Boolean).join(" · ")], ["Exámenes alterados", /^Sin exámenes registrados/.test(lab) ? "" : lab]]))}
        ${sec("Requerimientos", tabla([["Peso usado", R.Peso_Usado === "" ? "" : f(R.Peso_Usado, 1) + " kg (" + R.PesoTipo + ")"], ["Fórmula", R.Formula_Usada],
          ["Energía", isNum(R.GET_Final) ? f(R.GET_Final, 0) + " kcal/día · " + f(R.Kcal_Kg, 1) + " kcal/kg · " + R.Nom_Kcal : ""], ["VHT", isNum(R.VHT) ? f(R.VHT, 0) + " ml/día (" + f(R.VHT_Vasos, 1) + " vasos)" : ""],
          ["Proteínas", isNum(R.Prot_g) ? f(R.Prot_g, 1) + " g · " + f(R.Prot_Gkg, 2) + " g/kg · " + f(R.Prot_Pct, 0) + " % · " + R.Prot_Nom : ""], ["Lípidos", isNum(R.Lip_g) ? f(R.Lip_g, 1) + " g · " + R.Lip_Pct + " % · " + R.Lip_Nom : ""],
          ["Hidratos de carbono", isNum(R.CHO_g) ? f(R.CHO_g, 1) + " g · " + f(R.CHO_Pct_Usado, 0) + " % · " + R.CHO_Nom : ""], ["Fibra", isNum(R.Fibra_g) ? f(R.Fibra_g, 0) + " g/día" : ""]]))}
        ${sec("Diagnóstico nutricional integrado", txt(R.DNI))}
        ${sec("Prescripción dietética", txt(R.PD_Texto === "Faltan datos para la prescripción" ? "" : R.PD_Texto))}
        ${sec("Anamnesis alimentaria", txt(/^Recordatorio sin datos/i.test(String(R.Rec24_Conclusion || "")) ? "" : R.Rec24_Conclusion) + txt(R.TFC_Conclusion && R.TFC_Conclusion !== "TFC sin datos." ? "Tendencia de consumo: " + R.TFC_Conclusion : ""))}
        ${sec("Objetivos nutricionales", objs.length ? `<tr><td colspan="4" class="txt"><ol>${objs.map((o) => `<li>${esc(o)}</li>`).join("")}</ol></td></tr>` : "")}
        ${!incSeg ? "" : sec("Seguimiento", tabla([["Próximo control", fecha(R.Prox_Control)], ["PSCV", R.PSCV_Ingreso], ["Metas", metas]]) + (der.length ? `<tr><th>Derivaciones</th><td colspan="3" class="txt">${der.map(esc).join("<br>")}</td></tr>` : ""))}
      </tbody></table>
      <p class="firma">Firma y timbre del nutricionista: ______________________________</p>
      ${root.AUTORIA ? `<p class="autoria">${esc(root.AUTORIA)}</p>` : ""}
    </div>
    ${incPauta ? (pautaHoja({ R, D, T }) || '<p class="sec-nota" style="padding:0 16px 10px">La pauta de porciones aparece cuando hay requerimiento de energía (peso, talla y actividad física).</p>') : ""}
    <div class="acciones resumen-acc" style="padding:4px 16px 16px;display:flex;gap:10px;flex-wrap:wrap">
      <button class="btn" data-a="imprimir-resumen">Imprimir resumen (carta)</button>
      <button class="btn" data-a="imprimir-pauta">Imprimir solo la pauta de porciones</button>
      <button class="btn pri" data-a="guardar-paciente">Guardar paciente</button>
    </div>`;
  };

  // exámenes con resultado fuera de rango (ficha resumen) + hallazgos de la planilla (Lab_ODIN)
  function labAlt(R) {
    const f = (R.LAB || []).filter((x) => x.v !== "" && x.cls && !/^(Normal|A1|\(ver|Sin|No aplica|—|Falta)/.test(x.cls)).map((x) => x.n.replace(/ \(.*\)$/, "") + " (" + x.cls.charAt(0).toLowerCase() + x.cls.slice(1) + ")");
    const t = f.join(", ");
    return t ? t + (R.Lab_ODIN ? ". " + R.Lab_ODIN.charAt(0).toUpperCase() + R.Lab_ODIN.slice(1) : "") : R.LAB && R.LAB.some((x) => x.v !== "") ? "Sin exámenes alterados" : "Sin exámenes registrados";
  }
  root.Etapa6 = { live: L, sugerencias, nivelBloom, pautaHoja, nombreGrupo };
  if (root.Etapa2) Object.assign(root.Etapa2.live, L);
})(this);
