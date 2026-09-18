const DATA = window.AMAZONIA_DATA;
const NS = "http://www.w3.org/2000/svg";
const svg = d3.select("#ui");
const fmt = d3.format(",");
const STATE_NAMES = {AC:"ACRE",AM:"AMAZONAS",AP:"AMAPÁ",MA:"MARANHÃO",MT:"MATO GROSSO",PA:"PARÁ",RO:"RONDÔNIA",RR:"RORAIMA",TO:"TOCANTINS"};
const YEARS = d3.range(1999, 2020);
const DEF_YEARS = d3.range(2004, 2020);

// ---------- geometry (stage px, matches the 1672×941 sketch) ----------
const X = y => 245 + (y - 1999) * 68.35;
const PX0 = 236, PX1 = 1652;
const yD = v => 690 - v / 30000 * 63;
const FB = 773, yF = v => FB - v / 300000 * 60;
const EB = 824, EAMP = 28;
const SEV = {"Weak":.34, "Moderate":.62, "Strong":.84, "Very Strong":1};

// ---------- state ----------
let pinned = 2019, year = 2019, stateSel = "PA", stateFocus = false, focus = "canopy", focusTouched = false;

// ---------- helpers ----------
const g = id => svg.select(id);
function ensoValue(t){
  let v = 0;
  for (const e of DATA.enso){
    const c = e.end - 0.2, s = .36;
    v += (e.phase.startsWith("El") ? 1 : -1) * SEV[e.sev] * Math.exp(-((t-c)**2)/(2*s*s));
  }
  return Math.max(-1, Math.min(1, v));
}
function ensoPhase(y){
  const e = DATA.enso.find(d => d.end === y) || DATA.enso.find(d => d.start === y);
  if (!e) return {sev:"", phase:"Neutral", label:"NEUTRAL ENSO"};
  const ph = e.phase.replace("Nino","Niño").replace("Nina","Niña");
  return {sev:e.sev, phase:ph, label:(e.sev + " " + ph).toUpperCase()};
}
function pearson(a,b){
  const ma=d3.mean(a), mb=d3.mean(b);
  let n=0,da=0,db=0;
  a.forEach((x,i)=>{n+=(x-ma)*(b[i]-mb);da+=(x-ma)**2;db+=(b[i]-mb)**2;});
  return n/Math.sqrt(da*db);
}

// ---------- KPIs ----------
const totDef = d3.sum(DEF_YEARS, y => DATA.defor[y]);
const totFire = d3.sum(YEARS, y => DATA.fires[y]);
const rAll = pearson(DEF_YEARS.map(y=>DATA.defor[y]), DEF_YEARS.map(y=>DATA.fires[y]));
d3.select("#kpi1").text(fmt(totDef) + " km²");
d3.select("#kpi2").text(fmt(totFire));
function updateR(){
  if (stateFocus){
    const r = pearson(DEF_YEARS.map(y=>DATA.deforState[stateSel][y]), DEF_YEARS.map(y=>DATA.firesState[stateSel][y]));
    d3.select("#kpi3").text("r = " + r.toFixed(2));
    d3.select("#kpi3a").text("BETWEEN ANNUAL DEFORESTATION AND FIRE HOTSPOTS");
    d3.select("#kpi3b").text(`(${STATE_NAMES[stateSel]} ONLY · NOT CAUSATION)`);
  } else {
    d3.select("#kpi3").text("r = " + rAll.toFixed(2));
    d3.select("#kpi3a").text("BETWEEN ANNUAL DEFORESTATION AND FIRE HOTSPOTS");
    d3.select("#kpi3b").text("(NOT CAUSATION)");
  }
}
updateR();

// ---------- legend (focus toggles) ----------
const LEG = [
  {k:"canopy", label:"CANOPY", c:"var(--green)", x:1256},
  {k:"loss",   label:"LOSS",   c:"var(--orange)", x:1372},
  {k:"fires",  label:"FIRES",  c:"var(--red)", x:1471},
  {k:"enso",   label:"ENSO",   c:"var(--cyan)", x:1583},
];
const lg = g("#legend").selectAll("g").data(LEG).join("g")
  .attr("class","lg").attr("tabindex",0).attr("role","button")
  .attr("aria-label", d => "Focus " + d.label.toLowerCase())
  .attr("transform", d => `translate(${d.x},584)`)
  .on("click", (ev,d) => setFocus(d.k))
  .on("keydown", (ev,d) => { if (ev.key==="Enter"||ev.key===" "){ev.preventDefault();setFocus(d.k);} });
lg.append("rect").attr("x",-14).attr("y",-14).attr("width", d => 34 + d.label.length*7.5).attr("height",28).attr("fill","transparent");
lg.append("circle").attr("class","ring").attr("r",10).attr("fill","none").attr("stroke", d=>d.c).attr("stroke-width",1.8);
lg.append("circle").attr("class","dot").attr("r",4.6).attr("fill", d=>d.c);
lg.append("text").attr("x",20).attr("y",5).attr("font-size",12.5).attr("fill","#e3e8e8").attr("letter-spacing",0).text(d=>d.label);

function setFocus(k){
  focus = (focus === k && focusTouched) ? null : k;
  focusTouched = true;
  applyFocus();
}
function applyFocus(){
  lg.select(".dot").attr("opacity", d => d.k === focus ? 1 : 0);
  const dimmed = focusTouched && focus;
  const op = (on) => !dimmed || on ? 1 : .32;
  g("#pDefor").attr("opacity", op(focus==="canopy"));
  g("#pFire").attr("opacity", op(focus==="loss"));
  g("#pEnso").attr("opacity", op(focus==="enso" || focus==="fires"));
  g("#ensoNeg").attr("opacity", dimmed && focus==="fires" ? .25 : 1);
  d3.select("#embers").style("opacity", !dimmed || focus==="fires" ? 1 : .35);
  emberBoost = dimmed && focus==="fires" ? 2.2 : 1;
  if (typeof mobileUpdate === "function") mobileUpdate();
}

// ---------- bottom legend ----------
const BL = [
  {x:38,  c:"var(--green)",  t:"= Annual deforestation (km²)"},
  {x:288, c:"var(--orange)", t:"= Fire hotspots (count)"},
  {x:503, c:"var(--red)",    t:"= El Niño (warmer oceans)"},
  {x:737, c:"var(--cyan)",   t:"= La Niña (cooler oceans)"},
];
const blg = g("#bottomLegend").selectAll("g").data(BL).join("g").attr("transform", d=>`translate(${d.x},911)`);
blg.append("circle").attr("r",9).attr("fill","none").attr("stroke",d=>d.c).attr("stroke-width",1.7);
blg.append("text").attr("x",19).attr("y",4.5).text(d=>d.t);

// ---------- axes & grid ----------
const ax = g("#axes");
// vertical year grid
YEARS.forEach(y => ax.append("line").attr("x1",X(y)).attr("x2",X(y)).attr("y1",617).attr("y2",855)
  .attr("stroke","var(--grid)").attr("stroke-dasharray","3 4"));
// horizontal dashed guides
[[yD(15000)],[yD(30000)],[yF(150000)],[yF(300000)],[EB-28],[EB+28]].forEach(([yy]) =>
  ax.append("line").attr("x1",PX0).attr("x2",PX1).attr("y1",yy).attr("y2",yy).attr("stroke","var(--grid)").attr("stroke-dasharray","3 4"));
// panel base rules
[[692,.26],[775,.26],[855,.34]].forEach(([yy,o]) =>
  ax.append("line").attr("x1",PX0).attr("x2",PX1).attr("y1",yy+.5).attr("y2",yy+.5).attr("stroke",`rgba(255,255,255,${o})`));
ax.append("line").attr("x1",PX0+.5).attr("x2",PX0+.5).attr("y1",620).attr("y2",858).attr("stroke","rgba(255,255,255,.45)");
// y tick labels
const yl = [["30,000",yD(30000)],["15,000",yD(15000)],["0",yD(0)],["300,000",yF(300000)],["150,000",yF(150000)],["0",yF(0)],["El Niño",EB-28],["Neutral",EB],["La Niña",EB+28]];
yl.forEach(([t,yy]) => {
  ax.append("text").attr("x",221).attr("y",yy+4).attr("text-anchor","end").attr("font-size",12).attr("fill","#c7cece").attr("letter-spacing",1).text(t);
  ax.append("line").attr("x1",228).attr("x2",PX0).attr("y1",yy+.5).attr("y2",yy+.5).attr("stroke","rgba(255,255,255,.45)");
});
// x axis labels
const xa = g("#xAxis").selectAll("g").data(YEARS).join("g").attr("transform", y=>`translate(${X(y)},0)`);
xa.append("line").attr("y1",855).attr("y2",861).attr("stroke","rgba(255,255,255,.45)");
xa.append("text").attr("class","xl").attr("y",884).attr("text-anchor","middle").attr("font-size",11.5).attr("fill","#d4dada").attr("letter-spacing",-.2).text(y=>y);

// ---------- deforestation panel ----------
const pD = g("#pDefor");
const defPts = DEF_YEARS.map(y => ({y, v:DATA.defor[y]}));
const area = d3.area().x(d=>X(d.y)).y0(yD(0)).y1(d=>yD(d.v)).curve(d3.curveMonotoneX);
const line = d3.line().x(d=>X(d.y)).y(d=>yD(d.v)).curve(d3.curveMonotoneX);
pD.append("path").attr("d", area(defPts)).attr("fill","url(#gArea)");
pD.append("path").attr("d", line(defPts)).attr("fill","none").attr("stroke","var(--green)").attr("stroke-width",1.8).attr("filter","url(#glow)");
const stateDefPath = pD.append("path").attr("fill","none").attr("stroke","#eafff1").attr("stroke-width",1.3).attr("stroke-dasharray","4 3").attr("opacity",0);
const stateDefDots = pD.append("g").attr("opacity",0);
pD.append("g").selectAll("circle").data(defPts).join("circle").attr("cx",d=>X(d.y)).attr("cy",d=>yD(d.v)).attr("r",3.2).attr("fill","var(--green)");
const peakD = d3.greatest(defPts, d=>d.v), minD = d3.least(defPts, d=>d.v);
[peakD, minD].forEach(p => pD.append("circle").attr("cx",X(p.y)).attr("cy",yD(p.v)).attr("r",5.2).attr("fill","#a8f7c2").attr("filter","url(#glow)"));
function annot(parent, x, y, num, tag, anchor){
  const t = parent.append("text").attr("x",x).attr("y",y).attr("text-anchor",anchor||"start").attr("letter-spacing",.2);
  t.append("tspan").attr("font-size",13).attr("font-weight",600).attr("fill","#f3f6f6").text(num);
  t.append("tspan").attr("font-size",12).attr("fill","#c3cacb").attr("dx",6).text(tag);
  return t;
}
const aPeakD = annot(pD, X(peakD.y)+14, yD(peakD.v)-9, fmt(peakD.v), `(peak ${peakD.y})`);
const aMinD  = annot(pD, X(minD.y)-46, yD(minD.v)-10, fmt(minD.v), `(min ${minD.y})`);

// ---------- fire panel ----------
const pF = g("#pFire");
const BW = 25;
const firePts = YEARS.map(y => ({y, v:DATA.fires[y]}));
const bars = pF.append("g").selectAll("rect").data(firePts).join("rect")
  .attr("x",d=>X(d.y)-BW/2).attr("width",BW).attr("y",d=>yF(d.v)).attr("height",d=>FB-yF(d.v)).attr("fill","url(#gBar)");
const stateBars = pF.append("g").selectAll("rect").data(YEARS).join("rect")
  .attr("x",y=>X(y)-BW/2+5).attr("width",BW-10).attr("fill","#fff3d6").attr("opacity",0);
const peakF = d3.greatest(firePts, d=>d.v);
pF.append("circle").attr("cx",X(peakF.y)).attr("cy",yF(peakF.v)-6).attr("r",3.8).attr("fill","#ffc24a").attr("filter","url(#glow)");
const aPeakF = annot(pF, X(peakF.y)+14, yF(peakF.v)-7, fmt(peakF.v), `(peak ${peakF.y})`);

// ---------- ENSO panel ----------
const pE = g("#pEnso");
pE.append("rect").attr("x",PX0+1).attr("y",EB).attr("width",PX1-PX0-1).attr("height",20).attr("fill","url(#gUnder)");
const ts = d3.range(1999, 2019.6, 0.02).map(t => ({t, v:ensoValue(t)}));
const clipX = x => Math.max(PX0+2, Math.min(PX1, x));
const ePos = d3.area().x(d=>clipX(X(d.t))).y0(EB).y1(d=>EB - Math.max(0,d.v)*EAMP).curve(d3.curveBasis);
const eNeg = d3.area().x(d=>clipX(X(d.t))).y0(EB).y1(d=>EB - Math.min(0,d.v)*EAMP).curve(d3.curveBasis);
const lPos = d3.line().defined(d=>d.v>0.015).x(d=>clipX(X(d.t))).y(d=>EB - Math.max(0,d.v)*EAMP).curve(d3.curveBasis);
const lNeg = d3.line().defined(d=>d.v<-0.015).x(d=>clipX(X(d.t))).y(d=>EB - Math.min(0,d.v)*EAMP).curve(d3.curveBasis);
const gPos = pE.append("g").attr("id","ensoPos");
gPos.append("path").attr("d",ePos(ts)).attr("fill","url(#gRed)").attr("filter","url(#soft)");
gPos.append("path").attr("d",lPos(ts)).attr("fill","none").attr("stroke","#ff5b45").attr("stroke-width",2).attr("filter","url(#glowBig)");
const gNeg = pE.append("g").attr("id","ensoNeg");
gNeg.append("path").attr("d",eNeg(ts)).attr("fill","url(#gCyan)").attr("filter","url(#soft)");
gNeg.append("path").attr("d",lNeg(ts)).attr("fill","none").attr("stroke","#4fe3ff").attr("stroke-width",2).attr("filter","url(#glowBig)");
pE.append("line").attr("x1",PX0).attr("x2",PX1).attr("y1",EB).attr("y2",EB).attr("stroke","rgba(235,250,255,.8)").attr("stroke-width",1.2);
// strongest event bracket
const topE = DATA.enso.slice().sort((a,b)=>SEV[b.sev]-SEV[a.sev])[0];
const tc = topE.end - .2, bx0 = X(tc-.7), bx1 = X(tc+.7);
pE.append("path").attr("d",`M${bx0},806 V800 H${bx1} V806`).attr("fill","none").attr("stroke","#e6ecec").attr("stroke-width",1);
pE.append("text").attr("x",(bx0+bx1)/2).attr("y",791).attr("text-anchor","middle").attr("font-size",11).attr("fill","#eef2f2").attr("letter-spacing",.1)
  .text(`${topE.sev} ${topE.phase.replace("Nino","Niño").replace("Nina","Niña")} ${topE.start}-${String(topE.end).slice(2)}`.toUpperCase());

// ---------- state bars (hero) ----------
const ROW_Y = [79,113,147];
const BAR_X = 1477, BAR_MAX = 80; // bright length for the largest total
const maxStateTotal = d3.max(Object.keys(STATE_NAMES), s => d3.sum(DEF_YEARS, y => DATA.deforState[s][y]));
function cum(s, y){ return d3.sum(DEF_YEARS.filter(d => d <= y), d => DATA.deforState[s][d]); }
function renderStates(){
  const yy = Math.max(2004, year);
  const rows = Object.keys(STATE_NAMES).map(s => ({s, v:cum(s, yy), tot:cum(s,2019)}))
    .sort((a,b)=>b.v-a.v).slice(0,3);
  d3.select("#stateSub").text(`2004-${yy} (km²)`);
  const k = BAR_MAX / maxStateTotal;
  const sel = g("#stateRows").selectAll("g.row").data(rows, d=>d.s).join(
    enter => {
      const r = enter.append("g").attr("class","row").attr("tabindex",0).attr("role","button")
        .attr("transform",(d,i)=>`translate(0,${ROW_Y[i]})`);
      r.append("rect").attr("class","hit").attr("x",1364).attr("y",-14).attr("width",300).attr("height",28).attr("rx",3);
      r.append("text").attr("class","nm").attr("x",1372).attr("y",5).attr("font-size",13).attr("letter-spacing",.6);
      r.append("rect").attr("class","trk").attr("x",BAR_X).attr("y",-7).attr("height",14).attr("fill","#1c4a2c").attr("opacity",.85);
      r.append("rect").attr("class","val").attr("x",BAR_X).attr("y",-7).attr("height",14).attr("fill","url(#gState)");
      r.append("text").attr("class","num").attr("y",5).attr("font-size",12.5).attr("fill","#eef2f2").attr("letter-spacing",.6);
      r.on("click",(ev,d)=>pickState(d.s)).on("keydown",(ev,d)=>{ if(ev.key==="Enter"||ev.key===" "){ev.preventDefault();pickState(d.s);} });
      return r;
    });
  sel.attr("aria-label", d => `${STATE_NAMES[d.s]}, ${fmt(d.v)} square kilometres. Show in callout`);
  sel.transition().duration(350).attr("transform",(d,i)=>`translate(0,${ROW_Y[i]})`);
  sel.select(".nm").text(d=>STATE_NAMES[d.s]).attr("fill", d => d.s===stateSel ? "#ffffff" : "#d5dcdc").attr("font-weight", d => d.s===stateSel && stateFocus ? 600 : 400);
  sel.select(".trk").attr("width", d => Math.max(4, d.tot*k*1.5));
  sel.select(".val").transition().duration(250).attr("width", d => d.v*k);
  sel.select(".num").attr("x", d => BAR_X + Math.max(4, d.tot*k*1.5) + 10).text(d=>fmt(d.v));
}
function pickState(s){
  if (s === stateSel && stateFocus) stateFocus = false;
  else { stateSel = s; stateFocus = true; }
  updateR(); renderOverlay(); render();
}
function renderOverlay(){
  const pts = DEF_YEARS.map(y=>({y, v:DATA.deforState[stateSel][y]}));
  stateDefPath.attr("d", line(pts)).transition().duration(300).attr("opacity", stateFocus ? .9 : 0);
  stateDefDots.selectAll("circle").data(pts).join("circle").attr("r",2.2).attr("fill","#eafff1").attr("cx",d=>X(d.y)).attr("cy",d=>yD(d.v));
  stateDefDots.transition().duration(300).attr("opacity", stateFocus ? .9 : 0);
  stateBars.attr("y", y=>yF(DATA.firesState[stateSel][y])).attr("height", y=>FB-yF(DATA.firesState[stateSel][y]))
    .transition().duration(300).attr("opacity", stateFocus ? .55 : 0);
}

// ---------- callout ----------
function renderCallout(){
  const d = year >= 2004 ? DATA.deforState[stateSel][year] : null;
  const f = DATA.firesState[stateSel][year];
  d3.select("#coTitle").text(`${year} · ${STATE_NAMES[stateSel]}`);
  d3.select("#coL1").text(d == null ? "NO DATA  km² DEFORESTED" : `${fmt(d)} km² DEFORESTED`);
  d3.select("#coL2").text(`${fmt(f)} FIRE HOTSPOTS`);
  d3.select("#coL3").text(ensoPhase(year).label);
  const w = Math.max(...["#coTitle","#coL1","#coL2","#coL3"].map(id => document.querySelector(id).getComputedTextLength()));
  d3.select("#coLine").attr("x2", Math.max(1323, 1146 + w + 6));
}

// ---------- cursor ----------
const cur = g("#cursor");
const cLine = cur.append("line").attr("id","cursorLine").attr("y1",355).attr("y2",860).attr("stroke","url(#gFade)").attr("stroke-width",1.6).attr("stroke-dasharray","7 4");
const cDefDot = cur.append("circle").attr("r",5.4).attr("fill","#fff").attr("filter","url(#glow)");
const cDefLbl = cur.append("text").attr("text-anchor","end").attr("letter-spacing",.2);
const cDefNum = cDefLbl.append("tspan").attr("font-size",13).attr("font-weight",600).attr("fill","var(--green)");
const cDefYr  = cDefLbl.append("tspan").attr("font-size",12.5).attr("fill","#c3cacb");
const cFireDot = cur.append("circle").attr("r",2.6).attr("fill","#fff");
const cFireLbl = cur.append("text").attr("text-anchor","end").attr("letter-spacing",.2);
const cFireNum = cFireLbl.append("tspan").attr("font-size",13).attr("font-weight",600).attr("fill","var(--orange)");
const cFireYr  = cFireLbl.append("tspan").attr("font-size",12.5).attr("fill","#c3cacb");
const cEnsoDot = cur.append("circle").attr("r",5.6).attr("fill","#fff").attr("filter","url(#glow)");
const cEnsoLbl = cur.append("text").attr("font-size",11).attr("fill","#eef2f2");
const cE1 = cEnsoLbl.append("tspan"), cE2 = cEnsoLbl.append("tspan");

function render(){
  const x = X(year);
  cLine.attr("x1",x).attr("x2",x);
  const left = x > 420;
  // deforestation
  const dv = DATA.defor[year];
  if (dv != null){
    const py = yD(dv);
    cDefDot.attr("cx",x).attr("cy",py).attr("opacity",1);
    const collide = year === peakD.y || year === minD.y;
    cDefLbl.attr("opacity", collide ? 0 : 1).attr("text-anchor", left?"end":"start");
    cDefNum.attr("x", left? x-8 : x+10).attr("y", py-24).text(fmt(dv));
    cDefYr.attr("x", left? x-8 : x+10).attr("y", py-8).text(`(${year})`);
  } else {
    cDefDot.attr("opacity",0); cDefLbl.attr("opacity",0);
  }
  // fires
  const fv = DATA.fires[year], fy = yF(fv);
  cFireDot.attr("cx",x).attr("cy",fy-5);
  cFireLbl.attr("opacity", year === peakF.y ? 0 : 1).attr("text-anchor", left?"end":"start");
  cFireNum.attr("x", left? x-8 : x+10).attr("y", fy-28).text(fmt(fv));
  cFireYr.attr("x", left? x-8 : x+10).attr("y", fy-12).text(`(${year})`);
  bars.attr("fill", d => d.y === year ? "url(#gBarHi)" : "url(#gBar)");
  // enso
  const ev = ensoValue(year), ph = ensoPhase(year);
  cEnsoDot.attr("cx",x).attr("cy",EB - ev*EAMP);
  const ex = x + 9;
  cE1.attr("x",ex).attr("y",797).text(ph.sev || "");
  cE2.attr("x",ex).attr("y",ph.sev ? 811 : 804).text(ph.phase);
  // axis highlight
  xa.select(".xl").attr("fill", y => y===year ? "#ffffff" : "#d4dada").attr("font-weight", y => y===year ? 600 : 400);
  renderStates();
  renderCallout();
  if (typeof mobileUpdate === "function") mobileUpdate();
}

// ---------- interaction ----------
function yearFromEvent(ev){
  const [mx] = d3.pointer(ev, svg.node());
  return Math.max(1999, Math.min(2019, Math.round((mx - 245) / 68.35) + 1999));
}
d3.select("#hit")
  .on("pointermove", ev => { const y = yearFromEvent(ev); if (y !== year){ year = y; render(); } })
  .on("pointerleave", () => { if (year !== pinned){ year = pinned; render(); } })
  .on("pointerdown", ev => { pinned = year = yearFromEvent(ev); render(); });
svg.on("keydown", ev => {
  if (ev.target !== svg.node()) return;
  if (ev.key === "ArrowLeft" || ev.key === "ArrowRight"){
    ev.preventDefault();
    pinned = year = Math.max(1999, Math.min(2019, pinned + (ev.key==="ArrowRight"?1:-1)));
    render();
  }
});

// ---------- scaling ----------
function fit(){
  const s = Math.min(innerWidth/1672, innerHeight/941);
  const st = document.getElementById("stage");
  st.style.transform = `scale(${s})`;
  st.style.left = ((innerWidth - 1672*s)/2) + "px";
  st.style.top = ((innerHeight - 941*s)/2) + "px";
}
addEventListener("resize", fit); fit();

// ---------- embers (hero) ----------
let emberBoost = 1;
(function(){
  const cv = document.getElementById("embers"), ctx = cv.getContext("2d");
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  // fire front in canvas coords (stage minus 880,40)
  const front = [[70,110],[160,140],[260,190],[380,240],[470,280],[560,300],[640,300],[720,275]];
  const pts = [];
  function spawn(){
    const i = Math.floor(Math.random()*(front.length-1)), t = Math.random();
    const [x0,y0]=front[i],[x1,y1]=front[i+1];
    return {x:x0+(x1-x0)*t+(Math.random()-.5)*30, y:y0+(y1-y0)*t+(Math.random()-.5)*16,
      vx:(Math.random()-.3)*.25, vy:-(.25+Math.random()*.6), life:0, max:80+Math.random()*120, r:.6+Math.random()*1.3,
      hue: 10 + Math.random()*30};
  }
  function tick(){
    if (document.documentElement.classList.contains("is-mobile")){ requestAnimationFrame(tick); return; }
    ctx.clearRect(0,0,cv.width,cv.height);
    const target = Math.round(70*emberBoost);
    while (pts.length < target) pts.push(spawn());
    ctx.globalCompositeOperation = "lighter";
    for (let i=pts.length-1;i>=0;i--){
      const p = pts[i];
      p.life++; p.x += p.vx + Math.sin((p.life+i)*.07)*.15; p.y += p.vy;
      const a = Math.sin(Math.PI*p.life/p.max);
      if (p.life > p.max){ if (pts.length > target) pts.splice(i,1); else pts[i] = spawn(); continue; }
      ctx.fillStyle = `hsla(${p.hue},100%,${55+a*15}%,${.85*a})`;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,7); ctx.fill();
    }
    requestAnimationFrame(tick);
  }
  tick();
})();

applyFocus();
renderOverlay();
render();
document.fonts && document.fonts.ready.then(renderCallout);
