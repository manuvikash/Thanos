import { useState } from "react";
import { useTheme } from '@/contexts/ThemeContext';

const API_URL = import.meta.env.VITE_API_URL;
const API_KEY = import.meta.env.VITE_API_KEY;

export default function ConnectAws() {
  const [accountId, setAccountId] = useState("");
  const [region, setRegion] = useState("us-east-1");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const { currentTheme } = useTheme();
  const isLight = currentTheme.id === 'ocean-light';

  // Default regions to scan (all available regions)
  const defaultRegions = [
    "us-east-1","us-east-2","us-west-1","us-west-2",
    "eu-west-1","eu-central-1","ap-south-1","ap-southeast-1"
  ];

  async function openQuickCreate() {
    setMsg(null);
    setBusy(true);
    try {
      const r = await fetch(`${API_URL}/onboarding/quick-create-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": API_KEY },
        body: JSON.stringify({ accountId, region })
      });
      const text = await r.text();
      let j: any = {};
      try { j = text ? JSON.parse(text) : {}; } catch (e) { j = { message: text || r.statusText }; }
      setBusy(false);
      if (!r.ok) {
        const errMsg = j.error || j.message || `${r.status} ${r.statusText}`;
        setMsg(`Failed to build Quick-Create URL: ${errMsg}`);
        console.error('QuickCreate error', r.status, j);
        return;
      }
      
      // Open AWS sign-in page that redirects to CloudFormation
      const signInUrl = j.signInUrl;
      const targetAccountId = j.accountId;
      
      if (!signInUrl) {
        setMsg("Error: No sign-in URL returned from API");
        return;
      }

      // Open sign-in page - user will be logged out and prompted to sign in to target account
      window.open(signInUrl, '_blank', 'noopener');

      setMsg(`Opening AWS sign-in. Please sign in to AWS account ${targetAccountId}, then you'll be redirected to CloudFormation. Review the template, acknowledge IAM capabilities, and create the stack. After completion, click 'Verify & Save'.`);
    } catch (err: any) {
      setBusy(false);
      console.error('QuickCreate fetch failed', err);
      setMsg(`Failed to build Quick-Create URL: ${err?.message || err}`);
    }
  }

  async function verify() {
    setMsg(null);
    setBusy(true);
    try {
      const r = await fetch(`${API_URL}/onboarding/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": API_KEY },
        // Verify against the region the user selected (the role is global, but verifying region-specific access helps)
        body: JSON.stringify({ accountId, regions: [region] })
      });
      const text = await r.text();
      let j: any = {};
      try { j = text ? JSON.parse(text) : {}; } catch (e) { j = { message: text || r.statusText }; }
      setBusy(false);
      if (!r.ok) {
        if (j.error === "ASSUME_ROLE_FAILED") {
          setMsg("Role not ready yet. Wait ~30–60s and try Verify again.");
        } else {
          setMsg(`Verification failed: ${j.error || j.message || r.statusText}`);
        }
        console.error('Verify error', r.status, j);
        return;
      }
      setMsg("✅ Connected! Customer saved. You can start scanning.");
    } catch (err: any) {
      setBusy(false);
      console.error('Verify fetch failed', err);
      setMsg(`Verification failed: ${err?.message || err}`);
    }
  }

  const containerClass = isLight
    ? 'rounded-2xl border p-6 space-y-4 bg-white shadow-sm text-gray-900'
    : 'rounded-2xl border p-6 space-y-4 bg-[#102020]/50 border-neutral-800 text-neutral-100';

  const primaryButtonClass = isLight
    ? 'rounded-2xl px-4 py-2 bg-black text-white disabled:opacity-50'
    : 'rounded-2xl px-4 py-2 bg-cyan-500 text-white disabled:opacity-50';

  const secondaryButtonClass = isLight
    ? 'rounded-2xl px-4 py-2 border text-gray-700 disabled:opacity-50'
    : 'rounded-2xl px-4 py-2 border border-neutral-700 text-neutral-200 disabled:opacity-50';

  return (
    <div className={containerClass}>
      <h2 className="text-xl font-semibold">Connect AWS</h2>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
             <label className="text-sm font-medium">AWS Account ID</label>
             <input value={accountId} onChange={e=>setAccountId(e.target.value)}
               placeholder="123456789012"
               className="mt-1 w-full rounded-lg border px-3 py-2 placeholder-gray-400 bg-transparent" />
        </div>

        <div>
          <label className="text-sm font-medium">Open Console In Region</label>
          <select value={region} onChange={e=>setRegion(e.target.value)}
                  className="mt-1 w-full rounded-lg border px-3 py-2 bg-transparent">
            {defaultRegions.map(r => <option key={r}>{r}</option>)}
          </select>
          <p className="text-xs mt-1 text-neutral-400">This just selects which console tab opens; the role is global.</p>
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={openQuickCreate}
                disabled={busy || !/^\d{12}$/.test(accountId)}
                className={primaryButtonClass}>
          Create Role via CloudFormation
        </button>

        <button onClick={verify}
                disabled={busy || !/^\d{12}$/.test(accountId)}
                className={secondaryButtonClass}>
          I created the role → Verify & Save
        </button>
      </div>

      {msg && <p className="text-sm text-neutral-300">{msg}</p>}
    </div>
  );
}
