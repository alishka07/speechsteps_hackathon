import { scoreColor } from '@/theme';

/** Данные отчёта по ребёнку для PDF. */
export interface ReportData {
  title: string;
  childName: string;
  ageLabel: string;
  diagnoses: string[];
  therapistName: string;
  avgScore: number;
  attemptsCount: number;
  weekMinutes: number;
  soundStats: { sound: string; accuracy: number }[];
  attempts: {
    date: string;
    exerciseTitle: string;
    expectedWord: string;
    recognizedWord: string;
    score: number;
  }[];
  notes: { title: string; text: string; date: string }[];
  labels: {
    therapist: string;
    avgScore: string;
    attempts: string;
    weekMinutes: string;
    bySound: string;
    history: string;
    notes: string;
    generated: string;
    minShort: string;
  };
}

function esc(s: string): string {
  return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c] ?? c);
}

/** Собирает HTML отчёта (чистая функция — тестируется отдельно). */
export function buildReportHtml(d: ReportData): string {
  const soundRows = d.soundStats
    .map((s) => {
      const c = scoreColor(s.accuracy).fg;
      return `<div class="bar-row">
        <span class="bar-label">${esc(s.sound)}</span>
        <span class="bar-track"><span class="bar-fill" style="width:${s.accuracy}%;background:${c}"></span></span>
        <span class="bar-val" style="color:${c}">${s.accuracy}%</span>
      </div>`;
    })
    .join('');

  const attemptRows = d.attempts
    .map((a) => {
      const c = scoreColor(a.score).fg;
      return `<tr>
        <td>${esc(a.date)}</td>
        <td>${esc(a.exerciseTitle)}</td>
        <td>${esc(a.expectedWord)} → <i>${esc(a.recognizedWord)}</i></td>
        <td style="color:${c};font-weight:700;text-align:right">${a.score}%</td>
      </tr>`;
    })
    .join('');

  const noteRows = d.notes
    .map(
      (n) => `<div class="note">
        <div class="note-head"><b>${esc(n.title)}</b><span>${esc(n.date)}</span></div>
        <div>${esc(n.text)}</div>
      </div>`,
    )
    .join('');

  return `<!doctype html><html><head><meta charset="utf-8"/>
  <style>
    * { font-family: -apple-system, Roboto, 'Segoe UI', sans-serif; box-sizing: border-box; }
    body { color:#1E2A6E; padding:28px; }
    h1 { font-size:24px; margin:0 0 2px; }
    .sub { color:#5D6280; font-size:13px; margin-bottom:18px; }
    .tags span { display:inline-block; background:#FDE9E1; color:#C2602F; border-radius:999px;
      padding:3px 10px; font-size:12px; margin-right:6px; }
    .kpis { display:flex; gap:12px; margin:18px 0; }
    .kpi { flex:1; background:#FAF7F2; border-radius:12px; padding:12px; text-align:center; }
    .kpi b { font-size:22px; display:block; }
    .kpi span { font-size:12px; color:#5D6280; }
    h2 { font-size:15px; margin:22px 0 8px; }
    .bar-row { display:flex; align-items:center; gap:10px; margin:5px 0; }
    .bar-label { width:28px; font-weight:700; }
    .bar-track { flex:1; height:9px; background:#EDE7DE; border-radius:5px; overflow:hidden; }
    .bar-fill { display:block; height:100%; }
    .bar-val { width:42px; text-align:right; font-weight:700; font-size:13px; }
    table { width:100%; border-collapse:collapse; font-size:12.5px; }
    th { text-align:left; color:#787D99; font-size:11px; text-transform:uppercase; border-bottom:1.5px solid #EDE7DE; padding:6px 4px; }
    td { padding:7px 4px; border-bottom:1px solid #F0EBE3; }
    .note { background:#FAF7F2; border-radius:10px; padding:10px 12px; margin:6px 0; font-size:13px; }
    .note-head { display:flex; justify-content:space-between; margin-bottom:3px; }
    .note-head span { color:#787D99; font-size:11px; }
    .footer { margin-top:24px; color:#A3A7BC; font-size:11px; text-align:center; }
  </style></head><body>
    <h1>${esc(d.childName)}</h1>
    <div class="sub">${esc(d.ageLabel)} · ${esc(d.labels.therapist)}: ${esc(d.therapistName)}</div>
    <div class="tags">${d.diagnoses.map((x) => `<span>${esc(x)}</span>`).join('')}</div>
    <div class="kpis">
      <div class="kpi"><b>${d.avgScore}%</b><span>${esc(d.labels.avgScore)}</span></div>
      <div class="kpi"><b>${d.attemptsCount}</b><span>${esc(d.labels.attempts)}</span></div>
      <div class="kpi"><b>${d.weekMinutes}${esc(d.labels.minShort)}</b><span>${esc(d.labels.weekMinutes)}</span></div>
    </div>
    ${d.soundStats.length ? `<h2>${esc(d.labels.bySound)}</h2>${soundRows}` : ''}
    ${d.attempts.length ? `<h2>${esc(d.labels.history)}</h2>
      <table><tr><th>Дата</th><th>Упражнение</th><th>Слово</th><th style="text-align:right">%</th></tr>${attemptRows}</table>` : ''}
    ${d.notes.length ? `<h2>${esc(d.labels.notes)}</h2>${noteRows}` : ''}
    <div class="footer">${esc(d.labels.generated)} · SpeechSteps</div>
  </body></html>`;
}

export type PdfResult = 'shared' | 'web' | 'error';

/** Открывает версию для печати: браузер позволяет сохранить её как PDF. */
export async function exportPdf(html: string): Promise<PdfResult> {
  try {
    const report = window.open('', '_blank');
    if (!report) return 'error';
    report.document.open();
    report.document.write(html.replace('</head>', '<style>@media print{body{padding:16mm!important}.footer{position:fixed;bottom:4mm;left:0;right:0}}@page{size:A4;margin:10mm}</style></head>'));
    report.document.close();
    report.addEventListener('load', () => report.print(), { once: true });
    window.setTimeout(() => { if (!report.closed) report.print(); }, 450);
    return 'shared';
  } catch {
    return 'error';
  }
}
