import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

Deno.serve(async (req) => {
  try {
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

    console.log('Starting to create ALL missing setups from unit_assessments...')

    // ดึงข้อมูลทั้งหมดจาก unit_assessments
    const { data: assessments, error: fetchError } = await supabaseAdmin
      .from('unit_assessments')
      .select('teacher_id, subject, grade_level, classroom, academic_term, unit_name, k_total, p_total, a_total, assessed_date')

    if (fetchError) {
      throw new Error(`Failed to fetch assessments: ${fetchError.message}`)
    }

    console.log(`Found ${assessments.length} assessment records`)

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

    console.log(`Found ${uniqueUnits.size} unique units`)

    // ตรวจสอบว่า setup ไหนมีอยู่แล้ว
    const { data: existingSetups, error: existError } = await supabaseAdmin
      .from('unit_assessment_setups')
      .select('teacher_id, subject, grade_level, classroom, academic_term, unit_name')

    if (existError) {
      console.error('Error fetching existing setups:', existError)
    }

    console.log(`Found ${existingSetups?.length || 0} existing setups`)

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
          totalUnits: uniqueUnits.size,
          existingSetups: existingSetups?.length || 0,
          newSetups: 0
        }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Log what we're about to insert
    console.log('Setups to insert:', toInsert.map(s =>
      `${s.subject} - ${s.grade_level}/${s.classroom} - ${s.unit_name} (teacher: ${s.teacher_id.substring(0, 8)}...)`
    ))

    // Insert new setups
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('unit_assessment_setups')
      .insert(toInsert)
      .select()

    if (insertError) {
      throw new Error(`Failed to insert setups: ${insertError.message}`)
    }

    console.log(`Successfully inserted ${inserted.length} setups`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Created ${inserted.length} unit assessment setups`,
        totalUnits: uniqueUnits.size,
        existingSetups: existingSetups?.length || 0,
        newSetups: inserted.length,
        setups: inserted
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
