import { supabase } from '../client';
import type { BoardMember } from '@/shared/types';

export async function getBoardMembers(businessProfileId: string): Promise<BoardMember[]> {
  const { data, error } = await supabase
    .from('board_members')
    .select('*')
    .eq('business_profile_id', businessProfileId)
    .order('position', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getActiveBoardMembers(businessProfileId: string): Promise<BoardMember[]> {
  const { data, error } = await supabase
    .from('board_members')
    .select('*')
    .eq('business_profile_id', businessProfileId)
    .eq('is_active', true)
    .order('position', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createBoardMember(member: Omit<BoardMember, 'id' | 'created_at' | 'updated_at'>): Promise<BoardMember> {
  const { data, error } = await supabase
    .from('board_members')
    .insert(member)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateBoardMember(id: string, updates: Partial<BoardMember>): Promise<BoardMember> {
  const { data, error } = await supabase
    .from('board_members')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteBoardMember(id: string): Promise<void> {
  const { error } = await supabase
    .from('board_members')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export function getPositionLabel(position: BoardMember['position']): string {
  const labels: Record<BoardMember['position'], string> = {
    prezes: 'Prezes Zarządu',
    wiceprezes: 'Wiceprezes Zarządu',
    czlonek_zarzadu: 'Członek Zarządu',
    prokurent: 'Prokurent'
  };
  return labels[position];
}
