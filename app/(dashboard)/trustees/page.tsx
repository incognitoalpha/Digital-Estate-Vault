import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { TrusteesPageClient } from './TrusteesPageClient';

export default async function TrusteesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get user's trustees
  const { data: trustees } = await supabase
    .from('trustees')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false });

  // Get user's assets for grant management
  const { data: assets } = await supabase
    .from('assets')
    .select('id, title, category')
    .eq('owner_id', user.id)
    .order('title');

  return (
    <TrusteesPageClient trustees={trustees || []} assets={assets || []} />
  );
}
