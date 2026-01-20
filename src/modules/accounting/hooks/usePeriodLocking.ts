import { useState, useEffect, useCallback } from 'react';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import { 
  checkPeriodsForLocking, 
  autoLockPeriods, 
  getPeriodsNeedingAttention,
  runPeriodLockingCheck,
  type PeriodLockCheck,
  type AutoLockResult
} from '../services/periodLockingService';

export interface UsePeriodLockingOptions {
  autoCheck?: boolean;
  checkInterval?: number; // in minutes
  showToast?: boolean;
  maxDaysOverdue?: number;
}

export interface UsePeriodLockingReturn {
  // State
  periodsNeedingAttention: PeriodLockCheck[];
  isChecking: boolean;
  isLocking: boolean;
  lastCheckTime: Date | null;
  
  // Actions
  checkPeriods: () => Promise<PeriodLockCheck[]>;
  lockPeriods: (options?: { dryRun?: boolean }) => Promise<AutoLockResult>;
  runAutoLock: () => Promise<void>;
  
  // Computed
  hasOverduePeriods: boolean;
  totalOverduePeriods: number;
  criticalPeriods: PeriodLockCheck[]; // Over 30 days
}

export function usePeriodLocking(options: UsePeriodLockingOptions = {}): UsePeriodLockingReturn {
  const {
    autoCheck = true,
    checkInterval = 60, // Check every hour by default
    showToast = true,
    maxDaysOverdue = 90,
  } = options;
  
  const { selectedProfileId } = useBusinessProfile();
  
  const [periodsNeedingAttention, setPeriodsNeedingAttention] = useState<PeriodLockCheck[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<Date | null>(null);
  
  // Check periods that need attention
  const checkPeriods = useCallback(async (): Promise<PeriodLockCheck[]> => {
    if (!selectedProfileId) return [];
    
    setIsChecking(true);
    try {
      const checks = await checkPeriodsForLocking(selectedProfileId);
      const needingAttention = checks.filter(check => 
        check.shouldLock && 
        !check.isLocked && 
        check.daysOverdue >= 0
      );
      
      setPeriodsNeedingAttention(needingAttention);
      setLastCheckTime(new Date());
      
      return needingAttention;
    } catch (error) {
      console.error('Error checking periods:', error);
      return [];
    } finally {
      setIsChecking(false);
    }
  }, [selectedProfileId]);
  
  // Lock eligible periods
  const lockPeriods = useCallback(async (lockOptions?: { dryRun?: boolean }): Promise<AutoLockResult> => {
    if (!selectedProfileId) {
      return {
        success: false,
        lockedPeriods: [],
        skippedPeriods: [],
        errors: [{ year: 0, month: 0, error: 'No business profile selected' }],
      };
    }
    
    setIsLocking(true);
    try {
      const result = await autoLockPeriods(selectedProfileId, {
        dryRun: lockOptions?.dryRun || false,
        maxDaysOverdue,
        skipIfUnposted: true,
      });
      
      // Refresh the periods after locking
      if (!lockOptions?.dryRun) {
        await checkPeriods();
      }
      
      return result;
    } catch (error) {
      console.error('Error locking periods:', error);
      return {
        success: false,
        lockedPeriods: [],
        skippedPeriods: [],
        errors: [{ year: 0, month: 0, error: error instanceof Error ? error.message : 'Unknown error' }],
      };
    } finally {
      setIsLocking(false);
    }
  }, [selectedProfileId, maxDaysOverdue, checkPeriods]);
  
  // Run automatic locking check
  const runAutoLock = useCallback(async (): Promise<void> => {
    if (!selectedProfileId) return;
    
    await runPeriodLockingCheck(selectedProfileId, showToast);
    await checkPeriods();
  }, [selectedProfileId, showToast, checkPeriods]);
  
  // Auto-check on mount and interval
  useEffect(() => {
    if (!selectedProfileId || !autoCheck) return;
    
    // Initial check
    checkPeriods();
    
    // Set up interval
    const interval = setInterval(() => {
      checkPeriods();
    }, checkInterval * 60 * 1000); // Convert minutes to milliseconds
    
    return () => clearInterval(interval);
  }, [selectedProfileId, autoCheck, checkInterval, checkPeriods]);
  
  // Computed values
  const hasOverduePeriods = periodsNeedingAttention.length > 0;
  const totalOverduePeriods = periodsNeedingAttention.length;
  const criticalPeriods = periodsNeedingAttention.filter(check => check.daysOverdue > 30);
  
  return {
    // State
    periodsNeedingAttention,
    isChecking,
    isLocking,
    lastCheckTime,
    
    // Actions
    checkPeriods,
    lockPeriods,
    runAutoLock,
    
    // Computed
    hasOverduePeriods,
    totalOverduePeriods,
    criticalPeriods,
  };
}
