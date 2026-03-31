# ATLAS Refactor Stage 5 Report (2026-03-31)

## Scope executed

- **Route-level code splitting:** `React.lazy` + `Suspense` สำหรับทุกหน้าที่ไม่ใช่ entry เบา (`Index`, `Login`, `NotFound`)
- **Vendor chunking:** `build.rollupOptions.output.manualChunks` ใน `vite.config.ts` แยก dependency หนัก (recharts, xlsx, docx, markdown stack, supabase, react-query, router, icons, react core)
- **Bundle analysis:** `rollup-plugin-visualizer` + สคริปต์ `npm run build:analyze` → สร้าง `dist/stats.html` (โฟลเดอร์ `dist` อยู่ใน `.gitignore`)
- **UX ขณะโหลด chunk:** คอมโพเนนต์ `RouteFallback` (สปินเนอร์ + ข้อความสั้น + `aria-*`)

## Files touched

- `src/App.tsx` — lazy imports, `Suspense` ครอบ `Routes`
- `src/components/RouteFallback.tsx` — fallback ใหม่
- `vite.config.ts` — `manualChunks`, `chunkSizeWarningLimit: 600`, plugin visualizer เมื่อ `ANALYZE=true`
- `package.json` — `rollup-plugin-visualizer`, สคริปต์ `build:analyze`

## Build outcome (สรุป)

- หลังแยก chunk ไฟล์ entry หลัก (~`index-*.js`) ลดลงมากเมื่อเทียบกับ bundle เดียวก้อนใหญ่ก่อน Stage 5; dependency หนักถูกแยกเป็น `vendor-*` และโหลดตาม route
- คำเตือน chunk >500kB จาก `recharts` / `xlsx` / `docx` ยังมีอยู่แต่แยกออกจาก main chunk แล้ว

## วิธีใช้ bundle report

```bash
npm run build:analyze
# เปิด dist/stats.html ในเบราว์เซอร์ (หลัง build)
```

## Verification

- `npm run build`: ผ่าน
- `npm run lint`: ยังเหลือ error เดิมใน `supabase/functions/atlas-diagnostic/index.ts` (ไม่ใช่ regression จาก Stage 5)

## Release hardening (แนะนำ)

- ก่อน deploy production ใช้ `docs/REFRACTOR-CHECKLISTS.md` (Pre-Deploy / Post-Deploy)
- ตรวจ env (`VITE_SUPABASE_URL`, anon key, JWT) และ Edge functions ที่เกี่ยวข้องกับ flow ที่เปลี่ยน
- หลัง deploy สลับ route หลัก (login → log / executive → consultant) เพื่อยืนยัน lazy load ไม่พัง

## Stage 5 outcome

- **Initial JS ลดลง** โดยไม่โหลดทุกหน้าในครั้งแรก
- **มีเครื่องมือวิเคราะห์ bundle** สำหรับงานต่อยอด (ตัด dependency / dynamic import ลึกขึ้น)
