export const quarterToWindow = {
  Q1: ["q1_start", "q1_end"],
  Q2: ["q2_start", "q2_end"],
  Q3: ["q3_start", "q3_end"],
  Q4: ["q4_start", "q4_end"]
};

export function getActiveWindow(cycle, now = new Date()) {
  const checks = [
    ["goal_setting", "goal_setting_start", "goal_setting_end"],
    ["Q1", "q1_start", "q1_end"],
    ["Q2", "q2_start", "q2_end"],
    ["Q3", "q3_start", "q3_end"],
    ["Q4", "q4_start", "q4_end"]
  ];

  for (const [name, startKey, endKey] of checks) {
    if (isDateInside(cycle[startKey], cycle[endKey], now)) return name;
  }

  return "closed";
}

export function isWindowOpen(cycle, windowName, now = new Date()) {
  if (windowName === "goal_setting") {
    return isDateInside(cycle.goal_setting_start, cycle.goal_setting_end, now);
  }

  const range = quarterToWindow[windowName];
  if (!range) return false;
  return isDateInside(cycle[range[0]], cycle[range[1]], now);
}

export function assertWindowOpen(cycle, windowName, user) {
  if (user?.role === "admin") return;
  if (!isWindowOpen(cycle, windowName)) {
    const error = new Error(`${windowName} window is not open for ${cycle.name}`);
    error.status = 423;
    throw error;
  }
}

function isDateInside(start, end, now) {
  if (!start || !end) return false;
  const current = atStartOfDay(now);
  return current >= atStartOfDay(start) && current <= atEndOfDay(end);
}

function atStartOfDay(input) {
  const date = new Date(input);
  date.setHours(0, 0, 0, 0);
  return date;
}

function atEndOfDay(input) {
  const date = new Date(input);
  date.setHours(23, 59, 59, 999);
  return date;
}
