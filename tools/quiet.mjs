// Waits for the owner to stop saving before the copy is taken, so a run of quick
// edits turns into a single rebuild instead of one per save. Every save changes the
// fingerprint the live site reports; a steady fingerprint means the studio is idle.
const SITE = process.env.SITE_URL || 'https://shazmi-naushad-portfolio-s3pdo9.freebuff.page';
const QUIET_MS = 20000;
const CAP_MS = 150000;
const POLL_MS = 5000;

const fingerprint = async () => {
  const res = await fetch(`${SITE}/api/live-version?x=${Date.now()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`fingerprint failed: ${res.status}`);
  return (await res.json()).v;
};

const started = Date.now();
let last = null;
let quietSince = Date.now();

while (Date.now() - started < CAP_MS) {
  try {
    const v = await fingerprint();
    if (v !== last) {
      last = v;
      quietSince = Date.now();
      console.log('the studio changed, waiting for it to settle');
    } else if (Date.now() - quietSince >= QUIET_MS) {
      console.log(`studio quiet for ${QUIET_MS / 1000}s — copying now`);
      process.exit(0);
    }
  } catch (err) {
    console.log(err.message);
  }
  await new Promise((r) => setTimeout(r, POLL_MS));
}
console.log('still changing after the wait cap — copying what is there now');
