import { Link, useLocation } from 'react-router-dom';
import { Home } from 'lucide-react';

// Map of URL segments to display names
const pathNameMap: Record<string, string> = {
  'dashboard': 'Pulpit',
  'invoices': 'Faktury',
  'customers': 'Klienci',
  'products': 'Produkty',
  'expenses': 'Wydatki',
  'settings': 'Ustawienia',
  'new': 'Nowy',
  'edit': 'Edycja',
  'list': 'Lista',
  'profile': 'Profil',
  'billing': 'Rozliczenia',
  'account': 'Konto',
  'preferences': 'Preferencje',
  'inventory': 'Magazyn',
  'contracts': 'Umowy',
  'employees': 'Pracownicy',
  'accounting': 'Księgowość',
  'reports': 'Raporty',
  'analytics': 'Analizy',
  'help': 'Pomoc'
};

// A simple utility to get display name from URL segment
const getDisplayName = (path: string): string => {
  // If we have a custom name in our map, use it
  if (pathNameMap[path]) {
    return pathNameMap[path];
  }
  // Otherwise, clean up the path for display
  return path
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

// Pages where breadcrumbs should be hidden
const HIDE_BREADCRUMBS = [
  '/dashboard',
  '/',
  ''
];

export function Breadcrumbs() {
  const location = useLocation();
  
  // Don't show breadcrumbs on main pages where navigation is already clear
  if (HIDE_BREADCRUMBS.includes(location.pathname)) {
    return null;
  }
  
  const pathnames = location.pathname.split('/').filter((x) => x);

  return (
    <nav aria-label="breadcrumb" className="min-w-0">
      <ol className="flex flex-wrap items-center text-sm text-gray-500">
        <li className="flex items-center">
          <Link 
            to="/dashboard" 
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center"
          >
            <Home className="h-4 w-4 mr-1.5" />
            Pulpit
          </Link>
        </li>
        
        {pathnames.map((value, index) => {
          const to = `/${pathnames.slice(0, index + 1).join('/')}`;
          const isLast = index === pathnames.length - 1;
          const displayName = getDisplayName(value);

          return (
            <li key={to} className="flex items-center">
              <span className="mx-2 text-gray-300 dark:text-gray-600">/</span>
              {isLast ? (
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {displayName}
                </span>
              ) : (
                <Link 
                  to={to} 
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  {displayName}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
