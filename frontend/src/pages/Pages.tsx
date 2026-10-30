import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BellRing,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Cloud,
  CloudUpload,
  CreditCard,
  Download,
  Eye,
  EyeOff,
  FileText,
  Flame,
  Heart,
  Lightbulb,
  LockKeyhole,
  LogOut,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  TrendingDown,
  Wallet,
  WifiOff,
  X,
} from "lucide-react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
} from "recharts";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { setUser } from "@/features/auth/authSlice";
import {
  changePassword as changePasswordRequest,
  clearLocalSession,
  login,
  logout as logoutRequest,
  register,
  requestPasswordReset,
  resetPassword as resetPasswordRequest,
  updateCachedUser,
} from "@/features/auth/authService";
import { loginSchema, registerSchema } from "@/features/auth/schemas";
import {
  setActiveBudget,
  persistBudget,
  removeBudget,
  hydrateBudgets,
  clearBudgetState,
} from "@/features/budget/budgetSlice";
import { setCurrency } from "@/features/settings/settingsSlice";
import { runSync } from "@/features/sync/syncSlice";
import type { BudgetRecord } from "@/types";
import { anomalyRules } from "@/utils/anomalyRules";
import {
  burnRate,
  monthEndPrediction,
  savings,
  totalExpense,
} from "@/utils/calculations";
import { CATEGORY_LABELS } from "@/utils/constants";
import { currency, monthName } from "@/utils/formatters";
import { StatCard } from "@/components/common/StatCard";
import { SyncBadge } from "@/components/common/SyncBadge";
import { SaveIndicator } from "@/components/common/SaveIndicator";
import { EmptyState } from "@/components/common/EmptyState";
import { Logo } from "@/components/common/Logo";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { useAutoSave } from "@/hooks/useAutoSave";
import { clearBudgets } from "@/features/budget/budgetDb";

const monthKey = (year: number, month: number) =>
  `${year}-${String(month).padStart(2, "0")}`;
const currentKey = () =>
  monthKey(new Date().getFullYear(), new Date().getMonth() + 1);
const money = (amount: number, code: string) => currency(amount, code);
const tones = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function PageHeading({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow page-eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
      </div>
      {children && <div className="heading-actions">{children}</div>}
    </div>
  );
}
function Button({
  children,
  kind = "primary",
  onClick,
  to,
  disabled,
  className = "",
}: {
  children: React.ReactNode;
  kind?: "primary" | "secondary" | "quiet" | "danger";
  onClick?: () => void;
  to?: string;
  disabled?: boolean;
  className?: string;
}) {
  const c = `button ${kind} ${className}`;
  return to ? (
    <Link className={c} to={to}>
      {children}
    </Link>
  ) : (
    <button className={c} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <section className={`card ${className}`}>{children}</section>;
}
function SectionTitle({
  title,
  caption,
  action,
}: {
  title: string;
  caption?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="section-title">
      <div>
        <h2>{title}</h2>
        {caption && <p>{caption}</p>}
      </div>
      {action}
    </div>
  );
}

export function LandingPage() {
  return (
    <div className="landing">
      <header className="landing-nav">
        <Link to="/">
          <Logo />
        </Link>
        <nav>
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
        </nav>
        <div className="landing-actions">
          <ThemeToggle />
          <Link className="nav-login" to="/login">
            Log in
          </Link>
          <Link className="button primary" to="/register">
            Get started <ArrowRight size={15} />
          </Link>
        </div>
      </header>
      <section className="hero">
        <div className="hero-copy">
          <span className="hero-kicker">
            <span /> YOUR MONEY, IN FOCUS
          </span>
          <h1>
            Budget anywhere.
            <br />
            <em>Even offline.</em>
          </h1>
          <p>
            A more thoughtful way to understand your money. Plan your month,
            build better habits, and stay in control wherever life takes you.
          </p>
          <div className="hero-buttons">
            <Link className="button primary large" to="/register">
              Start your free budget <ArrowRight size={17} />
            </Link>
            <a className="text-link" href="#how-it-works">
              See how it works <span>↓</span>
            </a>
          </div>
          <div className="hero-proof">
            <span className="proof-avatars">
              <i>R</i>
              <i>A</i>
              <i>M</i>
              <i>+</i>
            </span>
            <span>
              <b>Made for real life.</b>
              <br />
              Simple, private, and yours.
            </span>
          </div>
        </div>
        <div className="hero-art">
          <div className="hero-orbit orbit-one" />
          <div className="hero-orbit orbit-two" />
          <div className="float-tag tag-sync">
            <span className="sync-check">
              <Check size={13} />
            </span>
            <span>
              <b>Everything in sync</b>
              <small>Saved just now</small>
            </span>
          </div>
          <div className="hero-dashboard">
            <div className="mock-top">
              <span className="mock-brand">
                <i />
                <b>budgetbox</b>
              </span>
              <span className="mock-date">
                October 2026 <ChevronDown size={13} />
              </span>
            </div>
            <div className="mock-greeting">
              <small>MONDAY, OCTOBER 26</small>
              <h3>Your month at a glance</h3>
            </div>
            <div className="mock-stat-grid">
              <div>
                <small>MONTHLY INCOME</small>
                <b>₹98,000</b>
                <span className="green-text">+4.2% from last month</span>
              </div>
              <div>
                <small>SPENT SO FAR</small>
                <b>₹59,000</b>
                <span>60% of your income</span>
              </div>
            </div>
            <div className="mock-chart">
              <div className="mock-ring">
                <div>
                  <b>40%</b>
                  <small>left to spend</small>
                </div>
              </div>
              <div className="mock-legend">
                <span>
                  <i className="dot teal" /> Essentials <b>₹28,500</b>
                </span>
                <span>
                  <i className="dot navy" /> Lifestyle <b>₹22,700</b>
                </span>
                <span>
                  <i className="dot blue" /> Other <b>₹7,800</b>
                </span>
              </div>
            </div>
            <div className="mock-insight">
              <span>
                <Sparkles size={14} />
              </span>
              <p>
                <b>A little insight</b>
                <br />
                You’re spending 12% less on food this month.
              </p>
              <ArrowRight size={14} />
            </div>
          </div>
          <div className="float-tag tag-offline">
            <WifiOff size={16} />
            <span>
              <b>Offline ready</b>
              <small>Your data stays with you</small>
            </span>
          </div>
          <div className="hero-scribble">✳</div>
        </div>
      </section>
      <section className="trust-strip">
        <span>DESIGNED FOR EVERYDAY CLARITY</span>
        <b>Private by design</b>
        <i />
        <b>Works without Wi-Fi</b>
        <i />
        <b>Always in your control</b>
      </section>
      <section className="features-section" id="features">
        <div className="center-heading">
          <span className="eyebrow">THE GOOD WITH YOUR MONEY</span>
          <h2>
            Less tracking. More <em>understanding.</em>
          </h2>
          <p>
            Everything you need to feel more confident about the month ahead.
          </p>
        </div>
        <div className="feature-grid">
          <article>
            <span className="feature-icon mint">
              <Cloud size={21} />
            </span>
            <span className="feature-number">01 / BUILT TO GO</span>
            <h3>Works offline</h3>
            <p>
              Your budget is always close at hand. Add a purchase on the train,
              at the market, or wherever the day takes you.
            </p>
            <span className="feature-foot">
              <i /> Automatically syncs when you’re back
            </span>
          </article>
          <article>
            <span className="feature-icon lavender">
              <RefreshCw size={21} />
            </span>
            <span className="feature-number">02 / NOTHING LOST</span>
            <h3>Auto-saves as you go</h3>
            <p>
              No submit buttons. No lost progress. Every change is safely stored
              on your device as you make it.
            </p>
            <span className="feature-foot">
              <i /> Your edits are saved instantly
            </span>
          </article>
          <article>
            <span className="feature-icon peach">
              <BellRing size={21} />
            </span>
            <span className="feature-number">03 / A GENTLE NUDGE</span>
            <h3>Spending, made visible</h3>
            <p>
              Simple, useful alerts help you spot patterns early, so you can
              make small changes before they add up.
            </p>
            <span className="feature-foot">
              <i /> Helpful, never judgmental
            </span>
          </article>
        </div>
      </section>
      <section className="how-section" id="how-it-works">
        <div className="how-copy">
          <span className="eyebrow">A GOOD PLACE TO START</span>
          <h2>
            Small steps.
            <br />
            <em>Clearer picture.</em>
          </h2>
          <p>
            Good financial habits don’t have to feel like a big project. Start
            with what you know, and go from there.
          </p>
          <Link className="text-link" to="/register">
            Make your first budget <ArrowRight size={15} />
          </Link>
        </div>
        <div className="steps">
          <div>
            <span>01</span>
            <div>
              <h3>Save locally</h3>
              <p>Your numbers stay on your device, ready whenever you are.</p>
            </div>
            <span className="step-doodle">↘</span>
          </div>
          <div>
            <span>02</span>
            <div>
              <h3>Sync when you’re ready</h3>
              <p>When you’re back online, your latest changes catch up.</p>
            </div>
            <span className="step-doodle">↘</span>
          </div>
          <div>
            <span>03</span>
            <div>
              <h3>Get a little insight</h3>
              <p>See what’s working and where you might want to adjust.</p>
            </div>
            <span className="step-doodle">✳</span>
          </div>
        </div>
      </section>
      <section className="cta-section">
        <div>
          <span className="eyebrow">YOUR NEXT MONTH STARTS HERE</span>
          <h2>
            A clearer view can change
            <br />
            the way you feel about money.
          </h2>
          <p>Start with one month. Build from there.</p>
          <Link className="button light-button" to="/register">
            Create your free account <ArrowRight size={16} />
          </Link>
        </div>
        <span className="cta-star">✳</span>
      </section>
      <footer className="landing-footer">
        <Link to="/">
          <Logo />
        </Link>
        <span>Thoughtful money management, built for real life.</span>
        <span>© 2026 BudgetBox</span>
      </footer>
    </div>
  );
}

function AuthFrame({
  title,
  sub,
  children,
  footer,
}: {
  title: string;
  sub: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="auth-form-wrap">
      <Link to="/" className="mobile-auth-logo">
        <Logo />
      </Link>
      <div className="auth-welcome">
        <span className="eyebrow">WELCOME TO BUDGETBOX</span>
        <h1>{title}</h1>
        <p>{sub}</p>
      </div>
      {children}
      <div className="auth-bottom">{footer}</div>
    </div>
  );
}
function Field({
  label,
  error,
  type = "text",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type={type} {...props} />
      {error && <small className="field-error">{error}</small>}
    </label>
  );
}
function PasswordField({
  label,
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <label className="field">
      <span>{label}</span>
      <div className="password-field">
        <input type={show ? "text" : "password"} {...props} />
        <button
          type="button"
          aria-label={show ? "Hide password" : "Show password"}
          onClick={() => setShow(!show)}
        >
          {show ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
      {error && <small className="field-error">{error}</small>}
    </label>
  );
}
type LoginForm = { email: string; password: string };
export function LoginPage() {
  const dispatch = useAppDispatch();
  const nav = useNavigate();
  const online = useAppSelector((s) => s.ui.isOnline);
  const {
    register: field,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });
  const submit = handleSubmit(async (data) => {
    if (!online) {
      toast.error("Connect to the internet to sign in.");
      return;
    }
    try {
      const user = await login(data.email, data.password);
      dispatch(setUser(user));
      await dispatch(hydrateBudgets(user.id)).unwrap();
      void dispatch(runSync(user.id));
      toast.success("Welcome back.");
      nav("/dashboard");
    } catch {
      toast.error("We couldn’t sign you in. Please try again.");
    }
  });
  return (
    <AuthFrame
      title="Welcome back"
      sub="Pick up right where you left off."
      footer={
        <>
          New to BudgetBox?{" "}
          <Link to="/register">
            Create an account <ArrowRight size={14} />
          </Link>
        </>
      }
    >
      <form className="auth-form" onSubmit={submit}>
        {!online && (
          <div className="inline-alert amber">
            <WifiOff size={16} /> You’re offline. Login needs an internet
            connection.
          </div>
        )}
        <Field
          label="Email address"
          placeholder="you@example.com"
          autoComplete="email"
          error={errors.email?.message}
          {...field("email")}
        />
        <PasswordField
          label="Password"
          placeholder="Enter your password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...field("password")}
        />
        <div className="form-row">
          <label className="check-label">
            <input type="checkbox" defaultChecked /> Remember me
          </label>
          <Link to="/forgot-password">Forgot password?</Link>
        </div>
        <button className="button primary full" disabled={isSubmitting}>
          {isSubmitting ? "Signing in…" : "Sign in"} <ArrowRight size={16} />
        </button>
        <div className="form-divider">
          <span />
          or continue with
          <span />
        </div>
        <button
          className="button google-button"
          type="button"
          onClick={() => toast.info("Google sign in will be available soon.")}
        >
          ◎ <b>Continue with Google</b>
        </button>
        <div className="secure-note">
          <LockKeyhole size={13} /> Your information is encrypted and secure
        </div>
      </form>
    </AuthFrame>
  );
}
type RegisterForm = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};
export function RegisterPage() {
  const dispatch = useAppDispatch();
  const nav = useNavigate();
  const {
    register: field,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });
  const password = watch("password") ?? "";
  const score = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;
  const submit = handleSubmit(async (data) => {
    try {
      const user = await register(data.name, data.email, data.password);
      dispatch(setUser(user));
      await dispatch(hydrateBudgets(user.id)).unwrap();
      void dispatch(runSync(user.id));
      toast.success("Your account is ready.");
      nav("/dashboard");
    } catch {
      toast.error("Couldn’t create your account. Try again.");
    }
  });
  return (
    <AuthFrame
      title="Make room for clarity"
      sub="Create an account and start with one month."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login">
            Sign in <ArrowRight size={14} />
          </Link>
        </>
      }
    >
      <form className="auth-form" onSubmit={submit}>
        <Field
          label="Your name"
          placeholder="e.g. Alex Morgan"
          autoComplete="name"
          error={errors.name?.message}
          {...field("name")}
        />
        <Field
          label="Email address"
          placeholder="you@example.com"
          autoComplete="email"
          error={errors.email?.message}
          {...field("email")}
        />
        <PasswordField
          label="Create a password"
          placeholder="At least 8 characters"
          autoComplete="new-password"
          error={errors.password?.message}
          {...field("password")}
        />
        <div className="strength-meter">
          <div>
            {[1, 2, 3, 4].map((n) => (
              <i key={n} className={score >= n ? "filled" : ""} />
            ))}
          </div>
          <small>
            {score < 2
              ? "Use 8+ characters for a stronger password"
              : score < 4
                ? "Getting stronger"
                : "Strong password"}
          </small>
        </div>
        <PasswordField
          label="Confirm password"
          placeholder="Enter your password again"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...field("confirmPassword")}
        />
        <label className="check-label terms">
          <input type="checkbox" required /> I agree to the{" "}
          <a href="#terms">Terms of Service</a> and{" "}
          <a href="#privacy">Privacy Policy</a>.
        </label>
        <button className="button primary full" disabled={isSubmitting}>
          {isSubmitting ? "Creating account…" : "Create your account"}{" "}
          <ArrowRight size={16} />
        </button>
        <div className="secure-note">
          <ShieldCheck size={14} /> Your data belongs to you. Always.
        </div>
      </form>
    </AuthFrame>
  );
}
export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch {
      toast.error("We couldn’t send the reset request. Try again.");
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <AuthFrame
      title={sent ? "Check your inbox" : "Forgot your password?"}
      sub={
        sent
          ? "If there’s an account for that email, we’ve sent a reset link."
          : "It happens. Enter your email and we’ll send you a reset link."
      }
      footer={
        <>
          Remember your password?{" "}
          <Link to="/login">
            Back to sign in <ArrowRight size={14} />
          </Link>
        </>
      }
    >
      <form className="auth-form" onSubmit={submit}>
        <Field
          label="Email address"
          placeholder="you@example.com"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <button className="button primary full" disabled={submitting}>
          {submitting
            ? "Sending…"
            : sent
              ? "Send another link"
              : "Send reset link"}{" "}
          <ArrowRight size={16} />
        </button>
        <div className="inline-alert info">
          <CircleHelp size={16} /> The link is valid for 30 minutes.
        </div>
      </form>
    </AuthFrame>
  );
}
export function ResetPasswordPage() {
  const { token = "" } = useParams();
  const nav = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirmation) {
      toast.error("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      await resetPasswordRequest(token, password);
      toast.success("Password updated. Sign in with your new password.");
      nav("/login");
    } catch {
      toast.error("That reset link is invalid or expired.");
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <AuthFrame
      title="Choose a new password"
      sub="Make it something only you know."
      footer={
        <>
          Need help? <a href="mailto:support@budgetbox.app">Contact support</a>
        </>
      }
    >
      <form className="auth-form" onSubmit={submit}>
        <PasswordField
          label="New password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <PasswordField
          label="Confirm new password"
          placeholder="Enter it again"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
        />
        <button className="button primary full" disabled={submitting || !token}>
          Update password <ArrowRight size={16} />
        </button>
      </form>
    </AuthFrame>
  );
}

export function DashboardPage() {
  const dispatch = useAppDispatch();
  const records = useAppSelector((s) =>
    s.budget.records.filter((r) => !r.isDeleted),
  );
  const activeId = useAppSelector((s) => s.budget.activeId);
  const code = useAppSelector((s) => s.settings.currency);
  const current = records.find((r) => r.id === activeId) ?? records[0];
  const syncing = useAppSelector((s) => s.sync.syncing);
  const user = useAppSelector((s) => s.auth.user);
  const changeMonth = (delta: number) => {
    if (!current) return;
    const date = new Date(current.year, current.month - 1 + delta, 1);
    const key = monthKey(date.getFullYear(), date.getMonth() + 1);
    if (!records.some((r) => r.id === key)) {
      toast.info("No budget for that month yet.");
      return;
    }
    dispatch(setActiveBudget(key));
  };
  const expenses = current ? totalExpense(current) : 0;
  const saved = current ? savings(current) : 0;
  const predicted = current ? monthEndPrediction(current) : 0;
  const alerts = current ? anomalyRules(current) : [];
  const data = current
    ? [
        { name: "Bills", value: current.bills },
        { name: "Food", value: current.food },
        { name: "Transport", value: current.transport },
        { name: "Subscriptions", value: current.subscriptions },
        { name: "Other", value: current.miscellaneous },
      ]
    : [];
  const sync = async () => {
    if (!user || !navigator.onLine) {
      toast.info(
        "Your changes are saved on this device and will sync when online.",
      );
      return;
    }
    try {
      await dispatch(runSync(user.id)).unwrap();
      toast.success("Your budgets are up to date.");
    } catch {
      if (navigator.onLine)
        toast.error("Sync couldn’t finish. Your local changes are safe.");
    }
  };
  return (
    <>
      <PageHeading
        eyebrow={new Date()
          .toLocaleDateString("en-IN", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })
          .toUpperCase()}
        title="Your money, in focus."
      >
        <div className="month-control">
          <button aria-label="Previous month" onClick={() => changeMonth(-1)}>
            <ChevronLeft size={17} />
          </button>
          <span>
            {current
              ? `${monthName(current.month)} ${current.year}`
              : "No budget yet"}
          </span>
          <button aria-label="Next month" onClick={() => changeMonth(1)}>
            <ChevronRight size={17} />
          </button>
          <ChevronDown size={14} />
        </div>
        <SyncBadge status={current?.syncStatus ?? "local-only"} />
        <Button kind="secondary" onClick={sync} disabled={syncing}>
          {syncing ? (
            <RefreshCw className="spin" size={15} />
          ) : (
            <CloudUpload size={15} />
          )}{" "}
          Sync now
        </Button>
      </PageHeading>
      {current ? (
        <>
          <div className="stats-grid">
            <StatCard
              label="MONTHLY INCOME"
              value={money(current.income, code)}
              detail="Your take-home income"
              icon={<Wallet size={18} />}
              tone="navy"
            />
            <StatCard
              label="TOTAL SPENT"
              value={money(expenses, code)}
              detail="Across 5 categories"
              icon={<CreditCard size={18} />}
              tone="blue"
            />
            <StatCard
              label="SAVINGS POTENTIAL"
              value={money(saved, code)}
              detail={
                saved >= 0
                  ? "Available to set aside"
                  : "Over your monthly income"
              }
              icon={<Target size={18} />}
              tone="mint"
            />
            <StatCard
              label="BURN RATE"
              value={`${Math.round(burnRate(current) * 100)}%`}
              detail="Of monthly income spent"
              icon={<Flame size={18} />}
              tone="peach"
            />
          </div>
          <div className="dashboard-grid">
            <Card className="prediction-card">
              <SectionTitle
                title="Month-end outlook"
                caption="Based on your spending so far"
                action={
                  <span className="trend-pill">
                    <ArrowDownRight size={14} /> On track
                  </span>
                }
              />
              <div className="prediction-main">
                <div>
                  <span className="eyebrow">PREDICTED TOTAL SPEND</span>
                  <strong>{money(predicted, code)}</strong>
                  <small>Budgeted {money(current.income, code)}</small>
                </div>
                <div className="prediction-mark">
                  <TrendingDown size={24} />
                </div>
              </div>
              <div className="progress-track">
                <i
                  style={{
                    width: `${Math.min(100, Math.max(0, (predicted / Math.max(current.income, 1)) * 100))}%`,
                  }}
                />
              </div>
              <div className="progress-label">
                <span>
                  {Math.round((predicted / Math.max(current.income, 1)) * 100)}%
                  of income projected
                </span>
                <b>
                  {money(Math.max(0, current.income - predicted), code)} left
                </b>
              </div>
              <div className="insight-note">
                <span>
                  <Lightbulb size={15} />
                </span>
                <p>
                  Your spending pace is <b>looking steady.</b> Keep it up to
                  meet your savings goal.
                </p>
              </div>
            </Card>
            <Card className="category-card">
              <SectionTitle
                title="Where it goes"
                caption={`${monthName(current.month)} spending by category`}
                action={
                  <button className="more-button" aria-label="More options">
                    <MoreHorizontal size={18} />
                  </button>
                }
              />
              <div className="chart-layout">
                <div className="donut-wrap">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data}
                        innerRadius="69%"
                        outerRadius="94%"
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                      >
                        {data.map((entry, i) => (
                          <Cell key={entry.name} fill={tones[i]} />
                        ))}
                      </Pie>
                      <ChartTooltip formatter={(v) => money(Number(v), code)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="donut-center">
                    <strong>{money(expenses, code)}</strong>
                    <small>total spend</small>
                  </div>
                </div>
                <div className="chart-legend">
                  {data.map((item, i) => (
                    <div key={item.name}>
                      <span>
                        <i style={{ background: tones[i] }} />
                        {item.name}
                      </span>
                      <b>{money(item.value, code)}</b>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
            <Card className="category-table-card">
              <SectionTitle
                title="Category breakdown"
                caption="A closer look at this month"
                action={
                  <Link className="subtle-link" to="/budget">
                    Edit budget <ArrowRight size={14} />
                  </Link>
                }
              />
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>CATEGORY</th>
                      <th>AMOUNT</th>
                      <th>OF INCOME</th>
                      <th>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(CATEGORY_LABELS).map(([key, label], i) => {
                      const amount = current[
                        key as keyof BudgetRecord
                      ] as number;
                      return (
                        <tr key={key}>
                          <td>
                            <span className="category-name">
                              <i style={{ background: tones[i] }} />
                              {label}
                            </span>
                          </td>
                          <td className="table-amount">
                            {money(amount, code)}
                          </td>
                          <td>
                            <div className="mini-progress">
                              <i
                                style={{
                                  width: `${Math.min((amount / Math.max(current.income, 1)) * 100 * 2, 100)}%`,
                                  background: tones[i],
                                }}
                              />
                            </div>
                            <small>
                              {Math.round(
                                (amount / Math.max(current.income, 1)) * 100,
                              )}
                              %
                            </small>
                          </td>
                          <td>
                            <span
                              className={`table-status ${amount / Math.max(current.income, 1) > 0.35 ? "watch" : "healthy"}`}
                            >
                              {amount / Math.max(current.income, 1) > 0.35
                                ? "Worth a look"
                                : "On track"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
            <Card className="alerts-card">
              <SectionTitle
                title="A note for you"
                caption="Small things worth noticing"
                action={
                  <Link className="subtle-link" to="/insights">
                    All insights <ArrowRight size={14} />
                  </Link>
                }
              />
              {alerts.length ? (
                <div className="alert-list">
                  {alerts.slice(0, 2).map((a) => (
                    <div className={`alert-item ${a.severity}`} key={a.id}>
                      <span>
                        <BellRing size={15} />
                      </span>
                      <div>
                        <b>{a.message}</b>
                        <p>{a.suggestion}</p>
                      </div>
                      <ArrowRight size={15} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="healthy-note">
                  <span>
                    <Heart size={16} />
                  </span>
                  <p>
                    Everything looks balanced this month. Keep doing what works.
                  </p>
                </div>
              )}
              <div className="monthly-quote">
                “A budget is telling your money where to go instead of wondering
                where it went.”<small>— Dave Ramsey</small>
              </div>
            </Card>
          </div>
        </>
      ) : (
        <EmptyState
          title="Start with your first month"
          body="Add a few numbers to get a clearer picture of your spending."
          action={
            <Button to="/budget">
              <Plus size={15} /> Create a budget
            </Button>
          }
        />
      )}
    </>
  );
}

const fieldMeta = [
  {
    key: "income",
    label: "Monthly income",
    help: "Your take-home pay and other regular income",
    icon: Wallet,
  },
  {
    key: "bills",
    label: "Monthly bills",
    help: "Rent, utilities, insurance, and other fixed costs",
    icon: FileText,
  },
  {
    key: "food",
    label: "Food & groceries",
    help: "Groceries, dining out, and coffee runs",
    icon: Heart,
  },
  {
    key: "transport",
    label: "Transport",
    help: "Commutes, fuel, rideshares, and travel",
    icon: ArrowRight,
  },
  {
    key: "subscriptions",
    label: "Subscriptions",
    help: "Streaming, apps, memberships, and more",
    icon: RefreshCw,
  },
  {
    key: "miscellaneous",
    label: "Miscellaneous",
    help: "Everything else that makes life yours",
    icon: Sparkles,
  },
] as const;
export function BudgetPage() {
  const dispatch = useAppDispatch();
  const params = useParams();
  const allRecords = useAppSelector((s) => s.budget.records);
  const records = allRecords.filter((r) => !r.isDeleted);
  const activeId = useAppSelector((s) => s.budget.activeId);
  const code = useAppSelector((s) => s.settings.currency);
  const user = useAppSelector((s) => s.auth.user);
  const existing = records.find((r) => r.id === activeId);
  const [form, setForm] = useState<BudgetRecord>(
    existing ?? {
      id: currentKey(),
      userId: user?.id ?? "",
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      income: 0,
      bills: 0,
      food: 0,
      transport: 0,
      subscriptions: 0,
      miscellaneous: 0,
      syncStatus: "pending",
      updatedAt: new Date().toISOString(),
    },
  );
  const change = useCallback((key: keyof BudgetRecord, value: number) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
      syncStatus: "pending",
      updatedAt: new Date().toISOString(),
    }));
  }, []);
  const saveState = useAutoSave(form, async (record) => {
    await dispatch(persistBudget(record)).unwrap();
  });
  useEffect(() => {
    if (!params.monthId) return;
    dispatch(setActiveBudget(params.monthId));
    const match = records.find((r) => r.id === params.monthId);
    if (match) setForm(match);
    else {
      const [year, month] = params.monthId.split("-").map(Number);
      if (year && month >= 1 && month <= 12)
        setForm({
          id: params.monthId,
          userId: user?.id ?? "",
          year,
          month,
          income: 0,
          bills: 0,
          food: 0,
          transport: 0,
          subscriptions: 0,
          miscellaneous: 0,
          syncStatus: "pending",
          updatedAt: new Date().toISOString(),
        });
    }
  }, [dispatch, params.monthId]);
  const onInput = (key: keyof BudgetRecord, value: string) => {
    change(key, Number(value) || 0);
  };
  const chooseDate = (value: string) => {
    const [year, month] = value.split("-").map(Number);
    const id = monthKey(year, month);
    dispatch(setActiveBudget(id));
    const match = records.find((r) => r.id === id);
    setForm(
      match ?? {
        id,
        userId: user?.id ?? "",
        month,
        year,
        income: 0,
        bills: 0,
        food: 0,
        transport: 0,
        subscriptions: 0,
        miscellaneous: 0,
        syncStatus: "pending",
        updatedAt: new Date().toISOString(),
      },
    );
  };
  const expense = totalExpense(form);
  const alerts = anomalyRules(form);
  return (
    <>
      <PageHeading
        eyebrow="YOUR MONTH, YOUR WAY"
        title="A plan that feels like yours."
      >
        <SaveIndicator saving={saveState === "saving"} />
        <Button
          kind="quiet"
          onClick={() => {
            if (window.confirm("Delete this month’s budget?")) {
              void dispatch(removeBudget({ userId: form.userId, id: form.id }));
              toast.success("Budget deleted.");
            }
          }}
        >
          <Trash2 size={15} /> Delete month
        </Button>
      </PageHeading>
      <div className="budget-layout">
        <Card className="budget-form-card">
          <div className="budget-form-head">
            <div>
              <span className="eyebrow">MONTHLY BUDGET</span>
              <h2>Let’s map out the month.</h2>
              <p>Add what you know. You can always come back and change it.</p>
            </div>
            <label className="month-picker">
              <CalendarDays size={16} />
              <input
                type="month"
                value={monthKey(form.year, form.month)}
                onChange={(e) => chooseDate(e.target.value)}
              />
            </label>
          </div>
          <div className="budget-fields">
            {fieldMeta.map(({ key, label, help, icon: Icon }) => (
              <label className="budget-field" key={key}>
                <span className="budget-field-icon">
                  <Icon size={16} />
                </span>
                <span className="budget-field-copy">
                  <b>{label}</b>
                  <small>{help}</small>
                </span>
                <span className="money-input">
                  <span>{code === "INR" ? "₹" : code}</span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={form[key]}
                    onChange={(e) => onInput(key, e.target.value)}
                    aria-label={label}
                  />
                </span>
              </label>
            ))}
          </div>
          <div className="budget-form-foot">
            <span>
              <ShieldCheck size={15} /> Your budget is private and saved on this
              device.
            </span>
            <span>
              <SaveIndicator saving={saveState === "saving"} />
            </span>
          </div>
        </Card>
        <aside className="budget-aside">
          <Card className="live-summary">
            <span className="eyebrow">YOUR MONTH AT A GLANCE</span>
            <h2>Looking good.</h2>
            <div className="summary-number">
              <small>Income</small>
              <b>{money(form.income, code)}</b>
            </div>
            <div className="summary-row">
              <span>Planned spending</span>
              <b>{money(expense, code)}</b>
            </div>
            <div className="summary-row savings-row">
              <span>
                <span className="tiny-dot" />
                Potential savings
              </span>
              <b>{money(savings(form), code)}</b>
            </div>
            <div className="summary-divider" />
            <div className="summary-bar">
              <i
                style={{
                  width: `${Math.min(100, form.income ? (expense / form.income) * 100 : 0)}%`,
                }}
              />
            </div>
            <div className="summary-caption">
              <span>
                {form.income ? Math.round((expense / form.income) * 100) : 0}%
                allocated
              </span>
              <span>
                {money(Math.max(0, form.income - expense), code)} unplanned
              </span>
            </div>
          </Card>
          <Card className="budget-alerts">
            <SectionTitle title="Worth a look" caption="A few gentle nudges" />
            {alerts.length ? (
              alerts.map((alert) => (
                <div className={`small-alert ${alert.severity}`} key={alert.id}>
                  <BellRing size={15} />
                  <p>
                    {alert.message}
                    <small>{alert.suggestion}</small>
                  </p>
                </div>
              ))
            ) : (
              <div className="all-clear">
                <span>
                  <Check size={15} />
                </span>
                <p>
                  Nothing to flag so far.
                  <small>Your plan looks balanced.</small>
                </p>
              </div>
            )}
          </Card>
          <div className="privacy-note">
            <LockKeyhole size={15} />
            <span>
              <b>Your numbers stay yours.</b>
              <br />
              Everything saves on your device first. Sync when you’re ready.
            </span>
          </div>
        </aside>
      </div>
    </>
  );
}

export function HistoryPage() {
  const records = useAppSelector((s) =>
    s.budget.records.filter((r) => !r.isDeleted),
  );
  const code = useAppSelector((s) => s.settings.currency);
  const dispatch = useAppDispatch();
  const [query, setQuery] = useState("");
  const years = [...new Set(records.map((r) => r.year))].sort((a, b) => b - a);
  const [year, setYear] = useState("all");
  const filtered = useMemo(
    () =>
      records.filter(
        (r) =>
          (year === "all" || String(r.year) === year) &&
          `${monthName(r.month)} ${r.year}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [records, year, query],
  );
  return (
    <>
      <PageHeading eyebrow="LOOKING BACK" title="Your budget history.">
        <Button to="/budget">
          <Plus size={15} /> Add a month
        </Button>
      </PageHeading>
      <Card className="history-card">
        <SectionTitle
          title="All months"
          caption={`${filtered.length} months of thoughtful planning`}
          action={
            <div className="history-filters">
              <label className="search-box">
                <Search size={15} />
                <input
                  placeholder="Search months…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              <select
                aria-label="Filter year"
                value={year}
                onChange={(e) => setYear(e.target.value)}
              >
                <option value="all">All years</option>
                {years.map((y) => (
                  <option key={y}>{y}</option>
                ))}
              </select>
            </div>
          }
        />
        {filtered.length ? (
          <div className="table-wrap">
            <table className="history-table">
              <thead>
                <tr>
                  <th>MONTH</th>
                  <th>INCOME</th>
                  <th>TOTAL SPENT</th>
                  <th>SAVINGS</th>
                  <th>SYNC STATUS</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => dispatch(setActiveBudget(r.id))}
                  >
                    <td>
                      <div className="history-month">
                        <span className="calendar-tile">
                          <small>
                            {monthName(r.month).slice(0, 3).toUpperCase()}
                          </small>
                          <b>{String(r.year).slice(2)}</b>
                        </span>
                        <span>
                          <b>
                            {monthName(r.month)} {r.year}
                          </b>
                          <small>Monthly budget</small>
                        </span>
                      </div>
                    </td>
                    <td>{money(r.income, code)}</td>
                    <td>{money(totalExpense(r), code)}</td>
                    <td className={savings(r) < 0 ? "negative" : "positive"}>
                      {money(savings(r), code)}
                    </td>
                    <td>
                      <SyncBadge status={r.syncStatus} />
                    </td>
                    <td>
                      <Link
                        className="row-action"
                        to="/budget"
                        aria-label={`Edit ${monthName(r.month)} budget`}
                      >
                        <ArrowRight size={16} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No months found"
            body="Try a different search or start a new budget."
            action={
              <Button to="/budget">
                <Plus size={15} /> Add a month
              </Button>
            }
          />
        )}
      </Card>
      <div className="history-foot">
        <span>
          <ShieldCheck size={15} /> Your budget history stays on this device.
        </span>
        <Link to="/sync">
          Manage your sync settings <ArrowRight size={14} />
        </Link>
      </div>
    </>
  );
}

export function SyncPage() {
  const records = useAppSelector((s) => s.budget.records);
  const state = useAppSelector((s) => s.sync);
  const user = useAppSelector((s) => s.auth.user);
  const dispatch = useAppDispatch();
  const pending = records.filter((r) => r.syncStatus !== "synced");
  const synced = records.length - pending.length;
  const syncing = state.syncing;
  const run = async () => {
    if (!navigator.onLine) {
      toast.error("You’re offline. Try syncing when you reconnect.");
      return;
    }
    if (!user) return;
    try {
      await dispatch(runSync(user.id)).unwrap();
      toast.success("All caught up.");
    } catch {
      if (navigator.onLine)
        toast.error("Sync couldn’t finish. Your local changes are safe.");
    }
  };
  return (
    <>
      <PageHeading eyebrow="YOUR DATA, YOUR CALL" title="Sync on your terms.">
        <Button onClick={run} disabled={syncing}>
          {syncing ? (
            <RefreshCw className="spin" size={15} />
          ) : (
            <CloudUpload size={15} />
          )}{" "}
          {syncing ? "Syncing…" : "Sync now"}
        </Button>
      </PageHeading>
      <div className="sync-hero">
        <div className="sync-hero-icon">
          <CloudUpload size={26} />
        </div>
        <div className="sync-hero-copy">
          <span className="eyebrow">SYNC STATUS</span>
          <h2>
            {pending.length
              ? "A few changes are waiting."
              : "You’re all caught up."}
          </h2>
          <p>
            {pending.length
              ? "Your latest budget edits are safely stored on this device and ready to sync."
              : "Your budgets are up to date across your devices."}
          </p>
          <div className="sync-last">
            <Check size={14} /> Last synced{" "}
            {state.lastSynced
              ? new Date(state.lastSynced).toLocaleString("en-IN")
              : "Not synced yet"}
          </div>
        </div>
        <div className="sync-counts">
          <div>
            <b>{records.length}</b>
            <small>Total months</small>
          </div>
          <div>
            <b className="amber-text">{pending.length}</b>
            <small>Pending</small>
          </div>
          <div>
            <b className="green-text">{synced}</b>
            <small>Synced</small>
          </div>
        </div>
      </div>
      <div className="sync-grid">
        <Card>
          <SectionTitle title="Your records" caption="Budgets on this device" />
          <div className="sync-records">
            {records.map((r) => (
              <div key={r.id}>
                <span className="record-icon">
                  <CalendarDays size={16} />
                </span>
                <span>
                  <b>
                    {monthName(r.month)} {r.year}
                    {r.isDeleted ? " · deletion pending" : ""}
                  </b>
                  <small>
                    Updated{" "}
                    {new Date(r.updatedAt).toLocaleDateString("en-IN", {
                      month: "short",
                      day: "numeric",
                    })}
                  </small>
                </span>
                <SyncBadge status={r.syncStatus} />
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <SectionTitle title="Sync activity" caption="A little history" />
          <div className="activity-list">
            <div>
              <i className={pending.length ? "" : "activity-good"}>
                {pending.length ? <Cloud size={12} /> : <Check size={12} />}
              </i>
              <span>
                <b>
                  {pending.length
                    ? "Changes saved on this device"
                    : "Ready to sync"}
                </b>
                <small>
                  {pending.length
                    ? `${pending.length} record${pending.length === 1 ? "" : "s"} waiting for a connection`
                    : "Your current records are up to date"}
                </small>
              </span>
            </div>
            {state.lastSynced && (
              <div>
                <i className="activity-good">
                  <Check size={12} />
                </i>
                <span>
                  <b>Last sync completed</b>
                  <small>
                    {new Date(state.lastSynced).toLocaleString("en-IN")}
                  </small>
                </span>
              </div>
            )}
          </div>
        </Card>
      </div>
      <div className="conflict-note">
        <span>
          <CircleHelp size={17} />
        </span>
        <div>
          <b>How we handle two edits</b>
          <p>
            If the same budget changes in two places, the most recently updated
            version is kept. Your original local copy stays safe until sync
            completes.
          </p>
        </div>
      </div>
    </>
  );
}

export function InsightsPage() {
  const records = useAppSelector((s) =>
    s.budget.records.filter((r) => !r.isDeleted),
  );
  const code = useAppSelector((s) => s.settings.currency);
  const [current, setCurrent] = useState(records[0]);
  const alerts = current ? anomalyRules(current) : [];
  const allRules = current ? anomalyRules(current) : [];
  return (
    <>
      <PageHeading
        eyebrow="A LITTLE MORE CLARITY"
        title="Patterns worth noticing."
      >
        <label className="select-month">
          <CalendarDays size={15} />
          <select
            value={current?.id ?? ""}
            onChange={(e) =>
              setCurrent(
                records.find((r) => r.id === e.target.value) ?? records[0],
              )
            }
          >
            {records.map((r) => (
              <option key={r.id} value={r.id}>
                {monthName(r.month)} {r.year}
              </option>
            ))}
          </select>
          <ChevronDown size={14} />
        </label>
      </PageHeading>
      <div className="insights-intro">
        <div>
          <span className="eyebrow">YOUR MONTHLY CHECK-IN</span>
          <h2>
            {alerts.length
              ? "A few things to keep an eye on."
              : "You’re finding a good rhythm."}
          </h2>
          <p>
            {alerts.length
              ? "These aren’t rules. They’re just a helpful nudge to check in with your plan."
              : "Your spending looks well balanced. Keep noticing the habits that are working."}
          </p>
        </div>
        <span className="insight-stamp">
          <Sparkles size={22} />
        </span>
      </div>
      {allRules.length ? (
        <div className="insight-grid">
          {allRules.map((a, i) => (
            <Card key={a.id} className={`insight-card ${a.severity}`}>
              <div className="insight-card-top">
                <span className="insight-category">
                  {a.id === "food"
                    ? "FOOD & GROCERIES"
                    : a.id === "subs"
                      ? "SUBSCRIPTIONS"
                      : a.id === "bills"
                        ? "MONTHLY BILLS"
                        : "TOTAL SPENDING"}
                </span>
                <span className={`severity-label ${a.severity}`}>
                  {a.severity === "red" ? "Needs attention" : "Worth a look"}
                </span>
              </div>
              <span className={`insight-big ${a.severity}`}>
                {a.id === "food"
                  ? `${Math.round((current.food / current.income) * 100)}%`
                  : a.id === "subs"
                    ? `${Math.round((current.subscriptions / current.income) * 100)}%`
                    : a.id === "bills"
                      ? `${Math.round((current.bills / current.income) * 100)}%`
                      : money(totalExpense(current), code)}
              </span>
              <h3>{a.message}</h3>
              <p>{a.suggestion}</p>
              <div className="insight-tip">
                <Lightbulb size={15} />
                <span>
                  A small adjustment today can make next month feel easier.
                </span>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="healthy-state">
          <span className="healthy-art">
            <Heart size={25} />
          </span>
          <div>
            <span className="eyebrow">A BALANCED MONTH</span>
            <h2>Healthy spending, steady progress.</h2>
            <p>
              No alerts for this month. Your choices are lining up with the plan
              you made.
            </p>
            <Button kind="secondary" to="/budget">
              Review your budget <ArrowRight size={14} />
            </Button>
          </div>
        </Card>
      )}
      <div className="insight-disclaimer">
        <ShieldCheck size={15} /> These are simple spending thresholds based on
        your income, not financial advice.
      </div>
    </>
  );
}

export function SettingsPage() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const code = useAppSelector((s) => s.settings.currency);
  const [tab, setTab] = useState("Profile");
  const [name, setName] = useState(user?.name ?? "");
  const records = useAppSelector((s) => s.budget.records);
  const tabs = ["Profile", "Preferences", "Data", "Security"];
  const exportJson = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          { exportedAt: new Date().toISOString(), user, budgets: records },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "budgetbox-backup.json";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Your data export is ready.");
  };
  return (
    <>
      <PageHeading eyebrow="MAKE IT YOURS" title="Settings and preferences." />
      <Card className="settings-card">
        <div className="settings-tabs">
          {tabs.map((t) => (
            <button
              className={tab === t ? "selected" : ""}
              onClick={() => setTab(t)}
              key={t}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="settings-body">
          {tab === "Profile" && (
            <>
              <SectionTitle
                title="Your profile"
                caption="The basics of your BudgetBox account."
              />
              <div className="profile-block">
                <div className="profile-avatar">
                  {(name || "P").slice(0, 1)}
                </div>
                <div>
                  <b>{name || "Your name"}</b>
                  <small>Profile photo · Update soon</small>
                </div>
                <Button
                  kind="secondary"
                  onClick={() =>
                    toast.info("Profile photo upload is coming soon.")
                  }
                >
                  Change photo
                </Button>
              </div>
              <div className="settings-fields">
                <Field
                  label="Full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <Field
                  label="Email address"
                  value={user?.email ?? ""}
                  readOnly
                />
                <Button
                  kind="secondary"
                  onClick={() => {
                    if (user) {
                      const updated = { ...user, name };
                      dispatch(setUser(updated));
                      void updateCachedUser(updated);
                      toast.success("Profile updated.");
                    }
                  }}
                >
                  Save profile
                </Button>
              </div>
            </>
          )}
          {tab === "Preferences" && (
            <>
              <SectionTitle
                title="Preferences"
                caption="Make BudgetBox feel like yours."
              />
              <div className="preference-row">
                <div>
                  <b>Appearance</b>
                  <small>Choose a theme that feels comfortable.</small>
                </div>
                <ThemeToggle />
              </div>
              <div className="preference-row">
                <div>
                  <b>Currency</b>
                  <small>Used across your budget and reports.</small>
                </div>
                <select
                  value={code}
                  onChange={(e) => dispatch(setCurrency(e.target.value))}
                >
                  <option value="INR">Indian Rupee (₹ INR)</option>
                  <option value="USD">US Dollar ($ USD)</option>
                  <option value="EUR">Euro (€ EUR)</option>
                  <option value="GBP">British Pound (£ GBP)</option>
                </select>
              </div>
            </>
          )}
          {tab === "Data" && (
            <>
              <SectionTitle
                title="Your data"
                caption="Take a copy or clear this device."
              />
              <div className="data-action">
                <span className="data-action-icon">
                  <Download size={18} />
                </span>
                <div>
                  <b>Export a backup</b>
                  <small>
                    Download your profile and budgets as a JSON file.
                  </small>
                </div>
                <Button kind="secondary" onClick={exportJson}>
                  Export JSON <Download size={14} />
                </Button>
              </div>
              <div className="data-action destructive">
                <span className="data-action-icon">
                  <Trash2 size={18} />
                </span>
                <div>
                  <b>Clear local data</b>
                  <small>Remove all saved budget data from this device.</small>
                </div>
                <Button
                  kind="danger"
                  onClick={() => {
                    if (
                      window.confirm(
                        "Clear all local budget data? This cannot be undone.",
                      )
                    ) {
                      if (!user) return;
                      void clearBudgets(user.id)
                        .then(() => {
                          dispatch(clearBudgetState());
                          toast.success("Local data cleared.");
                        })
                        .catch(() =>
                          toast.error("Local data could not be cleared."),
                        );
                    }
                  }}
                >
                  Clear data
                </Button>
              </div>
            </>
          )}
          {tab === "Security" && (
            <>
              <SectionTitle
                title="Security"
                caption="Keep your account protected."
              />
              <div className="security-row">
                <span className="data-action-icon">
                  <LockKeyhole size={18} />
                </span>
                <div>
                  <b>Password</b>
                  <small>Update your sign-in password.</small>
                </div>
                <Button kind="secondary" to="/settings/change-password">
                  Change password <ArrowRight size={14} />
                </Button>
              </div>
              <div className="security-row">
                <span className="data-action-icon">
                  <LogOut size={18} />
                </span>
                <div>
                  <b>Sign out</b>
                  <small>Sign out of this device.</small>
                </div>
                <Button
                  kind="quiet"
                  onClick={() => {
                    void logoutRequest().finally(() => {
                      dispatch(setUser(null));
                      toast.success("You’re signed out.");
                    });
                  }}
                >
                  Sign out
                </Button>
              </div>
            </>
          )}
        </div>
      </Card>
      <p className="settings-foot">
        <ShieldCheck size={14} /> BudgetBox keeps your finances private, always.
      </p>
    </>
  );
}
export function ChangePasswordPage() {
  const dispatch = useAppDispatch();
  const nav = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (newPassword !== confirmation) {
      toast.error("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      await changePasswordRequest(currentPassword, newPassword);
      toast.success("Password changed successfully.");
      await clearLocalSession();
      dispatch(setUser(null));
      nav("/login");
    } catch {
      toast.error(
        "Couldn’t change your password. Check your current password.",
      );
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <>
      <PageHeading eyebrow="ACCOUNT SECURITY" title="Change your password." />
      <Card className="change-password">
        <SectionTitle
          title="Choose a new password"
          caption="Use at least 8 characters. A mix of letters and numbers is stronger."
        />
        <form onSubmit={submit}>
          <PasswordField
            label="Current password"
            placeholder="Enter current password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
          <PasswordField
            label="New password"
            placeholder="At least 8 characters"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
          <PasswordField
            label="Confirm new password"
            placeholder="Enter it again"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
          />
          <div className="form-actions">
            <Button kind="secondary" to="/settings">
              Cancel
            </Button>
            <button className="button primary" disabled={submitting}>
              Update password <ArrowRight size={15} />
            </button>
          </div>
        </form>
      </Card>
    </>
  );
}
export function NotFoundPage() {
  return (
    <div className="not-found">
      <span className="not-found-mark">404</span>
      <span className="eyebrow">THIS PAGE TOOK A DETOUR</span>
      <h1>We can’t find that page.</h1>
      <p>It may have moved, or the address might be a little off.</p>
      <Button to="/dashboard">
        Back to dashboard <ArrowRight size={15} />
      </Button>
    </div>
  );
}
