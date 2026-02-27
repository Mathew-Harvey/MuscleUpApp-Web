/* ================================================================
   Progress Dashboard — rendering, heatmap, chart, journey, bests
   All functions prefixed with pd to avoid global collisions
   Must load BEFORE app.js (router calls renderProgress)
   ================================================================ */

const PD_EXERCISE_NAMES = {
  ring_hang: 'Ring Hang',
  false_grip: 'False Grip',
  false_grip_hang: 'FG Hang',
  false_grip_ring_rows: 'FG Ring Rows',
  false_grip_pull_ups: 'FG Pull-ups',
  false_grip_stretch: 'FG Stretch',
  ring_push_ups: 'Ring Push-ups',
  ring_push_ups_turn_out: 'Ring Push-ups TO',
  ring_dips: 'Ring Dips',
  ring_dips_turn_out: 'Ring Dips TO',
  pull_up: 'Pull-up',
  bar_dip: 'Bar Dip',
  transition_ring_rows: 'Transition Rows',
  bent_arm_false_grip_hang: 'Bent Arm FG Hang',
  tempo_eccentric_ring_muscle_up: 'Eccentric MU',
  ring_muscle_up: 'Ring Muscle Up',
  muscle_up_conditioning: 'MU Conditioning',
  arm_extension_stretch: 'Arm Ext. Stretch',
  wrist_warmup: 'Wrist Warm-Up',
  ring_dead_hang: 'Ring Dead Hang',
  ring_rows: 'Ring Rows',
  push_ups: 'Push-Ups',
  scapula_pulls: 'Scapula Pull-Ups',
  ring_support: 'Ring Support Hold',
  wrist_warmup_2: 'Wrist Warm-Up',
  pull_ups: 'Pull-Ups',
  bar_dips: 'Bar Dips',
  ring_support_2: 'Ring Support (Turnout)',
  wrist_warmup_3: 'False Grip Prep',
  false_grip_pullups: 'False Grip Pull-Ups',
  false_grip_rows: 'False Grip Rows',
  bent_arm_hold: 'Bent Arm Hold',
  ring_support_turnout: 'Ring Support (Turnout)',
  wrist_warmup_4: 'Wrist Warm-Up + Mobility',
  false_grip_pullups_4: 'False Grip Pull-Ups (Chest)',
  negative_muscle_ups: 'Negative Muscle Ups',
  deep_ring_dips: 'Deep Ring Dips',
  russian_dips: 'Russian Dips',
  wrist_warmup_5: 'Wrist Warm-Up',
  false_grip_pull_high: 'False Grip Pull to Chest',
  muscle_up_attempts: 'Muscle Up Attempts',
  transition_catch: 'Low Ring Muscle Up',
  deep_dips_5: 'Deep Ring Dips',
  muscle_up_sets: 'Muscle Up Sets',
  muscle_up_emom: 'Muscle Up EMOM',
  ring_strength: 'Ring Strength Complex',
};

function pdExName(key) {
  return PD_EXERCISE_NAMES[key] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ===== COUNT-UP ANIMATION =====
function pdCountUp(el, target, duration) {
  const start = performance.now();
  const ease = t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  (function frame(now) {
    const p = Math.min((now - start) / duration, 1);
    el.textContent = Math.round(ease(p) * target).toLocaleString();
    if (p < 1) requestAnimationFrame(frame);
  })(start);
}

// ===== HOLD TIME FORMATTING =====
function pdFormatHold(seconds) {
  if (!seconds || seconds <= 0) return '0s';
  if (seconds < 60) return seconds + 's';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s === 0 ? m + 'm' : m + 'm ' + s + 's';
}

function pdFmtISO(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function pdFmtDatePretty(dateStr) {
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return dateStr; }
}

function pdFmtDateShort(dateStr) {
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
  } catch { return dateStr; }
}

// ===== MAIN RENDER =====
async function renderProgress() {
  const appEl = document.querySelector('#app');
  appEl.innerHTML = '<div class="pd-wrap"><p style="color:#8b949e;">Loading…</p></div>';

  let dashboard, stats;
  try {
    [dashboard, stats] = await Promise.all([
      api('/dashboard'),
      api('/dashboard/stats'),
    ]);
    if (!dashboard || !stats) return;
  } catch (err) {
    appEl.innerHTML = `<div class="pd-wrap"><div class="alert alert-error">${esc(err.message)}</div></div>`;
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = pdFmtISO(today);
  const heatmapMap = {};
  stats.heatmap.forEach(h => { heatmapMap[h.date] = h.count; });
  const loggedToday = (heatmapMap[todayStr] || 0) > 0;

  // --- Hero Stats ---
  const heroHtml = `
    <section class="pd-hero" aria-label="Key statistics">
      <div class="pd-stat-card pd-stat-card--streak">
        <div class="pd-stat-icon">${loggedToday ? '<span class="pd-flame-pulse">🔥</span>' : '🔥'}</div>
        <div class="pd-stat-num" data-countup="${stats.streak.current}">0</div>
        <div class="pd-stat-label">Current Streak</div>
      </div>
      <div class="pd-stat-card pd-stat-card--streak">
        <div class="pd-stat-icon">⚡</div>
        <div class="pd-stat-num" data-countup="${stats.streak.longest}">0</div>
        <div class="pd-stat-label">Longest Streak</div>
      </div>
      <div class="pd-stat-card">
        <div class="pd-stat-icon">💪</div>
        <div class="pd-stat-num" data-countup="${stats.totals.totalSessions}">0</div>
        <div class="pd-stat-label">Total Sessions</div>
      </div>
      <div class="pd-stat-card">
        <div class="pd-stat-icon">📅</div>
        <div class="pd-stat-num" data-countup="${stats.totals.memberSinceDays}">0</div>
        <div class="pd-stat-label">Days Since Joined</div>
      </div>
    </section>`;

  // --- Heatmap ---
  const heatmapHtml = pdBuildHeatmap(heatmapMap, today);

  // --- Volume chart placeholder ---
  const trendDir = pdCalcTrend(stats.weeklyVolume);
  const chartHtml = `
    <section class="pd-section" aria-label="Weekly training volume">
      <div class="pd-chart-container">
        <div class="pd-chart-header">
          <h2 class="pd-section-title" style="margin-bottom:0">Weekly Volume</h2>
          ${trendDir !== 'flat' ? `<span class="pd-trend-badge pd-trend-badge--${trendDir === 'up' ? 'up' : 'down'}">${trendDir === 'up' ? '↑' : '↓'} trending ${trendDir}</span>` : ''}
        </div>
        <div class="pd-chart-wrap">
          <canvas id="pdVolumeChart" aria-hidden="true"></canvas>
          <p class="pd-chart-sr">Weekly sets chart: ${stats.weeklyVolume.map(w => w.sets + ' sets in ' + w.week).join(', ')}</p>
        </div>
      </div>
    </section>`;

  // --- Level Journey ---
  const journeyHtml = pdBuildJourney(stats.levelTimeline, dashboard.user.current_level);

  // --- Personal Bests ---
  const bestsWithHold = stats.personalBests.filter(pb => pb.best_hold_seconds > 0);
  const bestsHtml = `
    <section class="pd-section" aria-label="Personal bests">
      <h2 class="pd-section-title">Personal Bests</h2>
      ${bestsWithHold.length > 0 ? `
        <div class="pd-bests-grid">
          ${bestsWithHold.map(pb => `
            <div class="pd-best-card">
              <div class="pd-best-icon">🏆</div>
              <div class="pd-best-exercise">${esc(pdExName(pb.exercise_key))}</div>
              <div class="pd-best-value">${pdFormatHold(pb.best_hold_seconds)}</div>
              <div class="pd-best-date">${pdFmtDateShort(pb.achieved_at)}</div>
            </div>`).join('')}
        </div>` : `<div class="pd-bests-empty">Keep logging — your PRs will appear here! 🎯</div>`}
    </section>`;

  // --- Most Practiced ---
  const topExercises = stats.exerciseBreakdown.slice(0, 5);
  const maxLogs = topExercises.length > 0 ? topExercises[0].total_logs : 1;
  const practicedHtml = `
    <section class="pd-section" aria-label="Most practiced exercises">
      <h2 class="pd-section-title">Most Practiced</h2>
      ${topExercises.length > 0 ? `
      <div class="pd-practiced-list">
        ${topExercises.map((ex, i) => {
          const pct = Math.round((ex.total_logs / maxLogs) * 100);
          return `
            <div class="pd-practiced-row">
              <span class="pd-practiced-rank">${i + 1}</span>
              <span class="pd-practiced-name">${esc(pdExName(ex.exercise_key))}</span>
              <div class="pd-practiced-track">
                <div class="pd-practiced-bar" data-width="${pct}" style="transition-delay:${i * 0.1}s"></div>
              </div>
              <span class="pd-practiced-count">${ex.total_logs}</span>
            </div>`;
        }).join('')}
      </div>` : `<div class="pd-bests-empty">Log some exercises to see your most practiced! 💪</div>`}
    </section>`;

  appEl.innerHTML = `
    <div class="pd-wrap">
      <a href="#/dashboard" class="pd-back">← Dashboard</a>
      <h1 class="pd-title">Progress Dashboard</h1>
      <p class="pd-subtitle">Your training journey at a glance</p>
      ${heroHtml}
      ${heatmapHtml}
      ${chartHtml}
      ${journeyHtml}
      ${bestsHtml}
      ${practicedHtml}
    </div>
    <div class="pd-heatmap-tooltip" id="pdTooltip"></div>`;

  // --- Post-render: count-up ---
  setTimeout(() => {
    document.querySelectorAll('[data-countup]').forEach(el => {
      pdCountUp(el, parseInt(el.dataset.countup), 1200);
    });
  }, 150);

  // --- Post-render: chart ---
  setTimeout(() => pdInitChart(stats.weeklyVolume), 60);

  // --- Post-render: intersection observer for fade-in ---
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('pd-visible');
        observer.unobserve(entry.target);

        // Animate bars when the practiced section becomes visible
        entry.target.querySelectorAll('.pd-practiced-bar').forEach(bar => {
          bar.style.width = bar.dataset.width + '%';
        });
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.pd-section').forEach(s => observer.observe(s));

  // --- Post-render: heatmap tooltip ---
  pdBindHeatmapTooltip();
}

// ===== HEATMAP BUILDER =====
function pdBuildHeatmap(heatmapMap, today) {
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const currentMonday = new Date(today);
  currentMonday.setDate(today.getDate() + mondayOffset);

  const startMonday = new Date(currentMonday);
  startMonday.setDate(startMonday.getDate() - 25 * 7);

  const dayLabels = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun'];

  // Month labels
  const months = [];
  let lastMonth = -1;
  for (let w = 0; w < 26; w++) {
    const d = new Date(startMonday);
    d.setDate(d.getDate() + w * 7);
    const m = d.getMonth();
    if (m !== lastMonth) {
      const label = d.toLocaleDateString('en-AU', { month: 'short' });
      months.push({ label, left: w * 16 });
      lastMonth = m;
    }
  }

  // Cells
  let cellsHtml = '';
  for (let w = 0; w < 26; w++) {
    for (let d = 0; d < 7; d++) {
      const cellDate = new Date(startMonday);
      cellDate.setDate(startMonday.getDate() + w * 7 + d);
      const dateStr = pdFmtISO(cellDate);
      const isFuture = cellDate > today;
      const count = heatmapMap[dateStr] || 0;
      let level = 0;
      if (count === 1) level = 1;
      else if (count === 2) level = 2;
      else if (count >= 3 && count <= 4) level = 3;
      else if (count >= 5) level = 4;

      const futureClass = isFuture ? ' pd-heatmap-cell--future' : '';
      const prettyDate = cellDate.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
      cellsHtml += `<div class="pd-heatmap-cell${futureClass}" data-level="${isFuture ? '' : level}" data-date="${dateStr}" data-count="${count}" aria-label="${count} logs on ${prettyDate}" role="gridcell"></div>`;
    }
  }

  return `
    <section class="pd-section" aria-label="Activity heatmap">
      <h2 class="pd-section-title">Activity</h2>
      <div class="pd-heatmap-container">
        <div class="pd-heatmap-scroll">
          <div class="pd-heatmap-months" style="margin-left:32px;">
            ${months.map(m => `<span class="pd-heatmap-month" style="left:${m.left}px">${m.label}</span>`).join('')}
          </div>
          <div class="pd-heatmap-body">
            <div class="pd-heatmap-days">
              ${dayLabels.map(l => `<span class="pd-heatmap-day-label">${l}</span>`).join('')}
            </div>
            <div class="pd-heatmap-grid" role="grid" aria-label="Training activity by day">
              ${cellsHtml}
            </div>
          </div>
        </div>
        <div class="pd-heatmap-legend">
          <span>Less</span>
          <div class="pd-heatmap-legend-cell" style="background:#161b22"></div>
          <div class="pd-heatmap-legend-cell" style="background:#0e4429"></div>
          <div class="pd-heatmap-legend-cell" style="background:#006d32"></div>
          <div class="pd-heatmap-legend-cell" style="background:#26a641"></div>
          <div class="pd-heatmap-legend-cell" style="background:#39d353"></div>
          <span>More</span>
        </div>
      </div>
    </section>`;
}

// ===== HEATMAP TOOLTIP =====
function pdBindHeatmapTooltip() {
  const tooltip = document.getElementById('pdTooltip');
  if (!tooltip) return;

  const grid = document.querySelector('.pd-heatmap-grid');
  if (!grid) return;

  grid.addEventListener('mouseover', (e) => {
    const cell = e.target.closest('.pd-heatmap-cell');
    if (!cell || cell.classList.contains('pd-heatmap-cell--future')) return;
    const count = cell.dataset.count || 0;
    const dateStr = cell.dataset.date;
    if (!dateStr) return;
    const pretty = new Date(dateStr + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
    tooltip.textContent = `${count} log${count !== '1' ? 's' : ''} on ${pretty}`;
    tooltip.style.display = 'block';

    const rect = cell.getBoundingClientRect();
    tooltip.style.left = (rect.left + rect.width / 2 - tooltip.offsetWidth / 2) + 'px';
    tooltip.style.top = (rect.top - tooltip.offsetHeight - 6) + 'px';
  });

  grid.addEventListener('mouseout', (e) => {
    const cell = e.target.closest('.pd-heatmap-cell');
    if (cell) tooltip.style.display = 'none';
  });
}

// ===== CHART =====
function pdInitChart(weeklyVolume) {
  const canvas = document.getElementById('pdVolumeChart');
  if (!canvas || typeof Chart === 'undefined') return;

  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 220);
  gradient.addColorStop(0, 'rgba(88, 166, 255, 0.28)');
  gradient.addColorStop(1, 'rgba(88, 166, 255, 0)');

  const labels = weeklyVolume.map(w => {
    const parts = w.week.split('-W');
    return 'W' + parseInt(parts[1]);
  });
  const data = weeklyVolume.map(w => w.sets);

  new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Sets',
        data,
        fill: true,
        backgroundColor: gradient,
        borderColor: '#58a6ff',
        borderWidth: 2,
        tension: 0.35,
        pointRadius: data.map((_, i) => i === data.length - 1 ? 6 : 3),
        pointBackgroundColor: data.map((_, i) => i === data.length - 1 ? '#f0883e' : '#58a6ff'),
        pointBorderColor: data.map((_, i) => i === data.length - 1 ? '#f0883e' : '#58a6ff'),
        pointHoverRadius: 6,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1c2128',
          borderColor: '#30363d',
          borderWidth: 1,
          titleColor: '#e6edf3',
          bodyColor: '#8b949e',
          padding: 10,
          cornerRadius: 8,
          displayColors: false,
          callbacks: {
            label: (ctx) => ctx.parsed.y + ' sets',
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(48, 54, 61, 0.5)', drawBorder: false },
          ticks: { color: '#8b949e', font: { size: 11 } }
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(48, 54, 61, 0.5)', drawBorder: false },
          ticks: { color: '#8b949e', font: { size: 11 } }
        }
      },
      interaction: {
        intersect: false,
        mode: 'index',
      },
    }
  });
}

function pdCalcTrend(weeklyVolume) {
  if (weeklyVolume.length < 6) return 'flat';
  const recent3 = weeklyVolume.slice(-3).reduce((s, w) => s + w.sets, 0) / 3;
  const prev3 = weeklyVolume.slice(-6, -3).reduce((s, w) => s + w.sets, 0) / 3;
  if (recent3 > prev3 * 1.05) return 'up';
  if (recent3 < prev3 * 0.95) return 'down';
  return 'flat';
}

// ===== LEVEL JOURNEY =====
function pdBuildJourney(levelTimeline, currentLevel) {
  const stepsHtml = levelTimeline.map(lv => {
    let state = 'future';
    if (lv.graduated_at) state = 'done';
    else if (lv.level === currentLevel) state = 'current';

    const dotContent = state === 'done'
      ? `<svg class="pd-journey-check" viewBox="0 0 16 16" fill="white"><path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 1 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z"/></svg>`
      : lv.level;

    const dateLabel = state === 'done' && lv.graduated_at
      ? `<div class="pd-journey-date">${pdFmtDateShort(lv.graduated_at)}</div>` : '';

    return `
      <div class="pd-journey-step pd-journey-step--${state}">
        <div class="pd-journey-dot">${dotContent}</div>
        <div class="pd-journey-label">Level ${lv.level}</div>
        ${dateLabel}
      </div>`;
  }).join('');

  return `
    <section class="pd-section" aria-label="Level progression timeline">
      <h2 class="pd-section-title">Level Journey</h2>
      <div class="pd-journey-scroll">
        <div class="pd-journey">
          ${stepsHtml}
        </div>
      </div>
    </section>`;
}
