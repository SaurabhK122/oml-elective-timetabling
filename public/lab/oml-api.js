// oml-model.ts
var key = (a, b) => JSON.stringify([a, b]);
var slotKey = (s) => JSON.stringify([s.date, String(s.slot)]);
var intersect = (a, b) => [...a].filter((x) => b.has(x)).sort();
var quarter = (n) => {
  if (!Number.isFinite(n) || !Number.isSafeInteger(Math.round(n * 4)) || Math.abs(n * 4 - Math.round(n * 4)) > 1e-8) throw Error("Credits must be multiples of 0.25");
  return Math.round(4 * n);
};
var unique = (a) => [...new Set(a)].sort();
function pairs(a) {
  return a.flatMap((v, i) => a.slice(i + 1).map((w) => [v, w]));
}
var OmlModel = class {
  constructor(input, settings) {
    this.input = input;
    this.settings = { maxCredits: 9, outsideLimit: 1, penalty: 1e3, timeLimit: 1200, heuristicRounds: 2e3, heuristicPatience: 500, heuristicGroup: 10, heuristicSeed: 2026, showSolverLog: false, ...settings };
    const z = this.settings;
    const record = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
    if (!record(input) || !Array.isArray(input.units) || !input.units.length || !Array.isArray(input.sessions) || !record(input.groups) || !record(input.students)) throw Error("Dataset needs units, sessions, same-content groups and student preferences");
    if (typeof z.showSolverLog !== "boolean") throw Error("Solver logging must be true or false");
    if (!["with", "without"].includes(z.version)) throw Error("External-course access must be with or without");
    for (const [name, n] of Object.entries({ heuristicRounds: z.heuristicRounds, heuristicPatience: z.heuristicPatience, heuristicGroup: z.heuristicGroup, heuristicSeed: z.heuristicSeed })) if (!Number.isSafeInteger(n) || n < (name === "heuristicGroup" ? 1 : 0)) throw Error(`${name} must be a non-negative safe integer (group size at least 1)`);
    if (!Number.isFinite(z.theta) || z.theta < 0 || z.theta > 1) throw Error("Flexibility must be between 0 and 1");
    if (z.floor < 0 || z.floor > z.maxCredits || !Number.isInteger(z.outsideLimit) || z.outsideLimit < 0 || z.outsideLimit > 1) throw Error("Invalid credit floor, ceiling or outside-unit limit");
    quarter(z.floor);
    quarter(z.maxCredits);
    if (!Number.isFinite(z.penalty) || z.penalty <= 4 * input.units.length) throw Error("Penalty must exceed four times the number of units to preserve priority");
    if (z.timeLimit !== null && (!Number.isFinite(z.timeLimit) || z.timeLimit <= 0)) throw Error("Time limit must be positive, or null for unlimited");
    for (const u of input.units) {
      if (!u || typeof u.unit_id !== "string" || !u.unit_id.trim() || this.units.has(u.unit_id)) throw Error("Duplicate or empty unit");
      if (![true, false, 0, 1].includes(u.movable) || ![true, false, 0, 1].includes(u.is_pgpx_or_fabm)) throw Error("Movability and external-course flags must be 0 or 1");
      quarter(u.credits);
      if (u.credits <= 0 || !Number.isSafeInteger(u.seat_cap) || u.seat_cap < 0) throw Error("Invalid unit credits or seats");
      this.units.set(u.unit_id, u);
      this.slots.set(u.unit_id, /* @__PURE__ */ new Set());
      this.classes.set(u.unit_id, /* @__PURE__ */ new Set());
      if (u.is_pgpx_or_fabm) this.outside.add(u.unit_id);
    }
    for (const s of input.sessions) {
      if (!s || typeof s.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s.date) || !Number.isFinite(Date.parse(s.date)) || new Date(s.date).toISOString().slice(0, 10) !== s.date || !["string", "number"].includes(typeof s.slot) || !String(s.slot).trim() || typeof s.slot === "number" && !Number.isFinite(s.slot) || !this.units.has(s.unit_id) || !["class", "block"].includes(s.session_type)) throw Error("Unknown session unit or type");
      const t = slotKey(s), slots = this.slots.get(s.unit_id);
      if (slots.has(t)) throw Error("Duplicate session");
      slots.add(t);
      if (s.session_type === "class") this.classes.get(s.unit_id).add(t);
    }
    for (const [g, us] of Object.entries(input.groups)) {
      if (!g.trim() || !Array.isArray(us) || !us.length) throw Error("Invalid same-content group");
      for (const u of us) {
        if (!this.units.has(u) || this.groupOf.has(u)) throw Error("Invalid same-content group");
        this.groupOf.set(u, g);
      }
    }
    for (const [i, us] of Object.entries(input.students).sort(([a], [b]) => a.localeCompare(b))) {
      if (!i.trim() || !Array.isArray(us)) throw Error("Invalid student demand record");
      if (us.some((u) => !this.units.has(u) || this.outside.has(u)) || unique(us).length !== us.length) throw Error("Invalid PGP demand list");
      this.bids.set(i, new Set(unique([...us, ...z.version === "with" ? this.outside : []])));
    }
    if (!this.bids.size) throw Error("At least one student is required");
    for (const [u, s] of this.slots) {
      if (!s.size) throw Error("Every unit needs at least one session");
      this.allowance.set(u, this.units.get(u).movable ? Math.floor(z.theta * s.size + 0.5) : 0);
    }
    this.makeClashes();
    this.build();
  }
  input;
  upper = [];
  rows = [];
  x = /* @__PURE__ */ new Map();
  r = /* @__PURE__ */ new Map();
  m = /* @__PURE__ */ new Map();
  f = /* @__PURE__ */ new Map();
  y = /* @__PURE__ */ new Map();
  units = /* @__PURE__ */ new Map();
  slots = /* @__PURE__ */ new Map();
  classes = /* @__PURE__ */ new Map();
  outside = /* @__PURE__ */ new Set();
  groupOf = /* @__PURE__ */ new Map();
  bids = /* @__PURE__ */ new Map();
  allowance = /* @__PURE__ */ new Map();
  clashes = [];
  settings;
  canMove(u, t) {
    return this.allowance.get(u) > 0 && this.classes.get(u).has(t);
  }
  addVar(upper = 1) {
    this.upper.push(upper);
    return this.upper.length - 1;
  }
  row(terms, lo = -Infinity, hi = Infinity) {
    this.rows.push({ terms, lo, hi });
  }
  makeClashes() {
    const bidders = /* @__PURE__ */ new Map();
    for (const [i, us] of this.bids) for (const u of us) {
      if (!bidders.has(u)) bidders.set(u, /* @__PURE__ */ new Set());
      bidders.get(u).add(i);
    }
    for (const [a, b] of pairs([...bidders.keys()].sort())) {
      if (this.outside.has(a) && this.outside.has(b) && this.settings.outsideLimit <= 1) continue;
      if (this.groupOf.has(a) && this.groupOf.get(a) === this.groupOf.get(b)) continue;
      const slots = intersect(this.slots.get(a), this.slots.get(b)), students = intersect(bidders.get(a), bidders.get(b));
      if (!slots.length || !students.length) continue;
      let onlyA = 0, onlyB = 0, either = 0, possible = true;
      for (const t of slots) {
        const ma = this.canMove(a, t), mb = this.canMove(b, t);
        if (ma && mb) either++;
        else if (ma) onlyA++;
        else if (mb) onlyB++;
        else possible = false;
      }
      const separable = possible && onlyA <= this.allowance.get(a) && onlyB <= this.allowance.get(b) && onlyA + onlyB + either <= this.allowance.get(a) + this.allowance.get(b);
      this.clashes.push({ a, b, slots, students, separable });
    }
  }
  build() {
    for (const [i, us] of this.bids) {
      const terms = [];
      for (const u of us) {
        const col = this.addVar();
        this.x.set(key(i, u), col);
        terms.push([col, quarter(this.units.get(u).credits)]);
      }
      const r = this.addVar(quarter(this.settings.floor));
      this.r.set(i, r);
      this.row([...terms, [r, 1]], quarter(this.settings.floor));
      this.row(terms, -Infinity, quarter(this.settings.maxCredits));
    }
    for (const [i, us] of this.bids) {
      const ext = [...us].filter((u) => this.outside.has(u));
      if (ext.length) this.row(ext.map((u) => [this.x.get(key(i, u)), 1]), -Infinity, this.settings.version === "with" ? this.settings.outsideLimit : 0);
      const gs = /* @__PURE__ */ new Map();
      for (const u of us) {
        const g = this.groupOf.get(u);
        if (g) {
          if (!gs.has(g)) gs.set(g, []);
          gs.get(g).push(u);
        }
      }
      for (const same of gs.values()) if (same.length > 1) this.row(same.map((u) => [this.x.get(key(i, u)), 1]), -Infinity, 1);
    }
    for (const u of [...this.units.keys()].sort()) {
      const terms = [];
      for (const i of this.bids.keys()) {
        const c = this.x.get(key(i, u));
        if (c !== void 0) terms.push([c, 1]);
      }
      if (terms.length) this.row(terms, -Infinity, this.units.get(u).seat_cap);
    }
    const worth = /* @__PURE__ */ new Map();
    for (const p of this.clashes.filter((p2) => p2.separable)) for (const u of [p.a, p.b]) for (const t of p.slots) if (this.canMove(u, t)) {
      if (!worth.has(u)) worth.set(u, /* @__PURE__ */ new Set());
      worth.get(u).add(t);
    }
    for (const u of [...worth.keys()].sort()) {
      const f = this.addVar();
      this.f.set(u, f);
      const terms = [];
      for (const t of [...worth.get(u)].sort()) {
        const m = this.addVar();
        this.m.set(key(u, t), m);
        this.row([[m, 1], [f, -1]], -Infinity, 0);
        terms.push([m, 1]);
      }
      this.row([...terms, [f, -this.allowance.get(u)]], -Infinity, 0);
    }
    for (const p of this.clashes.filter((p2) => p2.separable)) {
      const y = this.addVar();
      this.y.set(key(p.a, p.b), y);
      for (const t of p.slots) {
        const terms = [[y, 1]];
        for (const u of [p.a, p.b]) {
          const m = this.m.get(key(u, t));
          if (m !== void 0) terms.push([m, -1]);
        }
        this.row(terms, -Infinity, 0);
      }
    }
    for (const p of this.clashes) for (const i of p.students) {
      const terms = [[this.x.get(key(i, p.a)), 1], [this.x.get(key(i, p.b)), 1]];
      const y = this.y.get(key(p.a, p.b));
      if (y !== void 0) terms.push([y, -1]);
      this.row(terms, -Infinity, 1);
    }
  }
  costs(stage) {
    const c = new Array(this.upper.length).fill(0);
    if (stage === 1) {
      for (const v of this.r.values()) c[v] = this.settings.penalty / 4;
      for (const v of this.f.values()) c[v] = 1;
    } else for (const [k, v] of this.x) {
      const [, u] = JSON.parse(k);
      c[v] = -quarter(this.units.get(u).credits);
    }
    return c;
  }
  locks(first) {
    const rs = [{ terms: [...this.r.values()].map((c) => [c, 1]), lo: -Infinity, hi: quarter(first.short) }];
    if (this.f.size) rs.push({ terms: [...this.f.values()].map((c) => [c, 1]), lo: -Infinity, hi: first.asked.length });
    rs.push({ terms: [...this.x].map(([k, c]) => [c, quarter(this.units.get(JSON.parse(k)[1]).credits)]), lo: quarter(first.credits), hi: Infinity });
    return rs;
  }
  /** LP text uses safe variable indexes, never untrusted course codes. */
  toLP(stage, extra = []) {
    const expr = (terms) => terms.filter(([, v]) => v !== 0).map(([c, v], i) => `${v < 0 ? "-" : i ? "+" : ""} ${Math.abs(v)} v${c}`).join(" ") || "0 v0";
    const out = ["Minimize", " obj: " + expr(this.costs(stage).map((v, c) => [c, v])), "Subject To"];
    let n = 0;
    for (const row of [...this.rows, ...extra]) {
      if (row.lo === row.hi) out.push(` c${n++}: ${expr(row.terms)} = ${row.lo}`);
      else {
        if (Number.isFinite(row.lo)) out.push(` c${n++}: ${expr(row.terms)} >= ${row.lo}`);
        if (Number.isFinite(row.hi)) out.push(` c${n++}: ${expr(row.terms)} <= ${row.hi}`);
      }
    }
    out.push("Bounds", ...this.upper.map((u, c) => ` 0 <= v${c} <= ${u}`), "Generals", ...this.upper.map((_, c) => ` v${c}`), "End");
    return out.join("\n");
  }
  summarize(allocation, moves) {
    let short = 0, credits = 0, students_short = 0;
    for (const i of this.bids.keys()) {
      const held = allocation[i] ?? [];
      const c = held.reduce((a, u) => a + this.units.get(u).credits, 0);
      credits += c;
      const r = Math.max(0, this.settings.floor - c);
      short += r;
      if (r > 1e-8) students_short++;
    }
    return { allocation, moves, short, credits, students_short, asked: unique(moves.map((m) => m.unit_id)) };
  }
  decode(values) {
    const allocation = Object.fromEntries([...this.bids.keys()].map((i) => [i, []]));
    for (const [k, c] of this.x) if (values[c] > 0.5) {
      const [i, u] = JSON.parse(k);
      allocation[i].push(u);
    }
    const moves = [];
    for (const [k, c] of this.m) if (values[c] > 0.5) {
      const [u, t] = JSON.parse(k), [date, slot] = JSON.parse(t);
      moves.push({ unit_id: u, date, slot });
    }
    return this.summarize(allocation, moves);
  }
  start(plan) {
    const values = new Float64Array(this.upper.length), moves = new Set(plan.moves.map((m) => key(m.unit_id, slotKey(m))));
    for (const [k, c] of this.x) {
      const [i, u] = JSON.parse(k);
      values[c] = plan.allocation[i].includes(u) ? 1 : 0;
    }
    for (const [i, c] of this.r) values[c] = Math.max(0, quarter(this.settings.floor) - plan.allocation[i].reduce((n, u) => n + quarter(this.units.get(u).credits), 0));
    for (const [k, c] of this.m) if (moves.has(k)) values[c] = 1;
    for (const [u, c] of this.f) values[c] = plan.moves.some((m) => m.unit_id === u) ? 1 : 0;
    for (const p of this.clashes) {
      const y = this.y.get(key(p.a, p.b));
      if (y !== void 0) values[y] = p.slots.every((t) => moves.has(key(p.a, t)) || moves.has(key(p.b, t))) ? 1 : 0;
    }
    return values;
  }
  validateVector(v, extra = []) {
    if (v.length !== this.upper.length) throw Error("Wrong solver vector length");
    for (let c = 0; c < v.length; c++) if (!Number.isFinite(v[c]) || v[c] < -1e-6 || v[c] > this.upper[c] + 1e-6 || Math.abs(v[c] - Math.round(v[c])) > 1e-6) throw Error("Solver returned invalid integer/bound values");
    for (const r of [...this.rows, ...extra]) {
      const a = r.terms.reduce((s, [c, k]) => s + k * v[c], 0);
      if (a < r.lo - 1e-6 || a > r.hi + 1e-6) throw Error("Solver returned an infeasible plan");
    }
  }
  /** Independent reconstruction: no solver-variable assertions are used here. */
  validate(plan) {
    if (Object.keys(plan.allocation).length !== this.bids.size || [...this.bids.keys()].some((i) => !(i in plan.allocation))) throw Error("Allocation must include each student exactly once");
    const moved = /* @__PURE__ */ new Set(), counts = /* @__PURE__ */ new Map();
    for (const m of plan.moves) {
      const t = slotKey(m), k = key(m.unit_id, t);
      if (moved.has(k) || !this.units.has(m.unit_id) || !this.canMove(m.unit_id, t)) throw Error("Invalid, duplicate or block-day move");
      moved.add(k);
      counts.set(m.unit_id, (counts.get(m.unit_id) ?? 0) + 1);
    }
    for (const [u, n] of counts) if (n > this.allowance.get(u)) throw Error("Move allowance exceeded");
    const seats = /* @__PURE__ */ new Map();
    for (const [i, held] of Object.entries(plan.allocation)) {
      if (unique(held).length !== held.length || held.some((u) => !this.bids.get(i)?.has(u))) throw Error("Invalid allocation or bidding-set violation");
      if (held.filter((u) => this.outside.has(u)).length > (this.settings.version === "with" ? this.settings.outsideLimit : 0)) throw Error("External-unit limit exceeded");
      const gs = held.map((u) => this.groupOf.get(u)).filter(Boolean);
      if (new Set(gs).size !== gs.length) throw Error("Same-content violation");
      if (held.reduce((s, u) => s + this.units.get(u).credits, 0) > this.settings.maxCredits + 1e-8) throw Error("Credit ceiling exceeded");
      for (const [a, b] of pairs(held)) if (intersect(this.slots.get(a), this.slots.get(b)).some((t) => !moved.has(key(a, t)) && !moved.has(key(b, t)))) throw Error("Registration clash remains");
      for (const u of held) seats.set(u, (seats.get(u) ?? 0) + 1);
    }
    for (const [u, n] of seats) if (n > this.units.get(u).seat_cap) throw Error("Seat cap exceeded");
    const fresh = this.summarize(plan.allocation, plan.moves);
    for (const k of ["short", "credits", "students_short"]) if (Math.abs(fresh[k] - plan[k]) > 1e-8) throw Error("Reported metrics do not match allocation");
    if (JSON.stringify(fresh.asked) !== JSON.stringify([...plan.asked].sort())) throw Error("Asked courses do not match moves");
    return true;
  }
  /** Exact minimum subset of already-moved courses in each slot (not new moves). */
  cleanup(plan) {
    const bySlot = /* @__PURE__ */ new Map(), holders = /* @__PURE__ */ new Map();
    for (const [i, us] of Object.entries(plan.allocation)) for (const u of us) {
      if (!holders.has(u)) holders.set(u, /* @__PURE__ */ new Set());
      holders.get(u).add(i);
    }
    for (const m of plan.moves) {
      const t = slotKey(m);
      if (!bySlot.has(t)) bySlot.set(t, /* @__PURE__ */ new Set());
      bySlot.get(t).add(m.unit_id);
    }
    const kept = [];
    for (const [t, moved] of [...bySlot].sort(([a], [b]) => a.localeCompare(b))) {
      const meeting = [...this.slots.keys()].filter((u) => this.slots.get(u).has(t)).sort();
      const edges = pairs(meeting).filter(([a, b]) => intersect(holders.get(a) ?? /* @__PURE__ */ new Set(), holders.get(b) ?? /* @__PURE__ */ new Set()).length);
      const candidates = [...moved].sort();
      let best = [...candidates];
      const search = (selected) => {
        if (selected.size >= best.length) return;
        const e = edges.find(([a, b]) => !selected.has(a) && !selected.has(b));
        if (!e) {
          best = [...selected];
          return;
        }
        for (const u of e) if (moved.has(u)) {
          selected.add(u);
          search(selected);
          selected.delete(u);
        }
      };
      if (!edges.length) best = [];
      else search(/* @__PURE__ */ new Set());
      const [date, slot] = JSON.parse(t);
      for (const u of best) kept.push({ unit_id: u, date, slot });
    }
    const final = this.summarize(plan.allocation, kept);
    this.validate(final);
    return final;
  }
};

// oml-solve.ts
var finite = (x) => Number.isFinite(x) ? x : null;
function solveOML(highs, input, settings, onProgress) {
  onProgress?.("Building model");
  const oml = new OmlModel(input, settings);
  const run = (stage, first2) => {
    onProgress?.(`Solving stage ${stage}`);
    const started = performance.now(), extra = first2 ? oml.locks(first2) : [];
    const model = highs.createModel({ format: "lp", data: oml.toLP(stage, extra) });
    try {
      model.options.set({ output_flag: oml.settings.showSolverLog, mip_rel_gap: 0, ...oml.settings.timeLimit === null ? {} : { time_limit: oml.settings.timeLimit } });
      const indexes = oml.upper.map((_, i) => model.getColByName(`v${i}`));
      if (first2) {
        const src = oml.start(first2);
        oml.validateVector(src, extra);
        const ordered = new Float64Array(src.length);
        indexes.forEach((j, i) => ordered[j] = src[i]);
        model.setSolution({ colValue: ordered });
      }
      model.run();
      const code = model.getModelStatus();
      const status = Object.entries(highs.constants.modelStatus).find(([, v]) => v === code)?.[0] ?? `status ${code}`;
      const info = (name) => {
        try {
          return finite(Number(model.info.get(name)));
        } catch {
          return null;
        }
      };
      const found = model.info.get("primal_solution_status") === highs.constants.solutionStatus.feasible;
      const scale = stage === 1 ? 1 : -0.25;
      const report = { status: status === "timeLimit" ? "time limit" : status, found_plan: found, objective: found ? scale * model.getObjectiveValue() : null, bound: info("mip_dual_bound") === null ? null : scale * info("mip_dual_bound"), gap: info("mip_gap"), seconds: (performance.now() - started) / 1e3, started_from_plan: !!first2 };
      if (!found) return { plan: null, report };
      const raw2 = model.getSolution().colValue, vector = Float64Array.from(indexes, (j) => raw2[j]);
      oml.validateVector(vector, extra);
      const plan2 = oml.decode(vector);
      oml.validate(plan2);
      return { plan: plan2, report };
    } finally {
      model.dispose();
    }
  };
  const first = run(1);
  if (!first.plan) return { plan: null, step1: first.report, step2: null, message: first.report.status === "time limit" ? "Stage 1 reached its time limit without a feasible incumbent. Increase the limit or inspect a saved study run." : `Stage 1 returned ${first.report.status} without a feasible incumbent. No result is being presented.`, model_size: { variables: oml.upper.length, constraints: oml.rows.length } };
  const second = run(2, first.plan);
  const raw = second.plan ?? first.plan;
  if (raw.short > first.plan.short + 1e-8 || raw.asked.length > first.plan.asked.length || raw.credits < first.plan.credits - 1e-8) throw Error("Stage 2 violated priority locks");
  onProgress?.("Validating and removing unnecessary moves");
  const plan = oml.cleanup(raw);
  return { plan, step1: first.report, step2: second.report, optimal: first.report.status === "optimal" && second.report.status === "optimal", message: second.plan ? null : "Stage 2 did not return a feasible plan; showing the independently validated stage 1 incumbent.", model_size: { variables: oml.upper.length, constraints: oml.rows.length } };
}
function inputFromBundle(bundle, surveyId) {
  const survey = bundle.surveys.find((s) => s.id === surveyId);
  if (!survey) throw Error("Unknown survey");
  const groups = {};
  for (const row of bundle.sameContentGroups) (groups[row.group_id] ??= []).push(row.unit_id);
  return { units: bundle.units, sessions: bundle.sessions, students: survey.preferences, groups };
}
function validateInput(input, settings) {
  new OmlModel(input, settings);
  return true;
}
export {
  inputFromBundle,
  solveOML,
  validateInput
};
