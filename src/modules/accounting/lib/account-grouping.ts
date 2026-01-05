// Account grouping and subgroup logic for Chart of Accounts UI

export interface Account {
  id: string;
  code: string;
  name: string;
  account_type: string;
  is_synthetic: boolean;
  is_active: boolean;
  description: string | null;
  default_vat_rate: number | null;
  parent_id: string | null;
}

export interface AccountWithBalance extends Account {
  current_balance: number;
  month_delta: number;
  ytd_delta: number;
}

export interface SubgroupData {
  key: string;
  label: string;
  accounts: AccountWithBalance[];
  total_balance: number;
}

export interface GroupData {
  key: string;
  label: string;
  icon: string;
  subgroups: SubgroupData[];
  total_balance: number;
}

// Subgroup mapping based on Polish chart of accounts conventions
export function getAccountSubgroup(account: Account): string {
  const code = account.code;
  const type = account.account_type;

  // Assets
  if (type === 'asset') {
    if (code.startsWith('01')) return 'Środki trwałe';
    if (code.startsWith('02')) return 'Wartości niematerialne';
    if (code.startsWith('03')) return 'Długoterminowe aktywa finansowe';
    if (code.startsWith('13') || code.startsWith('14')) return 'Środki pieniężne';
    if (code.startsWith('20')) return 'Należności';
    if (code.startsWith('21')) return 'Rozliczenia międzyokresowe';
    if (code.startsWith('31')) return 'Materiały';
    if (code.startsWith('33')) return 'Produkty';
    return 'Inne aktywa';
  }

  // Liabilities
  if (type === 'liability') {
    if (code.startsWith('20')) return 'Zobowiązania';
    if (code.startsWith('22')) return 'Rozliczenia podatkowe';
    if (code.startsWith('23')) return 'Rozliczenia z ZUS';
    if (code.startsWith('24')) return 'Rozliczenia z pracownikami';
    if (code.startsWith('28')) return 'Rozliczenia międzyokresowe';
    if (code.startsWith('29')) return 'Rezerwy';
    return 'Inne zobowiązania';
  }

  // Equity
  if (type === 'equity') {
    if (code.startsWith('80')) return 'Kapitał podstawowy';
    if (code.startsWith('81')) return 'Kapitał zapasowy';
    if (code.startsWith('82')) return 'Kapitał rezerwowy';
    if (code.startsWith('84')) return 'Zyski zatrzymane';
    if (code.startsWith('86')) return 'Wynik bieżący';
    return 'Inne kapitały';
  }

  // Revenue
  if (type === 'revenue') {
    if (code.startsWith('70')) return 'Sprzedaż produktów';
    if (code.startsWith('71')) return 'Sprzedaż towarów';
    if (code.startsWith('72')) return 'Sprzedaż usług';
    if (code.startsWith('73')) return 'Pozostałe przychody';
    if (code.startsWith('74')) return 'Przychody finansowe';
    return 'Inne przychody';
  }

  // Expenses
  if (type === 'expense') {
    if (code.startsWith('40')) return 'Amortyzacja';
    if (code.startsWith('41')) return 'Materiały i energia';
    if (code.startsWith('42')) return 'Usługi obce';
    if (code.startsWith('43')) return 'Podatki i opłaty';
    if (code.startsWith('44')) return 'Wynagrodzenia';
    if (code.startsWith('45')) return 'Ubezpieczenia społeczne';
    if (code.startsWith('46')) return 'Pozostałe koszty';
    if (code.startsWith('47')) return 'Koszty finansowe';
    if (code.startsWith('49')) return 'Rozliczenia kosztów';
    return 'Inne koszty';
  }

  // Off-balance
  if (type === 'off_balance') {
    return 'Konta pozabilansowe';
  }

  return 'Inne';
}

export function groupAccountsByType(accounts: AccountWithBalance[]): GroupData[] {
  const groups: Record<string, GroupData> = {
    asset: {
      key: 'asset',
      label: 'Aktywa',
      icon: '💰',
      subgroups: [],
      total_balance: 0,
    },
    liability: {
      key: 'liability',
      label: 'Pasywa',
      icon: '📊',
      subgroups: [],
      total_balance: 0,
    },
    equity: {
      key: 'equity',
      label: 'Kapitał',
      icon: '🏦',
      subgroups: [],
      total_balance: 0,
    },
    revenue: {
      key: 'revenue',
      label: 'Przychody',
      icon: '📈',
      subgroups: [],
      total_balance: 0,
    },
    expense: {
      key: 'expense',
      label: 'Koszty',
      icon: '📉',
      subgroups: [],
      total_balance: 0,
    },
    off_balance: {
      key: 'off_balance',
      label: 'Pozabilansowe',
      icon: '📋',
      subgroups: [],
      total_balance: 0,
    },
  };

  // Group accounts by type and subgroup
  accounts.forEach(account => {
    const group = groups[account.account_type];
    if (!group) return;

    const subgroupKey = getAccountSubgroup(account);
    let subgroup = group.subgroups.find(sg => sg.key === subgroupKey);

    if (!subgroup) {
      subgroup = {
        key: subgroupKey,
        label: subgroupKey,
        accounts: [],
        total_balance: 0,
      };
      group.subgroups.push(subgroup);
    }

    subgroup.accounts.push(account);
    subgroup.total_balance += account.current_balance;
    group.total_balance += account.current_balance;
  });

  // Sort subgroups by label
  Object.values(groups).forEach(group => {
    group.subgroups.sort((a, b) => a.label.localeCompare(b.label, 'pl'));
  });

  // Return in display order
  return [
    groups.asset,
    groups.liability,
    groups.equity,
    groups.revenue,
    groups.expense,
    groups.off_balance,
  ];
}

export function formatBalance(balance: number): string {
  return `${balance >= 0 ? '+' : ''}${balance.toLocaleString('pl-PL', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })} PLN`;
}

export function getBalanceColor(balance: number, accountType: string): string {
  if (balance === 0) return 'text-slate-400';
  
  const isDebitNature = ['asset', 'expense'].includes(accountType);
  
  if (isDebitNature) {
    return balance > 0 ? 'text-green-600' : 'text-red-600';
  } else {
    return balance > 0 ? 'text-red-600' : 'text-green-600';
  }
}
