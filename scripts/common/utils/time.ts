import { floor } from "./math";

const MS_PER_SECOND = 1_000;

export function getTimestamp(): string {
  return Date.now().toString();
}

export function getLocalBlockTime(): number {
  return floor(Date.now() / MS_PER_SECOND);
}

// blockTimeOffset = contractBlockTime - localBlockTime
export function getBlockTime(blockTimeOffset: number): number {
  return blockTimeOffset + getLocalBlockTime();
}

export function wait(delayInMilliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayInMilliseconds));
}

/**
 * Rejects if `promise` doesn't settle within `timeout` ms.
 * The rejection reason is whatever `exception` throws (or returns).
 */
export async function specifyTimeout<T>(
  promise: Promise<T>,
  timeout: number = 5_000,
  exception: () => unknown = () => {
    throw new Error("Timeout!");
  }
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      try {
        reject(exception());
      } catch (error) {
        reject(error);
      }
    }, timeout);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timer);
  }
}

export function dateToTimestamp(date?: Date): number {
  return floor((date?.getTime() || 0) / MS_PER_SECOND);
}

export function toDate(value: Date | number): Date {
  return typeof value === "number" ? new Date(value * MS_PER_SECOND) : value;
}

const pad = (n: number) => n.toString().padStart(2, "0");

/** Unix seconds → "DD.MM.YYYY HH:MM:SS" (local time) */
export function epochToDateString(unixTimestamp: number): string {
  const d = new Date(unixTimestamp * MS_PER_SECOND);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** Unix seconds → "DD.MM.YYYY HH:MM:SS" (UTC) */
export function epochToDateStringUTC(unixTimestamp: number): string {
  const d = new Date(unixTimestamp * MS_PER_SECOND);
  return `${pad(d.getUTCDate())}.${pad(
    d.getUTCMonth() + 1
  )}.${d.getUTCFullYear()} ${pad(d.getUTCHours())}:${pad(
    d.getUTCMinutes()
  )}:${pad(d.getUTCSeconds())}`;
}

function parseDateString(
  dateString: string
): [number, number, number, number, number, number] {
  const [date = "", time = ""] = dateString.split(" ");
  const [day, month, year] = date.split(".").map(Number);
  const [hours, minutes, seconds] = time.split(":").map(Number);
  const parts = [year, month - 1, day, hours, minutes, seconds];

  if (parts.some((x) => !Number.isFinite(x))) {
    throw new Error(`Expected "DD.MM.YYYY HH:MM:SS", got "${dateString}"`);
  }
  return parts as [number, number, number, number, number, number];
}

/** "DD.MM.YYYY HH:MM:SS" (local time) → Unix seconds */
export function dateStringToEpoch(dateString: string): number {
  return Math.floor(
    new Date(...parseDateString(dateString)).getTime() / MS_PER_SECOND
  );
}

/** "DD.MM.YYYY HH:MM:SS" (UTC) → Unix seconds */
export function dateStringToEpochUTC(dateString: string): number {
  return Math.floor(Date.UTC(...parseDateString(dateString)) / MS_PER_SECOND);
}
