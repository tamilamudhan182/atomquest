export function computeProgress(goal, actual) {
  const measurementType = goal.measurement_type;
  const direction = goal.scoring_direction ?? "higher_better";

  if (measurementType === "timeline") {
    if (!actual.actual_date || !goal.target_date) {
      return { score: 0, meta: { reason: "Missing completion date or deadline" } };
    }
    const actualDate = new Date(actual.actual_date);
    const deadline = new Date(goal.target_date);
    const daysLate = Math.max(0, Math.ceil((actualDate - deadline) / 86400000));
    return {
      score: actualDate <= deadline ? 100 : 0,
      meta: { deadline: goal.target_date, actualDate: actual.actual_date, daysLate }
    };
  }

  if (measurementType === "zero_based") {
    const value = Number(actual.actual_numeric ?? 0);
    return {
      score: value === 0 ? 100 : 0,
      meta: { rule: "Zero actual means full score" }
    };
  }

  const target = Number(goal.target_numeric ?? 0);
  const achievement = Number(actual.actual_numeric ?? 0);

  if (target === 0 && achievement === 0) {
    return { score: 100, meta: { rule: "Target and achievement are both zero" } };
  }

  if (target <= 0 || achievement < 0) {
    return { score: 0, meta: { reason: "Invalid numeric inputs" } };
  }

  if (direction === "lower_better") {
    if (achievement === 0) return { score: 150, meta: { rule: "Best possible lower-better outcome" } };
    return { score: roundScore((target / achievement) * 100), meta: { direction } };
  }

  return { score: roundScore((achievement / target) * 100), meta: { direction } };
}

function roundScore(value) {
  return Math.round(Math.min(value, 150) * 100) / 100;
}
