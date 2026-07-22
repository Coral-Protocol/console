import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

const dollarFmt = new Intl.NumberFormat(undefined, {
	style: 'currency',
	currency: 'usd',
	currencyDisplay: 'narrowSymbol'
});

export const fmtMicrocents = (microcents: number): string => {
	return dollarFmt.format(microcents / 100_000_000);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChild<T> = T extends { child?: any } ? Omit<T, 'child'> : T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChildren<T> = T extends { children?: any } ? Omit<T, 'children'> : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & { ref?: U | null };

export function getInitials(str: string | string[]) {
	const dash = str.indexOf('-');
	if (dash === -1) {
		return str[0]?.toUpperCase() ?? '';
	}

	return (str[0]?.toUpperCase() ?? '') + (str[dash + 1]?.toUpperCase() ?? '');
}
