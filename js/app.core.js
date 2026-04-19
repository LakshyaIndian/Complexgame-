import { MODES, STAGES, UNLOCK_RULES, STAT_INFO } from "./gameData.js";

const STORAGE_KEY = "frs2050_state_v1";
const APP_VERSION = "2026-04-19-rebuild-1";
const appEl = document.getElementById("app");
const installBtn = document.getElementById("install-btn");
const navButtons = Array.from(document.querySelectorAll(".nav-button"));

const BASE_STATS = {
  resilience: 50,
  adaptability: 50,
  focus: 50,
  "mental-stamina": 50,
  credibility: 50,
  "network-trust": 50,
  "financial-buffer": 50,
  "learning-velocity": 50,
  "health-stability": 50,
  "strategic-clarity": 50,
  "ethical-consistency": 50,
  "ai-reliance": 50,
};

const DEFAULT_STATE = {
  settings: { mode: "standard", lowMotion: false },
  currentRun: null,
  unlockedModes: ["standard"],
  history: [],
};

let state = loadState();
let deferredInstallPrompt = null;
let waitingWorker = null;
let timerId = null;
let didAutoReloadForNewSw = false;
const ui = { screen: state.currentRun ? "stage-intro" : "home", selected: null, selectedIds: [], rankedIds: [], outcome: null, summary: null, timeLeft: null };

boot();

function boot() {
  try {
    applySettings();
    bindEvents();
    render();
    registerServiceWorker();
  } catch (error) {
    renderBootError(error);
  }
}

function bindEvents() {
  document.addEventListener("click", onClick);
  document.addEventListener("change", onChange);
  window.addEventListener("beforeunload", () => { clearTimer(); persist(); });
  window.addEventListener("appinstalled", () => { deferredInstallPrompt = null; installBtn?.classList.add("hidden"); toast("App installed."); });
  window.addEventListener("beforeinstallprompt", (event) => { event.preventDefault(); deferredInstallPrompt = event; installBtn?.classList.remove("hidden"); });
  window.addEventListener("error", (event) => renderBootError(event.error || new Error(event.message || "Unknown app error")));
  window.addEventListener("unhandledrejection", (event) => renderBootError(event.reason instanceof Error ? event.reason : new Error(String(event.reason))));
}

function onClick(event) {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const nav = target.closest("[data-nav]");
  if (nav) return openStaticScreen(nav.getAttribute("data-nav"));
  const actionEl = target.closest("[data-action]");
  if (actionEl) return handleAction(actionEl.getAttribute("data-action"));
  const option = target.closest("[data-option-id]");
  if (option) { ui.selected = option.getAttribute("data-option-id"); return render(); }
  const alloc = target.closest("[data-allocation-id]");
  if (alloc) { const id = alloc.getAttribute("data-allocation-id"); const set = new Set(ui.selectedIds); set.has(id) ? set.delete(id) : set.add(id); ui.selectedIds = Array.from(set); return render(); }
  const priority = target.closest("[data-priority-id]");
  if (priority) { const id = priority.getAttribute("data-priority-id"); if (!ui.rankedIds.includes(id)) ui.rankedIds.push(id); return render(); }
  const contradiction = target.closest("[data-contradiction-id]");
  if (contradiction) { const id = contradiction.getAttribute("data-contradiction-id"); const set = new Set(ui.selectedIds); if (set.has(id)) set.delete(id); else if (set.size < 3) set.add(id); ui.selectedIds = Array.from(set); return render(); }
  const settingToggle = target.closest("[data-setting-toggle]");
  if (settingToggle) { const key = settingToggle.getAttribute("data-setting-toggle"); state.settings[key] = !state.settings[key]; applySettings(); persist(); return render(); }
}

function onChange(event) {
  const target = event.target;
  if (!(target instanceof Element)) return;
  if (target.matches("#mode-select")) { state.settings.mode = target.value; persist(); render(); }
}

function handleAction(action) {
  switch (action) {
    case "new-run": resetUiSelection(); ui.screen = "new-run"; return render();
    case "confirm-new-run": return startNewRun(document.getElementById("mode-select")?.value || state.settings.mode || "standard");
    case "continue-run": if (!state.currentRun) return; resetUiSelection(); ui.screen = "stage-intro"; return render();
    case "show-briefing": if (!state.currentRun) return; resetUiSelection(); ui.screen = "briefing"; return render();
    case "back-stage-intro": ui.screen = "stage-intro"; return render();
    case "begin-level": return beginLevel();
    case "submit-level": return submitLevel();
    case "advance-after-outcome": return advanceAfterOutcome();
    case "continue-after-stage": return continueAfterStage();
    case "clear-priority": ui.rankedIds = []; return render();
    case "nav-home": return openStaticScreen("home");
    case "nav-history": return openStaticScreen("history");
    case "nav-help": return openStaticScreen("help");
    case "nav-settings": return openStaticScreen("settings");
    case "reset-local-data": return resetAllLocalData();
    case "reload-app": return window.location.reload();
    case "install-app": return promptInstall();
    case "reload-for-update": if (waitingWorker) waitingWorker.postMessage({ type: "SKIP_WAITING" }); else window.location.reload(); return;
    default: return;
  }
}

function openStaticScreen(name) { clearTimer(); ui.screen = name; render(); }

function startNewRun(modeId) {
  const safeModeId = MODES[modeId] ? modeId : "standard";
  state.currentRun = { id: `run-${Date.now()}`, modeId: safeModeId, startedAt: Date.now(), updatedAt: Date.now(), currentStageIndex: 0, currentLevelIndex: 0, stats: clone(BASE_STATS), stageProgress: STAGES.map((stage) => ({ stageId: stage.id, completed: false, levelResults: [] })) };
  state.settings.mode = safeModeId; ui.summary = null; ui.outcome = null; resetUiSelection(); persist(); ui.screen = "stage-intro"; render();
}

function beginLevel() {
  const run = getRun(); if (!run) return; resetUiSelection(); ui.screen = "gameplay"; const level = getCurrentLevel(run); if (level.timed) { const multiplier = MODES[run.modeId]?.timeMultiplier || 1; ui.timeLeft = Math.max(10, Math.floor(level.timeLimit * multiplier)); startTimer(); } else ui.timeLeft = null; render();
}

function startTimer() { clearTimer(); timerId = setInterval(() => { if (ui.screen !== "gameplay") return; ui.timeLeft = Math.max(0, Number(ui.timeLeft || 0) - 1); if (ui.timeLeft <= 0) { clearTimer(); toast("Time expired. Resolving current state."); submitLevel(); return; } render(); }, 1000); }
function clearTimer() { if (timerId) { clearInterval(timerId); timerId = null; } }

function submitLevel() {
  const run = getRun(); if (!run) return; clearTimer(); const level = getCurrentLevel(run); const evaluation = evaluateLevel(run, level); run.stats = applyEffects(run.stats, evaluation.effects); run.updatedAt = Date.now(); run.stageProgress[run.currentStageIndex].levelResults.push({ levelId: level.id, levelTitle: level.title, normalizedScore: evaluation.score, outcomeLabel: evaluation.label, feedback: evaluation.feedback }); state.currentRun = sanitizeRun(run); ui.outcome = { title: level.title, label: evaluation.label, score: evaluation.score, feedback: evaluation.feedback, summary: evaluation.summary, statsAfter: clone(state.currentRun.stats) }; persist(); ui.screen = "outcome"; render();
}

function advanceAfterOutcome() {
  const run = getRun(); if (!run) return; const stage = getCurrentStage(run); const finishedStage = run.currentLevelIndex >= stage.levels.length - 1; ui.outcome = null; resetUiSelection(); if (finishedStage) { run.stageProgress[run.currentStageIndex].completed = true; run.currentStageIndex += 1; run.currentLevelIndex = 0; state.currentRun = run.currentStageIndex >= STAGES.length ? run : sanitizeRun(run); persist(); ui.screen = "stage-debrief"; return render(); } run.currentLevelIndex += 1; state.currentRun = sanitizeRun(run); persist(); ui.screen = "stage-intro"; render();
}

function continueAfterStage() {
  const run = state.currentRun; if (!run) return; if (run.currentStageIndex >= STAGES.length) { const summary = buildRunSummary(run); state.history.unshift(summary); state.currentRun = null; state.unlockedModes = unlockModes(state.history); ui.summary = summary; persist(); ui.screen = "final-analysis"; return render(); } ui.screen = "stage-intro"; render();
}

function evaluateLevel(run, level) {
  if (level.type === "decision") return evaluateDecision(run, level);
  if (level.type === "allocation") return evaluateAllocation(run, level);
  if (level.type === "priority") return evaluatePriority(run, level);
  if (level.type === "contradiction") return evaluateContradiction(run, level);
  return fallbackEvaluation(level.rationale || "Unknown level type.");
}

function evaluateDecision(run, level) {
  const option = (level.options || []).find((item) => item.id === ui.selected); if (!option) return fallbackEvaluation("No valid decision was submitted before resolution.", { focus: -4, resilience: -3, "mental-stamina": -2 }); const score = normalizeScore(weightedEffectScore(option.effects), run.modeId); return { score, label: classifyScore(score), effects: option.effects || {}, feedback: `${classifyNarrative(score)} ${option.rationale}`, summary: option.rationale };
}

function evaluateAllocation(run, level) {
  const picked = (level.choices || []).filter((item) => ui.selectedIds.includes(item.id)); if (!picked.length) return fallbackEvaluation("You allocated nothing, which is itself a failure under constraint.", { focus: -4, resilience: -4, "strategic-clarity": -3 }); const spent = picked.reduce((sum, item) => sum + Number(item.cost || 0), 0); const effects = combineEffects(picked.map((item) => item.effects || {})); let rawScore = weightedEffectScore(effects); if (spent > Number(level.pool || 0)) rawScore -= 8; if (ui.selectedIds.includes("status")) rawScore -= 6; const score = normalizeScore(rawScore, run.modeId); return { score, label: classifyScore(score), effects, feedback: `You spent ${spent}/${level.pool}. ${classifyNarrative(score)} ${level.rationale}`, summary: level.rationale };
}

function evaluatePriority(run, level) {
  const items = level.items || []; if (!ui.rankedIds.length) return fallbackEvaluation("You did not establish an order of action.", { focus: -4, "strategic-clarity": -4, resilience: -2 }); let rawScore = 0; let effects = {}; ui.rankedIds.forEach((id, index) => { const item = items.find((entry) => entry.id === id); if (!item) return; effects = mergeEffects(effects, item.effects || {}); const distance = Math.abs((index + 1) - Number(item.idealRank || index + 1)); rawScore += Math.max(0, 8 - distance * 3); }); rawScore -= Math.max(0, items.length - ui.rankedIds.length) * 4; const score = normalizeScore(rawScore, run.modeId); return { score, label: classifyScore(score), effects, feedback: `${classifyNarrative(score)} ${level.rationale}`, summary: level.rationale };
}

function evaluateContradiction(run, level) {
  const correct = new Set(level.correctIds || []); const selected = new Set(ui.selectedIds || []); if (!selected.size) return fallbackEvaluation("You made no analytical call.", { credibility: -3, adaptability: -2, "strategic-clarity": -4 }); let rawScore = 0; for (const id of selected) { if (correct.has(id)) rawScore += 8; else rawScore -= 4; } rawScore -= Math.abs(selected.size - correct.size) * 3; const effects = { "strategic-clarity": Array.from(selected).filter((id) => correct.has(id)).length * 3 - Array.from(selected).filter((id) => !correct.has(id)).length * 2, credibility: Array.from(selected).filter((id) => correct.has(id)).length * 2 - Array.from(selected).filter((id) => !correct.has(id)).length, adaptability: Array.from(selected).some((id) => correct.has(id)) ? 1 : -2 }; const score = normalizeScore(rawScore, run.modeId); return { score, label: classifyScore(score), effects, feedback: `${classifyNarrative(score)} ${level.rationale}`, summary: level.rationale };
}

function fallbackEvaluation(summary, effects = {}) { const score = normalizeScore(-18, state.currentRun?.modeId || "standard"); return { score, label: classifyScore(score), effects, feedback: summary, summary }; }
function normalizeScore(rawScore, modeId) { const multiplier = MODES[modeId]?.scoreMultiplier || 1; return clamp(Math.round(rawScore * multiplier + 50), 0, 100); }
function classifyScore(score) { if (score >= 72) return "Resilient"; if (score >= 58) return "Adaptive"; if (score >= 42) return "Mixed"; return "Fragile"; }
function classifyNarrative(score) { if (score >= 72) return "This was a resilient call."; if (score >= 58) return "This was adaptive, but not clean."; if (score >= 42) return "This produced mixed tradeoffs."; return "This was a fragile response under compounding pressure."; }

function buildRunSummary(run) {
  const finalStats = clone(run.stats); const allLevelResults = run.stageProgress.flatMap((stage) => stage.levelResults || []); const averageScore = allLevelResults.length ? Math.round(allLevelResults.reduce((sum, item) => sum + item.normalizedScore, 0) / allLevelResults.length) : 0; const sorted = Object.entries(finalStats); const strengths = sorted.slice().sort((a, b) => b[1] - a[1]).slice(0, 3).map(([key, value]) => `${titleCase(key)} (${value})`); const weaknesses = sorted.slice().sort((a, b) => a[1] - b[1]).slice(0, 3).map(([key, value]) => `${titleCase(key)} (${value})`); const patterns = []; if (finalStats["financial-buffer"] < 45) patterns.push("You accepted near-term relief at the cost of future margin."); if (finalStats["network-trust"] > 60) patterns.push("You treated trust as real operating infrastructure."); if (finalStats["ethical-consistency"] > 60) patterns.push("You preserved principle better than most players under pressure."); if (finalStats["ai-reliance"] > 60) patterns.push("You leaned heavily on automation, increasing efficiency but also judgment risk."); if (!patterns.length) patterns.push("Your run was mixed: some durable calls, some expensive weaknesses under pressure."); const suggestions = []; if (finalStats["health-stability"] < 55) suggestions.push("Protect sleep, energy, and recovery earlier. They shape all later decisions."); if (finalStats["financial-buffer"] < 55) suggestions.push("Rebuild liquidity before chasing upside. Margin preserves freedom."); if (finalStats["strategic-clarity"] < 55) suggestions.push("Practice writing decisions before acting. Better sequence usually beats faster reaction."); if (finalStats["network-trust"] < 55) suggestions.push("Shrink commitments and become more predictably reliable."); if (suggestions.length < 3) suggestions.push("Run a harder mode next time to expose weaker parts of your pattern."); return { id: run.id, modeId: run.modeId, completedAt: Date.now(), averageScore, finalStats, profile: { strengths, weaknesses, patterns, suggestions } };
}

function unlockModes(history) {
  const unlocked = new Set(["standard"]); const scores = history.map((item) => item.averageScore || 0); const ethics = history.map((item) => item.finalStats?.["ethical-consistency"] || 0); const strategic = history.map((item) => item.finalStats?.["strategic-clarity"] || 0); if (history.length >= 1) unlocked.add("hard"); if (scores.some((score) => score >= 60)) unlocked.add("low-information"); if (history.length >= 2) unlocked.add("high-pressure"); if (ethics.some((score) => score > 60)) unlocked.add("ethics-stress-test"); if (strategic.some((score) => score > 65)) unlocked.add("long-horizon-strategist"); return Array.from(unlocked);
}

function render() {
  if (!appEl) throw new Error("Missing #app root"); applySettings(); updateNav(); if (ui.screen === "home") return void (appEl.innerHTML = renderHome()); if (ui.screen === "new-run") return void (appEl.innerHTML = renderNewRun()); if (ui.screen === "history") return void (appEl.innerHTML = renderHistory()); if (ui.screen === "help") return void (appEl.innerHTML = renderHelp()); if (ui.screen === "settings") return void (appEl.innerHTML = renderSettings()); const run = getRun(); if (!run) { ui.screen = "home"; return void (appEl.innerHTML = renderHome()); } if (ui.screen === "stage-intro") return void (appEl.innerHTML = renderStageIntro(run)); if (ui.screen === "briefing") return void (appEl.innerHTML = renderBriefing(run)); if (ui.screen === "gameplay") return void (appEl.innerHTML = renderGameplay(run)); if (ui.screen === "outcome") return void (appEl.innerHTML = renderOutcome()); if (ui.screen === "stage-debrief") return void (appEl.innerHTML = renderStageDebrief(run)); if (ui.screen === "final-analysis") return void (appEl.innerHTML = renderFinalAnalysis()); appEl.innerHTML = renderHome();
}

function renderHome() {
  return `<section class="screen"><section class="panel hero"><p class="eyebrow">Version ${APP_VERSION}</p><h2>Future Readiness Simulator 2050</h2><p>A serious scenario strategy simulator about resilience, AI disruption, money, trust, leadership, and long-horizon survival.</p><div class="button-row">${button("New Run", "new-run", "primary-button")}${state.currentRun ? button("Resume Run", "continue-run") : button("How to Play", "nav-help")}${button("Stats History", "nav-history")}</div></section>${state.currentRun ? renderCurrentRunCard() : ""}<section class="grid two"><article class="panel"><p class="kicker">Stages</p><div class="timeline">${STAGES.map((stage, index) => `<div class="timeline-item"><h3>${index + 1}. ${stage.title}</h3><p class="meta">${stage.summary}</p></div>`).join("")}</div></article><article class="panel"><p class="kicker">Modes</p><div class="list">${Object.values(MODES).map((mode) => `<div class="list-item"><div class="split"><strong>${mode.title}</strong><span class="badge ${(state.unlockedModes || []).includes(mode.id) ? "success" : "warn"}">${(state.unlockedModes || []).includes(mode.id) ? "Unlocked" : "Locked"}</span></div><p class="meta">${mode.description}</p></div>`).join("")}</div></article></section><section class="panel"><p class="kicker">Unlock Conditions</p><div class="list">${UNLOCK_RULES.map((rule) => `<div class="list-item"><strong>${MODES[rule.modeId]?.title || titleCase(rule.modeId)}</strong><p class="meta">${rule.description}</p></div>`).join("")}</div></section></section>`;
}

function renderCurrentRunCard() { const run = state.currentRun; const stage = getCurrentStage(run); const level = getCurrentLevel(run); return `<section class="panel"><div class="split"><div><p class="kicker">Current Run</p><h3>${stage.title} · ${level.title}</h3><p class="meta">Mode: ${MODES[run.modeId]?.title || run.modeId}</p></div>${button("Continue", "continue-run", "primary-button")}</div></section>`; }
function renderNewRun() { const modes = Object.values(MODES); const selectedMode = (state.unlockedModes || []).includes(state.settings.mode) ? state.settings.mode : "standard"; return `<section class="screen"><section class="panel hero"><p class="eyebrow">Start a run</p><h2>Choose your operating environment</h2><p>Each mode changes pressure and scoring. Pick the one that exposes your weaker pattern honestly.</p></section><section class="panel"><div class="input-row"><label for="mode-select">Game mode</label><select id="mode-select">${modes.map((mode) => `<option value="${mode.id}" ${selectedMode === mode.id ? "selected" : ""} ${!(state.unlockedModes || []).includes(mode.id) ? "disabled" : ""}>${mode.title}${!(state.unlockedModes || []).includes(mode.id) ? " — locked" : ""}</option>`).join("")}</select></div><div class="callout"><strong>${MODES[selectedMode]?.title || "Standard"}:</strong> ${MODES[selectedMode]?.description || "Balanced visibility."}</div><div class="button-row" style="margin-top:16px;">${button("Begin New Run", "confirm-new-run", "primary-button")}${button("Back", "nav-home")}</div></section></section>`; }
function renderStageIntro(run) { const stage = getCurrentStage(run); const completed = run.stageProgress?.[run.currentStageIndex]?.levelResults?.length || 0; return `<section class="screen"><section class="panel hero"><p class="eyebrow">Stage ${run.currentStageIndex + 1} of ${STAGES.length}</p><h2>${stage.title}</h2><p>${stage.intro}</p></section><section class="panel"><p class="kicker">Progress</p><div class="progress"><span style="width:${(completed / stage.levels.length) * 100}%"></span></div><p class="meta" style="margin-top:10px;">${completed}/${stage.levels.length} levels complete in this stage.</p><div class="button-row">${button("View Level Briefing", "show-briefing", "primary-button")}${button("Home", "nav-home")}</div></section><section class="panel"><p class="kicker">Current Stats</p>${renderStatGrid(run.stats)}</section></section>`; }
function renderBriefing(run) { const stage = getCurrentStage(run); const level = getCurrentLevel(run); return `<section class="screen"><section class="panel hero"><p class="eyebrow">${stage.title} · ${level.year}</p><h2>${level.title}</h2><p>${level.scenario}</p></section><section class="panel"><p class="kicker">Rules / Briefing</p><div class="list"><div class="list-item"><strong>What to do</strong><p class="meta">${level.briefing.objective}</p></div><div class="list-item"><strong>Constraints</strong><p class="meta">${(level.briefing.constraints || []).join(" · ")}</p></div><div class="list-item"><strong>Resources</strong><p class="meta">${(level.briefing.resources || []).join(" · ")}</p></div><div class="list-item"><strong>Timed?</strong><p class="meta">${level.timed ? `${formatDuration(level.timeLimit)} timer` : "Untimed"}</p></div><div class="list-item"><strong>Success / Partial / Failure</strong><p class="meta">Success: ${level.briefing.outcomes.success}<br>Partial: ${level.briefing.outcomes.partial}<br>Failure: ${level.briefing.outcomes.failure}</p></div><div class="list-item"><strong>Scoring</strong><p class="meta">${level.briefing.scoring}</p></div></div><div class="button-row" style="margin-top:16px;">${button("Begin", "begin-level", "primary-button")}${button("Back", "back-stage-intro")}</div></section></section>`; }
function renderGameplay(run) { const level = getCurrentLevel(run); const timer = level.timed ? `<div class="timer">Time: ${formatDuration(ui.timeLeft || 0)}</div>` : ""; return `<section class="screen"><section class="panel hero"><div class="split"><div><p class="eyebrow">${getCurrentStage(run).title} · ${level.year}</p><h2>${level.title}</h2></div>${timer}</div><p>${level.scenario}</p></section><section class="panel">${renderTaskBody(level)}</section><section class="panel"><p class="kicker">Current Stats</p>${renderStatGrid(run.stats)}</section></section>`; }
function renderTaskBody(level) { if (level.type === "decision") return `<div class="list">${(level.options || []).map((option) => `<button class="option-card ${ui.selected === option.id ? "selected" : ""}" type="button" data-option-id="${option.id}"><h4>${option.title}</h4><p>${option.description}</p><p class="meta">Signals: ${(option.tags || []).join(" · ")}</p></button>`).join("")}</div><div class="button-row">${button("Submit Decision", "submit-level", "primary-button", ui.selected ? "" : "disabled")}</div>`; if (level.type === "allocation") { const spent = (level.choices || []).filter((item) => ui.selectedIds.includes(item.id)).reduce((sum, item) => sum + Number(item.cost || 0), 0); return `<div class="split"><strong>Budget used: ${spent}/${level.pool}</strong><span class="badge ${spent > level.pool ? "danger" : "success"}">${spent > level.pool ? "Over budget" : "Within budget"}</span></div><div class="list">${(level.choices || []).map((choice) => `<button class="option-card ${ui.selectedIds.includes(choice.id) ? "selected" : ""}" type="button" data-allocation-id="${choice.id}"><div class="split"><h4>${choice.label}</h4><strong>Cost ${choice.cost}</strong></div></button>`).join("")}</div><div class="button-row">${button("Submit Allocation", "submit-level", "primary-button", ui.selectedIds.length ? "" : "disabled")}</div>`; } if (level.type === "priority") { const chosen = ui.rankedIds.map((id, index) => { const item = (level.items || []).find((entry) => entry.id === id); return `<div class="list-item"><strong>${index + 1}. ${item?.label || id}</strong></div>`; }).join(""); const available = (level.items || []).filter((item) => !ui.rankedIds.includes(item.id)).map((item) => `<button class="option-card" type="button" data-priority-id="${item.id}"><h4>${item.label}</h4></button>`).join(""); return `<section class="grid two"><article class="panel"><h3>Chosen order</h3><div class="list">${chosen || `<div class="list-item"><p class="meta">Tap items from the right to build the sequence.</p></div>`}</div><div class="button-row">${button("Clear Order", "clear-priority")}${button("Submit Ranking", "submit-level", "primary-button", ui.rankedIds.length === (level.items || []).length ? "" : "disabled")}</div></article><article class="panel"><h3>Available actions</h3><div class="list">${available}</div></article></section>`; } if (level.type === "contradiction") return `<p class="meta">Select exactly 3.</p><div class="list">${(level.choices || []).map((choice) => `<button class="option-card ${ui.selectedIds.includes(choice.id) ? "selected" : ""}" type="button" data-contradiction-id="${choice.id}"><h4>${choice.title}</h4><p>${choice.description}</p></button>`).join("")}</div><div class="button-row">${button("Submit Analysis", "submit-level", "primary-button", ui.selectedIds.length === 3 ? "" : "disabled")}</div>`; return `<p class="meta">Unsupported task type.</p>`; }
function renderOutcome() { const o = ui.outcome; return `<section class="screen"><section class="panel hero"><p class="eyebrow">Level Outcome</p><h2>${o.title} — ${o.label}</h2><p>${o.feedback}</p></section><section class="grid two"><article class="panel"><p class="kicker">Level Score</p><h3>${o.score}/100</h3><p class="meta">${o.summary}</p><div class="button-row">${button("Continue", "advance-after-outcome", "primary-button")}${button("Home", "nav-home")}</div></article><article class="panel"><p class="kicker">Stats After Decision</p>${renderStatGrid(o.statsAfter)}</article></section></section>`; }
function renderStageDebrief(run) { const stageIndex = clamp(run.currentStageIndex - 1, 0, STAGES.length - 1); const stage = STAGES[stageIndex]; const results = run.stageProgress?.[stageIndex]?.levelResults || []; const avg = results.length ? Math.round(results.reduce((sum, item) => sum + item.normalizedScore, 0) / results.length) : 0; return `<section class="screen"><section class="panel hero"><p class="eyebrow">Stage Debrief</p><h2>${stage.title}</h2><p>${stage.debrief}</p></section><section class="panel"><p class="kicker">Stage Performance</p><h3>${avg}/100 average</h3><div class="list">${results.map((item) => `<div class="list-item"><strong>${item.levelTitle}</strong><p class="meta">${item.normalizedScore}/100 · ${item.outcomeLabel}</p></div>`).join("")}</div><div class="button-row">${button(run.currentStageIndex >= STAGES.length ? "View Final Analysis" : "Next Stage", "continue-after-stage", "primary-button")}</div></section></section>`; }
function renderFinalAnalysis() { const summary = ui.summary; return `<section class="screen"><section class="panel hero"><p class="eyebrow">End of Run</p><h2>Behavioral Profile Analysis</h2><p>Your choices formed a pattern. This is not a morality score. It is an operating profile under uncertainty.</p></section><section class="grid two"><article class="panel"><p class="kicker">Overall Score</p><h3>${summary.averageScore}/100</h3><p class="meta">Mode: ${titleCase(summary.modeId)}</p><p><strong>Strengths</strong></p><ul>${summary.profile.strengths.map((item) => `<li>${item}</li>`).join("")}</ul><p><strong>Weaknesses</strong></p><ul>${summary.profile.weaknesses.map((item) => `<li>${item}</li>`).join("")}</ul></article><article class="panel"><p class="kicker">Patterns</p><div class="list">${summary.profile.patterns.map((item) => `<div class="list-item"><p class="meta">${item}</p></div>`).join("")}</div><p class="kicker" style="margin-top:14px;">Actionable Improvements</p><div class="list">${summary.profile.suggestions.map((item) => `<div class="list-item"><p class="meta">${item}</p></div>`).join("")}</div></article></section><section class="panel"><p class="kicker">Final Stats</p>${renderStatGrid(summary.finalStats)}<div class="button-row" style="margin-top:16px;">${button("Return Home", "nav-home", "primary-button")}${button("View History", "nav-history")}${button("Start New Run", "new-run")}</div></section></section>`; }
function renderHistory() { const history = [...(state.history || [])].sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0)); return `<section class="screen"><section class="panel hero"><p class="eyebrow">History</p><h2>Run Archive</h2><p>Review patterns across runs. A good simulator exposes repeated weaknesses instead of flattering you.</p></section><section class="panel">${history.length ? `<div class="list">${history.map((item) => `<div class="list-item"><div class="split"><strong>${titleCase(item.modeId)}</strong><span class="badge">${item.averageScore}/100</span></div><p class="meta">${formatDate(item.completedAt)} · Final weaknesses: ${(item.profile?.weaknesses || []).join(", ") || "Not available"}</p></div>`).join("")}</div>` : `<p class="meta">No completed runs yet.</p>`}</section></section>`; }
function renderHelp() { return `<section class="screen"><section class="panel hero"><p class="eyebrow">Help</p><h2>How to Play</h2><p>Before every task, you get a full rules screen. Read it. The simulator rewards durable tradeoff quality, not optimistic image management.</p></section><section class="panel"><div class="list"><div class="list-item"><strong>Decision tasks</strong><p class="meta">Choose one path from several plausible but costly options.</p></div><div class="list-item"><strong>Allocation tasks</strong><p class="meta">Spend a limited pool across competing needs. Over-optimizing one area can expose fragility elsewhere.</p></div><div class="list-item"><strong>Priority tasks</strong><p class="meta">Rank what you would do first. Sequence matters as much as intent.</p></div><div class="list-item"><strong>Contradiction tasks</strong><p class="meta">Select the strongest signals, principles, or red flags from mixed information.</p></div><div class="list-item"><strong>Saves</strong><p class="meta">Runs and history are stored locally in this browser.</p></div></div></section></section>`; }
function renderSettings() { return `<section class="screen"><section class="panel hero"><p class="eyebrow">Settings</p><h2>Control the simulation environment</h2><p>Settings are saved locally on this device.</p></section><section class="panel"><div class="chip-row"><button type="button" class="chip ${state.settings.lowMotion ? "active" : ""}" data-setting-toggle="lowMotion">Low Motion</button></div><div class="button-row" style="margin-top:16px;">${button("Reset All Local Data", "reset-local-data")}${installBtn && !installBtn.classList.contains("hidden") ? button("Install App", "install-app") : ""}</div><p class="footer-note" style="margin-top:12px;">This clears current run, history, unlocked modes, and settings from local storage.</p></section></section>`; }
function renderStatGrid(stats) { return `<div class="stat-grid">${Object.entries(stats || {}).map(([key, value]) => `<article class="stat-card" title="${STAT_INFO[key] || ""}"><span class="label">${titleCase(key)}</span><span class="value">${value}</span></article>`).join("")}</div>`; }
function updateNav() { navButtons.forEach((button) => { const nav = button.getAttribute("data-nav"); const active = (ui.screen === nav) || (ui.screen === "new-run" && nav === "home") || (["stage-intro", "briefing", "gameplay", "outcome", "stage-debrief", "final-analysis"].includes(ui.screen) && nav === "home"); button.classList.toggle("active", active); }); }
function promptInstall() { if (!deferredInstallPrompt) return; deferredInstallPrompt.prompt(); deferredInstallPrompt.userChoice.finally(() => { deferredInstallPrompt = null; installBtn?.classList.add("hidden"); }); }
async function registerServiceWorker() { if (!("serviceWorker" in navigator)) return; try { const registration = await navigator.serviceWorker.register(`./service-worker.js?v=${APP_VERSION}`); if (registration.waiting) waitingWorker = registration.waiting; registration.addEventListener("updatefound", () => { const worker = registration.installing; if (!worker) return; worker.addEventListener("statechange", () => { if (worker.state === "installed" && navigator.serviceWorker.controller) { waitingWorker = registration.waiting || worker; toast("A fresh version is ready."); if (waitingWorker) waitingWorker.postMessage({ type: "SKIP_WAITING" }); } }); }); navigator.serviceWorker.addEventListener("controllerchange", () => { if (didAutoReloadForNewSw) return; didAutoReloadForNewSw = true; window.location.reload(); }); window.setInterval(() => registration.update().catch(() => {}), 60000); } catch (error) { console.error("Service worker registration failed", error); } }
function loadState() { try { const raw = localStorage.getItem(STORAGE_KEY); if (!raw) return clone(DEFAULT_STATE); const parsed = JSON.parse(raw); return sanitizeState(parsed); } catch (error) { console.error("Failed to load state", error); return clone(DEFAULT_STATE); } }
function persist() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (error) { console.error("Failed to save state", error); } }
function sanitizeState(input) { const next = clone(DEFAULT_STATE); if (!input || typeof input !== "object") return next; next.settings.mode = MODES[input.settings?.mode] ? input.settings.mode : "standard"; next.settings.lowMotion = Boolean(input.settings?.lowMotion); next.history = Array.isArray(input.history) ? input.history.filter(Boolean) : []; next.unlockedModes = unlockModes(next.history); next.currentRun = sanitizeRun(input.currentRun); return next; }
function sanitizeRun(run) { if (!run || typeof run !== "object") return null; const stageIndex = clamp(Number.isInteger(run.currentStageIndex) ? run.currentStageIndex : 0, 0, STAGES.length - 1); const stage = STAGES[stageIndex]; const levelIndex = clamp(Number.isInteger(run.currentLevelIndex) ? run.currentLevelIndex : 0, 0, stage.levels.length - 1); const stats = clone(BASE_STATS); Object.keys(stats).forEach((key) => { stats[key] = clamp(Number(run.stats?.[key] ?? stats[key]), 0, 100); }); return { id: run.id || `run-${Date.now()}`, modeId: MODES[run.modeId] ? run.modeId : "standard", startedAt: Number(run.startedAt) || Date.now(), updatedAt: Number(run.updatedAt) || Date.now(), currentStageIndex: stageIndex, currentLevelIndex: levelIndex, stats, stageProgress: STAGES.map((stageItem, index) => ({ stageId: stageItem.id, completed: Boolean(run.stageProgress?.[index]?.completed), levelResults: Array.isArray(run.stageProgress?.[index]?.levelResults) ? run.stageProgress[index].levelResults.filter(Boolean) : [] })) }; }
function resetAllLocalData() { clearTimer(); try { localStorage.removeItem(STORAGE_KEY); } catch (error) { console.error("Failed to clear storage", error); } state = clone(DEFAULT_STATE); ui.screen = "home"; ui.outcome = null; ui.summary = null; resetUiSelection(); persist(); toast("Local data cleared."); render(); }
function getRun() { state.currentRun = sanitizeRun(state.currentRun); return state.currentRun; }
function getCurrentStage(run) { return STAGES[run.currentStageIndex]; }
function getCurrentLevel(run) { return getCurrentStage(run).levels[run.currentLevelIndex]; }
function resetUiSelection() { ui.selected = null; ui.selectedIds = []; ui.rankedIds = []; ui.timeLeft = null; }
function applySettings() { document.body.classList.toggle("low-motion", !!state.settings.lowMotion); }
function renderBootError(error) { console.error("App failed to boot", error); if (!appEl) return; appEl.innerHTML = `<section class="screen"><section class="panel hero"><p class="eyebrow">Runtime recovery</p><h2>The simulator hit an error</h2><p>A full rebuild is loaded, but this browser still encountered an error. Use the actions below to recover.</p></section><section class="panel"><div class="button-row"><button type="button" class="primary-button" data-action="reload-app">Reload App</button><button type="button" class="secondary-button" data-action="reset-local-data">Reset Local Data</button><button type="button" class="secondary-button" data-action="nav-home">Go Home</button></div><p class="footer-note" style="margin-top:12px;">Open the browser console to inspect the exact error.</p></section></section>`; }
function toast(message) { let stack = document.querySelector(".toast-stack"); if (!stack) { stack = document.createElement("div"); stack.className = "toast-stack"; document.body.appendChild(stack); } const node = document.createElement("div"); node.className = "toast"; node.textContent = message; stack.appendChild(node); setTimeout(() => { node.remove(); if (!stack.children.length) stack.remove(); }, 2200); }
function weightedEffectScore(effects = {}) { return Object.entries(effects).reduce((sum, [key, delta]) => { const value = Number(delta || 0); if (key === "ai-reliance") return sum - value * 0.35; return sum + value * 0.55; }, 0); }
function applyEffects(stats, effects = {}) { const next = clone(stats); Object.entries(effects).forEach(([key, delta]) => { if (!(key in next)) return; next[key] = clamp(Number(next[key]) + Number(delta || 0), 0, 100); }); return next; }
function combineEffects(list) { return list.reduce((acc, entry) => mergeEffects(acc, entry), {}); }
function mergeEffects(base, extra) { const next = { ...base }; Object.entries(extra || {}).forEach(([key, value]) => { next[key] = Number(next[key] || 0) + Number(value || 0); }); return next; }
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function clamp(value, min, max) { return Math.max(min, Math.min(max, Number(value))); }
function titleCase(value) { return String(value).replace(/[-_]/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()); }
function formatDuration(seconds) { const mins = Math.floor(Number(seconds || 0) / 60); const secs = Number(seconds || 0) % 60; return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`; }
function formatDate(timestamp) { return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" }).format(new Date(timestamp)); }
function button(label, action, variant = "secondary-button", attrs = "") { return `<button type="button" class="${variant}" data-action="${action}" ${attrs}>${label}</button>`; }
