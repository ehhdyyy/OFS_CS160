import { useEffect, useState } from 'react';
import AdminShell from '../AdminShell';

const API_BASE = 'http://localhost:8000';

export default function InviteCodesPage() {
  const [codes, setCodes] = useState([]);
  const [isLeadAdmin, setIsLeadAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const [genRole, setGenRole] = useState('employee');
  const [genNote, setGenNote] = useState('');
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState('');
  const [newCode, setNewCode] = useState('');

  async function loadCodes() {
    try {
      setIsLoading(true);
      setErrorMessage('');

      const res = await fetch(`${API_BASE}/api/admin/invite-codes`, {
        credentials: 'include',
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.detail || 'Failed to load invite codes');
      }

      const payload = await res.json();
      setCodes(payload.codes || []);
      setIsLeadAdmin(payload.is_lead_admin || false);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load invite codes');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadCodes();
  }, []);

  async function handleGenerate(event) {
    event.preventDefault();
    setGenLoading(true);
    setGenError('');
    setNewCode('');

    try {
      const res = await fetch(`${API_BASE}/api/admin/invite-codes`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: genRole,
          note: genNote.trim() || null,
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.detail || 'Failed to generate code');
      }

      const payload = await res.json();
      setNewCode(payload.code);
      setGenNote('');
      await loadCodes();
    } catch (err) {
      setGenError(err.message || 'Failed to generate code');
    } finally {
      setGenLoading(false);
    }
  }

  async function handleRevoke(id) {
    if (!window.confirm('Revoke this invite code? It will no longer be usable.')) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/admin/invite-codes/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.detail || 'Failed to revoke code');
      }

      await loadCodes();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to revoke code');
    }
  }

  async function handleCopyCode() {
    if (!newCode) {
      return;
    }

    try {
      await navigator.clipboard.writeText(newCode);
    } catch {
      setGenError('Could not copy code automatically. Please copy it manually.');
    }
  }

  const unusedCount = codes.filter((code) => !code.used).length;
  const usedCount = codes.filter((code) => code.used).length;

  return (
    <AdminShell
      activeNav="invite-codes"
      title="Invite Codes"
      description="Generate and manage registration codes for employees and managers."
      topSearchPlaceholder="Search invite codes..."
      quickPanel={{
        title: 'Overview',
        items: [
          {
            label: 'Active Codes',
            value: String(unusedCount),
            badgeClassName: 'bg-green-100 text-green-700',
          },
          {
            label: 'Used Codes',
            value: String(usedCount),
            badgeClassName: 'bg-gray-100 text-gray-600',
          },
        ],
      }}
    >
      {errorMessage ? (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <section className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-base font-semibold text-gray-800">Generate New Code</h3>

        <form onSubmit={handleGenerate} className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600" htmlFor="gen-role">
              Role
            </label>
            <select
              id="gen-role"
              value={genRole}
              onChange={(event) => setGenRole(event.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
            >
              <option value="employee">Employee</option>
              {isLeadAdmin ? <option value="manager">Manager</option> : null}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600" htmlFor="gen-note">
              Note (optional)
            </label>
            <input
              id="gen-note"
              type="text"
              value={genNote}
              onChange={(event) => setGenNote(event.target.value)}
              placeholder="e.g. For John's onboarding"
              className="w-64 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={genLoading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {genLoading ? 'Generating...' : 'Generate Code'}
          </button>
        </form>

        {genError ? <p className="mt-3 text-sm text-red-600">{genError}</p> : null}

        {newCode ? (
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
            <i className="fas fa-check-circle text-green-600" aria-hidden="true" />
            <div>
              <p className="text-xs text-green-700">Code generated — share this with the new hire:</p>
              <p className="mt-1 font-mono text-lg font-bold tracking-widest text-green-800">{newCode}</p>
            </div>
            <button
              type="button"
              onClick={handleCopyCode}
              className="ml-auto rounded-lg border border-green-300 px-3 py-1.5 text-xs text-green-700 hover:bg-green-100"
            >
              <i className="fas fa-copy mr-1" aria-hidden="true" />
              Copy
            </button>
          </div>
        ) : null}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-4">
          <h3 className="text-base font-semibold text-gray-800">
            {isLeadAdmin ? 'All Invite Codes' : 'Your Invite Codes'}
          </h3>
        </div>

        {isLoading ? (
          <div className="px-6 py-10 text-center text-sm text-gray-500">Loading...</div>
        ) : codes.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-gray-500">No invite codes yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  <th className="px-6 py-3">Code</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Note</th>
                  {isLeadAdmin ? <th className="px-6 py-3">Created By</th> : null}
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Used By</th>
                  <th className="px-6 py-3">Created</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {codes.map((code) => (
                  <tr key={code.id} className={code.used ? 'bg-gray-50/50 opacity-60' : ''}>
                    <td className="px-6 py-4 font-mono font-semibold text-gray-800">{code.code}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          code.role === 'manager'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {code.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">{code.note || '—'}</td>
                    {isLeadAdmin ? (
                      <td className="px-6 py-4 text-gray-600">{code.created_by}</td>
                    ) : null}
                    <td className="px-6 py-4">
                      {code.used ? (
                        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
                          Used
                        </span>
                      ) : (
                        <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-500">{code.used_by || '—'}</td>
                    <td className="px-6 py-4 text-gray-500">{new Date(code.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      {!code.used ? (
                        <button
                          type="button"
                          onClick={() => handleRevoke(code.id)}
                          className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50"
                        >
                          Revoke
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AdminShell>
  );
}