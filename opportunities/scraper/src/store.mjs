import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const TRACKED_FIELDS = [
  'title', 'organization', 'category', 'description', 'eligibility', 'location',
  'applicationLink', 'applicationLinkCandidates', 'deadline', 'publicationDate',
  'workMode', 'fundingDetails', 'verificationFlags',
];

export function mergePendingRecords(existing = [], fresh = []) {
  const byId = new Map();
  for (const record of existing) {
    if (record?.id) byId.set(record.id, { ...record, status: 'pending_verification' });
  }

  for (const record of fresh) {
    if (!record?.id) continue;
    const previous = byId.get(record.id);
    if (!previous) {
      byId.set(record.id, { ...record, status: 'pending_verification' });
      continue;
    }
    const changed = TRACKED_FIELDS.some((field) => JSON.stringify(previous[field] ?? null) !== JSON.stringify(record[field] ?? null));
    byId.set(record.id, {
      ...previous,
      ...record,
      discoveredAt: previous.discoveredAt ?? record.discoveredAt,
      lastUpdatedAt: changed ? record.lastUpdatedAt : (previous.lastUpdatedAt ?? record.lastUpdatedAt),
      status: 'pending_verification',
    });
  }

  return [...byId.values()].sort((a, b) => String(b.discoveredAt ?? '').localeCompare(String(a.discoveredAt ?? '')));
}

export async function readPendingRecords(filePath) {
  try {
    const text = await readFile(filePath, 'utf8');
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) throw new Error('Pending output must contain a JSON array.');
    return parsed;
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw new Error(`Could not read existing pending output: ${error.message}`, { cause: error });
  }
}

export async function writePendingRecords(filePath, records) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const pendingOnly = records.map((record) => ({ ...record, status: 'pending_verification' }));
  await writeFile(filePath, `${JSON.stringify(pendingOnly, null, 2)}\n`, 'utf8');
}

export async function writeRunLog(filePath, runSummary) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(runSummary, null, 2)}\n`, 'utf8');
}
