// 安定判定 (スライディングウィンドウで max-min <= threshold)
/** 安定ウィンドウ成立時の結果 (平均値と対象サンプル列) */
export interface StabilityResult {
  mean: number;
  samples: number[];
}

/** 現在の蓄積統計 (UI表示用) */
export interface StabilityStats {
  len: number;
  max: number;
  min: number;
  span: number;
}

/**
 * 安定判定器。windowSize サンプル蓄積後、max-min<=threshold を満たせば平均値を返す。
 */
export function createStabilityDetector({
  windowSize,
  threshold,
}: {
  windowSize: number;
  threshold: number;
}) {
  const values: number[] = [];
  return {
    /** 窓サイズ(最大保持サンプル数) */
    capacity() {
      return windowSize;
    },
    /** サンプル追加し、安定成立なら平均を返す */
    push(v: number): StabilityResult | null {
      values.push(v);
      if (values.length > windowSize) values.shift();
      if (values.length < windowSize) return null;
      let min = Infinity,
        max = -Infinity,
        sum = 0;
      for (const x of values) {
        if (x < min) min = x;
        if (x > max) max = x;
        sum += x;
      }
      if (max - min <= threshold) {
        return { mean: sum / values.length, samples: [...values] };
      }
      return null;
    },
    /** 内部バッファをクリア */
    reset() {
      values.length = 0;
    },
    /** 現在統計 (len=0 の場合 span 等は0) */
    stats(): StabilityStats {
      if (values.length === 0) return { len: 0, max: 0, min: 0, span: 0 };
      let min = Infinity,
        max = -Infinity;
      for (const v of values) {
        if (v < min) min = v;
        if (v > max) max = v;
      }
      return { len: values.length, max, min, span: max - min };
    },
  };
}
