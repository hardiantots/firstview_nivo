import { supabase } from '../supabase';

export interface UserReward {
  id: string;
  user_id: string;
  total_points: number;
  current_streak: number;
  longest_streak: number;
  last_streak_date: string | null;
  milestones_achieved: number[];
  created_at: string;
  updated_at: string;
}

export interface RewardHistory {
  id: string;
  user_id: string;
  type: 'earned' | 'redeemed';
  points: number;
  reason?: string;
  milestone?: number;
  voucher_code?: string;
  redeemed_at?: string;
  created_at: string;
}

export interface Voucher {
  id: string;
  user_id: string;
  code: string;
  discount_amount: number;
  points_used: number;
  status: 'active' | 'used' | 'expired';
  used_at?: string;
  expires_at: string;
  created_at: string;
}

// Milestone configuration
export const MILESTONES = {
  7: { points: 10, label: '7 Hari Bebas Rokok' },
  14: { points: 20, label: '14 Hari Bebas Rokok' },
  30: { points: 40, label: '30 Hari Bebas Rokok' },
};

export const POINTS_FOR_VOUCHER = 60;
export const VOUCHER_DISCOUNT = 20000; // Rp 20.000

// Marketplace links
export const MARKETPLACE_LINKS = {
  shopee: 'https://s.shopee.co.id/9zqTKQOm2g',
  tokopedia: 'https://tk.tokopedia.com/ZSfKxfb7M/',
};

/**
 * Get or create user rewards record
 */
export async function getOrCreateUserRewards(userId: string): Promise<UserReward | null> {
  try {
    // Try to get existing record
    const { data: existing, error: fetchError } = await supabase
      .from('user_rewards')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (existing) {
      return existing;
    }

    // Create new record if doesn't exist
    if (fetchError?.code === 'PGRST116') {
      const { data: newRecord, error: insertError } = await supabase
        .from('user_rewards')
        .insert({
          user_id: userId,
          total_points: 0,
          current_streak: 0,
          longest_streak: 0,
          milestones_achieved: [],
        })
        .select()
        .single();

      if (insertError) throw insertError;
      return newRecord;
    }

    throw fetchError;
  } catch (error) {
    console.error('Error getting/creating user rewards:', error);
    return null;
  }
}

/**
 * Update streak and check for milestone achievements
 */
export async function updateStreakAndCheckMilestones(
  userId: string,
  currentStreak: number
): Promise<{ pointsEarned: number; milestonesAchieved: number[] }> {
  try {
    const rewards = await getOrCreateUserRewards(userId);
    if (!rewards) throw new Error('Failed to get user rewards');

    const milestonesAchieved = rewards.milestones_achieved || [];
    const newMilestones: number[] = [];
    let pointsEarned = 0;

    // Check each milestone
    for (const [milestone, config] of Object.entries(MILESTONES)) {
      const milestoneNumber = parseInt(milestone);
      
      // If current streak reaches milestone and not yet achieved
      if (currentStreak >= milestoneNumber && !milestonesAchieved.includes(milestoneNumber)) {
        newMilestones.push(milestoneNumber);
        pointsEarned += config.points;

        // Add to reward history
        await supabase.from('reward_history').insert({
          user_id: userId,
          type: 'earned',
          points: config.points,
          reason: config.label,
          milestone: milestoneNumber,
        });
      }
    }

    // Update user rewards if new milestones achieved
    if (newMilestones.length > 0) {
      const updatedMilestones = [...milestonesAchieved, ...newMilestones];
      const newTotalPoints = rewards.total_points + pointsEarned;

      await supabase
        .from('user_rewards')
        .update({
          total_points: newTotalPoints,
          current_streak: currentStreak,
          longest_streak: Math.max(rewards.longest_streak, currentStreak),
          last_streak_date: new Date().toISOString().split('T')[0],
          milestones_achieved: updatedMilestones,
        })
        .eq('user_id', userId);
    } else {
      // Just update streak without points
      await supabase
        .from('user_rewards')
        .update({
          current_streak: currentStreak,
          longest_streak: Math.max(rewards.longest_streak, currentStreak),
          last_streak_date: new Date().toISOString().split('T')[0],
        })
        .eq('user_id', userId);
    }

    return { pointsEarned, milestonesAchieved: newMilestones };
  } catch (error) {
    console.error('Error updating streak and checking milestones:', error);
    return { pointsEarned: 0, milestonesAchieved: [] };
  }
}

/**
 * Generate voucher code
 */
function generateVoucherCode(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `NIVO-${timestamp}-${random}`;
}

/**
 * Redeem points for voucher
 */
export async function redeemVoucher(
  userId: string,
  pointsToUse: number = POINTS_FOR_VOUCHER
): Promise<{ success: boolean; voucher?: Voucher; error?: string }> {
  try {
    const rewards = await getOrCreateUserRewards(userId);
    if (!rewards) {
      return { success: false, error: 'Failed to get user rewards' };
    }

    if (rewards.total_points < pointsToUse) {
      return { success: false, error: 'Insufficient points' };
    }

    // Generate voucher code
    const code = generateVoucherCode();
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 3); // Expires in 3 months

    // Create voucher
    const { data: voucher, error: voucherError } = await supabase
      .from('vouchers')
      .insert({
        user_id: userId,
        code,
        discount_amount: VOUCHER_DISCOUNT,
        points_used: pointsToUse,
        status: 'active',
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (voucherError) throw voucherError;

    // Deduct points
    const newTotalPoints = rewards.total_points - pointsToUse;
    await supabase
      .from('user_rewards')
      .update({ total_points: newTotalPoints })
      .eq('user_id', userId);

    // Add to history
    await supabase.from('reward_history').insert({
      user_id: userId,
      type: 'redeemed',
      points: -pointsToUse,
      reason: 'Voucher Ditukar',
      voucher_code: code,
      redeemed_at: new Date().toISOString(),
    });

    return { success: true, voucher };
  } catch (error) {
    console.error('Error redeeming voucher:', error);
    return { success: false, error: 'Failed to redeem voucher' };
  }
}

/**
 * Get reward history
 */
export async function getRewardHistory(userId: string): Promise<RewardHistory[]> {
  try {
    const { data, error } = await supabase
      .from('reward_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting reward history:', error);
    return [];
  }
}

/**
 * Get user vouchers
 */
export async function getUserVouchers(userId: string): Promise<Voucher[]> {
  try {
    const { data, error } = await supabase
      .from('vouchers')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting vouchers:', error);
    return [];
  }
}

/**
 * Mark voucher as used
 */
export async function markVoucherAsUsed(voucherId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('vouchers')
      .update({
        status: 'used',
        used_at: new Date().toISOString(),
      })
      .eq('id', voucherId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error marking voucher as used:', error);
    return false;
  }
}
