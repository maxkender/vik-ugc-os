import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { RequireRole, useAuth } from "./lib/auth";
import { AdminLayout } from "./components/layout/AdminLayout";
import { Spinner } from "./components/ui";

const Login = lazy(() => import("./pages/Login"));
const Landing = lazy(() => import("./pages/public/Landing"));
const Apply = lazy(() => import("./pages/public/Apply"));
const Sign = lazy(() => import("./pages/public/Sign"));
const CreatorLayout = lazy(() => import("./pages/creator/CreatorLayout"));
const CreatorToday = lazy(() => import("./pages/creator/Today"));
const CreatorStats = lazy(() => import("./pages/creator/Stats"));
const CreatorPayments = lazy(() => import("./pages/creator/Payments"));
const Library = lazy(() => import("./pages/admin/Library"));
const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const Creators = lazy(() => import("./pages/admin/Creators"));
const AssistantLog = lazy(() => import("./pages/admin/AssistantLog"));
const SettingsContent = lazy(() => import("./pages/admin/settings/Content"));
const CreatorPreview = lazy(() => import("./pages/admin/CreatorPreview"));
const Competitors = lazy(() => import("./pages/admin/Competitors"));
const Onboarding = lazy(() => import("./pages/admin/Onboarding"));
const CreatorAccount = lazy(() => import("./pages/creator/Account"));
const WinningAds = lazy(() => import("./pages/admin/WinningAds"));
const Agents = lazy(() => import("./pages/admin/Agents"));
const Legal = lazy(() => import("./pages/public/Legal"));
const Briefs = lazy(() => import("./pages/admin/Briefs"));
const Assets = lazy(() => import("./pages/admin/Assets"));
const Candidates = lazy(() => import("./pages/admin/Candidates"));
const Campaigns = lazy(() => import("./pages/admin/Campaigns"));
const Creatives = lazy(() => import("./pages/admin/Creatives"));
const Posters = lazy(() => import("./pages/admin/Posters"));
const Payroll = lazy(() => import("./pages/admin/Payroll"));
const PaidAds = lazy(() => import("./pages/admin/PaidAds"));
const SettingsApps = lazy(() => import("./pages/admin/settings/Apps"));
const SettingsCompetitors = lazy(() => import("./pages/admin/settings/Competitors"));
const SettingsCountries = lazy(() => import("./pages/admin/settings/Countries"));
const SettingsCategories = lazy(() => import("./pages/admin/settings/Categories"));
const SettingsEmails = lazy(() => import("./pages/admin/settings/Emails"));
const SettingsContracts = lazy(() => import("./pages/admin/settings/Contracts"));
const SettingsIntegrations = lazy(() => import("./pages/admin/settings/Integrations"));
const SettingsTeam = lazy(() => import("./pages/admin/settings/Team"));

function Home() {
  const { profile, session, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!session) return <Navigate to="/login" replace />;
  return <Navigate to={profile?.role === "poster" ? "/creator" : "/admin"} replace />;
}

const Loading = () => <div className="flex h-full items-center justify-center"><Spinner /></div>;
const staff = ["admin", "recruiter", "controller"] as const;
const recruiting = ["admin", "recruiter"] as const;
const adminOnly = ["admin"] as const;

export function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/join" element={<Landing />} />
        <Route path="/join/:country" element={<Landing />} />
        <Route path="/apply" element={<Apply />} />
        <Route path="/apply/:country" element={<Apply />} />
        <Route path="/sign/:token" element={<Sign />} />
        <Route path="/privacy" element={<Legal />} />
        <Route path="/terms" element={<Legal />} />

        <Route path="/creator" element={<RequireRole roles={["poster", "admin"]}><CreatorLayout /></RequireRole>}>
          <Route index element={<CreatorToday />} />
          <Route path="stats" element={<CreatorStats />} />
          <Route path="payments" element={<CreatorPayments />} />
          <Route path="account" element={<CreatorAccount />} />
        </Route>

        <Route path="/admin" element={<RequireRole roles={[...staff]}><AdminLayout /></RequireRole>}>
          <Route index element={<Dashboard />} />
          <Route path="library" element={<Library />} />
          <Route path="winning-ads" element={<WinningAds />} />
          <Route path="competitors" element={<Competitors />} />
          <Route path="agents" element={<RequireRole roles={[...adminOnly]}><Agents /></RequireRole>} />
          <Route path="briefs" element={<Briefs />} />
          <Route path="assets" element={<Assets />} />
          <Route path="recruitment" element={<Navigate to="candidates" replace />} />
          <Route path="recruitment/candidates" element={<RequireRole roles={[...recruiting]}><Candidates /></RequireRole>} />
          <Route path="recruitment/onboarding" element={<RequireRole roles={[...recruiting]}><Onboarding /></RequireRole>} />
          <Route path="recruitment/campaigns" element={<RequireRole roles={[...adminOnly]}><Campaigns /></RequireRole>} />
          <Route path="recruitment/creatives" element={<RequireRole roles={[...adminOnly]}><Creatives /></RequireRole>} />
          <Route path="posters" element={<Posters />} />
          <Route path="creators" element={<RequireRole roles={[...staff]}><Creators /></RequireRole>} />
          <Route path="creators/:id" element={<RequireRole roles={[...staff]}><Creators /></RequireRole>} />
          <Route path="assistant" element={<RequireRole roles={[...recruiting]}><AssistantLog /></RequireRole>} />
          <Route path="preview/creator" element={<RequireRole roles={[...adminOnly]}><CreatorPreview /></RequireRole>} />
          <Route path="payroll" element={<RequireRole roles={[...adminOnly]}><Payroll /></RequireRole>} />
          <Route path="paid-ads" element={<RequireRole roles={[...adminOnly]}><PaidAds /></RequireRole>} />
          <Route path="settings" element={<Navigate to="apps" replace />} />
          <Route path="settings/apps" element={<RequireRole roles={[...adminOnly]}><SettingsApps /></RequireRole>} />
          <Route path="settings/competitors" element={<RequireRole roles={[...adminOnly]}><SettingsCompetitors /></RequireRole>} />
          <Route path="settings/countries" element={<RequireRole roles={[...adminOnly]}><SettingsCountries /></RequireRole>} />
          <Route path="settings/categories" element={<RequireRole roles={[...adminOnly]}><SettingsCategories /></RequireRole>} />
          <Route path="settings/emails" element={<RequireRole roles={[...adminOnly]}><SettingsEmails /></RequireRole>} />
          <Route path="settings/contracts" element={<RequireRole roles={[...adminOnly]}><SettingsContracts /></RequireRole>} />
          <Route path="settings/integrations" element={<RequireRole roles={[...adminOnly]}><SettingsIntegrations /></RequireRole>} />
          <Route path="settings/team" element={<RequireRole roles={[...adminOnly]}><SettingsTeam /></RequireRole>} />
          <Route path="settings/content" element={<RequireRole roles={[...adminOnly]}><SettingsContent /></RequireRole>} />
        </Route>
        <Route path="*" element={<div className="p-10 text-center text-muted-foreground">404</div>} />
      </Routes>
    </Suspense>
  );
}
