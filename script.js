const KEY = "outlive365_mvp";

const SCIENCE = {
  zone2: {
    why: "Improves mitochondrial function and cardiorespiratory fitness linked to reduced all-cause mortality.",
    biomarkers: "VO2 max, resting heart rate, blood pressure",
    evidence: "🟢 Meta-analysis"
  },
  sleep: {
    why: "Regular sufficient sleep supports metabolic regulation, immune function, and cognitive performance.",
    biomarkers: "HbA1c, fasting glucose, HRV",
    evidence: "🟢 Meta-analysis"
  },
  protein: {
    why: "Adequate protein intake supports muscle maintenance and strength across aging.",
    biomarkers: "Lean mass, grip/strength capacity",
    evidence: "🟡 Observational research"
  },
  mobility: {
    why: "Mobility and movement quality improve functional capacity and reduce injury risk.",
    biomarkers: "Movement screening, pain/function outcomes",
    evidence: "🔵 Expert consensus"
  },
  sunlight: {
    why: "Morning light exposure helps circadian alignment and sleep quality.",
    biomarkers: "Sleep latency, melatonin timing",
    evidence: "🔵 Expert consensus"
  }
};

const PRIORITIES = {
  cardio: {
    title: "Improve cardiovascular fitness (VO2 max)",
    habits: ["zone2", "steps", "sunlight"]
  },
  strength: {
    title: "Increase strength capacity",
    habits: ["strength", "protein", "mobility"]
  },
  sleep: {
    title: "Improve sleep consistency",
    habits: ["sleep", "sunlight", "caffeine"]
  },
  metabolic: {
    title: "Improve metabolic health",
    habits: ["zone2", "sleep", "protein"]
  },
  mobility: {
    title: "Improve mobility and recovery",
    habits: ["mobility", "steps", "sleep"]
  }
};

const HABITS = {
  zone2: { label: "30+ min Zone 2 cardio", pillar: "exercise" },
  steps: { label: "8k+ steps", pillar: "exercise" },
  sunlight: { label: "Morning sunlight exposure", pillar: "sleep" },
  strength: { label: "Strength training session or progression", pillar: "strength" },
  protein: { label: "Hit protein target", pillar: "strength" },
  sleep: { label: "7.5+ hours sleep", pillar: "sleep" },
  mobility: { label: "10 minutes mobility work", pillar: "mobility" },
  caffeine: { label: "No caffeine after 2pm", pillar: "sleep" }
};

const views = {
  landing: document.getElementById("landingView"),
  auth: document.getElementById("authView"),
  assessment: document.getElementById("assessmentView"),
  priorities: document.getElementById("prioritiesView"),
  dashboard: document.getElementById("dashboardView")
};

const el = {
  logout: document.getElementById("logoutBtn"),
  priorityCards: document.getElementById("priorityCards"),
  habitList: document.getElementById("habitList"),
  weekly: document.getElementById("weeklyScore"),
  streak: document.getElementById("streakScore"),
  monthly: document.getElementById("monthlyScore"),
  summary: document.getElementById("consistencySummary"),
  pillars: document.getElementById("pillarGrid"),
  activeDate: document.getElementById("activeDate"),
  scienceDialog: document.getElementById("scienceDialog"),
  scienceTitle: document.getElementById("scienceTitle"),
  scienceWhy: document.getElementById("scienceWhy"),
  scienceBiomarkers: document.getElementById("scienceBiomarkers"),
  scienceBadge: document.getElementById("scienceBadge")
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function loadState() {
  return JSON.parse(localStorage.getItem(KEY) || "null") || {
    account: null,
    assessment: null,
    priorities: [],
    habits: [],
    logs: {}
  };
}

function saveState(state) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

let state = loadState();

function show(name) {
  Object.values(views).forEach((v) => v.classList.add("hidden"));
  views[name].classList.remove("hidden");
}

function rankPriorities(a) {
  const scores = { cardio: 0, strength: 0, sleep: 0, metabolic: 0, mobility: 0 };

  if (a.activity === "low") scores.cardio += 3;
  if (a.activity === "moderate") scores.cardio += 1;
  if (Number(a.rhr || 0) > 75) scores.cardio += 2;

  if (Number(a.pushups) < 15) scores.strength += 3;
  if (Number(a.hang) < 30) scores.strength += 2;

  if (Number(a.sleep) < 7.5) scores.sleep += 4;

  if (Number(a.waist) > 38) scores.metabolic += 3;
  if (Number(a.glucose || 0) >= 100) scores.metabolic += 3;
  if (a.family === "metabolic") scores.metabolic += 2;

  if (Number(a.hang) < 45) scores.mobility += 2;
  if (a.age > 40) scores.mobility += 1;

  if (a.family === "cardio") scores.cardio += 2;
  if (a.family === "neuro") scores.sleep += 1;

  return Object.entries(scores)
    .sort((x, y) => y[1] - x[1])
    .slice(0, 3)
    .map((entry) => entry[0]);
}

function setHabitsFromPriorities(priorityIds) {
  const set = new Set();
  priorityIds.forEach((id) => PRIORITIES[id].habits.forEach((h) => set.add(h)));
  return Array.from(set).slice(0, 5);
}

function getLog(date) {
  return state.logs[date] || {};
}

function setHabit(date, habit, done) {
  state.logs[date] = state.logs[date] || {};
  state.logs[date][habit] = done;
  saveState(state);
}

function dateList(days) {
  const out = [];
  const base = new Date();
  for (let i = 0; i < days; i += 1) {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

function adherenceForDates(dates, habits) {
  if (!habits.length) return 0;
  const possible = dates.length * habits.length;
  let done = 0;
  dates.forEach((d) => {
    const log = getLog(d);
    habits.forEach((h) => {
      if (log[h]) done += 1;
    });
  });
  return possible ? Math.round((done / possible) * 100) : 0;
}

function streakDays() {
  let streak = 0;
  const habits = state.habits;
  if (!habits.length) return 0;
  for (let i = 0; i < 90; i += 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const log = getLog(key);
    const completed = habits.filter((h) => log[h]).length;
    const pct = completed / habits.length;
    if (pct >= 0.7) streak += 1;
    else break;
  }
  return streak;
}

function pillarScores() {
  const dates = dateList(30);
  const grouped = { exercise: [], sleep: [], strength: [], mobility: [] };
  state.habits.forEach((h) => grouped[HABITS[h].pillar].push(h));
  return Object.entries(grouped).map(([pillar, list]) => ({
    pillar,
    score: list.length ? adherenceForDates(dates, list) : 0
  }));
}

function renderPriorities() {
  el.priorityCards.innerHTML = "";
  state.priorities.forEach((id, idx) => {
    const card = document.createElement("article");
    card.className = "priority";
    card.innerHTML = `<h3>${idx + 1}. ${PRIORITIES[id].title}</h3><p>Daily habits: ${PRIORITIES[id].habits.map((h) => HABITS[h].label).join(" • ")}</p>`;
    el.priorityCards.appendChild(card);
  });
}

function renderHabits() {
  const date = el.activeDate.value;
  const log = getLog(date);
  el.habitList.innerHTML = "";

  state.habits.forEach((habitId) => {
    const item = document.createElement("article");
    item.className = "habit";

    const left = document.createElement("div");
    left.className = "habit-left";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = Boolean(log[habitId]);
    cb.addEventListener("change", () => {
      setHabit(date, habitId, cb.checked);
      renderMetrics();
    });

    const text = document.createElement("div");
    text.innerHTML = `<h3>${HABITS[habitId].label}</h3><p>Pillar: ${HABITS[habitId].pillar}</p>`;

    left.append(cb, text);

    const btn = document.createElement("button");
    btn.className = "link-btn";
    btn.textContent = "Science brief";
    btn.addEventListener("click", () => openScience(habitId));

    item.append(left, btn);
    el.habitList.appendChild(item);
  });
}

function renderMetrics() {
  const weekly = adherenceForDates(dateList(7), state.habits);
  const monthly = adherenceForDates(dateList(30), state.habits);
  const streak = streakDays();

  el.weekly.textContent = `${weekly}%`;
  el.monthly.textContent = `${monthly}%`;
  el.streak.textContent = `${streak} day${streak === 1 ? "" : "s"}`;
  el.summary.textContent = `Your last 30 days are ${monthly}% aligned with your longevity protocol.`;

  el.pillars.innerHTML = "";
  pillarScores().forEach((p) => {
    const card = document.createElement("article");
    card.className = "pillar";
    card.innerHTML = `<h3>${p.pillar[0].toUpperCase() + p.pillar.slice(1)}</h3><p>${p.score}% adherence</p>`;
    el.pillars.appendChild(card);
  });
}

function openScience(habitId) {
  const key = SCIENCE[habitId] ? habitId : habitId === "steps" ? "zone2" : habitId === "strength" ? "protein" : "mobility";
  const s = SCIENCE[key];
  el.scienceTitle.textContent = HABITS[habitId].label;
  el.scienceWhy.textContent = s.why;
  el.scienceBiomarkers.textContent = s.biomarkers;
  el.scienceBadge.textContent = s.evidence;
  el.scienceDialog.showModal();
}

function enterAppState() {
  el.logout.classList.toggle("hidden", !state.account);

  if (!state.account) {
    show("landing");
    return;
  }

  if (!state.assessment) {
    show("assessment");
    return;
  }

  if (state.priorities.length && !state.habits.length) {
    state.habits = setHabitsFromPriorities(state.priorities);
    saveState(state);
  }

  if (!sessionStorage.getItem("seen_priorities")) {
    renderPriorities();
    show("priorities");
    return;
  }

  el.activeDate.value = el.activeDate.value || today();
  renderHabits();
  renderMetrics();
  show("dashboard");
}

// Events

document.getElementById("startBtn").addEventListener("click", () => show("auth"));

document.getElementById("demoBtn").addEventListener("click", () => {
  state = {
    account: { email: "demo@outlive365.app" },
    assessment: {
      age: 36,
      sex: "Male",
      activity: "moderate",
      pushups: 18,
      hang: 32,
      sleep: 6.8,
      waist: 39,
      family: "cardio"
    },
    priorities: ["cardio", "sleep", "strength"],
    habits: ["zone2", "sleep", "protein", "mobility", "sunlight"],
    logs: {}
  };
  saveState(state);
  sessionStorage.removeItem("seen_priorities");
  enterAppState();
});

document.getElementById("authForm").addEventListener("submit", (e) => {
  e.preventDefault();
  state.account = {
    email: document.getElementById("email").value.trim()
  };
  saveState(state);
  show("assessment");
});

document.getElementById("assessmentForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const assessment = {
    age: Number(document.getElementById("age").value),
    sex: document.getElementById("sex").value,
    activity: document.getElementById("activity").value,
    pushups: Number(document.getElementById("pushups").value),
    hang: Number(document.getElementById("hang").value),
    sleep: Number(document.getElementById("sleep").value),
    waist: Number(document.getElementById("waist").value),
    family: document.getElementById("family").value,
    glucose: Number(document.getElementById("glucose").value || 0),
    rhr: Number(document.getElementById("rhr").value || 0)
  };

  state.assessment = assessment;
  state.priorities = rankPriorities(assessment);
  state.habits = setHabitsFromPriorities(state.priorities);
  saveState(state);

  renderPriorities();
  show("priorities");
});

document.getElementById("openDashboardBtn").addEventListener("click", () => {
  sessionStorage.setItem("seen_priorities", "1");
  el.activeDate.value = today();
  renderHabits();
  renderMetrics();
  show("dashboard");
});

el.activeDate.value = today();
el.activeDate.addEventListener("change", renderHabits);

document.getElementById("closeScience").addEventListener("click", () => {
  el.scienceDialog.close();
});

el.logout.addEventListener("click", () => {
  state.account = null;
  saveState(state);
  sessionStorage.removeItem("seen_priorities");
  enterAppState();
});

enterAppState();
