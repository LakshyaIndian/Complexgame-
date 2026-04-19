import { MODES, STAGES } from "./gameData.js";
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
  sanitizeRun,
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
state.currentRun = sanitizeRun(state.currentRun);
state.unlockedModes = unlockModesFromState(state);
let screen = state.currentRun ? "stage-intro" : "home";
let transient = {
  gameplay: {},
  pendingResult: null,
  deferredPrompt: null,
  finishedRun: null,
  runSummary: null,
};

function persist() {
  const didSave = saveState(state);
  if (!didSave) console.warn("State could not be persisted on this device/browser.");
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

function setScreen(nextScreen) {
  if (screen === "gameplay" && nextScreen !== "gameplay") {
    clearTimer();
  }
  screen = nextScreen;
  render();
}

function currentRunOrHome() {
  if (!state.currentRun) {
    setScreen("home");
    return null;
  }
  state.currentRun = sanitizeRun(state.currentRun);
  return state.currentRun;
}

function render() {
  document.body.classList.toggle("low-motion", !!state.settings.lowMotion);

  if (screen === "home") {
    updateNav("home");
    app.innerHTML = renderHome(state);
  } else if (screen === "new-run") {
    updateNav("home");
    app.innerHTML = renderNewRun(state);
    syncModeDescription();
  } else if (screen === "stage-intro") {
    if (!currentRunOrHome()) return;
    updateNav("home");
    app.innerHTML = renderStageIntro(state.currentRun);
  } else if (screen === "briefing") {
    if (!currentRunOrHome()) return;
    updateNav("home");
    app.innerHTML = renderBriefing(state.currentRun);
  } else if (screen === "gameplay") {
    if (!currentRunOrHome()) return;
    updateNav("home");
    app.innerHTML = renderGameplay(state.currentRun, transient.gameplay);
  } else if (screen === "outcome") {
    if (!currentRunOrHome() || !transient.pendingResult) return setScreen("home");
    updateNav("home");
    app.innerHTML = renderOutcome(state.currentRun, transient.pendingResult);
  } else if (screen === "stage-debrief") {
    if (!currentRunOrHome()) return;
    updateNav("home");
    app.innerHTML = renderStageDebrief(state.currentRun);
  } else if (screen === "final-analysis") {
    updateNav("home");
    if (!transient.runSummary || !transient.finishedRun) return setScreen("home");
    app.innerHTML = renderFinalAnalysis(transient.runSummary, transient.finishedRun);
  } else if (screen === "history") {
    updateNav("history");
    app.innerHTML = renderHistory(state);
  } else if (screen === "settings") {
    updateNav("settings");
    app.innerHTML = renderSettings(state);
  } else if (screen === "help") {
    updateNav("help");
    app.innerHTML = renderHelp();
  } else {
    updateNav("home");
    app.innerHTML = renderHome(state);
  }
}

function syncModeDescription() {
  const select = document.querySelector("#mode-select");
  const target = document.querySelector("#mode-description");
  if (!select || !target) return;
  const mode = MODES[select.value] || MODES.standard;
  target.innerHTML = `<strong>${mode.title}:</strong> ${mode.description}`;
}

function resetTransientGameplay() {
  transient.gameplay = {
    selected: null,
    selectedIds: [],
    rankedIds: [],
    timeLeft: null,
  };
}

function startNewRun(modeId) {
  clearTimer();
  state.currentRun = createRun(modeId);
  state.settings.mode = state.currentRun.modeId;
  transient.pendingResult = null;
  transient.finishedRun = null;
  transient.runSummary = null;
  resetTransientGameplay();
  persist();
  setScreen("stage-intro");
}

function ensureGameplayState() {
  const run = currentRunOrHome();
  if (!run) return;
  const level = getCurrentLevel(run);

  transient.gameplay = {
    selected: transient.gameplay.selected ?? null,
    selectedIds: Array.isArray(transient.gameplay.selectedIds) ? transient.gameplay.selectedIds : [],
    rankedIds: Array.isArray(transient.gameplay.rankedIds) ? transient.gameplay.rankedIds : [],
    timeLeft: transient.gameplay.timeLeft ?? null,
  };

  if (level.timed) {
    const multiplier = MODES[run.modeId]?.timeMultiplier || 1;
    transient.gameplay.timeLeft = transient.gameplay.timeLeft ?? Math.max(10, Math.floor(level.timeLimit * multiplier));
    startTimer();
  } else {
    transient.gameplay.timeLeft = null;
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
    transient.gameplay.timeLeft = Math.max(0, (transient.gameplay.timeLeft || 0) - 1);
    if (transient.gameplay.timeLeft <= 0) {
      clearTimer();
      autoSubmitOnTimeout();
      return;
    }
    render();
  }, 1000);
}

function autoSubmitOnTimeout() {
  showToast("Time expired. Resolving with your current state.");
  submitLevel();
}

function submitLevel() {
  const run = currentRunOrHome();
  if (!run) return;

  clearTimer();
  const level = getCurrentLevel(run);
  let evaluation;

  try {
    if (level.type === "decision") {
      evaluation = evaluateDecisionLevel(run, level, transient.gameplay.selected);
    } else if (level.type === "allocation") {
      evaluation = evaluateAllocationLevel(run, level, transient.gameplay.selectedIds || []);
    } else if (level.type === "priority") {
      evaluation = evaluatePriorityLevel(run, level, transient.gameplay.rankedIds || []);
    } else if (level.type === "contradiction") {
      evaluation = evaluateContradictionLevel(run, level, transient.gameplay.selectedIds || []);
    } else {
      throw new Error(`Unsupported level type: ${level.type}`);
    }
  } catch (error) {
    console.error("Failed to submit level", error);
    showToast("A submission error occurred. The level was not advanced.");
    resetTransientGameplay();
    persist();
    return setScreen("stage-intro");
  }

  const result = finalizeLevel(run, level, evaluation);
  run.stats = result.statsAfter;
  run.totalScore = (run.totalScore || 0) + result.normalizedScore;
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

  state.currentRun = sanitizeRun(run);
  persist();
  transient.pendingResult = result;
  setScreen("outcome");
}

function advanceAfterOutcome() {
  const run = currentRunOrHome();
  if (!run) return;

  const stage = getCurrentStage(run);
  const finishedStage = run.currentLevelIndex >= stage.levels.length - 1;

  if (finishedStage) {
    run.stageProgress[run.currentStageIndex].completed = true;
    run.currentStageIndex += 1;
    run.currentLevelIndex = 0;
    state.currentRun = run.currentStageIndex >= STAGES.length ? run : sanitizeRun(run);
    persist();
    transient.pendingResult = null;
    return setScreen("stage-debrief");
  }

  run.currentLevelIndex += 1;
  state.currentRun = sanitizeRun(run);
  persist();
  transient.pendingResult = null;
  resetTransientGameplay();
  setScreen("stage-intro");
}

function continueAfterStage() {
  const run = state.currentRun;
  if (!run) return;

  if (run.currentStageIndex >= STAGES.length) {
    const finishedRun = JSON.parse(JSON.stringify(run));
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
    return setScreen("final-analysis");
  }

  resetTransientGameplay();
  setScreen("stage-intro");
}

function handleNav(target) {
  if (target === "home") return setScreen("home");
  if (target === "history") return setScreen("history");
  if (target === "help") return setScreen("help");
  if (target === "settings") return setScreen("settings");
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

  if (action === "new-run") return setScreen("new-run");

  if (action === "confirm-new-run") {
    const modeId = document.querySelector("#mode-select")?.value || state.settings.mode || "standard";
    return startNewRun(modeId);
  }

  if (action === "continue-run" && state.currentRun) {
    resetTransientGameplay();
    return setScreen("stage-intro");
  }

  if (action === "show-briefing") return setScreen("briefing");
  if (action === "back-stage-intro") return setScreen("stage-intro");

  if (action === "begin-level") {
    resetTransientGameplay();
    setScreen("gameplay");
    return ensureGameplayState();
  }

  if (action === "submit-level") return submitLevel();
  if (action === "advance-after-outcome") return advanceAfterOutcome();
  if (action === "continue-after-stage") return continueAfterStage();

  if (action === "clear-priority") {
    transient.gameplay.rankedIds = [];
    return render();
  }

  if (action === "nav-home") return handleNav("home");
  if (action === "nav-help") return handleNav("help");
  if (action === "nav-history") return handleNav("history");

  if (action === "reset-local-data") {
    clearTimer();
    state = resetState();
    state.unlockedModes = unlockModesFromState(state);
    transient = { gameplay: {}, pendingResult: null, deferredPrompt: transient.deferredPrompt, finishedRun: null, runSummary: null };
    persist();
    showToast("Local data cleared.");
    return setScreen("home");
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
  installBtn?.classList.add("hidden");
  transient.deferredPrompt = null;
  showToast("App installed.");
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  transient.deferredPrompt = event;
  installBtn?.classList.remove("hidden");
});

installBtn?.addEventListener("click", async () => {
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

persist();
render();
