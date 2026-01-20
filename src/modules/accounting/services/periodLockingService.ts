import { supabase } from '@/integrations/supabase/client';
import { calculateTaxDeadline, getCurrentPeriod, generateYearPeriodStates } from '../utils/periodState';
import { getClosedPeriods, closeAccountingPeriod } from '../data/periodRepository';
import { toast } from 'sonner';

export interface PeriodLockCheck {
  year: number;
  month: number;
  deadline: Date;
  daysOverdue: number;
  shouldLock: boolean;
  isLocked: boolean;
  hasUnpostedInvoices: boolean;
}

export interface AutoLockResult {
  success: boolean;
  lockedPeriods: Array<{
    year: number;
    month: number;
    deadline: Date;
    daysOverdue: number;
  }>;
  skippedPeriods: Array<{
    year: number;
    month: number;
    reason: string;
  }>;
  errors: Array<{
    year: number;
    month: number;
    error: string;
  }>;
}

/**
 * Check which periods should be automatically locked
 * A period should be locked if:
 * 1. The tax deadline (20th of next month) has passed
 * 2. The period is not already locked
 * 3. All invoices are posted (no unposted invoices)
 */
export async function checkPeriodsForLocking(
  businessProfileId: string,
  checkAllPeriods: boolean = false
): Promise<PeriodLockCheck[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Start of today
  
  const currentPeriod = getCurrentPeriod();
  const periodsToCheck: Array<{ year: number; month: number }> = [];
  
  // Always check current period and previous periods
  for (let year = currentPeriod.year - 1; year <= currentPeriod.year; year++) {
    const startMonth = year === currentPeriod.year - 1 ? 1 : 1;
    const endMonth = year === currentPeriod.year ? currentPeriod.month : 12;
    
    for (let month = startMonth; month <= endMonth; month++) {
      // Skip current month if not checking all periods
      if (!checkAllPeriods && year === currentPeriod.year && month === currentPeriod.month) {
        continue;
      }
      periodsToCheck.push({ year, month });
    }
  }
  
  const closedPeriods = await getClosedPeriods(businessProfileId);
  const checks: PeriodLockCheck[] = [];
  
  for (const { year, month } of periodsToCheck) {
    const deadline = calculateTaxDeadline(year, month);
    const daysOverdue = Math.floor((today.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24));
    const shouldLock = daysOverdue >= 0; // Deadline has passed
    
    const closedPeriod = closedPeriods.find(p => p.year === year && p.month === month);
    const isLocked = closedPeriod?.is_locked || false;
    
    // Check for unposted invoices
    const { count: unpostedCount } = await supabase
      .from('invoices')
      .select('id', { count: 'exact', head: true })
      .eq('business_profile_id', businessProfileId)
      .eq('accounting_status', 'unposted')
      .gte('issue_date', `${year}-${String(month).padStart(2, '0')}-01`)
      .lte('issue_date', `${year}-${String(month).padStart(2, '0')}-31`);
    
    const hasUnpostedInvoices = (unpostedCount || 0) > 0;
    
    checks.push({
      year,
      month,
      deadline,
      daysOverdue,
      shouldLock,
      isLocked,
      hasUnpostedInvoices,
    });
  }
  
  return checks;
}

/**
 * Automatically lock eligible periods
 */
export async function autoLockPeriods(
  businessProfileId: string,
  options: {
    dryRun?: boolean;
    maxDaysOverdue?: number;
    skipIfUnposted?: boolean;
  } = {}
): Promise<AutoLockResult> {
  const {
    dryRun = false,
    maxDaysOverdue = 365, // Don't auto-lock periods older than 1 year
    skipIfUnposted = true,
  } = options;
  
  const checks = await checkPeriodsForLocking(businessProfileId);
  
  const result: AutoLockResult = {
    success: true,
    lockedPeriods: [],
    skippedPeriods: [],
    errors: [],
  };
  
  for (const check of checks) {
    try {
      // Skip if already locked
      if (check.isLocked) {
        result.skippedPeriods.push({
          year: check.year,
          month: check.month,
          reason: 'Already locked',
        });
        continue;
      }
      
      // Skip if deadline hasn't passed
      if (!check.shouldLock) {
        result.skippedPeriods.push({
          year: check.year,
          month: check.month,
          reason: 'Tax deadline not passed',
        });
        continue;
      }
      
      // Skip if too old
      if (check.daysOverdue > maxDaysOverdue) {
        result.skippedPeriods.push({
          year: check.year,
          month: check.month,
          reason: `Period too old (${check.daysOverdue} days overdue)`,
        });
        continue;
      }
      
      // Skip if has unposted invoices (if configured)
      if (skipIfUnposted && check.hasUnpostedInvoices) {
        result.skippedPeriods.push({
          year: check.year,
          month: check.month,
          reason: 'Has unposted invoices',
        });
        continue;
      }
      
      // Lock the period (unless dry run)
      if (!dryRun) {
        const closeResult = await closeAccountingPeriod(
          businessProfileId,
          check.year,
          check.month,
          true, // Lock the period
          `Automatically locked ${check.daysOverdue} days after tax deadline`
        );
        
        if (!closeResult.success) {
          result.errors.push({
            year: check.year,
            month: check.month,
            error: closeResult.message || 'Failed to lock period',
          });
          continue;
        }
      }
      
      result.lockedPeriods.push({
        year: check.year,
        month: check.month,
        deadline: check.deadline,
        daysOverdue: check.daysOverdue,
      });
      
    } catch (error) {
      result.errors.push({
        year: check.year,
        month: check.month,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
  
  return result;
}

/**
 * Check and auto-lock periods on application startup or periodic intervals
 */
export async function runPeriodLockingCheck(
  businessProfileId: string,
  showToast: boolean = true
): Promise<void> {
  try {
    const result = await autoLockPeriods(businessProfileId, {
      dryRun: false,
      maxDaysOverdue: 90, // Auto-lock periods up to 3 months overdue
      skipIfUnposted: true,
    });
    
    if (result.lockedPeriods.length > 0 && showToast) {
      const periodNames = result.lockedPeriods
        .map(p => {
          const monthNames = ['styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec',
            'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień'];
          return `${monthNames[p.month - 1]} ${p.year}`;
        })
        .join(', ');
      
      toast.success(
        `Zablokowano okresy: ${periodNames}`,
        {
          description: `${result.lockedPeriods.length} okresów zostało automatycznie zablokowanych po terminie płatności podatku`,
          duration: 6000,
        }
      );
    }
    
    if (result.errors.length > 0 && showToast) {
      console.error('Period locking errors:', result.errors);
      toast.error(
        `Błędy podczas blokowania okresów`,
        {
          description: `${result.errors.length} okresów nie zostało zablokowanych`,
          duration: 4000,
        }
      );
    }
    
  } catch (error) {
    console.error('Failed to run period locking check:', error);
    if (showToast) {
      toast.error('Błąd podczas sprawdzania okresów do blokady');
    }
  }
}

/**
 * Get periods that need attention (overdue but not locked)
 */
export async function getPeriodsNeedingAttention(
  businessProfileId: string
): Promise<PeriodLockCheck[]> {
  const checks = await checkPeriodsForLocking(businessProfileId);
  
  return checks.filter(check => 
    check.shouldLock && 
    !check.isLocked && 
    check.daysOverdue >= 0
  );
}

/**
 * Schedule automatic period locking checks
 * This could be called from a useEffect or scheduler
 */
export function schedulePeriodLocking(
  businessProfileId: string,
  intervalHours: number = 24
): NodeJS.Timeout {
  return setInterval(async () => {
    await runPeriodLockingCheck(businessProfileId, false);
  }, intervalHours * 60 * 60 * 1000);
}
