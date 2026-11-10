/* Atención Nutricional APS — © 2026 Emilio Alejandro Espinoza Sotomayor, estudiante de Nutrición y Dietética, Universidad San Sebastián, sede De la Patagonia. Todos los derechos reservados. Prohibida su reproducción, distribución o modificación sin autorización escrita del autor. */
/* Etapa 3 — bloques de requerimientos: energía, macronutrientes, nutrientes críticos e hidratación.
   Se registran en Etapa2.live; cada renderer recibe ctx = { R, D, T, ESQ, ui, flash } y devuelve HTML. */
(function (root) {
  "use strict";
  const isNum = (v) => typeof v === "number" && isFinite(v);
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const f = (v, d) => isNum(v) ? v.toLocaleString("es-CL", { minimumFractionDigits: d, maximumFractionDigits: d }) : (v === "" || v == null ? "—" : esc(String(v)));
  const f0 = (v) => f(v, 0), f1 = (v) => f(v, 1), f2 = (v) => f(v, 2);
  // color según el formato condicional de la planilla (verde normal, naranja riesgo, rojo alterado)
  let COLORES = null;
  const pill = (t) => {
    if (t === "" || t == null || t === "—") return "—";
    const e = root.Calc && COLORES ? root.Calc.estadoColor(t, COLORES) : "";
    return e ? `<span class="estado ${e}">${esc(t)}</span>` : esc(t);
  };
  const dl = (rows) => `<dl class="calc">${rows.filter(Boolean).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`).join("")}</dl>`;
  const nota = (t) => `<p class="sec-nota">${t}</p>`;
  const verif = (lista) => lista.length ? `<p class="sec-nota verif-n">${lista.map((t) => esc(t)).join("<br>")}</p>` : "";
  const kpis = (items) => `<div class="kpis">${items.map(([k, v, s]) => `<div class="kpi"><span>${esc(k)}</span><b class="num">${v}</b>${s ? `<small>${s}</small>` : ""}</div>`).join("")}</div>`;
  const tabla = (head, rows, cls) => `<div class="tabla-w" style="padding:10px 16px 6px"><table class="pr res ${cls || ""}"><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`;
  const V = (ctx, k) => (ctx.ESQ.verificar.req || {})[k];
  const PESO_TXT = (R) => ({ "Actual": "peso actual", "Seco": "peso seco", "Máximo aceptable": "peso máximo aceptable", "Mínimo aceptable": "peso mínimo aceptable", "Ajustado": "peso ajustado", "Ideal": "peso ideal", "Ideal (talla baja)": "peso ideal para la talla (talla baja)" }[R.PesoTipo] || R.PesoTipo);
  const L = {};

  const faltaPeso = (R) => R.Peso === "" ? nota("Ingrese el peso en <b>Evaluación antropométrica</b> para calcular los requerimientos.") : R.Ciclo === "" ? nota("Ingrese la fecha de nacimiento y la de evaluación en <b>Datos del paciente</b>.") : "";
  const gestante = (R) => R.Embarazada ? nota("Gestante (reglas del proyecto; FAO 2007 + MINSAL 2015): proteínas 0,8-1,0 g/kg de peso ideal + 20 % de digestibilidad + 25 g (+ 50 g en embarazo múltiple desde la semana 20); lípidos 25-30 % de la DMC; CHO por diferencia. Micronutrientes: Guía Perinatal 2015, Tabla 3.")
    : R.Nodriza ? nota("Nodriza (reglas del proyecto): proteínas 0,8-1,0 g/kg + 20 % de digestibilidad + 15 g los primeros 6 meses o + 12,5 g después; lípidos 25-30 % de la DMC; CHO por diferencia. Micronutrientes: Guía Perinatal 2015, Tabla 3 (lactancia).") : "";

  // ---------------- Energía ----------------
  L.req_energia = (ctx) => {
    const { R } = ctx; COLORES = ctx.ESQ.colores;
    const fp = faltaPeso(R); if (fp) return fp;
    const E = R.EN, nna = R.Ciclo === "NNA";
    const usada = R.Formula_Usada, sug = E.Sugerida, aj = nna && (E.AjustePct || E.Ajuste);
    const ref = R.Kcal_Kg_Ref, Pu = R.Peso_Usado;
    const adecDe = (g) => (isNum(g) && isNum(ref) && ref && isNum(Pu) && Pu ? g / Pu / ref * 100 : "");
    const nomDe = (a) => (!isNum(a) ? "—" : a < 90 ? "Hipocalórico" : a <= 110 ? "Normocalórico" : "Hipercalórico");
    let h = gestante(R);
    h += kpis([
      ["GET final", isNum(R.GET_Final) ? f0(R.GET_Final) + " kcal/día" : "—", ""],
      ["Peso usado", isNum(R.Peso_Usado) ? f1(R.Peso_Usado) + " kg" : "—", esc(PESO_TXT(R))],
      ["kcal/kg de peso usado", f1(R.Kcal_Kg), nna ? `Referencia ${f1(R.Kcal_Kg_Ref)} kcal/kg · adecuación ${isNum(R.Adec_Kcal) ? f0(R.Adec_Kcal) + " %" : "—"}` : `Peso real: ${f1(R.Kcal_Kg_Real)} kcal/kg`],
      ["Nomenclatura (PD)", pill(R.Nom_Kcal), nna ? "< 90 % hipo · 90-110 % normo · > 110 % hiper" : "kcal/kg de peso real: < 25 hipo · 25-30 normo · > 30 hiper"],
    ]);
    const filas = [];
    for (const x of E.formulas) {
      if (x.aplica !== "Sí") continue;
      const us = x.nombre === usada;
      filas.push(`<tr class="${us ? "usada" : ""}"><td>${esc(x.nombre)}${x.nombre === sug ? ' <span class="chip">sugerida</span>' : ""}${us ? ' <span class="chip acc">usada</span>' : ""}</td>
        <td class="num">${f1(x.c)}</td><td class="num">${isNum(x.d) ? f2(x.d) : esc(x.d)}</td><td class="num">${x.e === "" ? "" : f0(x.e)}</td><td class="num">${aj ? f0(x.get) : `<b>${f0(x.get)}</b>`}</td>${aj ? `<td class="num"><b>${f0(x.getAj)}</b></td>` : ""}${nna ? `<td class="num">${isNum(adecDe(x.getAj)) ? f0(adecDe(x.getAj)) + " %" : "—"}</td><td>${pill(nomDe(adecDe(x.getAj)))}</td>` : ""}<td class="fuente-c">${esc(x.fuente)}</td></tr>`);
    }
    h += dl([
      ["Fórmula usada", esc(usada || "—") + (usada !== sug ? ` <span class="chip">elegida (sugerida: ${esc(sug)})</span>` : "")],
      ["GET calculado", isNum(R.GET_Calc) ? f0(R.GET_Calc) + " kcal/día" : esc(R.GET_Calc)],
      nna && E.AjustePct ? ["Ajuste hipo / hipercalórico", (E.AjustePct > 0 ? "+" : "") + f0(E.AjustePct) + " % del GET de la fórmula → " + f0(R.GET_Final) + " kcal/día"] : null,
      E.Ajuste ? ["Ajuste por objetivo", (E.Ajuste > 0 ? "+" : "") + f0(E.Ajuste) + " kcal/día"] : null,
      !nna || isNum(R.PAL_NNA) ? ["Factor de actividad", f2(R.Factor_AF) + " · actividad " + esc(R.Actividad.toLowerCase()) + ' <span class="chip">ligera 1,4 · moderada 1,7 · intensa 2,0</span>'] : null,
      nna ? ["Costo de crecimiento", f0(R.Costo_Crec) + " kcal/día"] : null,
      nna && R.Edad_Meses_Aprox !== "" && R.Edad_Meses_Aprox < 12 ? ["Tipo de alimentación", esc(E.AlimLact)] : null,
      nna && R.EdadEv_A >= 5 ? ["Ajuste del método rápido (≥ 5 años)", f2(R.Ajuste_Rapido) + " (ligera −15 % · moderada sin ajuste · intensa +15 %)"] : null,
      !nna ? ["kcal/kg del factorial", f1(R.KcalKg_Fact) + ` <span class="chip">${R.Malnutricion ? esc(R.Malnutricion.toLowerCase()) : "—"}</span>`] : null,
      !nna && R.Factor_Pat !== 1 ? ["Factor patológico (FAO/OMS)", f2(R.Factor_Pat)] : null,
    ]);
    if (E.PC && E.PC.activa) {
      h += `<h4 class="sub">Parálisis cerebral (Krick)</h4>` + dl([
        ["Factor Krick = actividad + (tono − 1)", isNum(R.Krick_Factor) ? f2(R.Krick_Factor) + ` (FA ${f2(R.Krick_FA)} · ${esc(R.Actividad.toLowerCase())}; tono ${f2(R.Tono_Factor)})` : esc(R.Krick_Factor)],
        ["Peso ideal / peso real", `${f1(E.PC.ideal)} / ${f1(E.PC.real)} kg`],
        ["Diferencia a recuperar", isNum(E.PC.dif) ? f0(E.PC.dif) + " g" + (E.PC.dif <= 0 ? " · peso real ≥ ideal: se usa el costo de crecimiento" : "") : "—"],
        ["Ganancia diaria necesaria", isNum(E.PC.gdia) && E.PC.gdia > 0 ? f1(E.PC.gdia) + ` g/día (${f0(E.PC.dif)} g ÷ ${E.PC.meta * 30} días)` : E.PC.meta === "" ? "Sin meta (vacío = costo de crecimiento)" : "—"],
        ["Energía de recuperación / crecimiento", isNum(R.Krick_Crec) ? f0(R.Krick_Crec) + " kcal/día" : esc(R.Krick_Crec)],
      ]);
    }
    const cab = ["Fórmulas que aplican", "GEB / TEE / kcal·kg", "Factor / peso", "Crecimiento", aj ? "GET fórmula" : "GET (kcal/día)"].concat(aj ? ["GET ajustado"] : [], nna ? ["% adecuación", "Nomenclatura"] : [], ["Fuente"]);
    h += tabla(cab, filas.length ? filas : [`<tr><td colspan="${cab.length}">Ninguna fórmula aplica con los datos actuales.</td></tr>`], "formulas");
    if (nna && E.AjustePct) {
      const a = R.Adec_Kcal, quiere = E.AjustePct > 0 ? "Hipercalórico" : "Hipocalórico";
      if (isNum(a) && R.Nom_Kcal !== quiere) h += `<p class="aviso-g">Con ${E.AjustePct > 0 ? "+" : ""}${f0(E.AjustePct)} % la adecuación queda en ${f0(a)} % de la referencia (${f1(ref)} kcal/kg): todavía es <b>${esc(R.Nom_Kcal.toLowerCase())}</b>. Para que sea ${quiere.toLowerCase()} debe quedar ${E.AjustePct > 0 ? "sobre 110 %" : "bajo 90 %"} (Consenso p. 21).</p>`;
    }
    const v = [];
    if (nna && R.EdadEv_A !== "" && R.EdadEv_A >= 1) v.push(V(ctx, "pal"));
    if (!nna) v.push(V(ctx, "V20"));
    if (!nna && ctx.D.req_factor_pat && /⚠/.test(ctx.D.req_factor_pat)) v.push(V(ctx, "V21"));
    if (E.PC && E.PC.activa) v.push(V(ctx, "krick"));
    return h + verif(v.filter(Boolean));
  };

  // ---------------- Macronutrientes ----------------
  L.req_macros = (ctx) => {
    const { R, D } = ctx; COLORES = ctx.ESQ.colores;
    const fp = faltaPeso(R); if (fp) return fp;
    if (!isNum(R.GET_Final)) return nota("Falta el GET (revise el bloque de energía).");
    const M = R.MAC, nna = R.Ciclo === "NNA", P = R.Peso_Usado;
    const gk = (g) => isNum(g) && isNum(P) && P ? f2(g / P) : "—";
    const fila = (n, g, kc, pct, nom) => `<tr><td>${n}</td><td class="num">${f1(g)}</td><td class="num">${f0(kc)}</td><td class="num">${f1(pct)}</td><td class="num">${gk(g)}</td><td>${pill(nom)}</td></tr>`;
    let h = gestante(R) + tabla(["Macronutriente", "g/día", "kcal", "% DMC", "g/kg", "Nomenclatura (PD)"], [
      fila("Proteínas", R.Prot_g, R.Prot_kcal, R.Prot_Pct, R.Prot_Nom),
      fila("Lípidos", R.Lip_g, R.Lip_kcal, R.Lip_Pct, R.Lip_Nom),
      fila("Hidratos de carbono", R.CHO_g, R.CHO_kcal, R.CHO_Pct_Usado, R.CHO_Nom),
      `<tr class="total"><td>Total</td><td></td><td class="num">${f0([R.Prot_kcal, R.Lip_kcal, R.CHO_kcal].reduce((a, v) => a + (isNum(v) ? v : 0), 0))}</td><td class="num">${f1(R.Suma_Pct)}</td><td></td><td>${pill(M.Validacion)}</td></tr>`]);
    h += `<h4 class="sub">Proteínas</h4>` + dl([
      ["Tipo usado", esc(R.Prot_Tipo) + (R.Prot_Tipo !== M.ProtAuto ? ` <span class="chip">automático: ${esc(M.ProtAuto)}</span>` : ' <span class="chip">automático</span>')],
      ["g/kg/día usado", f2(R.Prot_Gkg) + (isNum(D.mac_prot_gkg) ? ' <span class="chip">manual</span>' : "") + (M.ERC === "Sí" ? " → tope 0,8 g/kg por ERC" : "")],
      nna && isNum(R.Prot_NSI) ? ["Nivel seguro de ingesta (NSI)", f2(R.Prot_NSI) + " g/kg (+20 % desde 6 m; mínimo de referencia)"] : null,
      ["Alerta", pill(M.Alerta)],
      M.ERCNota ? ["ERC", esc(M.ERCNota)] : null,
      R.Prot_Sel ? ["Selección (PD)", esc(R.Prot_Sel)] : null,
    ]);
    h += `<h4 class="sub">Lípidos</h4>` + dl([
      ["% de la DMC", f0(R.Lip_Pct) + " %" + (vacioD(D.mac_lip_pct) ? ' <span class="chip">sugerido</span>' : ` <span class="chip">elegido (sugerido ${f0(M.LipSug)} %)</span>`)],
      ["AGS (máximo)", isNum(M.AGS_Pct) ? `< ${f0(M.AGS_Pct)} % · ${f1(M.AGS_g)} g` : "—"],
      ["AGPI", M.AGPI_Pct === "—" ? "—" : esc(M.AGPI_Pct) + " %" + (Array.isArray(M.AGPI_g) ? " · " + M.AGPI_g.map(f1).join(" – ") + " g" : "")],
      ["AGMI (por diferencia)", isNum(M.AGMI_g) ? f1(M.AGMI_g) + " g" : "—"],
      R.Lip_Sel ? ["Selección (PD)", esc(R.Lip_Sel) + (vacioD(D.mac_lip_sel) ? ' <span class="chip">sugerida por DLP/ECV</span>' : "")] : null,
    ]);
    h += `<h4 class="sub">Hidratos de carbono</h4>` + dl([
      ["Control metabólico", pill(R.Control_Met) + (R.Control_Met !== M.CtrlAuto ? ` <span class="chip">automático: ${esc(M.CtrlAuto)}</span>` : "")],
      isNum(R.Lab_HOMA) ? ["HOMA-IR", f2(R.Lab_HOMA) + " (corte 2,5)"] : null,
      ["Cálculo", esc(R.Cho_Modo) + (R.Cho_Modo === "Según control metabólico" ? ` (${f0(M.ChoCtrlPct)} %)` : "")],
      ["Fibra", isNum(R.Fibra_g) ? f0(R.Fibra_g) + " g/día" : "—"],
      ["Azúcares libres (máximo, < 10 % DMC)", isNum(R.Azuc_Max) ? f0(R.Azuc_Max) + " g/día" : "—"],
      R.CHO_Sel ? ["Selección (PD)", esc(R.CHO_Sel)] : null,
    ]);
    const v = [];
    if (R.Prot_Tipo === "Hiperproteico") v.push(V(ctx, nna ? "hiperNNA" : "V3"));
    if (R.Cho_Modo === "Según control metabólico") v.push(V(ctx, "V13"));
    if (D.ant_erc === "Sí") v.push(V(ctx, "erc"));
    return h + verif(v.filter(Boolean));
  };
  const vacioD = (v) => v === undefined || v === null || v === "";

  // ---------------- Nutrientes críticos (las filas con entradas las dibuja la app; aquí va el resumen) ----------------
  L.req_micro = (ctx) => {
    const { R } = ctx; COLORES = ctx.ESQ.colores;
    if (R.Grupo_RDI === "") return nota("Ingrese las fechas en <b>Datos del paciente</b>.");
    return dl([
      ["Grupo de edad RDI", esc(R.Grupo_RDI) + (R.Sexo_RDI ? " · " + (R.Sexo_RDI === "N" ? "ambos sexos" : R.Sexo_RDI === "F" ? "mujer" : "hombre") : "")],
      ["Micronutrientes en la PD", R.Micro_PD ? `<b>${esc(R.Micro_PD)}</b>` : "Ninguno"],
      ["Potasio (AI)", isNum(R.K_AI) ? f0(R.K_AI) + " mg/día" : "—"],
      ["Sodio (AI)", isNum(R.Na_AI) ? f0(R.Na_AI) + " mg/día · el límite usado arriba es OMS < 2.000 mg" : "—"],
    ]) + nota("Clasificación de la ingesta: insuficiencia < 90 %, suficiencia 90-110 %, exceso > 110 % (Consenso p. 21). «Alto en» = > 110 % de la RDI (Consenso p. 44). «Alto en hierro / vitamina D» también se sugiere desde el ODIN de laboratorio (etapa de exámenes). Tipo AI = ingesta adecuada.")
      + verif([V(ctx, "ul"), V(ctx, "sodio")].filter(Boolean));
  };

  // ---------------- Hidratación ----------------
  L.req_hid = (ctx) => {
    const { R } = ctx;
    const fp = faltaPeso(R); if (fp) return fp;
    const filas = R.HID.filter((h) => h.aplica === "Sí").map((h) => `<tr class="${h.n === R.Hid_Metodo ? "usada" : ""}"><td>${esc(h.n)}${h.n === R.Hid_Sugerido ? ' <span class="chip">sugerido</span>' : ""}${h.n === R.Hid_Metodo ? ' <span class="chip acc">usado</span>' : ""}</td><td class="num">${f0(h.ml)}</td><td class="num">${f1(h.vasos)}</td><td class="fuente-c">${esc(h.fuente)}</td></tr>`);
    return kpis([["VHT", isNum(R.VHT) ? f0(R.VHT) + " ml/día" : "—", esc(R.Hid_Metodo)], ["Vasos de 200 ml", f1(R.VHT_Vasos), "1 vaso = 200 ml (1 taza; Medidas caseras p. 18-21)"]])
      + tabla(["Método", "ml/día", "Vasos 200 ml", "Fuente"], filas.length ? filas : ['<tr><td colspan="4">Ningún método aplica.</td></tr>']);
  };

  root.Etapa3 = { live: L };
  if (root.Etapa2) Object.assign(root.Etapa2.live, L);
})(this);
