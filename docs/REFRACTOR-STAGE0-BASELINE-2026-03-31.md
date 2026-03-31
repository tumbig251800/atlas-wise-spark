# ATLAS Refactor Stage 0 Baseline (2026-03-31)

เอกสารนี้เก็บ baseline ก่อนเริ่ม refactor ตามแผน Staged, Low-Risk เพื่อใช้เทียบผลใน Gate A/B/C/D

## 1) Command baseline

- `npm run lint` -> **fail** (`49 errors`, `12 warnings`, รวม `61 problems`)
- `npm run build` -> **pass**
- `npm run test:regression-lesson-plan` -> **fail** (network fetch failed + ไม่มี `ATLAS_LESSON_PLAN_TEST_JWT`)
- `npm run test:regression-ai-chat` -> **fail** (ขาด env: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `ATLAS_TEST_EMAIL`, `ATLAS_TEST_PASSWORD`)
- `npm audit --json` -> **พบช่องโหว่ 21 รายการ** (`high: 11`, `moderate: 7`, `low: 3`, `critical: 0`)

## 2) Quality snapshot

- Lint errors กลุ่มใหญ่:
  - `@typescript-eslint/no-explicit-any`
  - `no-empty`
  - `@typescript-eslint/no-empty-object-type`
  - `no-useless-escape`
  - `@typescript-eslint/no-require-imports`
- Fast refresh / hooks warnings ยังมีหลายจุด (`react-refresh/only-export-components`, `react-hooks/exhaustive-deps`)

## 3) Type-risk snapshot (`any`)

- `src/*` พบ `any` รวมประมาณ **25 จุด**
- `supabase/functions/*` พบ `any` รวมประมาณ **10 จุด**
- จุดเสี่ยงสูงตาม lint output:
  - `src/pages/Consultant.tsx`
  - `src/pages/TeachingLog.tsx`
  - `src/pages/UploadCSV.tsx`
  - `src/lib/edgeFunctionFetch.ts`
  - `supabase/functions/atlas-diagnostic/index.ts`

## 4) Empty-catch snapshot

- ใน `src/*` พบ empty catch/empty block ที่กระทบ flow หลักอย่างน้อย **9 จุด**
- จุดควรแก้ก่อนใน Stage 1:
  - `src/lib/edgeFunctionFetch.ts`
  - `src/components/chat/ChatSidebar.tsx`
  - `src/pages/Login.tsx`
  - `src/pages/TeachingLog.tsx`

## 5) Build and bundle snapshot

- build เวลา: ~4 วินาที
- artifact:
  - `dist/assets/index-Bbnsx-Y4.css` = `74.17 kB` (gzip `12.95 kB`)
  - `dist/assets/index-D2AAC_GJ.js` = `2,255.38 kB` (gzip `667.64 kB`)
- หมายเหตุ: Vite เตือน chunk ใหญ่กว่า 500kB (ต้องแก้ใน Stage 5)

## 6) Security snapshot (selected high-impact items)

- `react-router-dom` / `react-router` / `@remix-run/router` (open redirect/XSS advisory)
- `vite` + `esbuild` advisories
- `rollup` advisory
- `supabase` CLI package path (`tar`)
- `xlsx` high severity advisories (currently `fixAvailable: false`)

## 7) Environment constraints observed

- regression scripts ต้องใช้ env/jwt จริงเพื่อวัด pass/fail ที่มีความหมาย
- lesson-plan health/regression พึ่งพา network/endpoint ที่เข้าถึงได้จากเครื่องรัน

## 8) Stage 0 outcome

- Baseline พร้อมใช้เทียบผลใน Stage 1
- พร้อมเริ่ม Stage 1 (Code Quality Foundation) โดยจัดลำดับ:
  1. `no-empty` ใน flow สำคัญ
  2. `no-explicit-any` จุดเสี่ยงสูง
  3. lint cleanup กลุ่ม quick wins
  4. dependency vulnerability remediation ที่ไม่กระทบพฤติกรรมแอป
