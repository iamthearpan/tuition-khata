# Tuition Khata (টিউশন খাতা)
Offline fee & dues tracker for private tutors (West Bengal / India first; INR + multi-currency).
React Native CLI 0.88 · TypeScript · on-device SQLite (`@op-engineering/op-sqlite`).

```bash
npm install
npm start            # Metro
npm run android      # run on emulator/device
npm test             # logic tests (ledger, currency)
```
Structure: `src/db.ts` (SQLite schema & queries) · `src/store.tsx` (state + write-through persistence) · `src/calc.ts` (FIFO month ledger) · `src/screens/*`.
Publishing: see `PLAY_STORE_GUIDE.md`. Website & policies: `docs/`.
