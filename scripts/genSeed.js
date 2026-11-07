// Dev-only: generates a year of random-but-deterministic demo data for manual testing.
let seed = 12345;
const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const pick = a => a[ri(0, a.length - 1)];
const pad = n => String(n).padStart(2, '0');
const TODAY = '2026-11-07';
const dim = (y, m) => new Date(y, m, 0).getDate();
const addDays = (d, n) => { const [y, m, dd] = d.split('-').map(Number); const t = new Date(Date.UTC(y, m - 1, dd + n)); return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`; };
const iso = d => new Date(`${d}T12:00:00`).toISOString();

const names = ['Aarav Das','Riya Sen','Ankit Roy','Sneha Ghosh','Rahul Mondal','Priya Sarkar','Subham Paul','Tanisha Bose','Arnab Dey','Ishita Pal','Soham Saha','Moumita Dutta','Debjit Nandi','Ananya Basu','Sayan Mitra','Pallavi Roy','Koushik Das','Rima Khan','Abhishek Jana','Nandini Hazra','Pritam Sinha','Shreya Pal','Rohit Biswas','Madhuri Kar','Jayanta Ghosh','Oindrila Sen','Aditya Verma','Emma Wilson','Liam Carter','Noah Smith'];
const batches = [
  { id: 'b1', name: 'Class 10 Maths', subject: 'Maths', fee: 1500, currency: 'INR' },
  { id: 'b2', name: 'Class 12 Physics', subject: 'Physics', fee: 2200, currency: 'INR' },
  { id: 'b3', name: 'Class 8 All Subjects', subject: 'General', fee: 900, currency: 'INR' },
  { id: 'b4', name: 'English Speaking', subject: 'English', fee: 1200, currency: 'INR' },
];
const profiles = ['clear','clear','clear','clear','advance','advance','oneDue','oneDue','oneDue','allDue','allDue','partial','partial','irregular','irregular','irregular','stopped','newClear','newDue','twoDue'];
const students = [], payments = [], adjustments = [];
let pid = 0;
names.forEach((name, i) => {
  const usd = false; const eng = i >= 27;
  const b = eng ? batches[3] : batches[i % 3];
  const profile = i === 0 ? 'clear' : i === 1 ? 'allDue' : pick(profiles);
  const monthsAgo = profile.startsWith('new') ? ri(0, 2) : ri(3, 12);
  const jd = new Date(2026, 10 - monthsAgo, ri(1, 28));
  const joinDate = `${jd.getFullYear()}-${pad(jd.getMonth() + 1)}-${pad(jd.getDate())}`;
  const billing = pick(['cycle','cycle','cycle','prorate','full']);
  const fee = eng ? b.fee : b.fee + pick([0, 0, 100, -100]);
  const feeChanges = (!eng && monthsAgo > 6 && rnd() < 0.5) ? [{ month: '2026-06', amount: fee + 200 }] : [];
  let endDate = null;
  if (profile === 'stopped') { endDate = '2026-09-' + pad(ri(5, 25)); }
  const s = { id: 's' + (i + 1), name, phone: '98' + String(ri(10000000, 99999999)), guardian: 'Guardian of ' + name.split(' ')[0], batchId: b.id, fee, feeChanges, currency: 'INR', joinDate, endDate, billing };
  students.push(s);
  // billing periods approximated: month starts on join day (cycle) or the 1st otherwise
  const periods = [];
  let y = jd.getFullYear(), m = jd.getMonth() + 1;
  for (let k = 0; k < 14; k++) {
    const day = billing === 'cycle' ? Math.min(jd.getDate(), dim(y, m)) : (k === 0 && billing === 'full' ? 1 : 1);
    const start = `${y}-${pad(m)}-${pad(day)}`;
    if (billing !== 'cycle' && k === 0) { /* first calendar month */ }
    if (start > TODAY) break;
    if (endDate && start > endDate) break;
    periods.push(start);
    m++; if (m > 12) { m = 1; y++; }
  }
  const feeAt = start => (feeChanges.length && start.slice(0, 7) >= '2026-06') ? feeChanges[0].amount : fee;
  const pay = (day, amount, forMonth = null) => { if (day > TODAY) day = TODAY; payments.push({ id: 'p' + (++pid), studentId: s.id, amount, date: iso(day), forMonth, note: pick(['', '', 'Cash', 'UPI', 'GPay']) }); };
  periods.forEach((start, k) => {
    const last = k === periods.length - 1, secondLast = k === periods.length - 2;
    const f = feeAt(start);
    const when = addDays(start, ri(0, 9));
    switch (profile) {
      case 'clear': case 'newClear': pay(when, f); break;
      case 'advance': pay(when, f); break;
      case 'oneDue': if (!last) pay(when, f); break;
      case 'twoDue': if (!last && !secondLast) pay(when, f); break;
      case 'allDue': case 'newDue': break;
      case 'partial': if (last) pay(when, Math.round(f / 2)); else pay(when, f); break;
      case 'irregular': if (rnd() < 0.7) pay(when, f); else if (rnd() < 0.5) pay(addDays(when, 25), f * 2); break;
      case 'stopped': pay(when, f); break;
    }
  });
  if (profile === 'advance') pay(addDays(TODAY, -3), feeAt(TODAY) * ri(1, 3));
  if (rnd() < 0.15 && periods.length > 2) adjustments.push({ id: 'a' + (adjustments.length + 1), studentId: s.id, month: periods[1].slice(0, 7), amount: -Math.round(fee * 0.2), note: 'Sibling discount' });
  if (rnd() < 0.1 && periods.length > 3) adjustments.push({ id: 'a' + (adjustments.length + 1), studentId: s.id, month: periods[2].slice(0, 7), amount: 100, note: 'Late fine' });
  s.__profile = profile;
});
console.error(students.map(s => `${s.name}: ${s.__profile} ${s.billing} join ${s.joinDate}`).join('\n'));
students.forEach(s => delete s.__profile);
const out = { batches, students, payments, adjustments, settings: { lang: 'en', teacherName: 'Arpan Halder', defaultCurrency: 'INR', graceDays: 7, phoneCode: '91', paymentNote: 'UPI: arpan@upi' }, version: 3 };
process.stdout.write(JSON.stringify(out));
