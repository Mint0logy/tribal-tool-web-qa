import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { redactSecrets } from '../tests/utils/redactSecrets.js'
import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
  TestStep,
} from '@playwright/test/reporter'

type TestStatus =
  | 'passed'
  | 'failed'
  | 'timedOut'
  | 'skipped'
  | 'interrupted'
  | 'notRun'

type TestRecord = {
  id: string
  title: string
  file: string
  status: TestStatus
  duration: number
  attempts: number
  steps: TestStep[]
  logs: string[]
  errors: string[]
}

type ReporterOptions = {
  outputFile?: string
}

const STATUS_LABELS: Record<TestStatus, string> = {
  passed: 'Passed',
  failed: 'Failed',
  timedOut: 'Timed out',
  skipped: 'Skipped',
  interrupted: 'Interrupted',
  notRun: 'Not run',
}

const STATUS_COLORS: Record<TestStatus, string> = {
  passed: '#2e9d62',
  failed: '#d94848',
  timedOut: '#e99b27',
  skipped: '#8b95a5',
  interrupted: '#8a63d2',
  notRun: '#d8dde5',
}

const STATUS_BACKGROUNDS: Record<TestStatus, string> = {
  passed: '#edf8f1',
  failed: '#fff0f0',
  timedOut: '#fff7e8',
  skipped: '#f1f3f6',
  interrupted: '#f4efff',
  notRun: '#f4f5f7',
}

const STATUS_ORDER: TestStatus[] = [
  'passed',
  'failed',
  'timedOut',
  'skipped',
  'interrupted',
  'notRun',
]

export default class HtmlReporter implements Reporter {
  private readonly outputFile: string
  private readonly tests = new Map<string, TestRecord>()
  private readonly testOrder: string[] = []

  constructor(options: ReporterOptions = {}) {
    this.outputFile = resolve(
      process.cwd(),
      options.outputFile ?? 'reports/test-report.html',
    )
  }

  onBegin(_config: FullConfig, suite: Suite): void {
    for (const test of suite.allTests()) {
      this.tests.set(test.id, {
        id: test.id,
        title: test.titlePath().join(' › '),
        file: test.location.file,
        status: 'notRun',
        duration: 0,
        attempts: 0,
        steps: [],
        logs: [],
        errors: [],
      })

      this.testOrder.push(test.id)
    }
  }

  async onTestEnd(test: TestCase, result: TestResult): Promise<void> {
    const record = this.tests.get(test.id)

    if (!record) {
      return
    }

    // Keep the result of the latest attempt when retries are enabled.
    record.status = result.status
    record.duration = result.duration
    record.attempts = result.retry + 1
    record.steps = result.steps
    record.errors = result.errors.map((error) =>
      [error.message, error.stack].filter(Boolean).join('\n'),
    )
    record.logs = await this.readTextAttachments(result)
  }

  async onEnd(result: FullResult): Promise<void> {
    const records = this.testOrder
      .map((id) => this.tests.get(id))
      .filter((record): record is TestRecord => Boolean(record))

    const counts = this.getCounts(records)
    const html = this.renderHtml(records, counts, result)

    await mkdir(dirname(this.outputFile), { recursive: true })
    await writeFile(this.outputFile, html, 'utf8')

    console.log(`\nHTML report saved to: ${this.outputFile}`)
  }

  private async readTextAttachments(result: TestResult): Promise<string[]> {
    const logs: string[] = []

    for (const attachment of result.attachments) {
      const isTestLog = attachment.name === 'test-log.txt'
      const isTextFile = attachment.contentType.startsWith('text/plain')

      if (!isTestLog && !isTextFile) {
        continue
      }

      try {
        if (attachment.body) {
          logs.push(attachment.body.toString('utf8'))
        } else if (attachment.path) {
          logs.push(await readFile(attachment.path, 'utf8'))
        }
      } catch (error) {
        logs.push(
          `Could not read attachment "${attachment.name}": ${String(error)}`,
        )
      }
    }

    return logs
  }

  private getCounts(records: TestRecord[]): Record<TestStatus, number> {
    const counts: Record<TestStatus, number> = {
      passed: 0,
      failed: 0,
      timedOut: 0,
      skipped: 0,
      interrupted: 0,
      notRun: 0,
    }

    for (const record of records) {
      counts[record.status] += 1
    }

    return counts
  }

  private renderHtml(
    records: TestRecord[],
    counts: Record<TestStatus, number>,
    result: FullResult,
  ): string {
    const total = records.length
    const executed =
      counts.passed + counts.failed + counts.timedOut + counts.interrupted
    const otherOutcomes = total - counts.passed - counts.failed
    const pieGradient = this.createPieGradient(counts, total)

    const statusRows = STATUS_ORDER.map(
      (status) => `
        <tr>
          <td>
            <span class="legend-dot" style="background:${STATUS_COLORS[status]}"></span>
            ${STATUS_LABELS[status]}
          </td>
          <td>${counts[status]}</td>
        </tr>
      `,
    ).join('')

    const testDetails = records.map((record) => this.renderTest(record)).join('')

    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Playwright Test Report</title>
  <style>
    :root {
      color-scheme: light;
      font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: #202938;
      background: #f4f6f9;
    }

    * {
      box-sizing: border-box;
    }

    body {
      max-width: 1100px;
      margin: 0 auto;
      padding: 32px 20px 56px;
    }

    h1 {
      margin: 0 0 8px;
      font-size: 28px;
    }

    h2 {
      margin: 36px 0 14px;
      font-size: 22px;
    }

    .muted {
      color: #687386;
      font-size: 14px;
    }

    .overview {
      display: grid;
      grid-template-columns: minmax(280px, 1fr) 220px;
      align-items: center;
      gap: 28px;
      padding: 24px;
      background: #fff;
      border: 1px solid #e1e6ed;
      border-radius: 14px;
      box-shadow: 0 4px 18px #1d2a3a0a;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th,
    td {
      padding: 9px 12px;
      border-bottom: 1px solid #edf0f4;
      text-align: left;
    }

    th:last-child,
    td:last-child {
      width: 70px;
      text-align: right;
    }

    tr:last-child td {
      border-bottom: 0;
    }

    .legend-dot {
      display: inline-block;
      width: 10px;
      height: 10px;
      margin-right: 8px;
      border-radius: 50%;
    }

    .chart-wrap {
      display: grid;
      justify-items: center;
      gap: 12px;
    }

    .pie {
      display: grid;
      width: 180px;
      aspect-ratio: 1;
      place-items: center;
      border-radius: 50%;
      background: ${pieGradient};
    }

    .pie-center {
      display: grid;
      width: 112px;
      aspect-ratio: 1;
      place-content: center;
      border-radius: 50%;
      background: #fff;
      text-align: center;
    }

    .pie-center strong {
      font-size: 28px;
    }

    .pie-center span {
      color: #687386;
      font-size: 12px;
    }

    .run-status {
      margin-top: 12px;
    }

    .details-list {
      display: grid;
      gap: 10px;
    }

    details.test {
      overflow: hidden;
      border: 1px solid #dfe5ec;
      border-left: 6px solid var(--status-color);
      border-radius: 10px;
      background: var(--status-bg);
    }

    details.test > summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 14px 16px;
      cursor: pointer;
      font-weight: 650;
      list-style-position: inside;
    }

    .test-meta {
      color: #596579;
      font-size: 12px;
      font-weight: 400;
    }

    .test-content {
      padding: 0 18px 18px;
    }

    .test-content h3 {
      margin: 18px 0 8px;
      font-size: 14px;
    }

    .test-content pre {
      overflow-x: auto;
      margin: 0;
      padding: 12px;
      border: 1px solid #e2e7ee;
      border-radius: 8px;
      background: #fff;
      font: 12px/1.55 ui-monospace, SFMono-Regular, Consolas, monospace;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }

    .empty {
      color: #687386;
      font-size: 13px;
    }

    @media (max-width: 650px) {
      .overview {
        grid-template-columns: 1fr;
      }

      .chart-wrap {
        grid-row: 1;
      }
    }
  </style>
</head>
<body>
  <header>
    <h1>Playwright Test Report</h1>
    <div class="muted">
      Generated: ${escapeHtml(new Date().toLocaleString('en-GB'))}
      · Duration: ${formatDuration(result.duration)}
    </div>
    <div class="muted run-status">
      Overall run status: <strong>${escapeHtml(result.status)}</strong>
    </div>
  </header>

  <section class="overview" aria-label="Test summary">
    <table>
      <thead>
        <tr><th>Status</th><th>Count</th></tr>
      </thead>
      <tbody>
        <tr><td>All tests</td><td>${total}</td></tr>
        <tr><td>Executed</td><td>${executed}</td></tr>
        ${statusRows}
        <tr>
          <td><strong>Other outcomes</strong></td>
          <td><strong>${otherOutcomes}</strong></td>
        </tr>
      </tbody>
    </table>

    <div class="chart-wrap" aria-label="Test results chart">
      <div class="pie" role="img" aria-label="Pie chart of test results">
        <div class="pie-center">
          <strong>${total}</strong>
          <span>tests</span>
        </div>
      </div>
      <div class="muted">Results by status</div>
    </div>
  </section>

  <h2>Details</h2>
  <section class="details-list">
    ${testDetails || '<p class="empty">No tests were included in this run.</p>'}
  </section>
</body>
</html>`
  }

  private renderTest(record: TestRecord): string {
    const steps = this.renderSteps(record.steps)

    const logs =
      record.logs.length > 0
        ? record.logs
            .map((log) => escapeHtml(redactSecrets(log)))
            .join('\n\n')
        : 'The test did not attach test-log.txt.'

    const errors =
      record.errors.length > 0
        ? record.errors
            .map((error) => escapeHtml(redactSecrets(error)))
            .join('\n\n')
        : ''

    const attemptLabel = record.attempts === 1 ? 'attempt' : 'attempts'

    return `
      <details
        class="test"
        style="--status-color:${STATUS_COLORS[record.status]};--status-bg:${STATUS_BACKGROUNDS[record.status]}"
      >
        <summary>
          <span>${escapeHtml(redactSecrets(record.title))}</span>
          <span class="test-meta">
            ${STATUS_LABELS[record.status]} · ${formatDuration(record.duration)} ·
            ${record.attempts} ${attemptLabel}
          </span>
        </summary>
        <div class="test-content">
          <div class="muted">${escapeHtml(redactSecrets(record.file))}</div>

          ${
            steps
              ? `<h3>Playwright steps</h3><pre>${escapeHtml(redactSecrets(steps))}</pre>`
              : ''
          }

          <h3>Test log</h3>
          <pre>${logs}</pre>

          ${errors ? `<h3>Errors</h3><pre>${errors}</pre>` : ''}
        </div>
      </details>
    `
  }

  private renderSteps(steps: TestStep[], depth = 0): string {
    return steps
      .map((step) => {
        const indent = '  '.repeat(depth)
        const marker = step.error ? 'FAIL' : 'OK'
        const errorText = step.error?.message ? ` — ${step.error.message}` : ''
        const currentStep =
          `${indent}[${marker}] ${step.title} ` +
          `(${formatDuration(step.duration)})${errorText}`

        const nestedSteps = this.renderSteps(step.steps, depth + 1)

        return nestedSteps ? `${currentStep}\n${nestedSteps}` : currentStep
      })
      .join('\n')
  }

  private createPieGradient(
    counts: Record<TestStatus, number>,
    total: number,
  ): string {
    if (total === 0) {
      return 'conic-gradient(#d8dde5 0% 100%)'
    }

    let current = 0

    const segments = STATUS_ORDER.map((status) => {
      const start = current
      current += (counts[status] / total) * 100

      return `${STATUS_COLORS[status]} ${start}% ${current}%`
    })

    return `conic-gradient(${segments.join(', ')})`
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function formatDuration(durationMs: number): string {
  if (durationMs < 1000) {
    return `${Math.round(durationMs)} ms`
  }

  return `${(durationMs / 1000).toFixed(2)} s`
}