import type { Point, RegressionResult } from "../types";

/** 決定係数の合格閾値 */
export const R2_THRESHOLD = 0.99999; // 要件値 (高精度線形性)

/** 最小二乗法で d = a*V + b を推定し R^2 を返す */
export function regress(points: Point[]): RegressionResult {
  const n = points.length;
  const sumV = points.reduce((a, p) => a + p.v, 0);
  const sumD = points.reduce((a, p) => a + p.d, 0);
  const meanV = sumV / n;
  const meanD = sumD / n;
  let num = 0,
    den = 0,
    ssRes = 0,
    ssTot = 0;
  for (const p of points) {
    num += (p.v - meanV) * (p.d - meanD);
    den += (p.v - meanV) * (p.v - meanV);
  }
  const a = num / den;
  const b = meanD - a * meanV;
  for (const p of points) {
    const pred = a * p.v + b;
    const err = p.d - pred;
    ssRes += err * err;
    const diffD = p.d - meanD;
    ssTot += diffD * diffD;
  }
  const r2 = 1 - ssRes / ssTot;
  return { a, b, r2 };
}
