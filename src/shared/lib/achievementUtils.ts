import achievementsData from "@/data/achievements.json";
import { Leaf, Shield, Award, Target, Zap, Heart, Trophy, LucideIcon } from "lucide-react";

export type AchievementCondition = 
  | "registration" 
  | `streak_${number}` 
  | `reject_craving_${number}` 
  | `productive_replacement_${number}`
  | `streak_${number}_post`
  | `reject_craving_${number}_post`;

export interface Achievement {
  id: number;
  icon: LucideIcon;
  title: string;
  description: string;
  xp: number;
  condition: AchievementCondition;
  completed: boolean;
  locked: boolean;
}

export interface Reward {
  id: number;
  name: string;
  description: string;
  xpRequired: number;
  icon: LucideIcon;
  unlocked: boolean;
}

const iconMap: Record<string, LucideIcon> = {
  Leaf,
  Shield,
  Award,
  Target,
  Zap,
  Heart,
  Trophy,
};

export function getAchievementsForPhase(phase: "PRE_QUIT" | "POST_QUIT"): {
  milestones: Achievement[];
  behaviors: Achievement[];
} {
  const milestones = phase === "PRE_QUIT" 
    ? achievementsData.PRE_QUIT_MILESTONES 
    : achievementsData.POST_QUIT_MILESTONES;
  
  const behaviors = phase === "PRE_QUIT" 
    ? achievementsData.PRE_QUIT_BEHAVIOR 
    : achievementsData.POST_QUIT_BEHAVIOR;

  return {
    milestones: milestones.map((m) => ({
      ...m,
      icon: iconMap[m.icon] || Trophy,
      condition: m.condition as AchievementCondition,
      completed: false,
      locked: true,
    })),
    behaviors: behaviors.map((b) => ({
      ...b,
      icon: iconMap[b.icon] || Trophy,
      condition: b.condition as AchievementCondition,
      completed: false,
      locked: true,
    })),
  };
}

export function getRewardMilestones(): Reward[] {
  return achievementsData.REWARD_MILESTONES.map((r) => ({
    ...r,
    icon: iconMap[r.icon] || Trophy,
    unlocked: false,
  }));
}

export function checkAchievementCondition(
  condition: AchievementCondition,
  data: {
    streakDays: number;
    cravingsRejected: number;
    productiveActivities: number;
  }
): boolean {
  if (condition === "registration") return true;

  // Streak conditions
  const streakMatch = condition.match(/^streak_(\d+)(_post)?$/);
  if (streakMatch) {
    const requiredDays = parseInt(streakMatch[1], 10);
    return data.streakDays >= requiredDays;
  }

  // Reject craving conditions
  const rejectMatch = condition.match(/^reject_craving_(\d+)(_post)?$/);
  if (rejectMatch) {
    const requiredCount = parseInt(rejectMatch[1], 10);
    return data.cravingsRejected >= requiredCount;
  }

  // Productive replacement conditions
  const productiveMatch = condition.match(/^productive_replacement_(\d+)$/);
  if (productiveMatch) {
    const requiredCount = parseInt(productiveMatch[1], 10);
    return data.productiveActivities >= requiredCount;
  }

  return false;
}

export function calculateTotalXp(achievements: Achievement[]): number {
  return achievements.filter((a) => a.completed).reduce((sum, a) => sum + a.xp, 0);
}

export function getNextReward(totalXp: number, rewards: Reward[]): Reward | null {
  return rewards.find((r) => totalXp < r.xpRequired) || null;
}

export function getUnlockedRewards(totalXp: number, rewards: Reward[]): Reward[] {
  return rewards.filter((r) => totalXp >= r.xpRequired).map((r) => ({ ...r, unlocked: true }));
}
