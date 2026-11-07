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
  L.pd_texto = ({ R }) => `<p class="concl">${esc(R.PD_Texto)}</p>` + dl([
    ["Energía", isNum(R.GET_Final) ? f(R.GET_Final, 0) + " kcal/día · " + f(R.Kcal_Kg, 1) + " kcal/kg" : "—"],
    ["Proteínas", isNum(R.Prot_g) ? f(R.Prot_g, 1) + " g · " + f(R.Prot_Gkg, 2) + " g/kg · " + f(R.Prot_Pct, 0) + " %" : "—"],
    ["Lípidos", isNum(R.Lip_g) ? f(R.Lip_g, 1) + " g · " + f(+R.Lip_Pct, 0) + " %" : "—"],
    ["Hidratos de carbono", isNum(R.CHO_g) ? f(R.CHO_g, 1) + " g · " + f(R.CHO_Pct_Usado, 0) + " %" : "—"],
    ["Fibra · azúcares libres (máx.)", (isNum(R.Fibra_g) ? f(R.Fibra_g, 0) + " g" : "—") + " · " + (isNum(R.Azuc_Max) ? f(R.Azuc_Max, 0) + " g" : "—")],
    ["VHT", isNum(R.VHT) ? f(R.VHT, 0) + " ml/día (" + f(R.VHT_Vasos, 1) + " vasos)" : "—"],
  ]) + `<div class="acciones" style="padding:0 16px 12px"><button class="btn peq" data-a="copiar-txt" data-txt="${esc(R.PD_Texto)}">Copiar PD</button></div>`
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
  L.resumen = ({ R, D, ui }) => {
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
    const lab = labAlt(R);
    const metas = [R.Meta_Peso, R.Meta_CC].filter((x) => !vacioTxt(x)).map((x) => String(x).replace(/\.$/, "")).join(". ") + (D.metas_habitos ? ". " + D.metas_habitos : "");
    return `<div id="hojaResumen" class="hoja">
      <h2>Ficha resumen de atención nutricional</h2>
      <p class="hoja-aviso">Herramienta académica de práctica</p>
      <table class="hr"><tbody>
        ${sec("Paciente", tabla([["Nombre", D.nombre], ["RUT", D.rut], ["Sexo / edad", (D.sexo || "") + (R.Edad_Texto ? " · " + R.Edad_Texto : "")], ["Fecha evaluación", fecha(D.feval)],
          ["Ciclo vital / grupo", R.Ciclo ? R.Ciclo + " · " + R.GrupoEtario : ""], ["Programa", R.Prox_Programa]]))}
        ${sec("Evaluación", tabla([["Peso / talla", R.Peso === "" ? "" : f(R.Peso, 1) + " kg" + (R.Talla_cm === "" ? "" : " · " + f(R.Talla_cm, 1) + " cm")], ["IMC", isNum(R.IMC) ? f(R.IMC, 1) + " kg/m²" : ""],
          ["Calificación nutricional", vacioTxt(R.Calificacion_Nutricional) ? "" : R.Calificacion_Nutricional + (vacioTxt(R.Indicador_Ref) ? "" : " según " + R.Indicador_Ref)], ["Talla", nna && !R.Embarazada ? R.Dx_Talla : ""],
          ["Puntaje Z", nna && !R.Embarazada ? R.Z_Ref : ""],
          ...(R.Embarazada && R.GES ? [["Semanas de gestación", isNum(R.SG) ? f(R.SG, 0) + " SG" + (R.GES.mult ? " · embarazo múltiple" : "") : ""],
            ["Estado pregestacional", isNum(R.GES.imcPre) ? "IMC " + f(R.GES.imcPre, 1) + " · " + R.GES.enPre + " (incremento recomendado " + R.GES.rangoTxt + " kg)" : ""],
            ["Incremento de peso", isNum(R.GES.incSemG) ? f(R.GES.incSemG, 0) + " g/sem · " + R.GES.incCls : ""],
            ["Kcal extra por embarazo", R.GES.extra ? f(R.GES.extra, 0) + " kcal/día (meta " + f(R.GES.meta, 1) + " kg)" : ""]] : []),
          ...(R.Nodriza ? [["Nodriza", isNum(D.nod_meses) ? f(D.nod_meses, 0) + " meses posparto" : "Sí"]] : []), ["Circunferencia de cintura", D.cc ? D.cc + " cm · " + R.Riesgo_CC : ""],
          ["Presión arterial", R.PAS === "" ? "" : R.PAS + "/" + R.PAD + " mmHg"], ["Clasificación PA", R.PAS === "" ? "" : R.PA_Clasificacion],
          ["Riesgo cardiovascular", R.RCV_Cat], ["Exámenes alterados", /^Sin exámenes registrados/.test(lab) ? "" : lab]]))}
        ${sec("Requerimientos", tabla([["Peso usado", R.Peso_Usado === "" ? "" : f(R.Peso_Usado, 1) + " kg (" + R.PesoTipo + ")"], ["Fórmula", R.Formula_Usada],
          ["Energía", isNum(R.GET_Final) ? f(R.GET_Final, 0) + " kcal/día · " + f(R.Kcal_Kg, 1) + " kcal/kg · " + R.Nom_Kcal : ""], ["VHT", isNum(R.VHT) ? f(R.VHT, 0) + " ml/día (" + f(R.VHT_Vasos, 1) + " vasos)" : ""],
          ["Proteínas", isNum(R.Prot_g) ? f(R.Prot_g, 1) + " g · " + f(R.Prot_Gkg, 2) + " g/kg · " + f(R.Prot_Pct, 0) + " % · " + R.Prot_Nom : ""], ["Lípidos", isNum(R.Lip_g) ? f(R.Lip_g, 1) + " g · " + R.Lip_Pct + " % · " + R.Lip_Nom : ""],
          ["Hidratos de carbono", isNum(R.CHO_g) ? f(R.CHO_g, 1) + " g · " + f(R.CHO_Pct_Usado, 0) + " % · " + R.CHO_Nom : ""], ["Fibra", isNum(R.Fibra_g) ? f(R.Fibra_g, 0) + " g/día" : ""]]))}
        ${sec("Diagnóstico nutricional integrado", txt(R.DNI))}
        ${sec("Prescripción dietética", txt(R.PD_Texto === "Faltan datos para la prescripción" ? "" : R.PD_Texto))}
        ${sec("Anamnesis alimentaria", txt(/^Recordatorio sin datos/i.test(String(R.Rec24_Conclusion || "")) ? "" : R.Rec24_Conclusion) + txt(R.TFC_Conclusion && R.TFC_Conclusion !== "TFC sin datos." ? "Tendencia de consumo: " + R.TFC_Conclusion : ""))}
        ${sec("Objetivos nutricionales", objs.length ? `<tr><td colspan="4" class="txt"><ol>${objs.map((o) => `<li>${esc(o)}</li>`).join("")}</ol></td></tr>` : "")}
        ${sec("Seguimiento", tabla([["Próximo control", fecha(R.Prox_Control)], ["PSCV", R.PSCV_Ingreso], ["Metas", metas]]) + (der.length ? `<tr><th>Derivaciones</th><td colspan="3" class="txt">${der.map(esc).join("<br>")}</td></tr>` : ""))}
      </tbody></table>
      <p class="firma">Firma y timbre del nutricionista: ______________________________</p>
    </div>
    <div class="acciones resumen-acc" style="padding:4px 16px 16px;display:flex;gap:10px;flex-wrap:wrap">
      <button class="btn" data-a="imprimir-resumen">Imprimir resumen (carta)</button>
      <button class="btn pri" data-a="guardar-paciente">Guardar paciente</button>
    </div>`;
  };

  // exámenes con resultado fuera de rango (ficha resumen) + hallazgos de la planilla (Lab_ODIN)
  function labAlt(R) {
    const f = (R.LAB || []).filter((x) => x.v !== "" && x.cls && !/^(Normal|A1|\(ver|Sin|No aplica|—|Falta)/.test(x.cls)).map((x) => x.n.replace(/ \(.*\)$/, "") + " (" + x.cls.charAt(0).toLowerCase() + x.cls.slice(1) + ")");
    const t = f.join(", ");
    return t ? t + (R.Lab_ODIN ? ". " + R.Lab_ODIN.charAt(0).toUpperCase() + R.Lab_ODIN.slice(1) : "") : R.LAB && R.LAB.some((x) => x.v !== "") ? "Sin exámenes alterados" : "Sin exámenes registrados";
  }
  root.Etapa6 = { live: L, sugerencias, nivelBloom };
  if (root.Etapa2) Object.assign(root.Etapa2.live, L);
})(this);
