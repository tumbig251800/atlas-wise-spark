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

    console.log('Deleting setups with academic_term = "1/2569"...')

    // ลบ setups ที่มี academic_term ผิด
    const { data, error } = await supabaseAdmin
      .from('unit_assessment_setups')
      .delete()
      .eq('academic_term', '1/2569')
      .select()

    if (error) throw error

    console.log(`Deleted ${data.length} records with academic_term = "1/2569"`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Deleted ${data.length} records with wrong academic_term`,
        deleted: data.length,
        deleted_records: data
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
