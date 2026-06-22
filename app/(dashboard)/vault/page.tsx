import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { VaultPageClient } from './VaultPageClient';

export default async function VaultPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get user profile with salt
  const { data: profile } = await supabase
    .from('profiles')
    .select('vault_salt')
    .eq('id', user.id)
    .single();

  if (!profile?.vault_salt) {
    redirect('/onboarding/vault-setup');
  }

  // Get user's assets
  const { data: assets } = await supabase
    .from('assets')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false });

  return <VaultPageClient assets={assets || []} salt={profile.vault_salt} />;
}
