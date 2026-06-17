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

    // Get teacher_id from query params
    const url = new URL(req.url)
    const teacherId = url.searchParams.get('teacher_id')

    if (!teacherId) {
      return new Response(
        JSON.stringify({ error: 'teacher_id parameter required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // ดึง setups ทั้งหมดของ teacher คนนี้
    const { data: setups, error } = await supabaseAdmin
      .from('unit_assessment_setups')
      .select('*')
      .eq('teacher_id', teacherId)
      .order('subject, grade_level, classroom, unit_name')

    if (error) throw error

    // ดึง assessments ทั้งหมดของ teacher คนนี้เพื่อเปรียบเทียบ
    const { data: assessments } = await supabaseAdmin
      .from('unit_assessments')
      .select('subject, grade_level, classroom, unit_name, academic_term')
      .eq('teacher_id', teacherId)

    // Group unique units from assessments
    const uniqueAssessments = new Map()
    assessments?.forEach(a => {
      const key = `${a.subject}|${a.grade_level}/${a.classroom}|${a.unit_name}|${a.academic_term}`
      if (!uniqueAssessments.has(key)) {
        uniqueAssessments.set(key, a)
      }
    })

    return new Response(
      JSON.stringify({
        teacher_id: teacherId,
        setups_count: setups?.length || 0,
        assessments_unique_units: uniqueAssessments.size,
        setups: setups || [],
        assessment_units: Array.from(uniqueAssessments.values())
      }, null, 2),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('Error:', err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
