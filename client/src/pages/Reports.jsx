import { Download } from "lucide-react";
import { reportUrl } from "../api/client.js";

export default function Reports() {
  async function download(format) {
    const token = localStorage.getItem("atomquest_token");
    const response = await fetch(reportUrl(format), {
      headers: { Authorization: `Bearer ${token}` }
    });
    const blob = await response.blob();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `achievement-report.${format}`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <section className="page-stack">
      <div className="page-header">
        <span>Reporting</span>
        <h1>Achievement Reports</h1>
        <p>Export planned versus actual performance, progress scores, and manager comments.</p>
      </div>

      <section className="panel export-panel">
        <h2>Exportable Achievement Report</h2>
        <p>Downloads include employee hierarchy, goals, quarterly check-ins, computed progress, and comments.</p>
        <div className="form-actions">
          <button className="button button-gold" type="button" onClick={() => download("csv")}>
            <Download size={18} />
            CSV
          </button>
          <button className="button button-ghost" type="button" onClick={() => download("xlsx")}>
            <Download size={18} />
            Excel
          </button>
        </div>
      </section>
    </section>
  );
}
