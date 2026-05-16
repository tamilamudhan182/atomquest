import { ArrowRight, BriefcaseBusiness, Sparkles, Target, Users } from "lucide-react";
import { Link } from "react-router-dom";

export default function PremiumHome() {
  return (
    <main className="premium-home">
      <header className="home-nav">
        <Link to="/" className="home-brand">
          <span className="brand-mark">AQ</span>
          <span>AtomQuest TalentOS</span>
        </Link>
        <nav>
          <a href="#platform">Platform</a>
          <a href="#governance">Governance</a>
          <Link to="/login" className="nav-cta">Login</Link>
        </nav>
      </header>

      <section className="hero">
        <div className="hero-kicker">
          <Sparkles size={16} />
          Premium recruitment and performance alignment
        </div>
        <h1>Hire sharper. Align faster. Track every goal with executive clarity.</h1>
        <p>
          A dark, focused talent platform for recruitment teams and people leaders who need hiring,
          goal setting, quarterly check-ins, approvals, and audit-ready reporting in one place.
        </p>
        <div className="hero-actions">
          <Link to="/login" className="button button-gold">
            Get Started
            <ArrowRight size={18} />
          </Link>
          <a href="#platform" className="button button-ghost">Explore Platform</a>
        </div>
      </section>

      <section className="hero-board" aria-label="Platform snapshot">
        <div className="board-column">
          <span>Open Roles</span>
          <strong>42</strong>
          <small>Across Engineering, GTM, and Ops</small>
        </div>
        <div className="board-column highlighted">
          <span>Goal Completion</span>
          <strong>88%</strong>
          <small>Live quarterly progress score</small>
        </div>
        <div className="board-column">
          <span>Approvals</span>
          <strong>17</strong>
          <small>Manager actions pending</small>
        </div>
      </section>

      <section className="home-section" id="platform">
        <div className="section-heading centered">
          <span>Luxury minimalism, operational depth</span>
          <h2>A polished front door with a serious business engine behind it.</h2>
        </div>
        <div className="feature-grid">
          <Feature icon={BriefcaseBusiness} title="Recruitment Homepage" text="A premium black, gold, and white landing experience built for high-intent visitors." />
          <Feature icon={Target} title="Goal Lifecycle" text="Employees create goals, managers approve, and HR controls locked changes." />
          <Feature icon={Users} title="Governed Teams" text="Hierarchy, shared departmental KPIs, audit logs, and export-ready reporting." />
        </div>
      </section>

      <section className="home-section governance-band" id="governance">
        <div>
          <span>AtomQuest Hackathon 1.0</span>
          <h2>Demo credentials are included for Employee, Manager, and Admin roles.</h2>
        </div>
        <Link to="/login" className="button button-gold">Enter Portal</Link>
      </section>
    </main>
  );
}

function Feature({ icon: Icon, title, text }) {
  return (
    <article className="feature-card">
      <Icon size={24} />
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}
