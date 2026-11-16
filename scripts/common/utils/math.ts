import { BN } from "@coral-xyz/anchor";
import { all, create, type BigNumber } from "mathjs";

export const DECIMAL_PLACES = 18;

// configure the default type of numbers as BigNumbers
const math = create(all, {
  number: "BigNumber",
  precision: 256,
});

export function numberFrom(
  value: number | string | bigint | BN | undefined | null
): BigNumber {
  if (value === undefined || value === null || value === "") {
    return math.bignumber(0);
  }

  if (BN.isBN(value)) {
    return math.bignumber("0x" + value.toString("hex"));
  }

  return typeof value === "bigint"
    ? math.bignumber(value.toString())
    : math.bignumber(value);
}

export function decimalFrom(value: BigNumber): string {
  return value.toPrecision(DECIMAL_PLACES);
}

export function floor(num: number, digits: number = 0): number {
  const k = 10 ** digits;
  return Math.floor(k * num) / k;
}

export function round(num: number, digits: number = 0): number {
  const k = 10 ** digits;
  return Math.round(k * num) / k;
}

/**
 * number → UI amount (needs decimals), bigint → already atomics.
 * Rounded: 0.29 * 1e6 is 290000.00000000006 in floating point, which spl-token rejects.
 */
export function getAtomicsAmount(
  amount: number | bigint,
  decimals?: number
): number {
  if (typeof amount === "bigint") {
    return Number(amount);
  }

  if (decimals === undefined) {
    throw new Error("decimals must be specified for UI amount (number)");
  }

  return Math.round(amount * 10 ** decimals);
}

export function getBatchSize(maxBatchSize: number, maxCount: number): number {
  // Limit batch size to maxCount if specified
  maxBatchSize = Math.min(maxBatchSize, maxCount || maxBatchSize);

  // Balance the load across batches
  return maxCount
    ? Math.ceil(maxCount / Math.ceil(maxCount / maxBatchSize))
    : maxBatchSize;
}
