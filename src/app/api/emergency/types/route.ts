/**
 * Emergency Types Catalog API (read-only).
 *
 * Returns the active emergency type categories. These are non-sensitive
 * reference data; anonymous read is permitted (matches the RLS policy on
 * emergency_types). No auth required.
 */

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-static'

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('emergency_types')
      .select('id, name, slug, description, icon, color, default_radius, is_active')
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching emergency types:', error)
      return NextResponse.json({ error: 'Failed to fetch emergency types' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error in emergency/types GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
