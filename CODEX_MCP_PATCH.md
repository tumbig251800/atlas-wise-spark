# ATLAS MCP v2.2.0 — Patch Guide for Local Server

**Target**: `/Users/tum_macmini/atlas-mcp/index.js`  
**Goal**: เพิ่ม 6 PLC tools ใหม่เข้า local MCP (9 → 14 tools)

---

## 📋 Database Tables ที่ใช้

PLC tools ต้องอ่านจาก 3 tables:

### 1. `plc_sessions`
```
Columns ที่ใช้:
- id (uuid)
- session_date (date)
- topic (text)
- plc_type (text: 'subject' | 'grade_band' | 'cross')
- grade_band (text: 'ป.1-3' | 'ป.4-6' | 'ทั้งโรงเรียน')
- subject (text)
- facilitator_name (text)
- members (jsonb: [{teacher_id, teacher_name}])
- outcome_type (text: 'resolved' | 'need_supervision' | 'continue_plc')
- linked_action_item_ids (int[])
- next_plc_date (date)
- problem_statement (text)
- approach (text)
```

### 2. `action_plan_items`
```
Columns ที่ใช้:
- id (int)
- teacher_id (uuid)
- teacher_name (text)
- subject (text)
- grade_level (text)
- classroom (text)
- severity (text: 'critical' | 'high' | 'medium')
- status (text: 'open' | 'watching' | 'resolved' | 'verified' | 'dismissed')
- issue_type (text)
- detail (text)
- created_at (timestamp)
```

### 3. `profiles`
```
Columns ที่ใช้:
- user_id (uuid)
- full_name (text)
```

---

## 🔧 Part 1: Tool Definitions (เพิ่มใน TOOLS array)

```javascript
// เพิ่มที่ท้าย TOOLS array (หลัง atlas_action_items)

{
  name: "atlas_plc_sessions",
  description: "แสดง PLC sessions ที่บันทึกไว้ พร้อม outcome และ link กับ action items",
  inputSchema: {
    type: "object",
    properties: {
      date_from: { type: "string", description: "วันที่เริ่ม YYYY-MM-DD" },
      date_to: { type: "string", description: "วันที่สิ้นสุด YYYY-MM-DD" },
      outcome_type: { type: "string", description: "filter ตามผล: resolved | need_supervision | continue_plc" }
    },
    required: []
  }
},
{
  name: "atlas_plc_effectiveness",
  description: "วิเคราะห์ประสิทธิผลของ PLC sessions - resolution rate, outcome distribution, before/after mastery comparison",
  inputSchema: {
    type: "object",
    properties: {
      date_from: { type: "string", description: "วันที่เริ่ม YYYY-MM-DD" },
      date_to: { type: "string", description: "วันที่สิ้นสุด YYYY-MM-DD" },
      plc_type: { type: "string", description: "filter ตามประเภท: subject | grade_band | all" },
      teacher_id: { type: "string", description: "UUID ครู (optional)" }
    },
    required: []
  }
},
{
  name: "atlas_plc_coverage_gap",
  description: "หา action items ที่ยังไม่มี PLC ครอบคลุม แต่ยังค้างอยู่ (status = open/watching)",
  inputSchema: {
    type: "object",
    properties: {
      severity_filter: { type: "string", description: "filter ตาม severity: critical | high | medium | all (default: all)" }
    },
    required: []
  }
},
{
  name: "atlas_plc_timeline",
  description: "แสดง timeline ของ PLC sessions ที่เชื่อมต่อกัน (continue_plc chains) และระยะเวลาในการแก้ปัญหา",
  inputSchema: {
    type: "object",
    properties: {
      date_from: { type: "string", description: "วันที่เริ่ม YYYY-MM-DD" },
      date_to: { type: "string", description: "วันที่สิ้นสุด YYYY-MM-DD" }
    },
    required: []
  }
},
{
  name: "atlas_cross_plc_opportunities",
  description: "หาโอกาสในการจัด cross-PLC - ปัญหาที่ซ้ำกันข้ามวิชา/ช่วงชั้น หรือครูคนเดียวมีหลายปัญหา",
  inputSchema: {
    type: "object",
    properties: {
      min_overlap: { type: "number", description: "จำนวน items ที่ซ้ำกันขั้นต่ำ (default: 2)" }
    },
    required: []
  }
},
{
  name: "atlas_plc_recommendations",
  description: "แนะนำแผน PLC จาก open items (lightweight version ของ AI Planner สำหรับ MCP/n8n)",
  inputSchema: {
    type: "object",
    properties: {
      max_plans: { type: "number", description: "จำนวนแผนสูงสุด (default: 3)" },
      prefer_type: { type: "string", description: "ประเภทที่ต้องการ: subject | grade_band | cross (optional)" },
      min_coverage_percent: { type: "number", description: "% coverage ขั้นต่ำ (default: 30)" }
    },
    required: []
  }
}
```

---

## 🔧 Part 2: Helper Functions (ไม่มี — logic อยู่ใน case handlers)

PLC tools ไม่ต้องการ helper functions เพิ่มเติม  
ใช้ Supabase query builder และ JavaScript built-ins เท่านั้น

---

## 🔧 Part 3: Case Handlers (เพิ่มใน switch statement)

**หมายเหตุสำคัญ**:
- Edge Function ใช้ TypeScript + Deno
- Local MCP ใช้ JavaScript + Node
- ปรับ `supabase` instance ที่มีอยู่แล้วใน local
- ไม่ต้องปรับ return format (MCP stdio จัดการเอง)

### Case 1: atlas_plc_sessions

```javascript
case "atlas_plc_sessions": {
  let query = supabase
    .from("plc_sessions")
    .select("id, session_date, topic, plc_type, grade_band, subject, facilitator_name, members, outcome_type, linked_action_item_ids, next_plc_date, problem_statement, approach");
  
  if (args.date_from) query = query.gte("session_date", args.date_from);
  if (args.date_to) query = query.lte("session_date", args.date_to);
  if (args.outcome_type) query = query.eq("outcome_type", args.outcome_type);
  
  const { data, error } = await query.order("session_date", { ascending: false });
  if (error) throw error;
  
  const summary = {
    total_sessions: data.length,
    outcomes: data.reduce((acc, s) => {
      acc[s.outcome_type] = (acc[s.outcome_type] || 0) + 1;
      return acc;
    }, {}),
    sessions: data.map(s => ({
      session_date: s.session_date,
      topic: s.topic,
      plc_type: s.plc_type,
      grade_band: s.grade_band,
      subject: s.subject,
      facilitator: s.facilitator_name,
      member_count: Array.isArray(s.members) ? s.members.length : 0,
      outcome: s.outcome_type,
      covered_items: Array.isArray(s.linked_action_item_ids) ? s.linked_action_item_ids.length : 0,
      next_plc_date: s.next_plc_date
    }))
  };
  
  return JSON.stringify(summary, null, 2);
}
```

### Case 2: atlas_plc_effectiveness

```javascript
case "atlas_plc_effectiveness": {
  let plcQuery = supabase.from("plc_sessions").select("*");
  if (args.date_from) plcQuery = plcQuery.gte("session_date", args.date_from);
  if (args.date_to) plcQuery = plcQuery.lte("session_date", args.date_to);
  if (args.plc_type && args.plc_type !== "all") plcQuery = plcQuery.eq("plc_type", args.plc_type);
  
  const { data: sessions, error: plcError } = await plcQuery;
  if (plcError) throw plcError;

  if (!sessions || sessions.length === 0) {
    return JSON.stringify({ message: "ไม่มี PLC sessions ในช่วงเวลาที่กำหนด" }, null, 2);
  }

  const allLinkedItemIds = new Set();
  for (const s of sessions) {
    if (Array.isArray(s.linked_action_item_ids)) {
      for (const id of s.linked_action_item_ids) allLinkedItemIds.add(id);
    }
  }

  let actionItemsQuery = supabase.from("action_plan_items").select("*");
  if (allLinkedItemIds.size > 0) {
    actionItemsQuery = actionItemsQuery.in("id", Array.from(allLinkedItemIds));
  }
  if (args.teacher_id) actionItemsQuery = actionItemsQuery.eq("teacher_id", args.teacher_id);
  
  const { data: actionItems } = await actionItemsQuery;

  const itemMap = new Map((actionItems || []).map(i => [i.id, i]));
  const resolvedCount = (actionItems || []).filter(i => i.status === "resolved" || i.status === "verified").length;
  const totalItems = allLinkedItemIds.size;

  const outcomeDistribution = sessions.reduce((acc, s) => {
    acc[s.outcome_type] = (acc[s.outcome_type] || 0) + 1;
    return acc;
  }, {});

  const avgDaysToResolve = (() => {
    const resolved = sessions.filter(s => s.outcome_type === "resolved");
    if (resolved.length === 0) return null;
    let totalDays = 0;
    let count = 0;
    for (const s of resolved) {
      for (const itemId of s.linked_action_item_ids || []) {
        const item = itemMap.get(itemId);
        if (item && item.created_at) {
          const created = new Date(item.created_at);
          const sessionDate = new Date(s.session_date);
          const days = Math.round((sessionDate.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
          if (days >= 0) {
            totalDays += days;
            count++;
          }
        }
      }
    }
    return count > 0 ? Math.round(totalDays / count) : null;
  })();

  const result = {
    total_sessions: sessions.length,
    total_items_covered: totalItems,
    items_resolved: resolvedCount,
    resolution_rate_percent: totalItems > 0 ? Math.round((resolvedCount / totalItems) * 100) : 0,
    outcome_distribution: outcomeDistribution,
    avg_days_to_resolve: avgDaysToResolve,
    sessions_by_type: sessions.reduce((acc, s) => {
      acc[s.plc_type] = (acc[s.plc_type] || 0) + 1;
      return acc;
    }, {})
  };
  
  return JSON.stringify(result, null, 2);
}
```

### Case 3: atlas_plc_coverage_gap

```javascript
case "atlas_plc_coverage_gap": {
  const { data: openItems, error: itemsError } = await supabase
    .from("action_plan_items")
    .select("*")
    .in("status", ["open", "watching"]);
  if (itemsError) throw itemsError;

  const { data: plcSessions } = await supabase.from("plc_sessions").select("linked_action_item_ids");
  const coveredIds = new Set();
  for (const p of plcSessions || []) {
    for (const id of p.linked_action_item_ids || []) coveredIds.add(id);
  }

  let uncovered = (openItems || []).filter(i => !coveredIds.has(i.id));
  if (args.severity_filter && args.severity_filter !== "all") {
    uncovered = uncovered.filter(i => i.severity === args.severity_filter);
  }

  const totalOpen = (openItems || []).length;
  const uncoveredCount = uncovered.length;

  const result = {
    total_open_items: totalOpen,
    items_covered_by_plc: totalOpen - uncoveredCount,
    items_without_plc: uncoveredCount,
    coverage_percent: totalOpen > 0 ? Math.round(((totalOpen - uncoveredCount) / totalOpen) * 100) : 0,
    uncovered_items: uncovered.map(i => ({
      id: i.id,
      teacher_name: i.teacher_name,
      subject: i.subject,
      grade_level: i.grade_level,
      classroom: i.classroom,
      severity: i.severity,
      issue_type: i.issue_type,
      days_open: Math.round((Date.now() - new Date(i.created_at).getTime()) / (1000 * 60 * 60 * 24))
    })).sort((a, b) => b.days_open - a.days_open)
  };
  
  return JSON.stringify(result, null, 2);
}
```

### Case 4: atlas_plc_timeline

```javascript
case "atlas_plc_timeline": {
  let query = supabase.from("plc_sessions").select("*");
  if (args.date_from) query = query.gte("session_date", args.date_from);
  if (args.date_to) query = query.lte("session_date", args.date_to);
  
  const { data: sessions, error } = await query.order("session_date", { ascending: true });
  if (error) throw error;

  const chains = [];
  const processed = new Set();

  for (const s of sessions || []) {
    if (processed.has(s.id)) continue;

    const chain = [s];
    processed.add(s.id);

    let nextDate = s.next_plc_date;
    while (nextDate) {
      const nextSession = sessions.find(x => !processed.has(x.id) && x.session_date === nextDate && x.topic === s.topic);
      if (!nextSession) break;
      chain.push(nextSession);
      processed.add(nextSession.id);
      nextDate = nextSession.next_plc_date;
    }

    if (chain.length > 1 || s.outcome_type !== "continue_plc") {
      const firstDate = new Date(chain[0].session_date);
      const lastDate = new Date(chain[chain.length - 1].session_date);
      const daysToResolve = chain[chain.length - 1].outcome_type === "resolved" 
        ? Math.round((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)) 
        : null;

      chains.push({
        initial_session_date: chain[0].session_date,
        topic: s.topic,
        plc_type: s.plc_type,
        facilitator: s.facilitator_name,
        chain: chain.map(c => ({
          session_date: c.session_date,
          outcome: c.outcome_type,
          next_plc_date: c.next_plc_date,
          covered_items: Array.isArray(c.linked_action_item_ids) ? c.linked_action_item_ids.length : 0
        })),
        total_sessions: chain.length,
        days_to_resolve: daysToResolve,
        final_outcome: chain[chain.length - 1].outcome_type
      });
    }
  }

  const result = {
    total_chains: chains.length,
    plc_chains: chains.sort((a, b) => b.total_sessions - a.total_sessions)
  };
  
  return JSON.stringify(result, null, 2);
}
```

### Case 5: atlas_cross_plc_opportunities

```javascript
case "atlas_cross_plc_opportunities": {
  const minOverlap = args.min_overlap || 2;
  
  const { data: openItems, error: itemsError } = await supabase
    .from("action_plan_items")
    .select("*")
    .in("status", ["open", "watching"]);
  if (itemsError) throw itemsError;

  const items = openItems || [];

  // Group by issue detail
  const keyIssueMap = {};
  for (const item of items) {
    const key = (item.detail || "").trim().toLowerCase();
    if (key && key.length > 10) {
      if (!keyIssueMap[key]) keyIssueMap[key] = [];
      keyIssueMap[key].push(item);
    }
  }

  const crossSubjectOpportunities = Object.entries(keyIssueMap)
    .filter(([, items]) => items.length >= minOverlap)
    .map(([issue, items]) => {
      const subjects = new Set(items.map(i => i.subject).filter(Boolean));
      const grades = new Set(items.map(i => i.grade_level).filter(Boolean));
      const teachers = new Set(items.map(i => i.teacher_name).filter(Boolean));
      return {
        issue_summary: issue.slice(0, 100),
        item_count: items.length,
        subjects: Array.from(subjects),
        grade_levels: Array.from(grades),
        teachers: Array.from(teachers),
        is_cross_subject: subjects.size > 1,
        is_cross_grade: grades.size > 1,
        item_ids: items.map(i => i.id)
      };
    })
    .filter(opp => opp.is_cross_subject || opp.is_cross_grade)
    .sort((a, b) => b.item_count - a.item_count);

  // Group by teacher
  const teacherItemMap = {};
  for (const item of items) {
    if (item.teacher_name) {
      if (!teacherItemMap[item.teacher_name]) teacherItemMap[item.teacher_name] = [];
      teacherItemMap[item.teacher_name].push(item);
    }
  }

  const teacherOpportunities = Object.entries(teacherItemMap)
    .filter(([, items]) => items.length >= minOverlap)
    .map(([teacher, items]) => {
      const subjects = new Set(items.map(i => i.subject).filter(Boolean));
      return {
        teacher_name: teacher,
        item_count: items.length,
        subjects: Array.from(subjects),
        is_multi_subject: subjects.size > 1,
        item_ids: items.map(i => i.id)
      };
    })
    .filter(opp => opp.is_multi_subject)
    .sort((a, b) => b.item_count - a.item_count);

  const result = {
    cross_subject_opportunities: crossSubjectOpportunities,
    teacher_multi_subject_opportunities: teacherOpportunities,
    summary: {
      total_cross_opportunities: crossSubjectOpportunities.length,
      total_teacher_opportunities: teacherOpportunities.length
    }
  };
  
  return JSON.stringify(result, null, 2);
}
```

### Case 6: atlas_plc_recommendations

```javascript
case "atlas_plc_recommendations": {
  const maxPlans = args.max_plans || 3;
  const minCoverage = args.min_coverage_percent || 30;

  const { data: openItems, error: itemsError } = await supabase
    .from("action_plan_items")
    .select("*")
    .in("status", ["open", "watching"]);
  if (itemsError) throw itemsError;

  if (!openItems || openItems.length === 0) {
    return JSON.stringify({ plans: [], message: "ไม่มี open items ในระบบ" }, null, 2);
  }

  const { data: profiles } = await supabase.from("profiles").select("user_id, full_name");
  const teacherMap = new Map((profiles || []).map(p => [p.user_id, p.full_name]));

  const plans = [];

  // Subject-based plans
  if (!args.prefer_type || args.prefer_type === "subject") {
    const subjectMap = {};
    for (const item of openItems) {
      if (item.subject) {
        if (!subjectMap[item.subject]) subjectMap[item.subject] = [];
        subjectMap[item.subject].push(item);
      }
    }
    for (const [subject, items] of Object.entries(subjectMap)) {
      const coverage = (items.length / openItems.length) * 100;
      if (coverage >= minCoverage) {
        const teachers = new Set(items.map(i => i.teacher_id).filter(Boolean));
        plans.push({
          plan_name: `PLC วิชา${subject}`,
          topic: `แก้ปัญหาการสอนวิชา${subject}`,
          plc_type: "subject",
          subject,
          covered_item_ids: items.map(i => i.id),
          coverage_percent: Math.round(coverage),
          members: Array.from(teachers).map(tid => ({ 
            teacher_id: tid, 
            teacher_name: teacherMap.get(tid) || "ไม่ระบุ" 
          })),
          rationale: `รวมปัญหาวิชา${subject} จำนวน ${items.length} รายการ`,
          problem_statement: `นักเรียนมีปัญหาในวิชา${subject}`,
          root_cause: "ต้องวิเคราะห์เพิ่มเติมใน PLC",
          approach: "ครูร่วมกันหาวิธีสอนที่เหมาะสม"
        });
      }
    }
  }

  // Grade band plans
  if (!args.prefer_type || args.prefer_type === "grade_band") {
    const gradeBandMap = { "ป.1-3": [], "ป.4-6": [] };
    for (const item of openItems) {
      const gl = item.grade_level || "";
      if (gl.match(/ป\.[1-3]/)) gradeBandMap["ป.1-3"].push(item);
      else if (gl.match(/ป\.[4-6]/)) gradeBandMap["ป.4-6"].push(item);
    }
    for (const [band, items] of Object.entries(gradeBandMap)) {
      if (items.length === 0) continue;
      const coverage = (items.length / openItems.length) * 100;
      if (coverage >= minCoverage) {
        const teachers = new Set(items.map(i => i.teacher_id).filter(Boolean));
        plans.push({
          plan_name: `PLC ช่วงชั้น${band}`,
          topic: `แก้ปัญหาช่วงชั้น${band}`,
          plc_type: "grade_band",
          grade_band: band,
          covered_item_ids: items.map(i => i.id),
          coverage_percent: Math.round(coverage),
          members: Array.from(teachers).map(tid => ({ 
            teacher_id: tid, 
            teacher_name: teacherMap.get(tid) || "ไม่ระบุ" 
          })),
          rationale: `รวมปัญหาช่วงชั้น${band} จำนวน ${items.length} รายการ`,
          problem_statement: `นักเรียนช่วงชั้น${band} มีปัญหาหลายด้าน`,
          root_cause: "ต้องวิเคราะห์เพิ่มเติมใน PLC",
          approach: "ครูช่วงชั้นร่วมกันแก้ปัญหา"
        });
      }
    }
  }

  // Cross-school plan
  if (!args.prefer_type || args.prefer_type === "cross") {
    const teachers = new Set(openItems.map(i => i.teacher_id).filter(Boolean));
    plans.push({
      plan_name: "PLC ทั้งโรงเรียน",
      topic: "แก้ปัญหาทั่วทั้งโรงเรียน",
      plc_type: "cross",
      grade_band: "ทั้งโรงเรียน",
      covered_item_ids: openItems.map(i => i.id),
      coverage_percent: 100,
      members: Array.from(teachers).map(tid => ({ 
        teacher_id: tid, 
        teacher_name: teacherMap.get(tid) || "ไม่ระบุ" 
      })),
      rationale: `ครอบคลุมทุกปัญหา ${openItems.length} รายการ`,
      problem_statement: "ปัญหาหลากหลายข้ามวิชาและช่วงชั้น",
      root_cause: "ต้องวิเคราะห์เพิ่มเติมใน PLC",
      approach: "ครูทุกคนร่วมกันหาแนวทาง"
    });
  }

  const finalPlans = plans.sort((a, b) => b.coverage_percent - a.coverage_percent).slice(0, maxPlans);
  return JSON.stringify({ plans: finalPlans, total_plans: finalPlans.length }, null, 2);
}
```

---

## 🚨 สิ่งที่ Codex ต้องปรับ

### 1. Return Format
Edge Function return:
```javascript
return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
```

Local MCP return (stdio):
```javascript
return JSON.stringify(result, null, 2);
```

### 2. TypeScript vs JavaScript
- เอา type annotations ออก (`: any`, `: string`, etc.)
- เปลี่ยน `Set<number>` → `Set()`
- เปลี่ยน `Map<>` → `Map()`
- เปลี่ยน `Record<string, any>` → `{}`

### 3. ไม่ต้องเอามา
- `CORS_HEADERS`
- `Deno.serve()`
- HTTP request handling
- JSON-RPC protocol handling

### 4. ตรวจสอบ Supabase Instance
Local file น่าจะมี `supabase` instance อยู่แล้ว  
ถ้าไม่มี ต้องสร้าง:
```javascript
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

---

## ✅ Testing After Patch

หลัง patch แล้ว ทดสอบว่า tools ทำงาน:

```bash
# List tools (ต้องเห็น 14 tools)
echo '{"method":"tools/list"}' | node /Users/tum_macmini/atlas-mcp/index.js

# Test PLC effectiveness
echo '{"method":"tools/call","params":{"name":"atlas_plc_effectiveness","arguments":{"date_from":"2026-05-01","date_to":"2026-06-02"}}}' | node /Users/tum_macmini/atlas-mcp/index.js
```

Expected: JSON output ไม่มี error

---

## 📦 Summary

- **เพิ่ม**: 6 tool definitions
- **เพิ่ม**: 6 case handlers
- **Helper functions**: ไม่มี (ใช้ built-in)
- **Database tables**: 3 tables (plc_sessions, action_plan_items, profiles)
- **ต้องปรับ**: return format, type annotations, เอา HTTP/CORS ออก
- **Expected result**: 9 tools → 14 tools

---

**ส่งต่อไฟล์นี้ให้ Codex แล้วบอกว่า**:
> "Patch local MCP `/Users/tum_macmini/atlas-mcp/index.js` ตามคำแนะนำในไฟล์ `CODEX_MCP_PATCH.md` เพื่อเพิ่ม 6 PLC tools ใหม่"
