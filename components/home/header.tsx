'use client';

import Link from 'next/link';
import { ThemeSwitcher } from './theme-switcher';
import { Logo } from './logo';
import { usePathname } from 'next/navigation';
import { MobileNav } from './mobile-nav';

interface NavItem {
  label: string;
  href: string;
}

export default function Header() {
  const pathname = usePathname();
  const isDashboard = pathname?.startsWith('/dashboard');

  // Main navigation items that are always shown
  const mainNavItems: NavItem[] = [
    { label: 'Features', href: '#features' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'FAQ', href: '#faq' },
    { label: 'Contact', href: '#contact' },
  ];

  // Dashboard items - empty array as we don't want navigation items in dashboard
  const dashboardItems: NavItem[] = [];

  // Choose which navigation items to show
  const navItems = isDashboard ? dashboardItems : mainNavItems;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex mx-auto h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2 md:gap-8">
          <Logo />
          <nav className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <ThemeSwitcher />
          <MobileNav items={navItems} />
        </div>
      </div>
    </header>
  );
}
