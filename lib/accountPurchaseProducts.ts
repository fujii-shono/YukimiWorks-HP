import type { UserTicket } from '@/lib/firebase/types';

export const ACCOUNT_PURCHASE_PRODUCTS = {
  'coin-10': {
    label: 'コイン10枚',
    mode: 'payment',
    priceEnvironmentKey: 'STRIPE_PRICE_COIN_10',
    coinAmount: 10,
  },
  'coin-110': {
    label: 'コイン100+10枚',
    mode: 'payment',
    priceEnvironmentKey: 'STRIPE_PRICE_COIN_110',
    coinAmount: 110,
  },
  'blue-ticket': {
    label: '青チケット',
    mode: 'subscription',
    priceEnvironmentKey: 'STRIPE_PRICE_BLUE_TICKET',
    ticket: 'blue',
    coinAmount: 30,
  },
  'night-ticket': {
    label: '夜チケット',
    mode: 'subscription',
    priceEnvironmentKey: 'STRIPE_PRICE_NIGHT_TICKET',
    ticket: 'night',
    coinAmount: 0,
  },
} as const satisfies Record<
  string,
  {
    label: string;
    mode: 'payment' | 'subscription';
    priceEnvironmentKey: string;
    coinAmount: number;
    ticket?: UserTicket;
  }
>;

export type AccountPurchaseProduct = keyof typeof ACCOUNT_PURCHASE_PRODUCTS;

export function isAccountPurchaseProduct(value: unknown): value is AccountPurchaseProduct {
  return typeof value === 'string' && value in ACCOUNT_PURCHASE_PRODUCTS;
}

export function getStoredTickets(data: Record<string, unknown>) {
  const tickets = Array.isArray(data.tickets)
    ? data.tickets.filter((ticket): ticket is UserTicket => ticket === 'blue' || ticket === 'night')
    : [];

  const plan = data.plan;
  if ((plan === 'blue' || plan === 'night') && !tickets.includes(plan)) tickets.push(plan);
  return tickets;
}
