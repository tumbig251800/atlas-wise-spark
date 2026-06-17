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

    console.log('Starting duplicate cleanup...')

    // ดึงข้อมูลทั้งหมด
    const { data: allSetups, error } = await supabaseAdmin
      .from('unit_assessment_setups')
      .select('*')
      .order('created_at')

    if (error) throw error

    console.log(`Found ${allSetups.length} total setup records`)

    // หา duplicates
    const seen = new Map()
    const toDelete = []

    for (const setup of allSetups) {
      const key = `${setup.teacher_id}|${setup.subject}|${setup.grade_level}|${setup.classroom}|${setup.academic_term}|${setup.unit_name}`

      if (seen.has(key)) {
        // นี่คือรายการซ้ำ ให้เก็บอันแรก ลบอันหลัง
        toDelete.push(setup.id)
        console.log(`Duplicate found: ${setup.subject} - ${setup.grade_level}/${setup.classroom} - ${setup.unit_name} (will delete ${setup.id})`)
      } else {
        seen.set(key, setup)
      }
    }

    console.log(`Found ${toDelete.length} duplicates to delete`)

    if (toDelete.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No duplicates found',
          total: allSetups.length,
          deleted: 0
        }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    // ลบ duplicates
    const { error: deleteError } = await supabaseAdmin
      .from('unit_assessment_setups')
      .delete()
      .in('id', toDelete)

    if (deleteError) throw deleteError

    console.log(`Successfully deleted ${toDelete.length} duplicate records`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Deleted ${toDelete.length} duplicate records`,
        total: allSetups.length,
        deleted: toDelete.length,
        remaining: allSetups.length - toDelete.length
      }),
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
