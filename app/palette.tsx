"use client";
import {useEffect} from 'react';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Plus,
  TrendingUp,
  ArrowLeftRight,
  ChartNoAxesCombined,
  ReceiptText,
  Landmark,
  CalendarRange,
  Grid2X2,
  Tags,
  Repeat,
  Tag,
  Wallet,
  Coins,
  ChartCandlestick,
  Split,
  CalendarDays,
} from 'lucide-react';
import type {Account} from '@/lib/accounts';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: string[];
  accounts: Account[];
  onSelectTab: (tab: 'overview' | 'transactions' | 'accounts' | 'reports') => void;
  onSelectReport: (report: 'year' | 'table' | 'tax' | 'tags' | 'calendar') => void;
  onFilterCategory: (category: string) => void;
  onAddExpense: () => void;
  onAddIncome: () => void;
  onAddTransfer: () => void;
  onManageCategories: () => void;
  onRecurring: () => void;
  onOpenRemittance?: () => void;
  onOpenPortfolio?: () => void;
  onOpenSplit?: () => void;
};

export default function Palette({
  open,
  onOpenChange,
  categories,
  accounts,
  onSelectTab,
  onSelectReport,
  onFilterCategory,
  onAddExpense,
  onAddIncome,
  onAddTransfer,
  onManageCategories,
  onRecurring,
  onOpenRemittance,
  onOpenPortfolio,
  onOpenSplit,
}: Props) {
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, onOpenChange]);

  const run = (action?: () => void) => {
    onOpenChange(false);
    action?.();
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Command Palette" description="Search actions, tabs, categories or accounts">
      <CommandInput placeholder="Type a command or search (Ctrl+K)..." />
      <CommandList>
        <CommandEmpty>No matching commands found.</CommandEmpty>
        <CommandGroup heading="Quick Actions">
          <CommandItem onSelect={() => run(onAddExpense)}>
            <Plus className="mr-2" size={16} /> Add expense
          </CommandItem>
          {onOpenSplit && (
            <CommandItem onSelect={() => run(onOpenSplit)}>
              <Split className="mr-2" size={16} /> Split expense
            </CommandItem>
          )}
          <CommandItem onSelect={() => run(onAddIncome)}>
            <TrendingUp className="mr-2" size={16} /> Add income
          </CommandItem>
          {onOpenRemittance && (
            <CommandItem onSelect={() => run(onOpenRemittance)}>
              <Coins className="mr-2" size={16} /> Remittance / FX Calculator
            </CommandItem>
          )}
          {onOpenPortfolio && (
            <CommandItem onSelect={() => run(onOpenPortfolio)}>
              <ChartCandlestick className="mr-2" size={16} /> Stock Portfolio
            </CommandItem>
          )}
          <CommandItem onSelect={() => run(onAddTransfer)}>
            <ArrowLeftRight className="mr-2" size={16} /> Transfer money
          </CommandItem>
          <CommandItem onSelect={() => run(onManageCategories)}>
            <Tags className="mr-2" size={16} /> Manage categories
          </CommandItem>
          <CommandItem onSelect={() => run(onRecurring)}>
            <Repeat className="mr-2" size={16} /> Recurring rules
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => run(() => onSelectTab('overview'))}>
            <ChartNoAxesCombined className="mr-2" size={16} /> Overview
          </CommandItem>
          <CommandItem onSelect={() => run(() => onSelectTab('transactions'))}>
            <ReceiptText className="mr-2" size={16} /> Transactions
          </CommandItem>
          <CommandItem onSelect={() => run(() => onSelectTab('accounts'))}>
            <Landmark className="mr-2" size={16} /> Accounts &amp; Net Worth
          </CommandItem>
          <CommandItem onSelect={() => run(() => { onSelectTab('reports'); onSelectReport('year'); })}>
            <CalendarRange className="mr-2" size={16} /> Reports: Year in Review
          </CommandItem>
          <CommandItem onSelect={() => run(() => { onSelectTab('reports'); onSelectReport('table'); })}>
            <Grid2X2 className="mr-2" size={16} /> Reports: Monthly Table
          </CommandItem>
          <CommandItem onSelect={() => run(() => { onSelectTab('reports'); onSelectReport('tax'); })}>
            <ReceiptText className="mr-2" size={16} /> Reports: Bangladesh Tax Year
          </CommandItem>
          <CommandItem onSelect={() => run(() => { onSelectTab('reports'); onSelectReport('calendar'); })}>
            <CalendarDays className="mr-2" size={16} /> Reports: Monthly Calendar &amp; Schedule
          </CommandItem>
          <CommandItem onSelect={() => run(() => { onSelectTab('reports'); onSelectReport('tags'); })}>
            <Tag className="mr-2" size={16} /> Reports: Tag Spending Breakdown
          </CommandItem>
        </CommandGroup>
        {categories.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Filter by Category">
              {categories.map(c => (
                <CommandItem key={c} onSelect={() => run(() => onFilterCategory(c))}>
                  <Tag className="mr-2" size={14} /> {c}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
        {accounts.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Accounts">
              {accounts.map(a => (
                <CommandItem key={a.id} onSelect={() => run(() => onSelectTab('accounts'))}>
                  <Wallet className="mr-2" size={14} /> {a.name} ({a.type})
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
