import { MODES } from "./gameData.js";
import { loadState, saveState, resetState } from "./storage.js";
import {
  createRun,
  finalizeLevel,
  evaluateAllocationLevel,
  evaluateContradictionLevel,
  evaluateDecisionLevel,
  evaluatePriorityLevel,
  getCurrentLevel,
  getCurrentStage,
  summarizeRun,
  unlockModesFromState,
} from "./scoring.js";
import {
  renderBriefing,
  renderFinalAnalysis,
  renderGameplay,
  renderHelp,
  renderHistory,
  renderHome,
  renderNewRun,
  renderOutcome,
  renderSettings,
  renderStageDebrief,
  renderStageIntro,
} from "./ui.js";

const app = document.querySelector("#app");
const installBtn = document.querySelector("#install-btn");
const navButtons = Array.from(document.querySelectorAll(".nav-button"));

let state = loadState();
let screen = state.currentRun ? "stage-intro" : "home";
let transient = {
  gameplay: {},
  pendingResult: null,
  deferredPrompt: null,
};

function persist() {
  saveState(state);
}

function showToast(message) {
  let stack = document.querySelector(".toast-stack");
  if (!stack) {
    stack = document.createElement("div");
    stack.className = "toast-stack";
    document.body.appendChild(stack);
  }
  const template = document.querySelector("#toast-template");
  const node = template.content.firstElementChild.cloneNode(true);
  node.textContent = message;
  stack.appendChild(node);
  setTimeout(() => {
    node.remove();
    if (!stack.children.length) stack.remove();
  }, 2400);
}

function updateNav(active) {
  navButtons.forEach((button) => button.classList.toggle("active", button.dataset.nav === active));
}

function render() {
  document.body.classList.toggle("low-motion", !!state.settings.lowMotion);

  if (screen === "home") {
    updateNav("home");
    app.innerHTML = renderHome(state);
  }
  if (screen === "new-run") {
    updateNav("home");
    app.innerHTML = renderNewRun(state);
    syncModeDescription();
  }
  if (screen === "stage-intro") {
    updateNav("home");
    app.innerHTML = renderStageIntro(state.currentRun);
  }
  if (screen === "briefing") {
    updateNav("home");
    app.innerHTML = renderBriefing(state.currentRun);
  }
  if (screen === "gameplay") {
    updateNav("home");
    app.innerHTML = renderGameplay(state.currentRun, transient.gameplay);
  }
  if (screen === "outcome") {
    updateNav("home");
    app.innerHTML = renderOutcome(state.currentRun, transient.pendingResult);
  }
  if (screen === "stage-debrief") {
    updateNav("home");
    app.innerHTML = renderStageDebrief(state.currentRun);
  }
  if (screen === "final-analysis") {
    updateNav("home");
    app.innerHTML = renderFinalAnalysis(transient.runSummary, transient.finishedRun);
  }
  if (screen === "history") {
    updateNav("history");
    app.innerHTML = renderHistory(state);
  }
  if (screen === "settings") {
    updateNav("settings");
    app.innerHTML = renderSettings(state);
  }
  if (screen === "help") {
    updateNav("help");
    app.innerHTML = renderHelp();
  }
}

function syncModeDescription() {
  const select = document.querySelector("#mode-select");
  const target = document.querySelector("#mode-description");
  if (!select || !target) return;
  const mode = MODES[select.value];
  target.innerHTML = `<strong>${mode.title}:</strong> ${mode.description}`;
}

function startNewRun(modeId) {
  state.currentRun = createRun(modeId);
  persist();
  transient.gameplay = {};
  screen = "stage-intro";
  render();
}

function ensureGameplayState() {
  const level = getCurrentLevel(state.currentRun);
  transient.gameplay = transient.gameplay || {};
  if (level.timed && transient.gameplay.timeLeft == null) {
    const multiplier = MODES[state.currentRun.modeId]?.timeMultiplier || 1;
    transient.gameplay.timeLeft = Math.max(10, Math.floor(level.timeLimit * multiplier));
    startTimer();
  }
  render();
}

let timerHandle = null;
function clearTimer() {
  if (timerHandle) {
    clearInterval(timerHandle);
    timerHandle = null;
  }
}

function startTimer() {
  clearTimer();
  timerHandle = setInterval(() => {
    if (screen !== "gameplay") return;
    transient.gameplay.timeLeft -= 1;
    if (transient.gameplay.timeLeft <= 0) {
      transient.gameplay.timeLeft = 0;
      clearTimer();
      autoSubmitOnTimeout();
    }
    render();
  }, 1000);
}

function autoSubmitOnTimeout() {
  showToast("Time expired. Submitting current state.");
  submitLevel();
}

function submitLevel() {
  clearTimer();
  const run = state.currentRun;
  const level = getCurrentLevel(run);
  let evaluation;

  if (level.type === "decision") {
    evaluation = evaluateDecisionLevel(run, level, transient.gameplay.selected);
  }
  if (level.type === "allocation") {
    evaluation = evaluateAllocationLevel(run, level, transient.gameplay.selectedIds || []);
  }
  if (level.type === "priority") {
    const rankedIds = transient.gameplay.rankedIds || [];
    evaluation = evaluatePriorityLevel(run, level, rankedIds);
  }
  if (level.type === "contradiction") {
    evaluation = evaluateContradictionLevel(run, level, transient.gameplay.selectedIds || []);
  }

  const result = finalizeLevel(run, level, evaluation);
  run.stats = result.statsAfter;
  run.updatedAt = Date.now();
  run.stageProgress[run.currentStageIndex].levelResults.push({
    levelId: level.id,
    levelTitle: level.title,
    normalizedScore: result.normalizedScore,
    outcomeLabel: result.outcomeLabel,
  });
  run.decisions.push({
    stageId: getCurrentStage(run).id,
    levelId: level.id,
    result,
    at: Date.now(),
  });

  state.currentRun = run;
  persist();
  transient.pendingResult = result;
  screen = "outcome";
  render();
}

function advanceAfterOutcome() {
  const run = state.currentRun;
  const stage = getCurrentStage(run);
  const finishedStage = run.currentLevelIndex >= stage.levels.length - 1;

  if (finishedStage) {
    run.stageProgress[run.currentStageIndex].completed = true;
    run.currentStageIndex += 1;
    run.currentLevelIndex = 0;
    state.currentRun = run;
    persist();
    screen = "stage-debrief";
    render();
    return;
  }

  run.currentLevelIndex += 1;
  state.currentRun = run;
  persist();
  transient.gameplay = {};
  screen = "stage-intro";
  render();
}

function continueAfterStage() {
  if (!state.currentRun) return;

  if (state.currentRun.currentStageIndex >= 6) {
    const finishedRun = structuredClone(state.currentRun);
    const summary = summarizeRun(finishedRun);
    const completedEntry = {
      id: finishedRun.id,
      modeId: finishedRun.modeId,
      completedAt: Date.now(),
      averageScore: summary.averageScore,
      finalStats: summary.finalStats,
      profile: summary.profile,
    };

    state.history.unshift(completedEntry);
    state.currentRun = null;
    state.unlockedModes = unlockModesFromState(state);
    persist();

    transient.finishedRun = finishedRun;
    transient.runSummary = summary;
    screen = "final-analysis";
    render();
    return;
  }

  transient.gameplay = {};
  screen = "stage-intro";
  render();
}

function handleNav(target) {
  screen = target;
  render();
}

document.addEventListener("click", (event) => {
  const actionEl = event.target.closest("[data-action]");
  const navEl = event.target.closest("[data-nav]");
  const optionEl = event.target.closest("[data-option-id]");
  const allocationEl = event.target.closest("[data-allocation-id]");
  const priorityEl = event.target.closest("[data-priority-id]");
  const contradictionEl = event.target.closest("[data-contradiction-id]");
  const settingEl = event.target.closest("[data-setting-toggle]");

  if (navEl) {
    handleNav(navEl.dataset.nav);
    return;
  }

  if (optionEl) {
    transient.gameplay.selected = optionEl.dataset.optionId;
    render();
    return;
  }

  if (allocationEl) {
    const id = allocationEl.dataset.allocationId;
    const selected = new Set(transient.gameplay.selectedIds || []);
    selected.has(id) ? selected.delete(id) : selected.add(id);
    transient.gameplay.selectedIds = [...selected];
    render();
    return;
  }

  if (priorityEl) {
    transient.gameplay.rankedIds = [...(transient.gameplay.rankedIds || []), priorityEl.dataset.priorityId];
    render();
    return;
  }

  if (contradictionEl) {
    const id = contradictionEl.dataset.contradictionId;
    const selected = new Set(transient.gameplay.selectedIds || []);
    if (selected.has(id)) selected.delete(id);
    else if (selected.size < 3) selected.add(id);
    transient.gameplay.selectedIds = [...selected];
    render();
    return;
  }

  if (settingEl) {
    const key = settingEl.dataset.settingToggle;
    state.settings[key] = !state.settings[key];
    persist();
    render();
    return;
  }

  if (!actionEl) return;

  const { action } = actionEl.dataset;

  if (action === "new-run") {
    screen = "new-run";
    render();
  }

  if (action === "confirm-new-run") {
    const modeId = document.querySelector("#mode-select")?.value || "standard";
    startNewRun(modeId);
  }

  if (action === "continue-run" && state.currentRun) {
    screen = "stage-intro";
    render();
  }

  if (action === "show-briefing") {
    screen = "briefing";
    render();
  }

  if (action === "back-stage-intro") {
    screen = "stage-intro";
    render();
  }

  if (action === "begin-level") {
    screen = "gameplay";
    transient.gameplay = {};
    ensureGameplayState();
  }

  if (action === "submit-level") {
    submitLevel();
  }

  if (action === "advance-after-outcome") {
    advanceAfterOutcome();
  }

  if (action === "continue-after-stage") {
    continueAfterStage();
  }

  if (action === "clear-priority") {
    transient.gameplay.rankedIds = [];
    render();
  }

  if (action === "nav-home") handleNav("home");
  if (action === "nav-help") handleNav("help");
  if (action === "nav-history") handleNav("history");

  if (action === "reset-local-data") {
    state = resetState();
    transient = { gameplay: {}, pendingResult: null, deferredPrompt: transient.deferredPrompt };
    screen = "home";
    persist();
    showToast("Local data cleared.");
    render();
  }
});

document.addEventListener("change", (event) => {
  if (event.target.matches("#mode-select")) syncModeDescription();
});

window.addEventListener("beforeunload", () => {
  clearTimer();
  persist();
});

window.addEventListener("appinstalled", () => {
  installBtn.classList.add("hidden");
  transient.deferredPrompt = null;
  showToast("App installed.");
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  transient.deferredPrompt = event;
  installBtn.classList.remove("hidden");
});

installBtn.addEventListener("click", async () => {
  if (!transient.deferredPrompt) return;
  transient.deferredPrompt.prompt();
  await transient.deferredPrompt.userChoice;
  transient.deferredPrompt = null;
  installBtn.classList.add("hidden");
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch((error) => {
      console.error("Service worker registration failed", error);
    });
  });
}

render();
