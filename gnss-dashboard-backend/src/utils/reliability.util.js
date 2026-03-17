function calculateReliability({ assignments = [] }) {
  if (!assignments.length) {
    return {
      accuracyScore: 0,
      completionScore: 0,
      behaviorScore: 100,
      reliabilityScore: 0,
    };
  }

  // -------------------------
  // 1️⃣ Completion Score
  // -------------------------
  const total = assignments.length;

  const completed = assignments.filter(
    (a) => a.status === "completed" || a.status === "approved"
  ).length;

  const completionScore = (completed / total) * 100;

  // -------------------------
  // 2️⃣ Accuracy Score
  // -------------------------
  let deviations = [];

  assignments.forEach((a) => {
    if (a.deviationAnalyses && a.deviationAnalyses.length > 0) {
      const latest = a.deviationAnalyses[a.deviationAnalyses.length - 1];
      if (latest.avgDeviation !== undefined) {
        deviations.push(latest.avgDeviation);
      }
    }
  });

  let avgDeviation = 0;

  if (deviations.length > 0) {
    avgDeviation =
      deviations.reduce((sum, d) => sum + d, 0) / deviations.length;
  }

  // convert deviation → score
  const accuracyScore = Math.max(0, 100 - avgDeviation * 15);

  // -------------------------
  // 3️⃣ Behavior Score (simple for now)
  // -------------------------
  // we enhance later using activity logs
  const behaviorScore = 100;

  // -------------------------
  // Final Score
  // -------------------------
  const reliabilityScore =
    accuracyScore * 0.4 +
    completionScore * 0.4 +
    behaviorScore * 0.2;

  return {
    accuracyScore: Math.round(accuracyScore),
    completionScore: Math.round(completionScore),
    behaviorScore: Math.round(behaviorScore),
    reliabilityScore: Math.round(reliabilityScore),
  };
}

module.exports = { calculateReliability };