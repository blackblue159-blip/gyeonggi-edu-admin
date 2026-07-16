const exactReversedTextRepairs = new Map([
  ["산생", "생산"],
  ["도년산생", "생산년도"],
  ["서빙증출지", "지출증빙서"],
  ["간기존보", "보존기간"],
  ["명관기", "기관명"],
]);

export function reverseText(value) {
  return Array.from(value).reverse().join("");
}

export function repairKnownReversedText(value) {
  return exactReversedTextRepairs.get(value) ?? value;
}

export function repairReversedText(value, acceptedPattern) {
  const exactRepair = repairKnownReversedText(value);
  if (exactRepair !== value || acceptedPattern.test(value)) return exactRepair;

  const reversed = reverseText(value);
  return acceptedPattern.test(reversed) ? reversed : value;
}
