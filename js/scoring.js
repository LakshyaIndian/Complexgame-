import { STAT_INFO, MODES, STAGES } from "./gameData.js";
import { clamp, deepClone, titleCase, weightedAverage } from "./utils.js";

export const BASELINE_STATS = {
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

export function createRun(modeId = "standard") {
  const stageProgress = STAGES.map((stage) => ({
    stageId: stage.id,
    completed: false,
    levelResults: [],
  }));

  return {
    id: `run-${Date.now()}`,
    modeId,
    startedAt: Date.now(),
    updatedAt: Date.now(),
    currentStageIndex: 0,
    currentLevelIndex: 0,
    stats: deepClone(BASELINE_STATS),
    hiddenRisk: 0,
    totalScore: 0,
    decisions: [],
    stageProgress,
  };
}

export function applyEffects(stats, effects = {}) {
  const next = { ...stats };
  for (const [key, delta] of Object.entries(effects)) {
    if (!(key in next)) continue;
    next[key] = clamp(next[key] + delta, 0, 100);
  }
  return next;
}

export function evaluateDecisionLevel(run, level, selectedOptionId) {
  const option = level.options.find((item) => item.id === selectedOptionId);
  if (!option) throw new Error("Invalid option selection");

  let nextStats = applyEffects(run.stats, option.effects);
  let score = scoreFromEffects(option.effects);

  if (level.id === "ss3-legacy") {
    if (selectedOptionId === "build-institutions" && nextStats["network-trust"] >= 55 && nextStats["ethical-consistency"] >= 55) score += 8;
    if (selectedOptionId === "private-fortress" && nextStats["network-trust"] < 40) score -= 4;
    if (selectedOptionId === "opportunistic-arb" && nextStats["ethical-consistency"] < 45) score -= 6;
  }

  return {
    nextStats,
    score,
    outcomeLabel: classifyScore(score),
    feedback: buildTradeoffFeedback(level, option, score),
    summary: option.rationale,
  };
}

export function evaluateAllocationLevel(run, level, selectedIds = []) {
  const picked = level.choices.filter((item) => selectedIds.includes(item.id));
  const spent = picked.reduce((sum, item) => sum + item.cost, 0);
  let score = 0;
  let nextStats = { ...run.stats };

  if (spent > level.pool) {
    score -= 12;
  }

  for (const choice of picked) {
    nextStats = applyEffects(nextStats, choice.effects);
    score += scoreFromEffects(choice.effects);
  }

  const importantCoverage = ["health-stability", "financial-buffer", "network-trust", "strategic-clarity"];
  const touchedCoverage = picked.flatMap((choice) => Object.keys(choice.effects));
  const uniqueCoverage = new Set(touchedCoverage.filter((key) => importantCoverage.includes(key))).size;
  score += uniqueCoverage * 2;

  if (selectedIds.includes("status")) score -= 8;
  if (level.id === "cl1-infra-failure" && !selectedIds.includes("people")) score -= 6;
  if (level.id === "cl1-infra-failure" && !selectedIds.includes("comms")) score -= 4;

  return {
    nextStats,
    score,
    spent,
    outcomeLabel: classifyScore(score),
    feedback: buildAllocationFeedback(level, picked, score, spent),
    summary: level.rationale,
  };
}

export function evaluatePriorityLevel(run, level, rankedIds = []) {
  let score = 0;
  let nextStats = { ...run.stats };

  rankedIds.forEach((id, index) => {
    const item = level.items.find((entry) => entry.id === id);
    if (!item) return;
    nextStats = applyEffects(nextStats, item.effects);
    const distance = Math.abs((index + 1) - item.idealRank);
    score += Math.max(0, 8 - distance * 3);
  });

  return {
    nextStats,
    score,
    outcomeLabel: classifyScore(score),
    feedback: buildPriorityFeedback(level, rankedIds, score),
    summary: level.rationale,
  };
}

export function evaluateContradictionLevel(run, level, selectedIds = []) {
  let score = 0;
  let nextStats = { ...run.stats };
  const selectedSet = new Set(selectedIds);
  const correctSet = new Set(level.correctIds);

  const correctChosen = [...selectedSet].filter((id) => correctSet.has(id)).length;
  const incorrectChosen = [...selectedSet].filter((id) => !correctSet.has(id)).length;

  score += correctChosen * 8;
  score -= incorrectChosen * 4;

  nextStats = applyEffects(nextStats, {
    "strategic-clarity": correctChosen * 3 - incorrectChosen * 2,
    credibility: correctChosen * 2 - incorrectChosen * 1,
    adaptability: correctChosen > 0 ? 1 : -2,
  });

  return {
    nextStats,
    score,
    outcomeLabel: classifyScore(score),
    feedback: buildContradictionFeedback(level, selectedIds, score),
    summary: level.rationale,
  };
}

function scoreFromEffects(effects) {
  return Object.entries(effects).reduce((sum, [key, delta]) => {
    if (key === "ai-reliance") return sum - (delta > 0 ? delta * 0.45 : delta * 0.2);
    return sum + delta * 0.55;
  }, 0);
}

export function normalizeLevelScore(rawScore, modeId) {
  const mode = MODES[modeId] || MODES.standard;
  return Math.round(clamp(rawScore * mode.scoreMultiplier + 50, 0, 100));
}

export function classifyScore(score) {
  if (score >= 22) return "Resilient";
  if (score >= 10) return "Adaptive";
  if (score >= 0) return "Mixed";
  return "Fragile";
}

export function finalizeLevel(run, level, evaluation) {
  const normalized = normalizeLevelScore(evaluation.score, run.modeId);
  return {
    ...evaluation,
    normalizedScore: normalized,
    statsAfter: evaluation.nextStats,
  };
}

export function stageAverage(stageResults) {
  if (!stageResults.length) return 0;
  return Math.round(weightedAverage(stageResults.map((entry) => entry.normalizedScore)));
}

export function unlockModesFromState(state) {
  const unlocked = new Set(state.unlockedModes || ["standard"]);
  const history = state.history || [];
  const avgScores = history.map((run) => run.averageScore || 0);
  const avgEthics = history.map((run) => run.finalStats?.["ethical-consistency"] || 0);
  const avgStrategic = history.map((run) => run.finalStats?.["strategic-clarity"] || 0);

  if (history.length >= 1) unlocked.add("hard");
  if (avgScores.some((score) => score >= 60)) unlocked.add("low-information");
  if (history.length >= 2) unlocked.add("high-pressure");
  if (avgEthics.some((score) => score > 60)) unlocked.add("ethics-stress-test");
  if (avgStrategic.some((score) => score > 65)) unlocked.add("long-horizon-strategist");

  return Array.from(unlocked);
}

export function summarizeRun(run) {
  const allLevelResults = run.stageProgress.flatMap((stage) => stage.levelResults);
  const averageScore = stageAverage(allLevelResults);
  const profile = buildBehaviorProfile(run.stats, allLevelResults);
  return {
    averageScore,
    finalStats: run.stats,
    profile,
  };
}

export function buildBehaviorProfile(finalStats, allLevelResults) {
  const strengths = Object.entries(finalStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([key, value]) => `${titleCase(key)} (${value})`);

  const weaknesses = Object.entries(finalStats)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 3)
    .map(([key, value]) => `${titleCase(key)} (${value})`);

  const average = stageAverage(allLevelResults);

  const patterns = [];
  if (finalStats["financial-buffer"] < 45) patterns.push("You accepted meaningful future fragility to solve near-term pressure.");
  if (finalStats["ethical-consistency"] > 60) patterns.push("You kept principles more intact than most players under stress.");
  if (finalStats["ai-reliance"] > 60) patterns.push("You leaned heavily on automation; efficiency rose, but judgment risk also increased.");
  if (finalStats["network-trust"] > 60) patterns.push("You treated trust as real infrastructure, not social decoration.");
  if (average < 50) patterns.push("Your run shows stress-reactive decision loops. Recovery systems need work.");
  if (patterns.length === 0) patterns.push("Your pattern was mixed: competent in some domains, vulnerable where tradeoffs got emotionally expensive.");

  const suggestions = [];
  if (finalStats["health-stability"] < 50) suggestions.push("Protect energy before ambition. Sleep, rhythm, and recovery are strategic assets.");
  if (finalStats["learning-velocity"] < 55) suggestions.push("Build a recurring reskilling block so pivots are normal, not emergency-only.");
  if (finalStats["strategic-clarity"] < 55) suggestions.push("Spend more time writing decision memos before acting under pressure.");
  if (finalStats["financial-buffer"] < 55) suggestions.push("Treat liquidity as freedom. Rebuild emergency runway before chasing upside.");
  if (finalStats["network-trust"] < 55) suggestions.push("Shrink commitments and become more predictably reliable.");
  if (suggestions.length < 3) suggestions.push("Run a harder mode next time to expose weaker parts of your operating pattern.");

  return { strengths, weaknesses, patterns, suggestions };
}

function buildTradeoffFeedback(level, option, score) {
  const polarity =
    score >= 22 ? "This was a resilient choice." :
    score >= 10 ? "This was adaptive but costly." :
    score >= 0 ? "This solved something important, but not cleanly." :
    "This choice was fragile under compounding pressure.";

  return `${polarity} ${option.rationale}`;
}

function buildAllocationFeedback(level, picked, score, spent) {
  const missed = level.choices.filter((choice) => !picked.some((pickedChoice) => pickedChoice.id === choice.id));
  const missedNames = missed.slice(0, 2).map((item) => item.label).join(", ");
  return `You spent ${spent}/${level.pool}. ${
    score >= 18
      ? "Your allocation protected multiple layers of resilience."
      : score >= 6
        ? "You covered some core needs, but left gaps that could compound."
        : "Your allocation left critical vulnerabilities exposed."
  } ${missedNames ? `Unfunded areas worth reviewing: ${missedNames}.` : ""}`;
}

function buildPriorityFeedback(level, rankedIds, score) {
  const top = level.items.find((item) => item.id === rankedIds[0]);
  return `${score >= 18 ? "Your sequencing was strong." : score >= 8 ? "Your sequencing was mixed." : "Your sequencing favored the wrong urgencies."} ${
    top ? `You opened with "${top.label}".` : ""
  } In ambiguous crises, order often matters more than intention.`;
}

function buildContradictionFeedback(level, selectedIds, score) {
  const correctMatches = level.choices
    .filter((choice) => level.correctIds.includes(choice.id) && selectedIds.includes(choice.id))
    .map((choice) => choice.title);
  return `${score >= 18 ? "You filtered signal from noise well." : score >= 8 ? "You caught some real signal, but not enough." : "You were too vulnerable to polished noise."} ${
    correctMatches.length ? `Strong calls: ${correctMatches.join("; ")}.` : ""
  }`;
}

export function buildStatCards(stats) {
  return Object.entries(stats).map(([key, value]) => ({
    key,
    label: titleCase(key),
    value,
    description: STAT_INFO[key],
  }));
}

export function getCurrentStage(run) {
  return STAGES[run.currentStageIndex];
}

export function getCurrentLevel(run) {
  const stage = getCurrentStage(run);
  return stage.levels[run.currentLevelIndex];
}
