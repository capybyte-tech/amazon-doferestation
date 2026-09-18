// ===================== Mobile / narrow layout =====================
// Uses the shared state and helpers from main.js (year, pinned, stateSel, stateFocus,
// focus, focusTouched, DATA, fmt, STATE_NAMES, cum, maxStateTotal, pearson, render,
// pickState, setFocus, ensoValue, ensoPhase, SEV, LEG, DEF_YEARS, YEARS).

const mEl = id => document.getElementById(id);
const isMobile = () => document.documentElement.classList.contains("is-mobile");
// Switch to the stacked layout when the fixed 1672×941 canvas would shrink below 62%.
const wantMobile = () => Math.min(innerWidth / 1672, innerHeight / 941) < 0.62;

let mW = 0, MC = null;

// ---------- static parts ----------
mEl("mK1").innerHTML = `${fmt(totDef)} km²<span>LOST</span>`;
mEl("mK2").innerHTML = `${fmt(totFire)}<span>FIRE HOTSPOTS</span>`;

LEG.forEach(d => {
  const b = document.createElement("button");
  b.className = "m-lg"; b.type = "button"; b.dataset.k = d.k;
  b.innerHTML = `<span class="ring" style="border-color:${d.c}"><i style="background:${d.c}"></i></span>${d.label}`;
  b.addEventListener("click", () => setFocus(d.k));
  mEl("mLegend").appendChild(b);
});

[["var(--green)","= Annual deforestation (km²)"],["var(--orange)","= Fire hotspots (count)"],
 ["var(--red)","= El Niño (warmer oceans)"],["var(--cyan)","= La Niña (cooler oceans)"]].forEach(([c,t]) => {
  const s = document.createElement("span");
  s.innerHTML = `<b style="border-color:${c}"></b>${t}`;
  mEl("mBLegend").appendChild(s);
});

const slider = mEl("mYear");
slider.addEventListener("input", () => { pinned = year = +slider.value; render(); });

// ---------- hero marker ----------
function layoutHero(){
  const box = mEl("mHero"), w = box.clientWidth, h = box.clientHeight;
  const s = Math.max(w / 1672, h / 545);
  const ox = (w - 1672 * s) * 0.6, oy = (h - 545 * s) * 0.5; // matches object-position: 60% 50%
  const mk = mEl("mMarker");
  mk.style.left = (ox + 1058 * s) + "px";
  mk.style.top = (oy + 211 * s) + "px";
}

// ---------- charts ----------
function buildMobileCharts(){
  const W = mW, ml = 52, mr = 12, H = 400;
  const iw = W - ml - mr, step = iw / 20;
  const xm = y => ml + (y - 1999) / 20 * iw;
  const D = {top:36, bot:130, max:30000}, F = {top:178, bot:266, max:300000}, E = {top:310, base:340, amp:26, bot:370};
  const yd = v => D.bot - v / D.max * (D.bot - D.top);
  const yf = v => F.bot - v / F.max * (F.bot - F.top);

  const box = d3.select("#mCharts"); box.selectAll("*").remove();
  const s = box.append("svg").attr("width", W).attr("height", H).attr("viewBox", `0 0 ${W} ${H}`)
    .attr("aria-label", "Annual deforestation, fire hotspots and ENSO phase, 1999 to 2019. Drag across the chart or use the year slider.");

  const defs = s.append("defs");
  const lin = (id, stops, x2 = 0, y2 = 1, y1 = 0) => {
    const g = defs.append("linearGradient").attr("id", id).attr("x1", 0).attr("y1", y1).attr("x2", x2).attr("y2", y2);
    stops.forEach(([o, c, a]) => g.append("stop").attr("offset", o).attr("stop-color", c).attr("stop-opacity", a));
  };
  lin("mArea", [[0,"#2fae5c",.62],[1,"#0f3a22",.55]]);
  lin("mBar", [[0,"#ffb93d",1],[.55,"#f09a22",1],[1,"#c9730f",1]]);
  lin("mBarHi", [[0,"#ffd27a",1],[1,"#f09a22",1]]);
  lin("mRed", [[0,"#ff6a4a",1],[.6,"#ff3b2e",.7],[1,"#ff2d2d",.25]]);
  lin("mCyan", [[0,"#5ae8ff",1],[.6,"#27c3e6",.7],[1,"#1fb6d9",.25]], 0, 0, 1);
  const glow = defs.append("filter").attr("id","mGlow").attr("x","-50%").attr("y","-50%").attr("width","200%").attr("height","200%");
  glow.append("feGaussianBlur").attr("stdDeviation", 2).attr("result","b");
  const mg = glow.append("feMerge"); mg.append("feMergeNode").attr("in","b"); mg.append("feMergeNode").attr("in","SourceGraphic");
  const glowB = defs.append("filter").attr("id","mGlowB").attr("x","-50%").attr("y","-200%").attr("width","200%").attr("height","500%");
  glowB.append("feGaussianBlur").attr("stdDeviation", 4).attr("result","b");
  const mg2 = glowB.append("feMerge"); ["b","b","SourceGraphic"].forEach(i => mg2.append("feMergeNode").attr("in", i));

  // panel headers
  const head = (y, c, a, b) => {
    const t = s.append("text").attr("x", 0).attr("y", y).attr("fill", c).attr("font-size", 12.5).attr("letter-spacing", .3);
    t.append("tspan").text(a);
    t.append("tspan").attr("dx", 7).attr("font-size", 11.5).attr("opacity", .85).text(b);
  };
  head(D.top - 20, "var(--green)", "DEFORESTATION", "(km² per year)");
  head(F.top - 20, "var(--orange)", "FIRE HOTSPOTS", "(per year)");
  head(E.top - 14, "var(--cyan)", "ENSO", "(ocean index)");

  // grid & axes
  const grid = s.append("g");
  YEARS.forEach(y => grid.append("line").attr("x1", xm(y)).attr("x2", xm(y)).attr("y1", D.top - 4).attr("y2", E.bot)
    .attr("stroke", "var(--grid)").attr("stroke-dasharray", "2 3"));
  const ticks = [[yd(30000),"30,000"],[yd(15000),"15,000"],[yd(0),"0"],[yf(300000),"300,000"],[yf(150000),"150,000"],[yf(0),"0"],
                 [E.base - E.amp,"El Niño"],[E.base,"Neutral"],[E.base + E.amp,"La Niña"]];
  ticks.forEach(([y, t]) => {
    grid.append("line").attr("x1", ml).attr("x2", W - mr).attr("y1", y).attr("y2", y).attr("stroke", "var(--grid)").attr("stroke-dasharray", "2 3");
    grid.append("text").attr("x", ml - 6).attr("y", y + 3.5).attr("text-anchor", "end").attr("font-size", 9.5).attr("fill", "#c7cece").text(t);
  });
  [[D.bot,.26],[F.bot,.26],[E.bot,.34]].forEach(([y, o]) =>
    grid.append("line").attr("x1", ml).attr("x2", W - mr).attr("y1", y + .5).attr("y2", y + .5).attr("stroke", `rgba(255,255,255,${o})`));
  grid.append("line").attr("x1", ml + .5).attr("x2", ml + .5).attr("y1", D.top - 6).attr("y2", E.bot + 3).attr("stroke", "rgba(255,255,255,.45)");

  const ann = (g, x, y, num, tag, anchor) => {
    const t = g.append("text").attr("x", x).attr("y", y).attr("text-anchor", anchor || "start");
    t.append("tspan").attr("font-size", 11).attr("font-weight", 600).attr("fill", "#f3f6f6").text(num);
    t.append("tspan").attr("font-size", 10).attr("fill", "#c3cacb").attr("dx", 5).text(tag);
    return t;
  };

  // deforestation
  const gD = s.append("g").attr("class", "dim");
  const pts = DEF_YEARS.map(y => ({y, v: DATA.defor[y]}));
  const line = d3.line().x(d => xm(d.y)).y(d => yd(d.v)).curve(d3.curveMonotoneX);
  gD.append("path").attr("d", d3.area().x(d => xm(d.y)).y0(yd(0)).y1(d => yd(d.v)).curve(d3.curveMonotoneX)(pts)).attr("fill", "url(#mArea)");
  gD.append("path").attr("d", line(pts)).attr("fill", "none").attr("stroke", "var(--green)").attr("stroke-width", 1.6).attr("filter", "url(#mGlow)");
  const stLine = gD.append("path").attr("fill", "none").attr("stroke", "#eafff1").attr("stroke-width", 1.2).attr("stroke-dasharray", "4 3").attr("opacity", 0);
  gD.append("g").selectAll("circle").data(pts).join("circle").attr("cx", d => xm(d.y)).attr("cy", d => yd(d.v)).attr("r", 2.4).attr("fill", "var(--green)");
  const pk = d3.greatest(pts, d => d.v), mn = d3.least(pts, d => d.v);
  [pk, mn].forEach(p => gD.append("circle").attr("cx", xm(p.y)).attr("cy", yd(p.v)).attr("r", 4.2).attr("fill", "#a8f7c2").attr("filter", "url(#mGlow)"));
  ann(gD, xm(pk.y) + 8, yd(pk.v) - 4, fmt(pk.v), `(peak ${pk.y})`);
  ann(gD, xm(mn.y), yd(mn.v) - 10, fmt(mn.v), `(min ${mn.y})`, "middle");

  // fires
  const gF = s.append("g").attr("class", "dim");
  const bw = Math.max(4, step * 0.56);
  const fpts = YEARS.map(y => ({y, v: DATA.fires[y]}));
  const bars = gF.append("g").selectAll("rect").data(fpts).join("rect")
    .attr("x", d => xm(d.y) - bw / 2).attr("width", bw).attr("y", d => yf(d.v)).attr("height", d => F.bot - yf(d.v)).attr("fill", "url(#mBar)");
  const stBars = gF.append("g").selectAll("rect").data(YEARS).join("rect")
    .attr("x", y => xm(y) - bw / 2 + bw * .22).attr("width", bw * .56).attr("fill", "#fff3d6").attr("opacity", 0);
  const pf = d3.greatest(fpts, d => d.v);
  gF.append("circle").attr("cx", xm(pf.y)).attr("cy", yf(pf.v) - 5).attr("r", 3).attr("fill", "#ffc24a").attr("filter", "url(#mGlow)");
  ann(gF, xm(pf.y) + 8, yf(pf.v) - 3, fmt(pf.v), `(peak ${pf.y})`);

  // ENSO
  const gE = s.append("g").attr("class", "dim");
  const ts = d3.range(1999, 2019.01, 0.02).map(t => ({t, v: ensoValue(t)}));
  const cx = x => Math.max(ml + 1, Math.min(W - mr, x));
  const area = sign => d3.area().x(d => cx(xm(d.t))).y0(E.base).y1(d => E.base - (sign > 0 ? Math.max(0, d.v) : Math.min(0, d.v)) * E.amp).curve(d3.curveBasis);
  const edge = sign => d3.line().defined(d => sign > 0 ? d.v > .015 : d.v < -.015).x(d => cx(xm(d.t))).y(d => E.base - d.v * E.amp).curve(d3.curveBasis);
  gE.append("rect").attr("x", ml + 1).attr("y", E.base).attr("width", iw - 1).attr("height", 16).attr("fill", "#18a9c4").attr("opacity", .07);
  const gPos = gE.append("g"), gNeg = gE.append("g");
  gPos.append("path").attr("d", area(1)(ts)).attr("fill", "url(#mRed)");
  gPos.append("path").attr("d", edge(1)(ts)).attr("fill", "none").attr("stroke", "#ff5b45").attr("stroke-width", 1.8).attr("filter", "url(#mGlowB)");
  gNeg.append("path").attr("d", area(-1)(ts)).attr("fill", "url(#mCyan)");
  gNeg.append("path").attr("d", edge(-1)(ts)).attr("fill", "none").attr("stroke", "#4fe3ff").attr("stroke-width", 1.8).attr("filter", "url(#mGlowB)");
  gE.append("line").attr("x1", ml).attr("x2", W - mr).attr("y1", E.base).attr("y2", E.base).attr("stroke", "rgba(235,250,255,.8)").attr("stroke-width", 1.1);
  const top = DATA.enso.slice().sort((a, b) => SEV[b.sev] - SEV[a.sev])[0];
  const tc = top.end - .2, b0 = xm(tc - .7), b1 = xm(tc + .7);
  gE.append("path").attr("d", `M${b0},${E.top + 2} V${E.top - 3} H${b1} V${E.top + 2}`).attr("fill", "none").attr("stroke", "#e6ecec");
  const ph = top.phase.replace("Nino", "Niño").replace("Nina", "Niña");
  const lbl = (W < 480 ? `${top.sev} ${ph}` : `${top.sev} ${ph} ${top.start}-${String(top.end).slice(2)}`).toUpperCase();
  gE.append("text").attr("x", Math.min((b0 + b1) / 2, W - mr - lbl.length * 3.1)).attr("y", E.top - 7).attr("text-anchor", "middle")
    .attr("font-size", 9.5).attr("fill", "#eef2f2").text(lbl);

  // x axis: label every n years so labels never collide
  const n = [1, 2, 4, 5, 10].find(k => step * k >= 36);
  const xl = s.append("g").selectAll("g").data(YEARS).join("g").attr("transform", y => `translate(${xm(y)},0)`);
  xl.append("line").attr("y1", E.bot).attr("y2", E.bot + 5).attr("stroke", "rgba(255,255,255,.45)");
  xl.append("text").attr("y", E.bot + 20).attr("text-anchor", "middle").attr("font-size", 10).attr("fill", "#d4dada")
    .text(y => y).attr("opacity", y => (y - 1999) % n === 0 ? 1 : 0);

  // cursor
  const cur = s.append("g").attr("pointer-events", "none");
  const cl = cur.append("line").attr("y1", D.top - 8).attr("y2", E.bot + 6).attr("stroke", "#fff").attr("stroke-width", 1.4).attr("stroke-dasharray", "6 4").attr("opacity", .9);
  const cdDot = cur.append("circle").attr("r", 4.6).attr("fill", "#fff").attr("filter", "url(#mGlow)");
  const mk = (color) => {
    const t = cur.append("text");
    const a = t.append("tspan").attr("font-size", 11).attr("font-weight", 600).attr("fill", color);
    const b = t.append("tspan").attr("font-size", 10).attr("fill", "#c3cacb");
    return {t, a, b};
  };
  const cdL = mk("var(--green)"), cfL = mk("var(--orange)");
  const cfDot = cur.append("circle").attr("r", 2.4).attr("fill", "#fff");
  const ceDot = cur.append("circle").attr("r", 4.6).attr("fill", "#fff").attr("filter", "url(#mGlow)");
  const ceL = cur.append("text").attr("font-size", 10).attr("fill", "#eef2f2");
  const yLbl = cur.append("text").attr("y", E.bot + 20).attr("text-anchor", "middle").attr("font-size", 10.5).attr("font-weight", 600).attr("fill", "#fff");
  const yBg = cur.insert("rect", "text:last-of-type").attr("y", E.bot + 8).attr("height", 16).attr("width", 38).attr("fill", "var(--panel)");

  // touch / pointer
  const hit = s.append("rect").attr("x", ml - 10).attr("y", D.top - 20).attr("width", iw + 20).attr("height", E.bot - D.top + 46)
    .attr("fill", "transparent").style("touch-action", "pan-y").style("cursor", "crosshair");
  const pick = ev => {
    const [x] = d3.pointer(ev, s.node());
    const y = Math.max(1999, Math.min(2019, Math.round((x - ml) / step) + 1999));
    if (y !== year || y !== pinned){ pinned = year = y; render(); }
  };
  let dragging = false;
  hit.on("pointerdown", ev => { dragging = true; pick(ev); })
     .on("pointermove", ev => { if (dragging || ev.pointerType === "mouse") pick(ev); })
     .on("pointerup pointercancel pointerleave", () => { dragging = false; });

  MC = {xm, yd, yf, E, D, F, W, ml, mr, gD, gF, gE, gNeg, bars, stBars, stLine, line, cl, cdDot, cdL, cfL, cfDot, ceDot, ceL, yLbl, yBg, xl, n, pk, mn, pf};
}

function mCursor(){
  const c = MC; if (!c) return;
  const x = c.xm(year), right = x < c.W * 0.55;
  const put = (L, py, num, show) => {
    L.t.attr("text-anchor", right ? "start" : "end").attr("opacity", show ? 1 : 0);
    const lx = right ? x + 8 : x - 8;
    L.a.attr("x", lx).attr("y", py - 18).text(num);
    L.b.attr("x", lx).attr("y", py - 5).text(`(${year})`);
  };
  c.cl.attr("x1", x).attr("x2", x);
  const dv = DATA.defor[year];
  if (dv != null){
    c.cdDot.attr("cx", x).attr("cy", c.yd(dv)).attr("opacity", 1);
    put(c.cdL, c.yd(dv), fmt(dv), year !== c.pk.y && year !== c.mn.y);
  } else {
    c.cdDot.attr("opacity", 0);
    put(c.cdL, c.D.bot - 4, "no data", true);
    c.cdL.b.text("(pre-2004)");
  }
  const fy = c.yf(DATA.fires[year]);
  c.cfDot.attr("cx", x).attr("cy", fy - 5);
  put(c.cfL, fy - 6, fmt(DATA.fires[year]), year !== c.pf.y);
  c.bars.attr("fill", d => d.y === year ? "url(#mBarHi)" : "url(#mBar)");
  const ev = ensoValue(year), ph = ensoPhase(year);
  c.ceDot.attr("cx", x).attr("cy", c.E.base - ev * c.E.amp);
  c.ceL.attr("x", right ? x + 8 : x - 8).attr("y", ph.phase.startsWith("El") ? c.E.base + 20 : c.E.base - 12).attr("text-anchor", right ? "start" : "end")
    .text(ph.sev ? `${ph.sev} ${ph.phase}` : ph.phase);
  c.yLbl.attr("x", x).text(year);
  c.yBg.attr("x", x - 19);
  c.xl.select("text").attr("opacity", y => (y - 1999) % c.n === 0 && Math.abs(c.xm(y) - x) > 30 ? 1 : 0);
}

function mOverlay(){
  const c = MC; if (!c) return;
  c.stLine.attr("d", c.line(DEF_YEARS.map(y => ({y, v: DATA.deforState[stateSel][y]})))).attr("opacity", stateFocus ? .9 : 0);
  c.stBars.attr("y", y => c.yf(DATA.firesState[stateSel][y])).attr("height", y => c.F.bot - c.yf(DATA.firesState[stateSel][y]))
    .attr("opacity", stateFocus ? .55 : 0);
}

function mFocus(){
  document.querySelectorAll(".m-lg").forEach(b => b.setAttribute("aria-pressed", b.dataset.k === focus));
  if (!MC) return;
  const dimmed = focusTouched && focus, op = on => !dimmed || on ? 1 : .32;
  MC.gD.attr("opacity", op(focus === "canopy"));
  MC.gF.attr("opacity", op(focus === "loss"));
  MC.gE.attr("opacity", op(focus === "enso" || focus === "fires"));
  MC.gNeg.attr("opacity", dimmed && focus === "fires" ? .25 : 1);
}

function mStates(){
  const yy = Math.max(2004, year);
  mEl("mStateSub").textContent = `2004-${yy} (km²)`;
  const rows = Object.keys(STATE_NAMES).map(s => ({s, v: cum(s, yy), tot: cum(s, 2019)})).sort((a, b) => b.v - a.v).slice(0, 3);
  const box = mEl("mStateRows");
  while (box.children.length < 3){
    const b = document.createElement("button");
    b.type = "button"; b.className = "m-row";
    b.innerHTML = `<span class="nm"></span><span class="bar"><span class="trk"></span><span class="val"></span></span><span class="num"></span>`;
    b.addEventListener("click", () => pickState(b.dataset.s));
    box.appendChild(b);
  }
  rows.forEach((d, i) => {
    const b = box.children[i];
    b.dataset.s = d.s;
    b.classList.toggle("sel", d.s === stateSel);
    b.classList.toggle("focus", d.s === stateSel && stateFocus);
    b.setAttribute("aria-pressed", d.s === stateSel && stateFocus);
    b.setAttribute("aria-label", `${STATE_NAMES[d.s]}, ${fmt(d.v)} square kilometres. Show in callout`);
    b.querySelector(".nm").textContent = STATE_NAMES[d.s];
    b.querySelector(".trk").style.width = (d.tot / maxStateTotal * 90) + "%";
    b.querySelector(".val").style.width = (d.v / maxStateTotal * 60) + "%";
    b.querySelector(".num").textContent = fmt(d.v);
  });
}

function mText(){
  const d = year >= 2004 ? DATA.deforState[stateSel][year] : null;
  mEl("mCoTitle").textContent = `${year} · ${STATE_NAMES[stateSel]}`;
  mEl("mCoL1").textContent = d == null ? "NO DATA km² DEFORESTED" : `${fmt(d)} km² DEFORESTED`;
  mEl("mCoL2").textContent = `${fmt(DATA.firesState[stateSel][year])} FIRE HOTSPOTS`;
  mEl("mCoL3").textContent = ensoPhase(year).label;
  const r = stateFocus
    ? pearson(DEF_YEARS.map(y => DATA.deforState[stateSel][y]), DEF_YEARS.map(y => DATA.firesState[stateSel][y]))
    : rAll;
  mEl("mK3").innerHTML = `r = ${r.toFixed(2)}<span>ASSOCIATION</span>`;
  mEl("mK3a").textContent = `BETWEEN ANNUAL DEFORESTATION AND FIRE HOTSPOTS (${stateFocus ? STATE_NAMES[stateSel] + " ONLY · " : ""}NOT CAUSATION)`;
  slider.value = year;
  mEl("mYearOut").textContent = year;
}

function mobileUpdate(){
  if (!isMobile()) return;
  mText(); mStates(); mOverlay(); mCursor(); mFocus();
}

function setMode(){
  const mob = wantMobile();
  document.documentElement.classList.toggle("is-mobile", mob);
  if (!mob) return;
  layoutHero();
  const w = mEl("mCharts").clientWidth;
  if (w && w !== mW){ mW = w; buildMobileCharts(); }
  mobileUpdate();
}
addEventListener("resize", setMode);
setMode();
