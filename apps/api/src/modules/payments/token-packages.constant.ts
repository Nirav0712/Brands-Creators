import { ITokenPackage } from '@brands-creators/types';

export const TOKEN_PACKAGES: ITokenPackage[] = [
  {
    id: 'starter',
    name: 'Starter Token Pack',
    tokensCount: 50,
    priceInr: 500,
    popular: false,
    description: 'Great for testing creator briefs and messaging potential partners.',
  },
  {
    id: 'growth',
    name: 'Growth Pack',
    tokensCount: 150,
    priceInr: 1350,
    popular: true,
    description: 'Includes a 10% bonus. Perfect for growing creators and active brands.',
  },
  {
    id: 'power',
    name: 'Power Pack',
    tokensCount: 500,
    priceInr: 4000,
    popular: false,
    description: 'Includes a 20% bonus. Ideal for high-volume recruitment and briefs.',
  },
  {
    id: 'ultimate',
    name: 'Ultimate VIP Pack',
    tokensCount: 1500,
    priceInr: 10500,
    popular: false,
    description: 'Includes a 30% bonus. Maximum reach, spotlighting, and verified dossiers.',
  },
];

