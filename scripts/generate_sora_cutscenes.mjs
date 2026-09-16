import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import process from 'node:process';

const API_BASE = 'https://api.openai.com/v1';
const MANIFEST_PATH = resolve('property/sora-cutscenes.json');
const POLL_INTERVAL_MS = 15_000;
const MAX_WAIT_MS = 30 * 60 * 1000;

const args = new Map(
  process.argv.slice(2).map((argument) => {
    const [key, ...rest] = argument.replace(/^--/, '').split('=');
    return [key, rest.length ? rest.join('=') : true];
  }),
);
const dryRun = args.has('dry-run');
const selectedIds = typeof args.get('ids') === 'string'
  ? new Set(args.get('ids').split(',').map((value) => value.trim()).filter(Boolean))
  : null;

const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));
const items = manifest.items.filter((item) => !selectedIds || selectedIds.has(item.id));
if (!items.length) throw new Error('No cutscenes selected. Check --ids against property/sora-cutscenes.json.');

const estimatedCost = items.length * manifest.seconds * manifest.estimatedPricePerSecondUsd;
const maxCost = Number(process.env.SORA_MAX_COST_USD ?? manifest.estimatedTotalUsd);
if (!Number.isFinite(maxCost) || estimatedCost - maxCost > 1e-9) {
  throw new Error(`Estimated cost $${estimatedCost.toFixed(2)} exceeds SORA_MAX_COST_USD=$${maxCost.toFixed(2)}.`);
}

const fullPrompt = (item) => [
  manifest.styleBible,
  manifest.characterBible.manager,
  manifest.characterBible.employee,
  item.prompt,
].join(' ');

console.log(`Selected ${items.length} cutscene(s); estimated maximum cost: $${estimatedCost.toFixed(2)} USD.`);
if (dryRun) {
  for (const item of items) console.log(`\n[${item.id}] ${item.file}\n${fullPrompt(item)}`);
  process.exit(0);
}

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) throw new Error('OPENAI_API_KEY is required. Store it as a secret; never commit it.');

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${apiKey}`, ...options.headers },
  });
  if (!response.ok) {
    throw new Error(`${options.method ?? 'GET'} ${path} failed (${response.status}): ${await response.text()}`);
  }
  return response;
}

async function createJob(item) {
  const body = new FormData();
  body.set('model', manifest.model);
  body.set('size', manifest.size);
  body.set('seconds', String(manifest.seconds));
  body.set('prompt', fullPrompt(item));
  const job = await (await api('/videos', { method: 'POST', body })).json();
  console.log(`[${item.id}] queued as ${job.id}`);
  return { item, job };
}

async function waitForJob(entry) {
  const startedAt = Date.now();
  let job = entry.job;
  while (job.status === 'queued' || job.status === 'in_progress') {
    if (Date.now() - startedAt > MAX_WAIT_MS) throw new Error(`[${entry.item.id}] timed out (${job.id}).`);
    await new Promise((resolveDelay) => setTimeout(resolveDelay, POLL_INTERVAL_MS));
    job = await (await api(`/videos/${job.id}`)).json();
    console.log(`[${entry.item.id}] ${job.status}${job.progress == null ? '' : ` ${job.progress}%`}`);
  }
  if (job.status !== 'completed') {
    throw new Error(`[${entry.item.id}] generation ${job.status}: ${JSON.stringify(job.error ?? job)}`);
  }
  return { ...entry, job };
}

async function downloadJob(entry) {
  const outputPath = resolve(manifest.outputDirectory, entry.item.file);
  await mkdir(dirname(outputPath), { recursive: true });
  const response = await api(`/videos/${entry.job.id}/content`);
  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(outputPath, buffer);
  console.log(`[${entry.item.id}] saved ${outputPath} (${buffer.length} bytes)`);
  return {
    id: entry.item.id,
    videoId: entry.job.id,
    path: outputPath,
    bytes: buffer.length,
    model: entry.job.model,
    size: entry.job.size,
    seconds: entry.job.seconds,
  };
}

const jobs = await Promise.all(items.map(createJob));
const completed = await Promise.all(jobs.map(waitForJob));
const videos = await Promise.all(completed.map(downloadJob));
const reportPath = resolve(manifest.outputDirectory, 'sora-generation-report.json');
await writeFile(
  reportPath,
  `${JSON.stringify({ generatedAt: new Date().toISOString(), estimatedCostUsd: estimatedCost, videos }, null, 2)}\n`,
);
console.log(`Sora generation complete. Report: ${reportPath}`);
