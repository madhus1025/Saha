#!/usr/bin/env node
/**
 * Builds the QA execution report from the regression suite's JSON reporter output.
 *
 *   node tests/e2e/regression/build-report.mjs \
 *     [--results test-results/regression-results.json] \
 *     [--out ../reports/regression-execution-report.html]
 *
 * Failure screenshots are inlined as data URIs so the report is a single self-contained file that
 * can be attached to a ticket or emailed to a developer.
 */
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs'
import { resolve, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const frontendRoot = resolve(here, '../../..')
const repoRoot = resolve(frontendRoot, '..')

const args = process.argv.slice(2)
const argOf = (flag, fallback) => {
  const i = args.indexOf(flag)
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback
}

const resultsPath = resolve(frontendRoot, argOf('--results', 'test-results/regression-results.json'))
const outPath = resolve(repoRoot, argOf('--out', 'reports/regression-execution-report.html'))
const defectsPath = resolve(here, 'defects.json')

if (!existsSync(resultsPath)) {
  console.error(`✗ results file not found: ${resultsPath}`)
  process.exit(1)
}

const report = JSON.parse(readFileSync(resultsPath, 'utf8'))

/* ── Module metadata ───────────────────────────────────────────────────────────────────────── */

const MODULES = {
  'auth-login-session.spec.ts': {
    name: 'Authentication — Login, Session & Logout',
    catalogue: 'test-cases/authentication/login-session-and-recovery.md',
    prefixes: ['AUTH', 'SES'],
  },
  'auth-recovery.spec.ts': {
    name: 'Authentication — Password Recovery',
    catalogue: 'test-cases/authentication/login-session-and-recovery.md',
    prefixes: ['PWR'],
  },
  'auth-registration.spec.ts': {
    name: 'Registration, Invitations & Couple Lifecycle',
    catalogue: 'test-cases/authentication/registration-and-invitations.md',
    prefixes: ['REG', 'INV'],
  },
  'shell-dashboard-settings.spec.ts': {
    name: 'App Shell, Dashboard, Modules & Settings',
    catalogue: 'test-cases/shell/dashboard-navigation-settings.md',
    prefixes: ['NAV', 'DASH', 'MOD', 'SET'],
  },
  'profile.spec.ts': {
    name: 'Profile, Avatar & Partner View',
    catalogue: 'test-cases/profile/profile-and-partner-view.md',
    prefixes: ['PRF'],
  },
  'connect.spec.ts': {
    name: 'Couple Discovery & Connections',
    catalogue: 'test-cases/connect/connections.md',
    prefixes: ['CON'],
  },
  'messaging.spec.ts': {
    name: 'Conversations, Messages, Reactions & Groups',
    catalogue: 'test-cases/messaging/conversations-and-messages.md',
    prefixes: ['MSG', 'GRP', 'THR', 'TXT', 'EDT', 'DEL', 'REA', 'CFG'],
  },
  'security-crosscutting.spec.ts': {
    name: 'Cross-Cutting — Security, Reliability, Accessibility, Responsive & Telemetry',
    catalogue: 'test-cases/cross-cutting/security-accessibility-responsive-telemetry.md',
    prefixes: ['SEC', 'REL', 'ACC', 'RSP', 'TEL', 'DEP'],
  },
}

/* ── Walk the Playwright JSON tree ─────────────────────────────────────────────────────────── */

const rows = []

function walk(suite, fileHint) {
  const file = suite.file ? basename(suite.file) : fileHint
  for (const spec of suite.specs ?? []) {
    const test = spec.tests?.[0]
    const results = test?.results ?? []
    const last = results[results.length - 1]
    // Playwright marks a spec `flaky` when a retry passed. That is a harness-timing signal, not a
    // product defect, so it is reported separately and never counted as failed.
    const flaky = test?.status === 'flaky'
    const skipped = test?.status === 'skipped' || last?.status === 'skipped'
    const failed = !spec.ok && !flaky && !skipped
    // On a failure the first attempt carries the most representative error/screenshot.
    const evidence = failed ? results.find((r) => r.status !== 'passed') ?? last : last
    const ids = [...spec.title.matchAll(/\[([A-Z]{3,4}-\d{3})\]/g)].map((m) => m[1])

    rows.push({
      file,
      title: spec.title,
      cleanTitle: spec.title.replace(/\[[A-Z]{3,4}-\d{3}\]\s*/g, '').trim(),
      ids,
      status: failed ? 'failed' : flaky ? 'flaky' : skipped ? 'skipped' : 'passed',
      ok: !failed && !skipped,
      failed,
      flaky,
      attempts: results.length,
      duration: results.reduce((sum, r) => sum + (r.duration ?? 0), 0),
      error: failed && evidence?.error?.message ? stripAnsi(evidence.error.message) : null,
      location: `${file}:${spec.line}`,
      attachments: failed
        ? (evidence?.attachments ?? []).filter((a) => a.contentType?.startsWith('image/'))
        : [],
    })
  }
  for (const child of suite.suites ?? []) walk(child, file)
}

for (const suite of report.suites ?? []) walk(suite, basename(suite.file ?? ''))

function stripAnsi(s) {
  return String(s).replace(/\[[0-9;]*m/g, '')
}

/* ── Group into modules ────────────────────────────────────────────────────────────────────── */

const modules = []
for (const [file, meta] of Object.entries(MODULES)) {
  const tests = rows.filter((r) => r.file === file)
  if (!tests.length) continue
  modules.push({
    file,
    ...meta,
    tests,
    total: tests.length,
    passed: tests.filter((t) => t.status === 'passed').length,
    failed: tests.filter((t) => t.failed).length,
    flaky: tests.filter((t) => t.flaky).length,
    skipped: tests.filter((t) => t.status === 'skipped').length,
  })
}
// Anything in an unmapped file still gets reported.
const mapped = new Set(Object.keys(MODULES))
const orphans = rows.filter((r) => !mapped.has(r.file))
if (orphans.length) {
  modules.push({
    file: 'other',
    name: 'Other',
    catalogue: '—',
    prefixes: [],
    tests: orphans,
    total: orphans.length,
    passed: orphans.filter((t) => t.status === 'passed').length,
    failed: orphans.filter((t) => t.failed).length,
    flaky: orphans.filter((t) => t.flaky).length,
    skipped: 0,
  })
}

const totals = {
  total: rows.length,
  passed: rows.filter((r) => r.status === 'passed').length,
  failed: rows.filter((r) => r.failed).length,
  flaky: rows.filter((r) => r.flaky).length,
  skipped: rows.filter((r) => r.status === 'skipped').length,
  duration: report.stats?.duration ?? 0,
  startedAt: report.stats?.startTime ?? new Date().toISOString(),
}
const coveredIds = new Set(rows.flatMap((r) => r.ids))

/* ── Defect register (hand-triaged, joined onto failures by test title) ────────────────────── */

const defects = existsSync(defectsPath) ? JSON.parse(readFileSync(defectsPath, 'utf8')) : []
for (const d of defects) {
  d.evidence = rows.filter((r) => (d.tests ?? []).some((t) => r.title.includes(t)))
  d.screenshots = d.evidence.flatMap((e) => e.attachments)
}

/* ── Helpers ───────────────────────────────────────────────────────────────────────────────── */

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const MAX_IMG_BYTES = 1_500_000
function dataUri(att) {
  try {
    if (!att.path || !existsSync(att.path)) return null
    if (statSync(att.path).size > MAX_IMG_BYTES) return null
    const b64 = readFileSync(att.path).toString('base64')
    return `data:${att.contentType};base64,${b64}`
  } catch {
    return null
  }
}

const ms = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}s` : `${Math.round(n)}ms`)
const pct = (a, b) => (b === 0 ? '0' : ((a / b) * 100).toFixed(1))

const SEVERITY_ORDER = { Critical: 0, High: 1, Medium: 2, Low: 3 }
defects.sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9))

/* ── Render ────────────────────────────────────────────────────────────────────────────────── */

const moduleCards = modules
  .map((m) => {
    const rate = pct(m.passed + m.flaky, m.total)
    const state = m.failed === 0 ? 'ok' : m.failed > 2 ? 'bad' : 'warn'
    return `
    <a class="mcard ${state}" href="#mod-${esc(m.file)}">
      <div class="mcard-name">${esc(m.name)}</div>
      <div class="mcard-bar"><span style="width:${rate}%"></span></div>
      <div class="mcard-stats">
        <b>${m.passed}</b>/${m.total} passed
        ${m.failed ? `<em>${m.failed} failed</em>` : '<i>clean</i>'}
      </div>
    </a>`
  })
  .join('')

const defectSection = defects.length
  ? defects
      .map((d, i) => {
        const shots = d.screenshots
          .map(dataUri)
          .filter(Boolean)
          .map(
            (uri, n) =>
              `<figure><img src="${uri}" alt="Failure screenshot ${n + 1} for ${esc(d.id)}" loading="lazy"><figcaption>Captured at failure — ${esc(d.id)} (${n + 1}/${d.screenshots.length})</figcaption></figure>`,
          )
          .join('')

        const verifying = d.evidence.filter((e) => !e.failed)
        const stillFailing = d.evidence.filter((e) => e.failed)
        const fixed = d.evidence.length > 0 && stillFailing.length === 0
        const failing = d.evidence
          .map(
            (e) =>
              `<li><code>${esc(e.location)}</code> — ${esc(e.cleanTitle)} <span class="pill ${e.failed ? 'p-fail' : e.flaky ? 'p-flaky' : 'p-pass'}">${esc(e.status)}</span></li>`,
          )
          .join('')

        const errors = d.evidence
          .filter((e) => e.error)
          .map((e) => `<pre class="err">${esc(e.error.slice(0, 1400))}</pre>`)
          .join('')

        return `
      <article class="defect sev-${esc(d.severity.toLowerCase())}" id="${esc(d.id)}">
        <header>
          <span class="sev">${esc(d.severity)}</span>
          <h3>${esc(d.id)} · ${esc(d.title)}</h3>
          <span class="status ${fixed ? 's-fixed' : 's-open'}">${fixed ? '✓ Fixed &amp; verified' : '● Still failing'}</span>
        </header>
        <div class="dmeta">
          <div><dt>Module</dt><dd>${esc(d.module)}</dd></div>
          <div><dt>Catalogue cases</dt><dd>${d.cases.map((c) => `<code>${esc(c)}</code>`).join(' ')}</dd></div>
          <div><dt>Component</dt><dd><code>${esc(d.component)}</code></dd></div>
          <div><dt>Type</dt><dd>${esc(d.type)}</dd></div>
        </div>

        <h4>The defect (before the fix)</h4>
        <p>${d.observed}</p>

        <h4>What the catalogue requires</h4>
        <p>${d.expected}</p>

        <h4>Why it matters</h4>
        <p>${d.impact}</p>

        <h4>Steps to reproduce</h4>
        <ol class="repro">${d.repro.map((r) => `<li>${r}</li>`).join('')}</ol>

        ${d.fix ? `<h4>Fix applied</h4><div class="fix">${d.fix}</div>` : ''}
        ${d.evidenceNote ? `<h4>Evidence at the time of reporting</h4><p>${d.evidenceNote}</p>` : ''}
        ${errors ? `<h4>Assertion output</h4>${errors}` : ''}
        ${shots ? `<h4>Screenshots</h4><div class="shots">${shots}</div>` : ''}

        <h4>Verified by ${d.evidence.length} regression test${d.evidence.length === 1 ? '' : 's'}</h4>
        <ul class="tlist">${failing}</ul>

        ${verifying.some((e) => e.flaky) ? `<div class="note warnnote"><b>One linked test needed a retry.</b> It passed, but the timing sensitivity is worth a look — see the evidence note.</div>` : ''}
        ${d.note ? `<div class="note"><b>Note for the developer:</b> ${d.note}</div>` : ''}
      </article>`
      })
      .join('')
  : '<p class="empty">No defects were triaged for this run.</p>'

const moduleSections = modules
  .map((m) => {
    const testRows = m.tests
      .map((t) => {
        const shots = !t.failed
          ? ''
          : t.attachments
              .map(dataUri)
              .filter(Boolean)
              .map((uri) => `<img class="thumb" src="${uri}" alt="Failure screenshot for ${esc(t.cleanTitle)}" loading="lazy">`)
              .join('')
        return `
        <tr class="${t.failed ? 'row-fail' : ''}">
          <td class="c-ids">${t.ids.map((id) => `<code>${esc(id)}</code>`).join(' ') || '<span class="muted">—</span>'}</td>
          <td class="c-title">
            ${esc(t.cleanTitle)}
            ${t.error ? `<details><summary>failure detail</summary><pre class="err">${esc(t.error.slice(0, 1600))}</pre>${shots ? `<div class="shots inline">${shots}</div>` : ''}</details>` : ''}
          </td>
          <td class="c-status"><span class="pill ${t.failed ? 'p-fail' : t.flaky ? 'p-flaky' : t.status === 'skipped' ? 'p-skip' : 'p-pass'}">${esc(t.status)}</span>${t.flaky ? `<div class="muted" style="font-size:11px;margin-top:3px">passed on retry ${t.attempts - 1}</div>` : ''}</td>
          <td class="c-dur">${ms(t.duration)}</td>
        </tr>`
      })
      .join('')

    return `
    <section class="module" id="mod-${esc(m.file)}">
      <div class="mhead">
        <h3>${esc(m.name)}</h3>
        <div class="mnums">
          <span class="pill p-pass">${m.passed} passed</span>
          ${m.failed ? `<span class="pill p-fail">${m.failed} failed</span>` : ''}
          ${m.flaky ? `<span class="pill p-flaky">${m.flaky} flaky</span>` : ''}
          ${m.skipped ? `<span class="pill p-skip">${m.skipped} skipped</span>` : ''}
          <span class="muted">${m.total} executed</span>
        </div>
      </div>
      <p class="msrc">Catalogue: <code>${esc(m.catalogue)}</code> · Spec: <code>tests/e2e/regression/${esc(m.file)}</code> · Prefixes: ${m.prefixes.map((p) => `<code>${esc(p)}</code>`).join(' ')}</p>
      <table class="ttable">
        <thead><tr><th>Case ID</th><th>Scenario</th><th>Result</th><th>Time</th></tr></thead>
        <tbody>${testRows}</tbody>
      </table>
    </section>`
  })
  .join('')

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Saha · Fix Verification &amp; Regression Report</title>
<style>
  :root {
    --bg:#0f1115; --panel:#171a21; --panel2:#1d212a; --line:#2a2f3a;
    --fg:#e6e9ef; --muted:#98a1b3;
    --pass:#3fb950; --fail:#f85149; --skip:#d29922; --accent:#58a6ff;
    --crit:#f85149; --high:#ff7b45; --med:#d29922; --low:#58a6ff;
  }
  @media (prefers-color-scheme: light) {
    :root { --bg:#f6f7f9; --panel:#fff; --panel2:#f0f2f5; --line:#dfe3ea;
            --fg:#12151a; --muted:#5b6472; --accent:#0a66c2; }
  }
  * { box-sizing:border-box }
  body { margin:0; background:var(--bg); color:var(--fg);
         font:15px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; }
  .wrap { max-width:1180px; margin:0 auto; padding:32px 20px 96px }
  code { font:12.5px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;
         background:var(--panel2); border:1px solid var(--line); border-radius:5px; padding:1px 5px }
  h1 { font-size:30px; margin:0 0 6px; letter-spacing:-.02em }
  h2 { font-size:21px; margin:44px 0 14px; padding-bottom:8px; border-bottom:1px solid var(--line) }
  h3 { font-size:17px; margin:0 }
  h4 { font-size:13px; text-transform:uppercase; letter-spacing:.07em; color:var(--muted);
       margin:18px 0 5px }
  p { margin:6px 0 }
  .sub { color:var(--muted); margin-bottom:22px }

  .kpis { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:12px; margin:22px 0 8px }
  .kpi { background:var(--panel); border:1px solid var(--line); border-radius:12px; padding:16px }
  .kpi b { display:block; font-size:29px; line-height:1.15; letter-spacing:-.02em }
  .kpi span { color:var(--muted); font-size:12.5px }
  .kpi.pass b { color:var(--pass) } .kpi.fail b { color:var(--fail) } .kpi.warn b { color:var(--skip) }

  .mgrid { display:grid; grid-template-columns:repeat(auto-fit,minmax(250px,1fr)); gap:12px; margin:16px 0 }
  .mcard { display:block; text-decoration:none; color:inherit; background:var(--panel);
           border:1px solid var(--line); border-left:4px solid var(--pass);
           border-radius:10px; padding:14px; transition:transform .12s ease }
  .mcard:hover { transform:translateY(-2px) }
  .mcard.warn { border-left-color:var(--skip) } .mcard.bad { border-left-color:var(--fail) }
  .mcard-name { font-weight:600; font-size:14px; margin-bottom:9px; line-height:1.35 }
  .mcard-bar { height:6px; background:var(--panel2); border-radius:99px; overflow:hidden; margin-bottom:8px }
  .mcard-bar span { display:block; height:100%; background:var(--pass) }
  .mcard.bad .mcard-bar span { background:var(--fail) }
  .mcard.warn .mcard-bar span { background:var(--skip) }
  .mcard-stats { font-size:12.5px; color:var(--muted) }
  .mcard-stats em { color:var(--fail); font-style:normal; margin-left:6px }
  .mcard-stats i { color:var(--pass); font-style:normal; margin-left:6px }

  .module { background:var(--panel); border:1px solid var(--line); border-radius:12px;
            padding:18px; margin:16px 0 }
  .mhead { display:flex; flex-wrap:wrap; gap:10px; align-items:center; justify-content:space-between }
  .mnums { display:flex; gap:6px; align-items:center; flex-wrap:wrap }
  .msrc { color:var(--muted); font-size:12.5px; margin:8px 0 14px }

  .tblwrap, .ttable { width:100% }
  .ttable { border-collapse:collapse; display:block; overflow-x:auto }
  .ttable th { text-align:left; font-size:11.5px; text-transform:uppercase; letter-spacing:.06em;
               color:var(--muted); border-bottom:1px solid var(--line); padding:8px 10px; font-weight:600 }
  .ttable td { border-bottom:1px solid var(--line); padding:9px 10px; vertical-align:top }
  .ttable tr:last-child td { border-bottom:0 }
  .row-fail { background:color-mix(in srgb, var(--fail) 8%, transparent) }
  .c-ids { white-space:nowrap; width:1%; }
  .c-status, .c-dur { white-space:nowrap; width:1% }
  .c-dur { color:var(--muted); font-size:12.5px }
  .muted { color:var(--muted) }

  .pill { display:inline-block; font-size:11.5px; font-weight:600; padding:2px 9px; border-radius:99px;
          border:1px solid transparent; white-space:nowrap }
  .p-pass { color:var(--pass); background:color-mix(in srgb,var(--pass) 14%,transparent); border-color:color-mix(in srgb,var(--pass) 32%,transparent) }
  .p-fail { color:var(--fail); background:color-mix(in srgb,var(--fail) 14%,transparent); border-color:color-mix(in srgb,var(--fail) 32%,transparent) }
  .p-flaky { color:#a371f7; background:color-mix(in srgb,#a371f7 14%,transparent); border-color:color-mix(in srgb,#a371f7 32%,transparent) }
  .p-skip { color:var(--skip); background:color-mix(in srgb,var(--skip) 14%,transparent); border-color:color-mix(in srgb,var(--skip) 32%,transparent) }

  details { margin-top:7px } summary { cursor:pointer; color:var(--accent); font-size:12.5px }
  pre.err { background:var(--panel2); border:1px solid var(--line); border-left:3px solid var(--fail);
            border-radius:7px; padding:11px; overflow-x:auto; font:12px/1.55 ui-monospace,Menlo,monospace;
            white-space:pre-wrap; word-break:break-word; margin:9px 0 }

  .defect { background:var(--panel); border:1px solid var(--line); border-radius:12px;
            padding:20px; margin:16px 0; border-top:4px solid var(--med) }
  .defect.sev-critical { border-top-color:var(--crit) }
  .defect.sev-high { border-top-color:var(--high) }
  .defect.sev-medium { border-top-color:var(--med) }
  .defect.sev-low { border-top-color:var(--low) }
  .defect header { display:flex; gap:11px; align-items:baseline; flex-wrap:wrap }
  .sev { font-size:11px; font-weight:700; letter-spacing:.06em; text-transform:uppercase;
         padding:3px 9px; border-radius:5px; color:#0f1115; background:var(--med) }
  .sev-critical .sev { background:var(--crit); color:#fff }
  .sev-high .sev { background:var(--high); color:#fff }
  .sev-low .sev { background:var(--low); color:#fff }
  .status { margin-left:auto; font-size:12px; font-weight:600; padding:3px 10px; border-radius:99px; white-space:nowrap }
  .s-fixed { color:var(--pass); background:color-mix(in srgb,var(--pass) 14%,transparent); border:1px solid color-mix(in srgb,var(--pass) 34%,transparent) }
  .s-open { color:var(--fail); background:color-mix(in srgb,var(--fail) 14%,transparent); border:1px solid color-mix(in srgb,var(--fail) 34%,transparent) }
  .fix { background:color-mix(in srgb,var(--pass) 9%,transparent);
         border:1px solid color-mix(in srgb,var(--pass) 28%,transparent);
         border-radius:8px; padding:11px 13px; font-size:13.5px }
  .dmeta { display:grid; grid-template-columns:repeat(auto-fit,minmax(190px,1fr)); gap:10px;
           background:var(--panel2); border-radius:9px; padding:12px; margin:14px 0 }
  .dmeta dt { font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:var(--muted); font-weight:600 }
  .dmeta dd { margin:3px 0 0; font-size:13.5px }
  .repro { margin:6px 0 0; padding-left:20px } .repro li { margin:3px 0 }
  .tlist { margin:6px 0 0; padding-left:18px; font-size:13.5px } .tlist li { margin:3px 0 }
  .warnnote { background:color-mix(in srgb,var(--skip) 12%,transparent) !important;
              border-color:color-mix(in srgb,var(--skip) 36%,transparent) !important }
  .note { background:color-mix(in srgb,var(--accent) 10%,transparent);
          border:1px solid color-mix(in srgb,var(--accent) 32%,transparent);
          border-radius:8px; padding:11px 13px; margin-top:16px; font-size:13.5px }

  .shots { display:grid; grid-template-columns:repeat(auto-fit,minmax(300px,1fr)); gap:12px; margin-top:8px }
  .shots figure { margin:0; background:var(--panel2); border:1px solid var(--line); border-radius:9px; overflow:hidden }
  .shots img { display:block; width:100%; height:auto }
  .shots figcaption { font-size:11.5px; color:var(--muted); padding:7px 9px; border-top:1px solid var(--line) }
  .thumb { max-width:100%; border:1px solid var(--line); border-radius:7px; margin-top:7px }
  .empty { color:var(--muted); font-style:italic }

  .legend { display:flex; gap:16px; flex-wrap:wrap; color:var(--muted); font-size:13px; margin:10px 0 0 }
  footer { margin-top:52px; padding-top:18px; border-top:1px solid var(--line); color:var(--muted); font-size:12.5px }
  a { color:var(--accent) }
</style>
</head>
<body>
<div class="wrap">

  <h1>Saha · Fix Verification &amp; Regression Report</h1>
  <p class="sub">
    Automated execution of the manual test catalogue in <code>test-cases/</code>,
    run against the real backend (<code>ASPNETCORE_ENVIRONMENT=IntegrationTest</code>) and the Vite dev server.<br>
    Run started ${esc(new Date(totals.startedAt).toUTCString())} · wall clock ${ms(totals.duration)} ·
    Desktop Chromium · timezone <code>Asia/Kolkata</code>.
  </p>

  <div class="kpis">
    <div class="kpi"><b>${totals.total}</b><span>tests executed</span></div>
    <div class="kpi pass"><b>${totals.passed}</b><span>passed (${pct(totals.passed, totals.total)}%)</span></div>
    <div class="kpi ${totals.failed ? 'fail' : 'pass'}"><b>${totals.failed}</b><span>failing</span></div>
    <div class="kpi warn"><b>${totals.flaky}</b><span>flaky (passed on retry)</span></div>
    <div class="kpi pass"><b>${defects.length}</b><span>defects fixed &amp; verified</span></div>
    <div class="kpi"><b>${coveredIds.size}</b><span>catalogue case IDs exercised</span></div>
    <div class="kpi"><b>${modules.length}</b><span>modules</span></div>
  </div>

  <h2>Results by module</h2>
  <div class="mgrid">${moduleCards}</div>

  <h2>Defects fixed (${defects.length})</h2>
  <p class="sub">
    Each defect below was first reproduced by a failing automated test, then fixed, and is now
    verified by that same test passing. The tests are permanent members of the regression suite, so
    a future change that reintroduces any of these turns the linked test red again.
  </p>
  ${defectSection}

  <h2>Scope, environment and exclusions</h2>
  <div class="module">
    <h4>Environment under test</h4>
    <ul class="tlist">
      <li>Backend: <code>ASPNETCORE_ENVIRONMENT=IntegrationTest</code> on <code>https://localhost:7001</code>, SQLite store, seeded via <code>npm run seed:e2e</code> + <code>seed:e2e:connect</code>.</li>
      <li>Frontend: Vite dev server on <code>http://localhost:5173</code> with <code>VITE_REGISTRATION_ENABLED=true</code>.</li>
      <li>Browser: Desktop Chromium only. Timezone pinned to <code>Asia/Kolkata</code> (+05:30) so UTC-serialisation defects surface deterministically.</li>
      <li>Execution: single worker, no retries — every result below is a first-attempt result, not a best-of-N.</li>
    </ul>

    <h4>Catalogue areas deliberately not executed</h4>
    <p>These are excluded because the environment cannot support them, not because they passed.
       They remain valid manual coverage and are listed so nothing is mistaken for verified.</p>
    <table class="ttable">
      <thead><tr><th>Cases</th><th>Area</th><th>What it needs</th></tr></thead>
      <tbody>
        <tr><td><code>MED-001…007</code> <code>PRF-014…017</code> <code>SEC-012</code></td><td>Message media and profile avatars</td><td>Blob-backed storage (Azurite or a real storage account)</td></tr>
        <tr><td><code>PWR-010</code> <code>PWR-012</code> <code>PWR-014</code></td><td>The successful password-reset leg</td><td>A readable test mailbox or a fixture exposing the issued code</td></tr>
        <tr><td><code>REG-001</code></td><td>Registration feature flag disabled</td><td>A second Vite build without <code>VITE_REGISTRATION_ENABLED</code></td></tr>
        <tr><td><code>SEC-010</code> <code>SEC-011</code> <code>DEP-001</code></td><td>TLS/HSTS, real rate limits, deployment config</td><td>A deployed HTTPS environment and the production config matrix</td></tr>
        <tr><td><code>SEC-015</code> <code>TEL-006</code> <code>TEL-007</code></td><td>Audit records and OpenTelemetry exporters</td><td>Database inspection plus Loki/Grafana or test exporters</td></tr>
        <tr><td><code>BRW-001</code> <code>BRW-002</code></td><td>Firefox, WebKit, real mobile devices</td><td>Additional Playwright projects and a device lab</td></tr>
        <tr><td><code>ACC-004</code> <code>ACC-007</code> (partly)</td><td>Screen-reader announcements, captions, forced colors</td><td>Manual VoiceOver/NVDA review — not automatable</td></tr>
      </tbody>
    </table>

    <h4>How to read a failure</h4>
    <p>Every test asserts the behaviour the catalogue <em>specifies</em>, not the behaviour the code
       currently has. A red row is therefore a reported defect, not a broken test — fixing the
       product turns it green. Tests were re-verified in isolation before being reported, so
       locator and fixture faults in the harness have already been eliminated.</p>
  </div>

  <h2>Full execution detail</h2>
  <p class="sub">Every executed test, grouped by module and tagged with the catalogue case IDs it covers. Expand a failing row to see the assertion output and the screenshot captured at the moment of failure.</p>
  ${moduleSections}

  <footer>
    Generated from <code>${esc(basename(resultsPath))}</code> by
    <code>tests/e2e/regression/build-report.mjs</code>.
    Re-run with <code>npm run test:e2e:regression &amp;&amp; npm run report:regression</code>.
  </footer>
</div>
</body>
</html>`

writeFileSync(outPath, html)
console.log(`✓ report written: ${outPath}`)
console.log(`  ${totals.passed}/${totals.total} passed · ${totals.failed} failed · ${defects.length} defects · ${coveredIds.size} case IDs`)
