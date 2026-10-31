import { Outlet } from "react-router-dom";
import { Logo } from "@/components/common/Logo";
export function AuthLayout() {
  return (
    <div className="auth-layout">
      <aside className="auth-aside">
        <Logo />
        <div className="auth-promo">
          <span className="promo-kicker">MONEY, IN FOCUS</span>
          <h2>A calmer way to manage your money.</h2>
          <p>
            Know where you stand today. Make a plan that still works tomorrow.
          </p>
          <div className="auth-preview">
            <div className="preview-top">
              <span>MONTHLY OVERVIEW</span>
              <b>October ’26</b>
            </div>
            <div className="preview-balance">
              ₹98,000 <small>income</small>
            </div>
            <div className="preview-bar">
              <i />
              <i />
              <i />
              <i />
            </div>
            <div className="preview-labels">
              <span>Needs</span>
              <span>Wants</span>
              <span>Savings</span>
            </div>
          </div>
        </div>
        <small className="auth-foot">Private by design · Works offline</small>
      </aside>
      <main className="auth-content">
        <Outlet />
      </main>
    </div>
  );
}
