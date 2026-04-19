const APP_VERSION = "2026-04-19-standalone-1";
const STORAGE_KEY = "frs2050_state_v1";

const appEl = document.getElementById("app");
const installBtn = document.getElementById("install-btn");
const navButtons = Array.from(document.querySelectorAll(".nav-button"));

const MODES = {
  standard: { id: "standard", title: "Standard", description: "Balanced visibility and fair scoring.", timeMultiplier: 1, scoreMultiplier: 1 },
  hard: { id: "hard", title: "Hard", description: "Tighter margins and harsher outcomes.", timeMultiplier: 0.85, scoreMultiplier: 1.1 },
  "high-pressure": { id: "high-pressure", title: "High-Pressure", description: "Compressed time and more stressful sequencing.", timeMultiplier: 0.65, scoreMultiplier: 1.15 },
};

const BASE_STATS = {
  resilience: 50,
  adaptability: 50,
  focus: 50,
  credibility: 50,
  "financial-buffer": 50,
  "learning-velocity": 50,
  "health-stability": 50,
  "strategic-clarity": 50,
  "ethical-consistency": 50,
};

const STAGES = [
  {
    id: "personal-stability",
    title: "Personal Stability",
    summary: "Housing, health, and routines under pressure.",
    intro: "Your first future shock is often not abstract technology. It is whether your body, home, and routine can survive volatility without collapse.",
    debrief: "Stability is not softness. It is the infrastructure that lets you take hard hits without losing agency.",
    levels: [
      {
        id: "ps-1",
        title: "Fragile Apartment, Fragile Routine",
        type: "decision",
        year: 2026,
        timed: false,
        scenario: "Rent jumps 28%. Sleep is already poor and work quality is slipping. You must choose what to protect first.",
        briefing: {
          objective: "Choose a housing response that protects long-term stability.",
          constraints: ["Savings are thin", "Work quality matters", "There is no perfect answer"],
          resources: ["₹1.6 lakh liquid cash", "One dependable friend nearby"],
          scoring: "You score better for preserving runway, sleep, and optionality rather than status.",
          outcomes: {
            success: "You preserve cash, sleep, and flexibility.",
            partial: "You solve one problem but create drag elsewhere.",
            failure: "You preserve appearances while future fragility increases.",
          },
        },
        options: [
          { id: "shared-flat", title: "Move into a modest shared flat", description: "Lower ego comfort, recover runway and sleep discipline.", effects: { "financial-buffer": 10, "health-stability": 7, resilience: 6, focus: 4 }, rationale: "You traded short-term vanity for long-term operating stability." },
          { id: "stay-and-stretch", title: "Stay and stretch finances", description: "Avoid disruption, but anxiety rises immediately.", effects: { "financial-buffer": -12, "health-stability": -4, resilience: -5, focus: -4 }, rationale: "You preserved continuity, but at the cost of future choice." },
          { id: "far-commute", title: "Move farther away for lower rent", description: "Cash improves, but friction and fatigue rise.", effects: { "financial-buffer": 6, "health-stability": -4, focus: -3, adaptability: 2 }, rationale: "This helps cash but leaks energy every day." },
        ],
      },
    ],
  },
  {
    id: "career-disruption",
    title: "Career Disruption",
    summary: "AI compression, pivots, and professional fragility.",
    intro: "The market no longer rewards static competence. It rewards people who can reconfigure themselves without losing judgment.",
    debrief: "Career resilience is usually not one dramatic leap. It is repeated sober pivots before the market forces humiliation.",
    levels: [
      {
        id: "cd-1",
        title: "Your Role Is Being Compressed",
        type: "decision",
        year: 2031,
        timed: false,
        scenario: "AI systems now let one person do the work of three. Promotions shrink. Fees compress. You have to adapt before the market reprices you completely.",
        briefing: {
          objective: "Choose how to respond to role compression.",
          constraints: ["Income still matters now", "You cannot do everything at once", "Old titles are losing power"],
          resources: ["Strong work ethic", "One year before the market fully reprices this skill"],
          scoring: "You score better for building leverage and proof-of-work rather than panic activity.",
          outcomes: {
            success: "You keep income while repositioning into harder-to-automate value.",
            partial: "You adapt, but slowly and expensively.",
            failure: "You defend the old map while market leverage decays.",
          },
        },
        options: [
          { id: "pivot-stack", title: "Keep income but build an AI-adjacent execution portfolio", description: "Shift steady weekly time into workflow design, judgment-heavy coordination, and proof-of-work.", effects: { adaptability: 10, "learning-velocity": 9, focus: -2, "strategic-clarity": 4 }, rationale: "You preserved cash while building a stronger future layer." },
          { id: "double-down-old", title: "Become elite in the old specialty", description: "Hope that premium niches remain protected.", effects: { focus: 5, adaptability: -8, "learning-velocity": -5, credibility: 2 }, rationale: "This can work for a few people, but broad repricing still hurts most careers." },
          { id: "quit-and-study", title: "Quit immediately and fully reset", description: "Maximum learning intensity with maximum runway risk.", effects: { "learning-velocity": 12, "financial-buffer": -14, resilience: -5, adaptability: 7 }, rationale: "This is bold, but fragile if execution slips." },
        ],
      },
    ],
  },
  {
    id: "financial-stress",
    title: "Financial Stress",
    summary: "Runway, scarcity, and capital discipline.",
    intro: "Money is not only a returns game. In unstable eras it is a time, options, and dignity game.",
    debrief: "A financial buffer is stored courage. Once gone, fear buys more control over your decisions.",
    levels: [
      {
        id: "fs-1",
        title: "Four Months of Runway",
        type: "allocation",
        year: 2032,
        timed: true,
        timeLimit: 50,
        pool: 10,
        scenario: "A client collapse cuts your income by 45%. You must rebuild cash discipline immediately without making yourself unemployable or physically unstable.",
        briefing: {
          objective: "Allocate ten budget units across survival needs.",
          constraints: ["You only have 10 units", "Underfunding basics creates hidden penalties", "This is about survival quality, not comfort"],
          resources: ["Small emergency fund", "No debt yet"],
          scoring: "You score better for protecting runway, health, and earning capacity together.",
          outcomes: {
            success: "You preserve optionality while staying functional.",
            partial: "You survive, but fragility remains.",
            failure: "You underinvest in the foundations that let income recover.",
          },
        },
        choices: [
          { id: "rent", label: "Housing / rent", cost: 3, effects: { "financial-buffer": 4, resilience: 2 } },
          { id: "food", label: "Nutrition / groceries", cost: 2, effects: { "health-stability": 7, focus: 2 } },
          { id: "network", label: "Relationship maintenance", cost: 1, effects: { credibility: 2, adaptability: 2 } },
          { id: "skill", label: "Skill / tooling upkeep", cost: 1, effects: { "learning-velocity": 6, adaptability: 3 } },
          { id: "buffer", label: "Pure liquidity reserve", cost: 2, effects: { "financial-buffer": 9, resilience: 2 } },
          { id: "status", label: "Status expenses you are embarrassed to cut", cost: 2, effects: { credibility: 1, "financial-buffer": -8, resilience: -5 } },
        ],
        rationale: "Scarcity punishes ego-driven spending faster than almost anything else.",
      },
    ],
  },
  {
    id: "social-trust",
    title: "Social Trust & Reputation",
    summary: "Misinformation, signaling, and network erosion.",
    intro: "In fractured information environments, truth, timing, and tone all affect whether people continue to trust you.",
    debrief: "Reputation is not the same as image. Image is what people feel briefly. Reputation is what they predict you will do when it matters.",
    levels: [
      {
        id: "st-1",
        title: "The Viral Thread About You",
        type: "priority",
        year: 2033,
        timed: true,
        timeLimit: 45,
        scenario: "A clipped video makes you look dishonest. It is spreading faster than corrections. Friends urge immediate response. Enemies want emotional mistakes.",
        briefing: {
          objective: "Rank your response priorities to a misinformation wave.",
          constraints: ["You must rank all actions", "Visibility is rising faster than facts", "Every move also signals character"],
          resources: ["You have receipts", "A few credible allies"],
          scoring: "You score better by preserving evidence, calm, and selective escalation.",
          outcomes: {
            success: "You protect truth and credibility without feeding the fire blindly.",
            partial: "You defend yourself but waste energy or amplify noise.",
            failure: "You react from panic and worsen the narrative.",
          },
        },
        items: [
          { id: "archive", label: "Preserve evidence and timestamps first", idealRank: 1, effects: { credibility: 6, "strategic-clarity": 4 } },
          { id: "allies", label: "Brief 2–3 credible allies privately", idealRank: 2, effects: { credibility: 3, resilience: 2 } },
          { id: "statement", label: "Issue a short factual statement", idealRank: 3, effects: { credibility: 4, focus: 2 } },
          { id: "doomscroll", label: "Read every mention and quote-post", idealRank: 5, effects: { focus: -8, resilience: -6 } },
          { id: "counterattack", label: "Attack the biggest account spreading it", idealRank: 4, effects: { credibility: -4, resilience: -2 } },
        ],
        rationale: "Not every attack should be fought at full volume in public.",
      },
    ],
  },
  {
    id: "crisis-leadership",
    title: "Crisis Leadership",
    summary: "Triage, pressure, and incomplete information.",
    intro: "Under stress, leadership is less about charisma and more about sequencing, triage, and clarity under incomplete facts.",
    debrief: "Leadership in shocks is often the ability to remain ethically structured when speed and fear are pressuring you toward shortcuts.",
    levels: [
      {
        id: "cl-1",
        title: "Regional Grid Failure",
        type: "allocation",
        year: 2041,
        timed: true,
        timeLimit: 55,
        pool: 8,
        scenario: "A severe heat wave causes rolling grid failure. Your team is partly remote, partly on-site, and one critical supplier is offline.",
        briefing: {
          objective: "Allocate eight response units across the first four hours of failure.",
          constraints: ["You only have 8 units", "Information is partial", "Underfunding basics creates second-order risk"],
          resources: ["Small team", "One backup site"],
          scoring: "You score better for protecting people, communication, decision quality, and recovery sequence.",
          outcomes: {
            success: "You stabilize people and the operating picture first.",
            partial: "You keep moving, but confusion remains.",
            failure: "You confuse motion with control while basics fail.",
          },
        },
        choices: [
          { id: "people", label: "Staff safety and status check", cost: 2, effects: { resilience: 5, credibility: 2 } },
          { id: "comms", label: "Single source of truth communication", cost: 1, effects: { credibility: 5, focus: 3 } },
          { id: "backup", label: "Backup ops migration", cost: 2, effects: { adaptability: 6, resilience: 2 } },
          { id: "triage", label: "Client / mission triage matrix", cost: 2, effects: { "strategic-clarity": 7, credibility: 3 } },
          { id: "rest", label: "Leader rotation and rest protocol", cost: 1, effects: { resilience: 3, focus: 2 } },
          { id: "image", label: "External brand messaging polish", cost: 1, effects: { credibility: -2, focus: -1 } },
        ],
        rationale: "In crisis, clarity is a resource, not a mood.",
      },
    ],
  },
  {
    id: "strategic-survival",
    title: "2050 Strategic Survival",
    summary: "Long-horizon choices and civilizational tradeoffs.",
    intro: "The final game is not personal optimization alone. It is choosing what kind of future you are helping build while still surviving inside it.",
    debrief: "Strategic survival is not only staying alive. It is deciding what forms of strength you refuse to sacrifice even when the future gets expensive.",
    levels: [
      {
        id: "ss-1",
        title: "What Did Your Pattern Become?",
        type: "decision",
        year: 2050,
        timed: false,
        scenario: "By 2050, your choices have made you into a certain kind of operator. Now you must decide how to spend the next decade.",
        briefing: {
          objective: "Choose the final strategy that best reflects your operating pattern.",
          constraints: ["This is path-dependent", "The best ending is not the most comfortable one", "Your choice should align with what you preserved"],
          resources: ["Your accumulated strengths", "Whatever trust and runway you protected"],
          scoring: "This final decision weighs both coherence and long-horizon survivability.",
          outcomes: {
            success: "You align survival with principled stewardship.",
            partial: "You survive, but narrow your meaning or flexibility.",
            failure: "You optimize for immediate security in ways that betray your deeper structure.",
          },
        },
        options: [
          { id: "build", title: "Build resilient local institutions", description: "Slower payoff, larger legacy, requires credibility and stamina.", effects: { "strategic-clarity": 8, "ethical-consistency": 7, credibility: 5, resilience: 4 }, rationale: "Durable futures are built through competent institutions, not only individual escape." },
          { id: "fortress", title: "Maximize private insulation", description: "Rational in narrow terms, corrosive in aggregate.", effects: { "financial-buffer": 8, credibility: -4, "ethical-consistency": -3 }, rationale: "Personal safety can become strategic shrinking." },
          { id: "arb", title: "Exploit volatility aggressively", description: "High gains, but long-term identity drift risk.", effects: { "financial-buffer": 10, credibility: -5, "ethical-consistency": -8 }, rationale: "Some win the future financially while becoming unfit to trust." },
        ],
      },
    ],
  },
];

const DEFAULT_STATE = {
  settings: { mode: "standard", lowMotion: false },
  currentRun: null,
  unlockedModes: ["standard"],
  history: [],
};

let state = loadState();
let screen = state.currentRun ? "stage-intro" : "home";
let selected = null;
let selectedIds = [];
let rankedIds = [];
let timeLeft = null;
let timerId = null;
let pendingOutcome = null;
let finalSummary = null;
let deferredInstallPrompt = null;

boot();

function boot() {
  applySettings();
  bindEvents();
  render();
}

function bindEvents() {
  document.addEventListener("click", handleClick);
  document.addEventListener("change", handleChange);
  window.addEventListener("beforeunload", () => {
    clearTimer();
    persist();
  });
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    installBtn?.classList.remove("hidden");
  });
  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    installBtn?.classList.add("hidden");
  });
}

function handleClick(event) {
  const target = event.target;
  if (!(target instanceof Element)) return;

  const nav = target.closest("[data-nav]");
  if (nav) {
    openScreen(nav.getAttribute("data-nav"));
    return;
  }

  const action = target.closest("[data-action]")?.getAttribute("data-action");
  if (action) {
    runAction(action);
    return;
  }

  const optionId = target.closest("[data-option-id]")?.getAttribute("data-option-id");
  if (optionId) {
    selected = optionId;
    render();
    return;
  }

  const allocationId = target.closest("[data-allocation-id]")?.getAttribute("data-allocation-id");
  if (allocationId) {
    const set = new Set(selectedIds);
    set.has(allocationId) ? set.delete(allocationId) : set.add(allocationId);
    selectedIds = Array.from(set);
    render();
    return;
  }

  const priorityId = target.closest("[data-priority-id]")?.getAttribute("data-priority-id");
  if (priorityId) {
    if (!rankedIds.includes(priorityId)) rankedIds.push(priorityId);
    render();
    return;
  }

  const contradictionId = target.closest("[data-contradiction-id]")?.getAttribute("data-contradiction-id");
  if (contradictionId) {
    const set = new Set(selectedIds);
    if (set.has(contradictionId)) set.delete(contradictionId);
    else if (set.size < 3) set.add(contradictionId);
    selectedIds = Array.from(set);
    render();
    return;
  }

  const settingToggle = target.closest("[data-setting-toggle]")?.getAttribute("data-setting-toggle");
  if (settingToggle) {
    state.settings[settingToggle] = !state.settings[settingToggle];
    applySettings();
    persist();
    render();
    return;
  }
}

function handleChange(event) {
  const target = event.target;
  if (!(target instanceof Element)) return;
  if (target.matches("#mode-select")) {
    state.settings.mode = target.value;
    persist();
    render();
  }
}

function runAction(action) {
  switch (action) {
    case "new-run":
      resetSelections();
      screen = "new-run";
      render();
      break;
    case "confirm-new-run":
      startNewRun(document.getElementById("mode-select")?.value || state.settings.mode || "standard");
      break;
    case "continue-run":
      if (!state.currentRun) return;
      resetSelections();
      screen = "stage-intro";
      render();
      break;
    case "show-briefing":
      if (!state.currentRun) return;
      resetSelections();
      screen = "briefing";
      render();
      break;
    case "back-stage-intro":
      screen = "stage-intro";
      render();
      break;
    case "begin-level":
      beginLevel();
      break;
    case "submit-level":
      submitLevel();
      break;
    case "advance-after-outcome":
      continueAfterOutcome();
      break;
    case "continue-after-stage":
      continueAfterStage();
      break;
    case "clear-priority":
      rankedIds = [];
      render();
      break;
    case "nav-home":
      openScreen("home");
      break;
    case "nav-history":
      openScreen("history");
      break;
    case "nav-help":
      openScreen("help");
      break;
    case "nav-settings":
      openScreen("settings");
      break;
    case "reset-local-data":
      resetAllLocalData();
      break;
    case "install-app":
      promptInstall();
      break;
    case "reload-app":
      window.location.reload();
      break;
    default:
      break;
  }
}

function openScreen(name) {
  clearTimer();
  screen = name;
  render();
}

function startNewRun(modeId) {
  const safeModeId = MODES[modeId] ? modeId : "standard";
  state.currentRun = {
    id: `run-${Date.now()}`,
    modeId: safeModeId,
    startedAt: Date.now(),
    updatedAt: Date.now(),
    currentStageIndex: 0,
    currentLevelIndex: 0,
    stats: clone(BASE_STATS),
    stageProgress: STAGES.map((stage) => ({ stageId: stage.id, completed: false, levelResults: [] })),
  };
  state.settings.mode = safeModeId;
  pendingOutcome = null;
  finalSummary = null;
  resetSelections();
  persist();
  screen = "stage-intro";
  render();
}

function beginLevel() {
  if (!state.currentRun) return;
  resetSelections();
  screen = "gameplay";
  const level = getCurrentLevel();
  if (level.timed) {
    const multiplier = MODES[state.currentRun.modeId]?.timeMultiplier || 1;
    timeLeft = Math.max(10, Math.floor(level.timeLimit * multiplier));
    startTimer();
  }
  render();
}

function startTimer() {
  clearTimer();
  timerId = setInterval(() => {
    if (screen !== "gameplay") return;
    timeLeft = Math.max(0, Number(timeLeft || 0) - 1);
    if (timeLeft <= 0) {
      clearTimer();
      submitLevel();
      return;
    }
    render();
  }, 1000);
}

function clearTimer() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
}

function submitLevel() {
  if (!state.currentRun) return;
  clearTimer();
  const level = getCurrentLevel();
  const result = evaluateLevel(level);
  state.currentRun.stats = applyEffects(state.currentRun.stats, result.effects);
  state.currentRun.updatedAt = Date.now();
  state.currentRun.stageProgress[state.currentRun.currentStageIndex].levelResults.push({
    levelId: level.id,
    levelTitle: level.title,
    normalizedScore: result.score,
    outcomeLabel: result.label,
  });
  pendingOutcome = {
    title: level.title,
    label: result.label,
    score: result.score,
    feedback: result.feedback,
    summary: result.summary,
    statsAfter: clone(state.currentRun.stats),
  };
  persist();
  screen = "outcome";
  render();
}

function continueAfterOutcome() {
  if (!state.currentRun) return;
  const stage = getCurrentStage();
  const finishedStage = state.currentRun.currentLevelIndex >= stage.levels.length - 1;
  pendingOutcome = null;
  resetSelections();
  if (finishedStage) {
    state.currentRun.stageProgress[state.currentRun.currentStageIndex].completed = true;
    state.currentRun.currentStageIndex += 1;
    state.currentRun.currentLevelIndex = 0;
    persist();
    screen = "stage-debrief";
    render();
    return;
  }
  state.currentRun.currentLevelIndex += 1;
  persist();
  screen = "stage-intro";
  render();
}

function continueAfterStage() {
  if (!state.currentRun) return;
  if (state.currentRun.currentStageIndex >= STAGES.length) {
    finalSummary = buildRunSummary(state.currentRun);
    state.history.unshift(finalSummary);
    state.currentRun = null;
    state.unlockedModes = unlockModes();
    persist();
    screen = "final-analysis";
    render();
    return;
  }
  screen = "stage-intro";
  render();
}

function evaluateLevel(level) {
  if (level.type === "decision") return evaluateDecision(level);
  if (level.type === "allocation") return evaluateAllocation(level);
  if (level.type === "priority") return evaluatePriority(level);
  return fallbackEvaluation(level.rationale || "Unknown level type.");
}

function evaluateDecision(level) {
  const option = (level.options || []).find((item) => item.id === selected);
  if (!option) return fallbackEvaluation("No valid decision was submitted.", { focus: -4, resilience: -3 });
  const score = normalizeScore(weightedEffectScore(option.effects));
  return {
    score,
    label: classifyScore(score),
    effects: option.effects || {},
    feedback: `${classifyNarrative(score)} ${option.rationale}`,
    summary: option.rationale,
  };
}

function evaluateAllocation(level) {
  const picked = (level.choices || []).filter((item) => selectedIds.includes(item.id));
  if (!picked.length) return fallbackEvaluation("You allocated nothing, which is itself a failure under constraint.", { focus: -4, resilience: -4, "strategic-clarity": -3 });
  const spent = picked.reduce((sum, item) => sum + Number(item.cost || 0), 0);
  const effects = combineEffects(picked.map((item) => item.effects || {}));
  let rawScore = weightedEffectScore(effects);
  if (spent > Number(level.pool || 0)) rawScore -= 8;
  if (selectedIds.includes("status") || selectedIds.includes("image")) rawScore -= 6;
  const score = normalizeScore(rawScore);
  return {
    score,
    label: classifyScore(score),
    effects,
    feedback: `You spent ${spent}/${level.pool}. ${classifyNarrative(score)} ${level.rationale}`,
    summary: level.rationale,
  };
}

function evaluatePriority(level) {
  const items = level.items || [];
  if (!rankedIds.length) return fallbackEvaluation("You did not establish an order of action.", { focus: -4, "strategic-clarity": -4, resilience: -2 });
  let rawScore = 0;
  let effects = {};
  rankedIds.forEach((id, index) => {
    const item = items.find((entry) => entry.id === id);
    if (!item) return;
    effects = mergeEffects(effects, item.effects || {});
    const distance = Math.abs((index + 1) - Number(item.idealRank || index + 1));
    rawScore += Math.max(0, 8 - distance * 3);
  });
  rawScore -= Math.max(0, items.length - rankedIds.length) * 4;
  const score = normalizeScore(rawScore);
  return {
    score,
    label: classifyScore(score),
    effects,
    feedback: `${classifyNarrative(score)} ${level.rationale}`,
    summary: level.rationale,
  };
}

function fallbackEvaluation(summary, effects = {}) {
  const score = normalizeScore(-18);
  return { score, label: classifyScore(score), effects, feedback: summary, summary };
}

function normalizeScore(rawScore) {
  const multiplier = MODES[state.currentRun?.modeId || "standard"]?.scoreMultiplier || 1;
  return clamp(Math.round(rawScore * multiplier + 50), 0, 100);
}

function classifyScore(score) {
  if (score >= 72) return "Resilient";
  if (score >= 58) return "Adaptive";
  if (score >= 42) return "Mixed";
  return "Fragile";
}

function classifyNarrative(score) {
  if (score >= 72) return "This was a resilient call.";
  if (score >= 58) return "This was adaptive, but not clean.";
  if (score >= 42) return "This produced mixed tradeoffs.";
  return "This was a fragile response under compounding pressure.";
}

function buildRunSummary(run) {
  const allLevelResults = run.stageProgress.flatMap((stage) => stage.levelResults || []);
  const averageScore = allLevelResults.length ? Math.round(allLevelResults.reduce((sum, item) => sum + item.normalizedScore, 0) / allLevelResults.length) : 0;
  const sorted = Object.entries(run.stats);
  const strengths = sorted.slice().sort((a, b) => b[1] - a[1]).slice(0, 3).map(([key, value]) => `${titleCase(key)} (${value})`);
  const weaknesses = sorted.slice().sort((a, b) => a[1] - b[1]).slice(0, 3).map(([key, value]) => `${titleCase(key)} (${value})`);
  const patterns = [];
  if (run.stats["financial-buffer"] < 45) patterns.push("You accepted near-term relief at the cost of future margin.");
  if (run.stats["ethical-consistency"] > 60) patterns.push("You preserved principle better than most players under pressure.");
  if (run.stats["strategic-clarity"] > 60) patterns.push("You treated sequence and systems thinking as real advantages.");
  if (!patterns.length) patterns.push("Your run was mixed: some durable calls, some expensive weaknesses under pressure.");
  const suggestions = [];
  if (run.stats["health-stability"] < 55) suggestions.push("Protect sleep, energy, and recovery earlier. They shape all later decisions.");
  if (run.stats["financial-buffer"] < 55) suggestions.push("Rebuild liquidity before chasing upside. Margin preserves freedom.");
  if (run.stats["strategic-clarity"] < 55) suggestions.push("Practice writing decisions before acting. Better sequence usually beats faster reaction.");
  if (suggestions.length < 3) suggestions.push("Run a harder mode next time to expose weaker parts of your pattern.");
  return {
    id: run.id,
    modeId: run.modeId,
    completedAt: Date.now(),
    averageScore,
    finalStats: clone(run.stats),
    profile: { strengths, weaknesses, patterns, suggestions },
  };
}

function unlockModes() {
  const unlocked = new Set(["standard"]);
  const scores = (state.history || []).map((item) => item.averageScore || 0);
  if (state.history.length >= 1) unlocked.add("hard");
  if (scores.some((score) => score >= 60)) unlocked.add("high-pressure");
  return Array.from(unlocked);
}

function render() {
  if (!appEl) return;
  applySettings();
  updateNav();
  if (screen === "home") return void (appEl.innerHTML = renderHome());
  if (screen === "new-run") return void (appEl.innerHTML = renderNewRun());
  if (screen === "history") return void (appEl.innerHTML = renderHistory());
  if (screen === "help") return void (appEl.innerHTML = renderHelp());
  if (screen === "settings") return void (appEl.innerHTML = renderSettings());
  if (!state.currentRun) {
    screen = "home";
    return void (appEl.innerHTML = renderHome());
  }
  if (screen === "stage-intro") return void (appEl.innerHTML = renderStageIntro());
  if (screen === "briefing") return void (appEl.innerHTML = renderBriefing());
  if (screen === "gameplay") return void (appEl.innerHTML = renderGameplay());
  if (screen === "outcome") return void (appEl.innerHTML = renderOutcome());
  if (screen === "stage-debrief") return void (appEl.innerHTML = renderStageDebrief());
  if (screen === "final-analysis") return void (appEl.innerHTML = renderFinalAnalysis());
}

function renderHome() {
  return `
    <section class="screen">
      <section class="panel hero">
        <p class="eyebrow">Version ${APP_VERSION}</p>
        <h2>Future Readiness Simulator 2050</h2>
        <p>A serious scenario strategy simulator about resilience, AI disruption, money, trust, leadership, and long-horizon survival.</p>
        <div class="button-row">
          ${button("New Run", "new-run", "primary-button")}
          ${state.currentRun ? button("Resume Run", "continue-run") : button("How to Play", "nav-help")}
          ${button("Stats History", "nav-history")}
        </div>
      </section>
      ${state.currentRun ? renderCurrentRunCard() : ""}
      <section class="grid two">
        <article class="panel">
          <p class="kicker">Stages</p>
          <div class="timeline">${STAGES.map((stage, index) => `<div class="timeline-item"><h3>${index + 1}. ${stage.title}</h3><p class="meta">${stage.summary}</p></div>`).join("")}</div>
        </article>
        <article class="panel">
          <p class="kicker">Modes</p>
          <div class="list">${Object.values(MODES).map((mode) => `<div class="list-item"><div class="split"><strong>${mode.title}</strong><span class="badge ${(state.unlockedModes || []).includes(mode.id) ? "success" : "warn"}">${(state.unlockedModes || []).includes(mode.id) ? "Unlocked" : "Locked"}</span></div><p class="meta">${mode.description}</p></div>`).join("")}</div>
        </article>
      </section>
      <section class="panel">
        <p class="kicker">What this build fixes</p>
        <p class="meta">This runtime is self-contained. Home, History, Help, Settings, New Run, Stage flow, save/resume, and final analysis work without depending on other JS modules.</p>
      </section>
    </section>
  `;
}

function renderCurrentRunCard() {
  const stage = getCurrentStage();
  const level = getCurrentLevel();
  return `<section class="panel"><div class="split"><div><p class="kicker">Current Run</p><h3>${stage.title} · ${level.title}</h3><p class="meta">Mode: ${MODES[state.currentRun.modeId]?.title || state.currentRun.modeId}</p></div>${button("Continue", "continue-run", "primary-button")}</div></section>`;
}

function renderNewRun() {
  const selectedMode = (state.unlockedModes || []).includes(state.settings.mode) ? state.settings.mode : "standard";
  return `
    <section class="screen">
      <section class="panel hero">
        <p class="eyebrow">Start a run</p>
        <h2>Choose your operating environment</h2>
        <p>Each mode changes time pressure and scoring intensity.</p>
      </section>
      <section class="panel">
        <div class="input-row">
          <label for="mode-select">Game mode</label>
          <select id="mode-select">${Object.values(MODES).map((mode) => `<option value="${mode.id}" ${selectedMode === mode.id ? "selected" : ""} ${!(state.unlockedModes || []).includes(mode.id) ? "disabled" : ""}>${mode.title}${!(state.unlockedModes || []).includes(mode.id) ? " — locked" : ""}</option>`).join("")}</select>
        </div>
        <div class="callout"><strong>${MODES[selectedMode]?.title || "Standard"}:</strong> ${MODES[selectedMode]?.description || "Balanced visibility."}</div>
        <div class="button-row" style="margin-top:16px;">${button("Begin New Run", "confirm-new-run", "primary-button")}${button("Back", "nav-home")}</div>
      </section>
    </section>
  `;
}

function renderStageIntro() {
  const stage = getCurrentStage();
  const completed = state.currentRun.stageProgress?.[state.currentRun.currentStageIndex]?.levelResults?.length || 0;
  return `<section class="screen"><section class="panel hero"><p class="eyebrow">Stage ${state.currentRun.currentStageIndex + 1} of ${STAGES.length}</p><h2>${stage.title}</h2><p>${stage.intro}</p></section><section class="panel"><p class="kicker">Progress</p><div class="progress"><span style="width:${(completed / stage.levels.length) * 100}%"></span></div><p class="meta" style="margin-top:10px;">${completed}/${stage.levels.length} levels complete in this stage.</p><div class="button-row">${button("View Level Briefing", "show-briefing", "primary-button")}${button("Home", "nav-home")}</div></section><section class="panel"><p class="kicker">Current Stats</p>${renderStatGrid(state.currentRun.stats)}</section></section>`;
}

function renderBriefing() {
  const stage = getCurrentStage();
  const level = getCurrentLevel();
  return `<section class="screen"><section class="panel hero"><p class="eyebrow">${stage.title} · ${level.year}</p><h2>${level.title}</h2><p>${level.scenario}</p></section><section class="panel"><p class="kicker">Rules / Briefing</p><div class="list"><div class="list-item"><strong>What to do</strong><p class="meta">${level.briefing.objective}</p></div><div class="list-item"><strong>Constraints</strong><p class="meta">${(level.briefing.constraints || []).join(" · ")}</p></div><div class="list-item"><strong>Resources</strong><p class="meta">${(level.briefing.resources || []).join(" · ")}</p></div><div class="list-item"><strong>Timed?</strong><p class="meta">${level.timed ? `${formatDuration(level.timeLimit)} timer` : "Untimed"}</p></div><div class="list-item"><strong>Success / Partial / Failure</strong><p class="meta">Success: ${level.briefing.outcomes.success}<br>Partial: ${level.briefing.outcomes.partial}<br>Failure: ${level.briefing.outcomes.failure}</p></div><div class="list-item"><strong>Scoring</strong><p class="meta">${level.briefing.scoring}</p></div></div><div class="button-row" style="margin-top:16px;">${button("Begin", "begin-level", "primary-button")}${button("Back", "back-stage-intro")}</div></section></section>`;
}

function renderGameplay() {
  const level = getCurrentLevel();
  const timer = level.timed ? `<div class="timer">Time: ${formatDuration(timeLeft || 0)}</div>` : "";
  return `<section class="screen"><section class="panel hero"><div class="split"><div><p class="eyebrow">${getCurrentStage().title} · ${level.year}</p><h2>${level.title}</h2></div>${timer}</div><p>${level.scenario}</p></section><section class="panel">${renderTaskBody(level)}</section><section class="panel"><p class="kicker">Current Stats</p>${renderStatGrid(state.currentRun.stats)}</section></section>`;
}

function renderTaskBody(level) {
  if (level.type === "decision") {
    return `<div class="list">${(level.options || []).map((option) => `<button class="option-card ${selected === option.id ? "selected" : ""}" type="button" data-option-id="${option.id}"><h4>${option.title}</h4><p>${option.description}</p></button>`).join("")}</div><div class="button-row">${button("Submit Decision", "submit-level", "primary-button", selected ? "" : "disabled")}</div>`;
  }
  if (level.type === "allocation") {
    const spent = (level.choices || []).filter((item) => selectedIds.includes(item.id)).reduce((sum, item) => sum + Number(item.cost || 0), 0);
    return `<div class="split"><strong>Budget used: ${spent}/${level.pool}</strong><span class="badge ${spent > level.pool ? "danger" : "success"}">${spent > level.pool ? "Over budget" : "Within budget"}</span></div><div class="list">${(level.choices || []).map((choice) => `<button class="option-card ${selectedIds.includes(choice.id) ? "selected" : ""}" type="button" data-allocation-id="${choice.id}"><div class="split"><h4>${choice.label}</h4><strong>Cost ${choice.cost}</strong></div></button>`).join("")}</div><div class="button-row">${button("Submit Allocation", "submit-level", "primary-button", selectedIds.length ? "" : "disabled")}</div>`;
  }
  if (level.type === "priority") {
    const chosen = rankedIds.map((id, index) => {
      const item = (level.items || []).find((entry) => entry.id === id);
      return `<div class="list-item"><strong>${index + 1}. ${item?.label || id}</strong></div>`;
    }).join("");
    const available = (level.items || []).filter((item) => !rankedIds.includes(item.id)).map((item) => `<button class="option-card" type="button" data-priority-id="${item.id}"><h4>${item.label}</h4></button>`).join("");
    return `<section class="grid two"><article class="panel"><h3>Chosen order</h3><div class="list">${chosen || `<div class="list-item"><p class="meta">Tap items from the right to build the sequence.</p></div>`}</div><div class="button-row">${button("Clear Order", "clear-priority")}${button("Submit Ranking", "submit-level", "primary-button", rankedIds.length === (level.items || []).length ? "" : "disabled")}</div></article><article class="panel"><h3>Available actions</h3><div class="list">${available}</div></article></section>`;
  }
  return `<p class="meta">Unsupported task type.</p>`;
}

function renderOutcome() {
  const o = pendingOutcome;
  return `<section class="screen"><section class="panel hero"><p class="eyebrow">Level Outcome</p><h2>${o.title} — ${o.label}</h2><p>${o.feedback}</p></section><section class="grid two"><article class="panel"><p class="kicker">Level Score</p><h3>${o.score}/100</h3><p class="meta">${o.summary}</p><div class="button-row">${button("Continue", "advance-after-outcome", "primary-button")}${button("Home", "nav-home")}</div></article><article class="panel"><p class="kicker">Stats After Decision</p>${renderStatGrid(o.statsAfter)}</article></section></section>`;
}

function renderStageDebrief() {
  const stageIndex = clamp(state.currentRun.currentStageIndex - 1, 0, STAGES.length - 1);
  const stage = STAGES[stageIndex];
  const results = state.currentRun.stageProgress?.[stageIndex]?.levelResults || [];
  const avg = results.length ? Math.round(results.reduce((sum, item) => sum + item.normalizedScore, 0) / results.length) : 0;
  return `<section class="screen"><section class="panel hero"><p class="eyebrow">Stage Debrief</p><h2>${stage.title}</h2><p>${stage.debrief}</p></section><section class="panel"><p class="kicker">Stage Performance</p><h3>${avg}/100 average</h3><div class="list">${results.map((item) => `<div class="list-item"><strong>${item.levelTitle}</strong><p class="meta">${item.normalizedScore}/100 · ${item.outcomeLabel}</p></div>`).join("")}</div><div class="button-row">${button(state.currentRun.currentStageIndex >= STAGES.length ? "View Final Analysis" : "Next Stage", "continue-after-stage", "primary-button")}</div></section></section>`;
}

function renderFinalAnalysis() {
  const summary = finalSummary;
  return `<section class="screen"><section class="panel hero"><p class="eyebrow">End of Run</p><h2>Behavioral Profile Analysis</h2><p>Your choices formed a pattern. This is not a morality score. It is an operating profile under uncertainty.</p></section><section class="grid two"><article class="panel"><p class="kicker">Overall Score</p><h3>${summary.averageScore}/100</h3><p class="meta">Mode: ${titleCase(summary.modeId)}</p><p><strong>Strengths</strong></p><ul>${summary.profile.strengths.map((item) => `<li>${item}</li>`).join("")}</ul><p><strong>Weaknesses</strong></p><ul>${summary.profile.weaknesses.map((item) => `<li>${item}</li>`).join("")}</ul></article><article class="panel"><p class="kicker">Patterns</p><div class="list">${summary.profile.patterns.map((item) => `<div class="list-item"><p class="meta">${item}</p></div>`).join("")}</div><p class="kicker" style="margin-top:14px;">Actionable Improvements</p><div class="list">${summary.profile.suggestions.map((item) => `<div class="list-item"><p class="meta">${item}</p></div>`).join("")}</div></article></section><section class="panel"><p class="kicker">Final Stats</p>${renderStatGrid(summary.finalStats)}<div class="button-row" style="margin-top:16px;">${button("Return Home", "nav-home", "primary-button")}${button("View History", "nav-history")}${button("Start New Run", "new-run")}</div></section></section>`;
}

function renderHistory() {
  const history = [...(state.history || [])].sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
  return `<section class="screen"><section class="panel hero"><p class="eyebrow">History</p><h2>Run Archive</h2><p>Review patterns across runs. A good simulator exposes repeated weaknesses instead of flattering you.</p></section><section class="panel">${history.length ? `<div class="list">${history.map((item) => `<div class="list-item"><div class="split"><strong>${titleCase(item.modeId)}</strong><span class="badge">${item.averageScore}/100</span></div><p class="meta">${formatDate(item.completedAt)} · Final weaknesses: ${(item.profile?.weaknesses || []).join(", ") || "Not available"}</p></div>`).join("")}</div>` : `<p class="meta">No completed runs yet.</p>`}</section></section>`;
}

function renderHelp() {
  return `<section class="screen"><section class="panel hero"><p class="eyebrow">Help</p><h2>How to Play</h2><p>Before every task, you get a full rules screen. Read it. The simulator rewards durable tradeoff quality, not optimistic image management.</p></section><section class="panel"><div class="list"><div class="list-item"><strong>Decision tasks</strong><p class="meta">Choose one path from several plausible but costly options.</p></div><div class="list-item"><strong>Allocation tasks</strong><p class="meta">Spend a limited pool across competing needs.</p></div><div class="list-item"><strong>Priority tasks</strong><p class="meta">Rank what you would do first. Sequence matters as much as intent.</p></div><div class="list-item"><strong>Saves</strong><p class="meta">Runs and history are stored locally in this browser.</p></div></div></section></section>`;
}

function renderSettings() {
  return `<section class="screen"><section class="panel hero"><p class="eyebrow">Settings</p><h2>Control the simulation environment</h2><p>Settings are saved locally on this device.</p></section><section class="panel"><div class="chip-row"><button type="button" class="chip ${state.settings.lowMotion ? "active" : ""}" data-setting-toggle="lowMotion">Low Motion</button></div><div class="button-row" style="margin-top:16px;">${button("Reset All Local Data", "reset-local-data")}${deferredInstallPrompt ? button("Install App", "install-app") : ""}</div><p class="footer-note" style="margin-top:12px;">This clears current run, history, unlocked modes, and settings from local storage.</p></section></section>`;
}

function renderStatGrid(stats) {
  return `<div class="stat-grid">${Object.entries(stats || {}).map(([key, value]) => `<article class="stat-card"><span class="label">${titleCase(key)}</span><span class="value">${value}</span></article>`).join("")}</div>`;
}

function updateNav() {
  navButtons.forEach((button) => {
    const nav = button.getAttribute("data-nav");
    const active = (screen === nav) || (screen === "new-run" && nav === "home") || (["stage-intro", "briefing", "gameplay", "outcome", "stage-debrief", "final-analysis"].includes(screen) && nav === "home");
    button.classList.toggle("active", active);
  });
}

function getCurrentStage() {
  return STAGES[state.currentRun.currentStageIndex];
}

function getCurrentLevel() {
  return getCurrentStage().levels[state.currentRun.currentLevelIndex];
}

function resetSelections() {
  selected = null;
  selectedIds = [];
  rankedIds = [];
  timeLeft = null;
}

function promptInstall() {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  deferredInstallPrompt.userChoice.finally(() => {
    deferredInstallPrompt = null;
    installBtn?.classList.add("hidden");
    render();
  });
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return clone(DEFAULT_STATE);
    const parsed = JSON.parse(raw);
    return sanitizeState(parsed);
  } catch {
    return clone(DEFAULT_STATE);
  }
}

function sanitizeState(input) {
  const next = clone(DEFAULT_STATE);
  if (!input || typeof input !== "object") return next;
  next.settings.mode = MODES[input.settings?.mode] ? input.settings.mode : "standard";
  next.settings.lowMotion = Boolean(input.settings?.lowMotion);
  next.history = Array.isArray(input.history) ? input.history.filter(Boolean) : [];
  next.unlockedModes = unlockModes();
  next.currentRun = input.currentRun && typeof input.currentRun === "object" ? input.currentRun : null;
  return next;
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function resetAllLocalData() {
  clearTimer();
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
  state = clone(DEFAULT_STATE);
  pendingOutcome = null;
  finalSummary = null;
  resetSelections();
  screen = "home";
  persist();
  render();
}

function applySettings() {
  document.body.classList.toggle("low-motion", !!state.settings.lowMotion);
}

function weightedEffectScore(effects = {}) {
  return Object.entries(effects).reduce((sum, [key, delta]) => sum + (key === "ethical-consistency" ? Number(delta || 0) * 0.65 : Number(delta || 0) * 0.55), 0);
}

function applyEffects(stats, effects = {}) {
  const next = clone(stats);
  Object.entries(effects).forEach(([key, delta]) => {
    if (!(key in next)) return;
    next[key] = clamp(Number(next[key]) + Number(delta || 0), 0, 100);
  });
  return next;
}

function combineEffects(list) {
  return list.reduce((acc, entry) => mergeEffects(acc, entry), {});
}

function mergeEffects(base, extra) {
  const next = { ...base };
  Object.entries(extra || {}).forEach(([key, value]) => {
    next[key] = Number(next[key] || 0) + Number(value || 0);
  });
  return next;
}

function button(label, action, variant = "secondary-button", attrs = "") {
  return `<button type="button" class="${variant}" data-action="${action}" ${attrs}>${label}</button>`;
}

function titleCase(value) {
  return String(value).replace(/[-_]/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value)));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function formatDuration(seconds) {
  const mins = Math.floor(Number(seconds || 0) / 60);
  const secs = Number(seconds || 0) % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function formatDate(timestamp) {
  return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" }).format(new Date(timestamp));
}
