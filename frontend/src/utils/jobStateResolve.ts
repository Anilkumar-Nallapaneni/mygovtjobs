import { STATES } from '@/data/states';

/** Host / org substring → state id (longest match wins). */
const HOST_STATE_HINTS = [
  ['keralapsc', 'kl'],
  ['kerala', 'kl'],
  ['tamilnadupsc', 'tn'],
  ['tnpsc', 'tn'],
  ['mpsc.gov', 'mh'],
  ['maharashtra', 'mh'],
  ['upsc.gov', null],
  ['ssc.nic', null],
  ['isro.gov', null],
  ['jpsc.gov', 'jh'],
  ['jharkhand', 'jh'],
  ['apsc.nic', 'as'],
  ['assam', 'as'],
  ['wbpsc', 'wb'],
  ['west bengal', 'wb'],
  ['gpsc.gujarat', 'gj'],
  ['gujarat', 'gj'],
  ['kpsc.kar', 'ka'],
  ['karnataka', 'ka'],
  ['tspsc', 'tg'],
  ['telangana', 'tg'],
  ['appsc.gov', 'ap'],
  ['andhra pradesh', 'ap'],
  ['opsc.gov', 'od'],
  ['odisha', 'od'],
  ['mppsc', 'mp'],
  ['madhya pradesh', 'mp'],
  ['ppsc.gov', 'pb'],
  ['punjab', 'pb'],
  ['hpsc.gov', 'hp'],
  ['himachal', 'hp'],
  ['ukpsc', 'uk'],
  ['uttarakhand', 'uk'],
  ['uppsc', 'up'],
  ['uttar pradesh', 'up'],
  ['bpsc.bih', 'br'],
  ['bihar', 'br'],
  ['rpsc.raj', 'rj'],
  ['rajasthan', 'rj'],
  ['goa', 'ga'],
  ['mizoram', 'ne'],
  ['manipur', 'ne'],
  ['nagaland', 'ne'],
  ['meghalaya', 'ne'],
  ['tripura', 'ne'],
  ['arunachal', 'ne'],
  ['sikkim', 'sk'],
];

const VALID_STATE_IDS = new Set(STATES.map((s) => s.id));

function normalizeCodes(codes) {
  return [...new Set(codes.map((c) => String(c).toLowerCase().slice(0, 8)).filter((c) => VALID_STATE_IDS.has(c)))];
}

function fromSourceCode(source) {
  const code = String(source || '').toLowerCase();
  if (code.startsWith('psc-')) {
    const st = code.slice(4, 8);
    if (VALID_STATE_IDS.has(st)) return [st];
  }
  const m = code.match(/^([a-z]{2})-rss$/);
  if (m && VALID_STATE_IDS.has(m[1])) return [m[1]];
  return [];
}

function fromHostProbe(probe) {
  const p = String(probe || '').toLowerCase();
  if (!p) return [];
  for (const [hint, stateId] of HOST_STATE_HINTS) {
    if (p.includes(hint) && stateId) return [stateId];
  }
  for (const s of STATES) {
    if (p.includes(s.n.toLowerCase())) return [s.id];
    if (p.includes(`${s.id}psc`) || p.includes(`${s.ab.toLowerCase()}psc`)) return [s.id];
  }
  return [];
}

/** Resolve state_codes for API/JSON rows (fallback when DB field is empty). */
export function resolveStateCodes(row) {
  const explicit = normalizeCodes(row?.state_codes || []);
  if (explicit.length) return explicit;

  const source = row?.detail?.source || row?.source || '';
  const fromSource = fromSourceCode(source);
  if (fromSource.length) return fromSource;

  const probe = [
    row?.dept,
    row?.apply_url,
    row?.detail?.notification_url,
    row?.detail?.link,
    row?.title,
  ]
    .filter(Boolean)
    .join(' ');

  return fromHostProbe(probe);
}

export function resolveStateDisplay(row) {
  const codes = resolveStateCodes(row);
  if (!codes.length) {
    return { stateIds: ['all'], stateName: 'All India', isNationwide: true };
  }
  const stateIds = codes;
  const stateName =
    codes.length === 1
      ? STATES.find((s) => s.id === codes[0])?.n || codes[0]
      : codes.map((id) => STATES.find((s) => s.id === id)?.n || id).join(', ');
  return { stateIds, stateName, isNationwide: false };
}
