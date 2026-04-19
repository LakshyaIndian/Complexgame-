import { MODES, STAGES, UNLOCK_RULES } from "./gameData.js";
import { buildStatCards, getCurrentLevel, getCurrentStage, stageAverage } from "./scoring.js";
import { formatDate, formatDuration, titleCase } from "./utils.js";

function button(label, action, variant = "secondary-button", attrs = "") {
  return `<button type="button" class="${variant}" data-action="${action}" ${attrs}>${label}</button>`;
}

function statGrid(stats) {
  return `
    <div class="stat-grid">
      ${buildStatCards(stats).map((stat) => `
        <article class="stat-card" title="${stat.description}">
          <span class="label">${stat.label}</span>
          <span class="value">${stat.value}</span>
        </article>
      `).join("")}
    </div>
  `;
}

function topRunSummary(run) {
  const stage = getCurrentStage(run);
  const level = getCurrentLevel(run);
  return `
    <section class="panel">
      <div class="split">
        <div>
          <p class="kicker">Current Run</p>
          <h3>${stage.title} · ${level.title}</h3>
          <p class="meta">Mode: ${MODES[run.modeId]?.title || run.modeId}</p>
        </div>
        ${button("Continue Run", "continue-run", "primary-button")}
      </div>
    </section>
  `;
}

export function renderHome(state) {
  const currentRun = state.currentRun;
  const unlocked = new Set(state.unlockedModes || ["standard"]);

  return `
    <section class="screen">
      <section class="panel hero">
        <p class="eyebrow">Serious simulation</p>
        <h2>Learn to survive a plausible 2025–2050</h2>
        <p>This is a strategy and consequence simulator about pressure, uncertainty, AI disruption, money, trust, leadership, and long-horizon choices. It is not a quiz. You are judged by pattern, tradeoff quality, and durability.</p>
        <div class="button-row">
          ${button("New Run", "new-run", "primary-button")}
          ${currentRun ? button("Resume", "continue-run") : button("How to Play", "nav-help")}
          ${button("Stats History", "nav-history")}
        </div>
      </section>

      ${currentRun ? topRunSummary(currentRun) : ""}

      <section class="grid two">
        <article class="panel">
          <p class="kicker">Stages</p>
          <div class="timeline">
            ${STAGES.map((stage, index) => `
              <div class="timeline-item">
                <h3>${index + 1}. ${stage.title}</h3>
                <p class="meta">${stage.summary}</p>
              </div>
            `).join("")}
          </div>
        </article>

        <article class="panel">
          <p class="kicker">Modes</p>
          <div class="list">
            ${Object.values(MODES).map((mode) => `
              <div class="list-item">
                <div class="split">
                  <strong>${mode.title}</strong>
                  <span class="badge ${unlocked.has(mode.id) ? "success" : "warn"}">
                    ${unlocked.has(mode.id) ? "Unlocked" : "Locked"}
                  </span>
                </div>
                <p class="meta">${mode.description}</p>
              </div>
            `).join("")}
          </div>
        </article>
      </section>

      <section class="panel">
        <p class="kicker">Unlock Conditions</p>
        <div class="list">
          ${UNLOCK_RULES.map((rule) => `
            <div class="list-item">
              <strong>${MODES[rule.modeId]?.title}</strong>
              <p class="meta">${rule.description}</p>
            </div>
          `).join("")}
        </div>
      </section>
    </section>
  `;
}

export function renderNewRun(state) {
  const unlocked = state.unlockedModes || ["standard"];
  const preferredMode = unlocked.includes(state.settings.mode) ? state.settings.mode : unlocked[0] || "standard";
  return `
    <section class="screen">
      <section class="panel hero">
        <p class="eyebrow">Start a run</p>
        <h2>Choose your operating environment</h2>
        <p>Every mode changes time pressure, visibility, and scoring. Pick based on what weakness you want exposed.</p>
      </section>

      <section class="panel">
        <div class="input-row">
          <label for="mode-select">Game mode</label>
          <select id="mode-select">
            ${Object.values(MODES).map((mode) => `
              <option value="${mode.id}" ${preferredMode === mode.id ? "selected" : ""} ${!unlocked.includes(mode.id) ? "disabled" : ""}>
                ${mode.title}${!unlocked.includes(mode.id) ? " — locked" : ""}
              </option>
            `).join("")}
          </select>
        </div>
        <div id="mode-description" class="callout"></div>
        <div class="button-row" style="margin-top: 16px;">
          ${button("Begin New Run", "confirm-new-run", "primary-button")}
          ${button("Back", "nav-home")}
        </div>
      </section>
    </section>
  `;
}

export function renderStageIntro(run) {
  const stage = getCurrentStage(run);
  const completedCount = run.stageProgress[run.currentStageIndex]?.levelResults.length || 0;
  return `
    <section class="screen">
      <section class="panel hero">
        <p class="eyebrow">Stage ${Math.min(run.currentStageIndex + 1, STAGES.length)} of ${STAGES.length}</p>
        <h2>${stage.title}</h2>
        <p>${stage.intro}</p>
      </section>
      <section class="panel">
        <p class="kicker">Progress</p>
        <div class="progress"><span style="width: ${(completedCount / stage.levels.length) * 100}%"></span></div>
        <p class="meta" style="margin-top:10px;">${completedCount}/${stage.levels.length} levels complete in this stage.</p>
        <div class="button-row">
          ${button("View Level Briefing", "show-briefing", "primary-button")}
          ${button("Home", "nav-home")}
        </div>
      </section>
      <section class="panel">
        <p class="kicker">Current Stats</p>
        ${statGrid(run.stats)}
      </section>
    </section>
  `;
}

export function renderBriefing(run) {
  const stage = getCurrentStage(run);
  const level = getCurrentLevel(run);
  const timing = level.timed ? `${formatDuration(level.timeLimit)} base timer` : "Untimed";
  return `
    <section class="screen">
      <section class="panel hero">
        <p class="eyebrow">${stage.title} · ${level.year}</p>
        <h2>${level.title}</h2>
        <p>${level.scenario}</p>
      </section>

      <section class="panel">
        <p class="kicker">Rules / Briefing</p>
        <div class="list">
          <div class="list-item"><strong>What to do</strong><p class="meta">${level.briefing.objective}</p></div>
          <div class="list-item"><strong>Constraints</strong><p class="meta">${level.briefing.constraints.join(" · ")}</p></div>
          <div class="list-item"><strong>Resources</strong><p class="meta">${level.briefing.resources.join(" · ")}</p></div>
          <div class="list-item"><strong>Timed?</strong><p class="meta">${timing}</p></div>
          <div class="list-item"><strong>What choices affect</strong><p class="meta">Visible stats, hidden compounding risk, future pattern analysis, and unlocks.</p></div>
          <div class="list-item"><strong>Success / Partial / Failure</strong><p class="meta">Success: ${level.briefing.outcomes.success}<br>Partial: ${level.briefing.outcomes.partial}<br>Failure: ${level.briefing.outcomes.failure}</p></div>
          <div class="list-item"><strong>Scoring</strong><p class="meta">${level.briefing.scoring}</p></div>
        </div>
        <div class="button-row" style="margin-top: 16px;">
          ${button("Begin", "begin-level", "primary-button")}
          ${button("Back", "back-stage-intro")}
        </div>
      </section>
    </section>
  `;
}

export function renderGameplay(run, transient = {}) {
  const level = getCurrentLevel(run);
  const timeLeft = transient.timeLeft ?? level.timeLimit ?? 0;
  const timerBlock = level.timed ? `<div class="timer" aria-live="assertive">Time: ${formatDuration(Math.max(0, timeLeft))}</div>` : "";

  let body = "";
  if (level.type === "decision") {
    body = `
      <div class="list">
        ${level.options.map((option) => `
          <button class="option-card ${transient.selected === option.id ? "selected" : ""}" type="button" data-option-id="${option.id}">
            <h4>${option.title}</h4>
            <p>${option.description}</p>
            <p class="meta">Signals: ${option.tags.join(" · ")}</p>
          </button>
        `).join("")}
      </div>
      <div class="button-row">
        ${button("Submit Decision", "submit-level", "primary-button", transient.selected ? "" : "disabled")}
      </div>
    `;
  }

  if (level.type === "allocation") {
    const selectedIds = transient.selectedIds || [];
    const spent = level.choices.filter((item) => selectedIds.includes(item.id)).reduce((sum, item) => sum + item.cost, 0);
    body = `
      <div class="split">
        <strong>Budget used: ${spent}/${level.pool}</strong>
        <span class="badge ${spent > level.pool ? "danger" : "success"}">${spent > level.pool ? "Over budget" : "Within budget"}</span>
      </div>
      <div class="list">
        ${level.choices.map((choice) => `
          <button class="option-card ${selectedIds.includes(choice.id) ? "selected" : ""}" type="button" data-allocation-id="${choice.id}">
            <div class="split">
              <h4>${choice.label}</h4>
              <strong>Cost ${choice.cost}</strong>
            </div>
          </button>
        `).join("")}
      </div>
      <div class="button-row">
        ${button("Submit Allocation", "submit-level", "primary-button", selectedIds.length ? "" : "disabled")}
      </div>
    `;
  }

  if (level.type === "priority") {
    const selectedIds = transient.rankedIds || [];
    const available = level.items.filter((item) => !selectedIds.includes(item.id));
    body = `
      <section class="grid two">
        <article class="panel">
          <h3>Chosen order</h3>
          <div class="list">
            ${selectedIds.length ? selectedIds.map((id, index) => {
              const item = level.items.find((entry) => entry.id === id);
              return `<div class="list-item"><strong>${index + 1}. ${item.label}</strong></div>`;
            }).join("") : `<div class="list-item"><p class="meta">Tap items from the right to build the sequence.</p></div>`}
          </div>
          <div class="button-row">
            ${button("Clear Order", "clear-priority")}
            ${button("Submit Ranking", "submit-level", "primary-button", selectedIds.length === level.items.length ? "" : "disabled")}
          </div>
        </article>
        <article class="panel">
          <h3>Available actions</h3>
          <div class="list">
            ${available.map((item) => `
              <button class="option-card" type="button" data-priority-id="${item.id}">
                <h4>${item.label}</h4>
              </button>
            `).join("")}
          </div>
        </article>
      </section>
    `;
  }

  if (level.type === "contradiction") {
    const selectedIds = transient.selectedIds || [];
    body = `
      <p class="meta">Select exactly 3.</p>
      <div class="list">
        ${level.choices.map((choice) => `
          <button class="option-card ${selectedIds.includes(choice.id) ? "selected" : ""}" type="button" data-contradiction-id="${choice.id}">
            <h4>${choice.title}</h4>
            <p>${choice.description}</p>
          </button>
        `).join("")}
      </div>
      <div class="button-row">
        ${button("Submit Analysis", "submit-level", "primary-button", selectedIds.length === 3 ? "" : "disabled")}
      </div>
    `;
  }

  return `
    <section class="screen">
      <section class="panel hero">
        <div class="split">
          <div>
            <p class="eyebrow">${getCurrentStage(run).title} · ${level.year}</p>
            <h2>${level.title}</h2>
          </div>
          ${timerBlock}
        </div>
        <p>${level.scenario}</p>
      </section>
      <section class="panel">${body}</section>
      <section class="panel">
        <p class="kicker">Current Stats</p>
        ${statGrid(run.stats)}
      </section>
    </section>
  `;
}

export function renderOutcome(run, result) {
  const stage = getCurrentStage(run);
  const level = getCurrentLevel(run);
  return `
    <section class="screen">
      <section class="panel hero">
        <p class="eyebrow">${stage.title}</p>
        <h2>${level.title} — ${result.outcomeLabel}</h2>
        <p>${result.feedback}</p>
      </section>
      <section class="grid two">
        <article class="panel">
          <p class="kicker">Level Score</p>
          <h3>${result.normalizedScore}/100</h3>
          <p class="meta">${result.summary}</p>
          <div class="button-row">
            ${button("Continue", "advance-after-outcome", "primary-button")}
            ${button("Home", "nav-home")}
          </div>
        </article>
        <article class="panel">
          <p class="kicker">Stats After Decision</p>
          ${statGrid(result.statsAfter)}
        </article>
      </section>
    </section>
  `;
}

export function renderStageDebrief(run) {
  const stageIndex = Math.max(0, Math.min(run.currentStageIndex - 1, STAGES.length - 1));
  const stage = STAGES[stageIndex];
  const stageRecord = run.stageProgress[stageIndex];
  const avg = stageAverage(stageRecord.levelResults);
  return `
    <section class="screen">
      <section class="panel hero">
        <p class="eyebrow">Stage Debrief</p>
        <h2>${stage.title}</h2>
        <p>${stage.debrief}</p>
      </section>
      <section class="panel">
        <p class="kicker">Stage Performance</p>
        <h3>${avg}/100 average</h3>
        <div class="list">
          ${stageRecord.levelResults.map((result) => `
            <div class="list-item">
              <strong>${result.levelTitle}</strong>
              <p class="meta">${result.normalizedScore}/100 · ${result.outcomeLabel}</p>
            </div>
          `).join("")}
        </div>
        <div class="button-row">
          ${button(run.currentStageIndex >= STAGES.length ? "View Final Analysis" : "Next Stage", "continue-after-stage", "primary-button")}
        </div>
      </section>
    </section>
  `;
}

export function renderFinalAnalysis(summary, run) {
  return `
    <section class="screen">
      <section class="panel hero">
        <p class="eyebrow">End of Run</p>
        <h2>Behavioral Profile Analysis</h2>
        <p>Your choices formed a pattern. This is not a morality score. It is a profile of what you protected, what you sacrificed, and where your decision style became either durable or brittle.</p>
      </section>

      <section class="grid two">
        <article class="panel">
          <p class="kicker">Overall Score</p>
          <h3>${summary.averageScore}/100</h3>
          <p class="meta">Mode: ${titleCase(run.modeId)}</p>
          <p><strong>Strengths</strong></p>
          <ul>
            ${summary.profile.strengths.map((item) => `<li>${item}</li>`).join("")}
          </ul>
          <p><strong>Weaknesses</strong></p>
          <ul>
            ${summary.profile.weaknesses.map((item) => `<li>${item}</li>`).join("")}
          </ul>
        </article>

        <article class="panel">
          <p class="kicker">Patterns</p>
          <div class="list">
            ${summary.profile.patterns.map((item) => `<div class="list-item"><p class="meta">${item}</p></div>`).join("")}
          </div>
          <p class="kicker" style="margin-top:14px;">Actionable Improvements</p>
          <div class="list">
            ${summary.profile.suggestions.map((item) => `<div class="list-item"><p class="meta">${item}</p></div>`).join("")}
          </div>
        </article>
      </section>

      <section class="panel">
        <p class="kicker">Final Stats</p>
        ${statGrid(summary.finalStats)}
        <div class="button-row" style="margin-top:16px;">
          ${button("Return Home", "nav-home", "primary-button")}
          ${button("View History", "nav-history")}
          ${button("Start New Run", "new-run")}
        </div>
      </section>
    </section>
  `;
}

export function renderHistory(state) {
  const history = [...(state.history || [])].sort((a, b) => b.completedAt - a.completedAt);
  return `
    <section class="screen">
      <section class="panel hero">
        <p class="eyebrow">History</p>
        <h2>Run Archive</h2>
        <p>Review patterns across runs. A good simulator should expose repeated weaknesses, not flatter you.</p>
      </section>
      <section class="panel">
        ${history.length ? `
          <div class="list">
            ${history.map((run) => `
              <div class="list-item">
                <div class="split">
                  <strong>${titleCase(run.modeId)}</strong>
                  <span class="badge">${run.averageScore}/100</span>
                </div>
                <p class="meta">${formatDate(run.completedAt)} · Final weaknesses: ${(run.profile?.weaknesses || []).join(", ") || "Not available"}</p>
              </div>
            `).join("")}
          </div>
        ` : `<p class="meta">No completed runs yet.</p>`}
      </section>
    </section>
  `;
}

export function renderSettings(state) {
  return `
    <section class="screen">
      <section class="panel hero">
        <p class="eyebrow">Settings</p>
        <h2>Control the simulation environment</h2>
        <p>Settings are saved locally on this device.</p>
      </section>
      <section class="panel">
        <div class="chip-row">
          <button type="button" class="chip ${state.settings.lowMotion ? "active" : ""}" data-setting-toggle="lowMotion">Low Motion</button>
        </div>
        <div class="button-row" style="margin-top: 16px;">
          ${button("Reset All Local Data", "reset-local-data")}
        </div>
        <p class="footer-note" style="margin-top:12px;">This clears current run, history, unlocked modes, and settings from local storage.</p>
      </section>
    </section>
  `;
}

export function renderHelp() {
  return `
    <section class="screen">
      <section class="panel hero">
        <p class="eyebrow">Help</p>
        <h2>How to Play</h2>
        <p>Before every task, you get a full rules screen. Read it. The game rewards durable tradeoff quality, not perfect answers or optimistic image management.</p>
      </section>
      <section class="panel">
        <div class="list">
          <div class="list-item"><strong>Decision tasks</strong><p class="meta">Choose one path from several plausible but costly options.</p></div>
          <div class="list-item"><strong>Allocation tasks</strong><p class="meta">Spend a limited pool across competing needs. Over-optimization in one area can expose hidden fragility elsewhere.</p></div>
          <div class="list-item"><strong>Priority tasks</strong><p class="meta">Rank what you would do first. In crisis, correct sequence matters as much as correct intention.</p></div>
          <div class="list-item"><strong>Contradiction / misinformation tasks</strong><p class="meta">Select the strongest signals, red flags, or principles from a mixed-information environment.</p></div>
          <div class="list-item"><strong>Scoring logic</strong><p class="meta">Score is shaped by resilience, adaptability, judgment, trust, ethical coherence, and future option preservation.</p></div>
          <div class="list-item"><strong>Saves</strong><p class="meta">Runs and history are saved locally using browser storage. Continue later from the same device and browser.</p></div>
        </div>
      </section>
    </section>
  `;
}
