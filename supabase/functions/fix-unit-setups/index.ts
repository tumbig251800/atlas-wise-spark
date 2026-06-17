import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

Deno.serve(async (req) => {
  try {
    // ใช้ service role key เพื่อ bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    console.log('Starting to create missing unit_assessment_setups...')

    // SQL to create missing setups
    const { data, error } = await supabaseAdmin.rpc('exec_raw_sql', {
      sql: `
        INSERT INTO unit_assessment_setups (
          teacher_id,
          subject,
          grade_level,
          classroom,
          academic_term,
          unit_name,
          unit_display_name,
          k_total,
          p_total,
          a_total,
          assessed_date
        )
        SELECT DISTINCT ON (teacher_id, subject, grade_level, classroom, academic_term, unit_name)
          teacher_id,
          subject,
          grade_level,
          classroom,
          academic_term,
          unit_name,
          'หน่วยที่ ' || unit_name as unit_display_name,
          COALESCE(k_total, 0),
          COALESCE(p_total, 0),
          COALESCE(a_total, 0),
          assessed_date
        FROM unit_assessments
        WHERE NOT EXISTS (
          SELECT 1 FROM unit_assessment_setups s
          WHERE s.teacher_id = unit_assessments.teacher_id
            AND s.subject = unit_assessments.subject
            AND s.grade_level = unit_assessments.grade_level
            AND s.classroom = unit_assessments.classroom
            AND s.academic_term = unit_assessments.academic_term
            AND s.unit_name = unit_assessments.unit_name
        )
        ORDER BY teacher_id, subject, grade_level, classroom, academic_term, unit_name, created_at
        RETURNING *;
      `
    })

    if (error) {
      // ถ้าไม่มี RPC function ให้ใช้วิธีแทรกทีละรายการ
      console.log('RPC not available, using direct insert method...')

      // ดึงข้อมูลที่ต้องสร้าง
      const { data: assessments, error: fetchError } = await supabaseAdmin
        .from('unit_assessments')
        .select('teacher_id, subject, grade_level, classroom, academic_term, unit_name, k_total, p_total, a_total, assessed_date')

      if (fetchError) throw fetchError

      // Group by unique combinations
      const uniqueUnits = new Map()

      for (const a of assessments) {
        const key = `${a.teacher_id}|${a.subject}|${a.grade_level}|${a.classroom}|${a.academic_term}|${a.unit_name}`
        if (!uniqueUnits.has(key)) {
          uniqueUnits.set(key, {
            teacher_id: a.teacher_id,
            subject: a.subject,
            grade_level: a.grade_level,
            classroom: a.classroom,
            academic_term: a.academic_term,
            unit_name: a.unit_name,
            unit_display_name: `หน่วยที่ ${a.unit_name}`,
            k_total: a.k_total || 0,
            p_total: a.p_total || 0,
            a_total: a.a_total || 0,
            assessed_date: a.assessed_date,
          })
        }
      }

      console.log(`Found ${uniqueUnits.size} unique units to create`)

      // ตรวจสอบว่า setup ไหนมีอยู่แล้ว (ใช้ service role ดังนั้นเห็นทุกอัน)
      const { data: existingSetups, error: existError } = await supabaseAdmin
        .from('unit_assessment_setups')
        .select('teacher_id, subject, grade_level, classroom, academic_term, unit_name')

      console.log('Existing setups count:', existingSetups?.length || 0)
      if (existError) {
        console.error('Error fetching existing setups:', existError)
      }

      const existingKeys = new Set(
        (existingSetups || []).map(s =>
          `${s.teacher_id}|${s.subject}|${s.grade_level}|${s.classroom}|${s.academic_term}|${s.unit_name}`
        )
      )

      // Filter out existing ones
      const toInsert = Array.from(uniqueUnits.entries())
        .filter(([key]) => !existingKeys.has(key))
        .map(([_, setup]) => setup)

      console.log(`Need to insert ${toInsert.length} new setups`)

      if (toInsert.length === 0) {
        return new Response(
          JSON.stringify({
            success: true,
            message: 'All setups already exist',
            count: 0
          }),
          { headers: { 'Content-Type': 'application/json' } }
        )
      }

      // Insert new setups
      const { data: inserted, error: insertError } = await supabaseAdmin
        .from('unit_assessment_setups')
        .insert(toInsert)
        .select()

      if (insertError) throw insertError

      return new Response(
        JSON.stringify({
          success: true,
          message: `Created ${inserted.length} unit assessment setups`,
          count: inserted.length,
          setups: inserted
        }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Successfully created missing setups',
        data
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('Error:', err)
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
})
