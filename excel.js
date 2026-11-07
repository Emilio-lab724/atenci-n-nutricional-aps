/* Exportar / importar pacientes en Excel (.xlsx) con SheetJS.
   Formato (un solo formato para 1 paciente o para el respaldo de todos):
   - Hoja «Resumen»: resultados principales de cada control (solo lectura; no se usa al importar).
   - Hoja «Datos»: una fila por respuesta → Paciente · ID paciente · N° control · Módulo · Sección · Pregunta · Respuesta · Clave · Dato técnico.
     Al importar se leen «ID paciente», «N° control», «Clave» y «Respuesta» (o «Dato técnico» cuando la respuesta es una lista compleja).
   - Hoja «Info»: una fila por paciente (ID, nombre, modo, creado). */
(function (root) {
  "use strict";
  // SheetJS 0.18.5 (licencia Apache 2.0) incluido en la app; si no carga, se intenta desde cdnjs
  const XLSX_URLS = ["vendor/xlsx.full.min.js", "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"];
  let cargando = null;
  function cargarXLSX() {
    if (root.XLSX) return Promise.resolve(root.XLSX);
    const una = (url) => new Promise((ok, mal) => { const s = document.createElement("script"); s.src = url; s.onload = () => (root.XLSX ? ok(root.XLSX) : mal(new Error("xlsx"))); s.onerror = () => mal(new Error("xlsx")); document.head.appendChild(s); });
    if (!cargando) cargando = una(XLSX_URLS[0]).catch(() => una(XLSX_URLS[1])).catch((e) => { cargando = null; throw e; });
    return cargando;
  }
  const vacio = (v) => v === undefined || v === null || v === "" || (Array.isArray(v) && !v.length);
  const pad2 = (n) => String(n).padStart(2, "0");

  // Etiqueta legible y ubicación (módulo · sección) de cada clave
  function indice(ESQ, NAVT, Calc) {
    const ix = {};
    for (const [mod, secs] of Object.entries(ESQ.secciones.general)) for (const s of secs) for (const k of [].concat(s.c || [], s.aj || [])) if (!ix[k]) ix[k] = [NAVT[mod] || mod, s.t];
    const T = Calc.TIEMPOS || [], G = Calc.GRUPOS_R24 || [];
    return (k, CAMPOS) => {
      const f = CAMPOS[k]; let m;
      if (ix[k]) return [ix[k][0], ix[k][1], f ? f.label : k];
      if ((m = /^r24_(\d\d)_(\w+)$/.exec(k))) return ["Recordatorio de 24 horas", "R24 por intercambio", `Fila ${+m[1] + 1}: ${{ tiempo: "tiempo", hora: "hora", prep: "preparación", alim: "alimento", n: "N° medidas", g: "gramos" }[m[2]] || m[2]}`];
      if ((m = /^rc_(\d\d)_(\w+)$/.exec(k))) return ["R24 detallado y tendencia de consumo", "R24 detallado (CARHE)", `Fila ${+m[1] + 1}: ${{ tiempo: "tiempo", hora: "hora", prep: "preparación", grupo: "grupo", alim: "alimento", n: "N° medidas", g: "gramos" }[m[2]] || m[2]}`];
      if ((m = /^tfc_(\d\d)_(\w+)$/.exec(k))) return ["R24 detallado y tendencia de consumo", "TFC", `Grupo ${+m[1] + 1}: ${{ frec: "frecuencia", veces: "veces", porc: "porciones por vez" }[m[2]] || m[2]}`];
      if ((m = /^pd_por_(\d+)$/.exec(k))) return ["Prescripción dietética", "Pauta en porciones", `Porciones grupo ${+m[1] + 1}`];
      if ((m = /^pd_dist_(\d+)$/.exec(k))) return ["Prescripción dietética", "Distribución", `% ${T[+m[1]] || "tiempo " + (+m[1] + 1)}`];
      if ((m = /^fam_(\d\d)_(\w+)$/.exec(k))) return ["Anamnesis social", "Integrantes del hogar", `Integrante ${+m[1] + 1}: ${m[2] === "par" ? "parentesco" : "edad"}`];
      return ["Otros", "", f ? f.label : k];
    };
  }
  function legible(v) {
    if (Array.isArray(v)) return v.map((x) => (x && typeof x === "object" ? [x.nombre, x.dosis, x.funcion].filter(Boolean).join(" · ") : String(x))).join(" | ");
    if (v && typeof v === "object") return JSON.stringify(v);
    return v;
  }

  async function exportar(pacientes, ctx) {
    const XLSX = await cargarXLSX();
    const { ESQ, NAVT, Calc, CAMPOS, TAB, version } = ctx, ub = indice(ESQ, NAVT, Calc);
    const datos = [["Paciente", "ID paciente", "N° control", "Fecha evaluación", "Módulo", "Sección", "Pregunta", "Respuesta", "Clave", "Dato técnico"]];
    const resumen = [["Paciente", "RUT", "N° control", "Fecha evaluación", "Edad", "Ciclo vital", "Peso (kg)", "Talla (cm)", "IMC", "Calificación nutricional", "GET (kcal/día)", "Proteínas (g)", "Lípidos (g)", "CHO (g)", "DNI", "Prescripción dietética", "Próximo control"]];
    const info = [["ID paciente", "Nombre", "RUT", "Modo", "Creado", "Controles", "Exportado", "Versión de la app"]];
    const ahora = new Date().toISOString().slice(0, 19).replace("T", " ");
    for (const p of pacientes) {
      info.push([p.id, p.nombre || "", p.rut || "", p.modo || "completa", p.creado || "", p.controles.length, ahora, version]);
      p.controles.forEach((c, i) => {
        const D = c.datos;
        for (const k of Object.keys(D)) {
          const v = D[k]; if (vacio(v)) continue;
          const [mod, sec, preg] = ub(k, CAMPOS), complejo = Array.isArray(v) && v.some((x) => x && typeof x === "object");
          datos.push([p.nombre || "", p.id, i + 1, D.feval || "", mod, sec, preg, legible(v), k, complejo ? JSON.stringify(v) : ""]);
        }
        let R = {}; try { R = Calc.calcular(D, { T: TAB }); } catch (e) { /* sin resultados */ }
        const n = (x, d) => (typeof x === "number" ? Math.round(x * 10 ** d) / 10 ** d : "");
        resumen.push([p.nombre || "", D.rut || "", i + 1, D.feval || "", R.Edad_Texto || "", R.Ciclo || "", n(R.Peso, 1), n(R.Talla_cm, 1), n(R.IMC, 1), R.Calificacion_Nutricional || "",
          n(R.GET_Final, 0), n(R.Prot_g, 1), n(R.Lip_g, 1), n(R.CHO_g, 1), R.DNI || "", R.PD_Texto || "", R.Prox_Control || ""]);
      });
    }
    const wb = XLSX.utils.book_new();
    const hoja = (aoa, anchos) => { const ws = XLSX.utils.aoa_to_sheet(aoa); ws["!cols"] = anchos.map((w) => ({ wch: w })); ws["!autofilter"] = { ref: ws["!ref"] }; return ws; };
    XLSX.utils.book_append_sheet(wb, hoja(resumen, [24, 12, 9, 14, 26, 9, 9, 9, 7, 22, 12, 11, 10, 10, 70, 70, 14]), "Resumen");
    XLSX.utils.book_append_sheet(wb, hoja(datos, [24, 16, 9, 14, 26, 32, 46, 40, 18, 20]), "Datos");
    XLSX.utils.book_append_sheet(wb, hoja(info, [16, 24, 12, 10, 24, 10, 20, 14]), "Info");
    return XLSX.write(wb, { bookType: "xlsx", type: "array" });
  }

  // Convierte lo que devuelva Excel (texto, número, fecha) al tipo que usa la app
  function valor(k, v, tec, CAMPOS) {
    if (tec) { try { return JSON.parse(tec); } catch (e) { /* sigue */ } }
    const f = CAMPOS[k] || {};
    const fecha = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    if (v instanceof Date) return /_hora$/.test(k) ? `${pad2(v.getHours())}:${pad2(v.getMinutes())}` : fecha(v);
    if (f.type === "multi") return String(v).split("|").map((x) => x.trim()).filter(Boolean);
    if (f.type === "date" || /^(fnac|feval|prev_\d\d)$/.test(k)) { if (typeof v === "number") return fecha(new Date(Math.round((v - 25569) * 86400000) + new Date().getTimezoneOffset() * 60000)); return String(v).trim(); }
    if (/_hora$/.test(k) && typeof v === "number") { const m = Math.round(v * 1440) % 1440; return `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`; }
    if (f.type === "number" || /_(n|g|veces|porc|edad)$/.test(k) || /^(pd_por|pd_dist)_/.test(k)) { const x = typeof v === "number" ? v : Number(String(v).replace(",", ".")); return isFinite(x) ? x : String(v); }
    return typeof v === "number" ? v : String(v);
  }

  async function importar(buf, ctx) {
    const XLSX = await cargarXLSX();
    const wb = XLSX.read(buf, { type: "array", cellDates: true });
    const ws = wb.Sheets["Datos"]; if (!ws) throw new Error("formato");
    const filas = XLSX.utils.sheet_to_json(ws, { defval: "" });
    const infoWs = wb.Sheets["Info"], infos = infoWs ? XLSX.utils.sheet_to_json(infoWs, { defval: "" }) : [];
    const P = new Map();
    for (const r of filas) {
      const id = String(r["ID paciente"] || "importado"), nc = Number(r["N° control"]) || 1, k = String(r["Clave"] || "").trim();
      if (!k) continue;
      if (!P.has(id)) P.set(id, { id, nombre: String(r["Paciente"] || ""), controles: [] });
      const p = P.get(id);
      while (p.controles.length < nc) p.controles.push({ id: "c" + (p.controles.length + 1), datos: {} });
      const v = valor(k, r["Respuesta"], r["Dato técnico"], ctx.CAMPOS);
      if (!vacio(v)) p.controles[nc - 1].datos[k] = v;
    }
    const out = [];
    for (const p of P.values()) {
      const inf = infos.find((x) => String(x["ID paciente"]) === p.id) || {};
      p.modo = inf["Modo"] === "flash" ? "flash" : "completa"; p.creado = String(inf["Creado"] || new Date().toISOString());
      p.controles = p.controles.filter((c) => Object.keys(c.datos).length);
      if (p.controles.length) out.push(p);
    }
    if (!out.length) throw new Error("vacío");
    return out;
  }

  root.ExcelPac = { exportar, importar, cargarXLSX };
})(this);
