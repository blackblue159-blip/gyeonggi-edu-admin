export const RESIZE_STEP_MM = 0.5;
export const SNAP_TARGET_RADIUS_MM = 1;
export const SNAP_RELEASE_RADIUS_MM = 3;

/**
 * @param {number} value
 */
export function roundToResizeStep(value) {
  return Number(
    (Math.round(value / RESIZE_STEP_MM) * RESIZE_STEP_MM).toFixed(2),
  );
}

/**
 * @param {number} minimum
 * @param {number} maximum
 * @param {number} step
 * @param {number[]} extraTargets
 */
export function createResizeSnapTargets(
  minimum,
  maximum,
  step = 5,
  extraTargets = [],
) {
  const firstTarget = Math.ceil(minimum / step) * step;
  const stepTargets = [];

  for (let target = firstTarget; target <= maximum; target += step) {
    stepTargets.push(target);
  }

  return [...new Set([...stepTargets, ...extraTargets])]
    .filter((target) => target >= minimum && target <= maximum)
    .sort((a, b) => a - b);
}

/**
 * @param {number} value
 * @param {number[]} targets
 * @param {number | null} lockedTarget
 */
export function resolveResizeSnap(value, targets, lockedTarget = null) {
  const nearest = targets.reduce(
    (closest, target) => {
      if (closest === null) return target;
      return Math.abs(value - target) < Math.abs(value - closest)
        ? target
        : closest;
    },
    /** @type {number | null} */ (null),
  );

  if (
    nearest !== null &&
    nearest !== lockedTarget &&
    Math.abs(value - nearest) <= SNAP_TARGET_RADIUS_MM
  ) {
    return { value: nearest, lockedTarget: nearest, snapped: true };
  }

  if (
    lockedTarget !== null &&
    Math.abs(value - lockedTarget) <= SNAP_RELEASE_RADIUS_MM
  ) {
    return { value: lockedTarget, lockedTarget, snapped: true };
  }

  if (
    nearest !== null &&
    Math.abs(value - nearest) <= SNAP_TARGET_RADIUS_MM
  ) {
    return { value: nearest, lockedTarget: nearest, snapped: true };
  }

  return {
    value: roundToResizeStep(value),
    lockedTarget: null,
    snapped: false,
  };
}
