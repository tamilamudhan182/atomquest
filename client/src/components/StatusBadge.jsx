const labels = {
  draft: "Draft",
  submitted: "Submitted",
  returned: "Returned",
  approved: "Approved",
  locked: "Locked",
  not_started: "Not Started",
  on_track: "On Track",
  completed: "Completed"
};

export default function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{labels[status] ?? status}</span>;
}
