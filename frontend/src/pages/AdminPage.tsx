import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import {
  BarChart3, Check, Copy, ExternalLink, Shield, Trash2, Users, Briefcase, Gift, X, MessageSquare,
} from 'lucide-react';
import type { AdminConversation, Message, MessageReport } from '../types';
import { gold } from '../styles/design-tokens';

const card: React.CSSProperties = { background: 'rgba(21,35,50,0.7)', padding: 20 };

type AdminTab = 'overview' | 'verifications' | 'jobs' | 'users' | 'messages' | 'invites' | 'audit';

interface BetaMetrics {
  periodDays: number;
  tasksPosted: number;
  tasksOpen: number;
  applicationsTotal: number;
  pendingApplications: number;
  applyCreditsSpent: number;
  refundTransactions: number;
  avgApplicationsPerOpenJob: number;
  selectionRatePercent: number;
  completionRatePercent: number;
  pendingVerifications: number;
  recentTasks: Array<{ id: string; title: string; status: string; applications: number; createdAt: string }>;
}

interface PendingVerification {
  id: string;
  userId: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  serviceTypes: string[];
  licenseDocumentUrl?: string | null;
  licenseNumber?: string | null;
  updatedAt: string;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
}

interface AdminUser {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  role: string;
  createdAt: string;
  isVerified: boolean;
  suspendedAt?: string | null;
  suspensionReason?: string | null;
}

interface AdminJob {
  id: string;
  title: string;
  status: string;
  serviceType: string;
  city?: string | null;
  estimatedPrice: number;
  applications: number;
  clientEmail: string;
  clientName: string;
  createdAt: string;
}

const REJECTION_PRESETS = [
  'Document illisible (flou, coupé, sombre).',
  'Document expiré ou périmé.',
  'Photo d\'écran plutôt que photo du document original.',
  'Le nom ne correspond pas au profil.',
  'Document dans une langue non reconnue (permis hors Québec non couvert pour l\'instant).',
];

const TABS: { id: AdminTab; label: string }[] = [
  { id: 'overview', label: 'Vue d\'ensemble' },
  { id: 'verifications', label: 'Vérifications' },
  { id: 'jobs', label: 'Tâches' },
  { id: 'users', label: 'Utilisateurs' },
  { id: 'messages', label: 'Messages' },
  { id: 'invites', label: 'Invitations' },
  { id: 'audit', label: 'Audit' },
];

const ROLE_LABELS: Record<string, string> = {
  client: 'Client',
  provider: 'Travailleur',
  admin: 'Admin',
};

export function AdminPage() {
  const { addToast } = useToast();
  const { profile } = useAuth();
  const [tab, setTab] = useState<AdminTab>('overview');
  const [metrics, setMetrics] = useState<BetaMetrics | null>(null);
  const [pending, setPending] = useState<PendingVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<PendingVerification | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectConfirm, setRejectConfirm] = useState(false);

  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditAction, setAuditAction] = useState('');
  const [auditLoading, setAuditLoading] = useState(false);

  const [adminJobs, setAdminJobs] = useState<AdminJob[]>([]);
  const [jobsPage, setJobsPage] = useState(1);
  const [jobsTotal, setJobsTotal] = useState(0);
  const [jobsStatus, setJobsStatus] = useState('');
  const [jobsQuery, setJobsQuery] = useState('');
  const [jobsLoading, setJobsLoading] = useState(false);

  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersRole, setUsersRole] = useState('');
  const [usersQuery, setUsersQuery] = useState('');
  const [usersLoading, setUsersLoading] = useState(false);

  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  const [msgConversations, setMsgConversations] = useState<AdminConversation[]>([]);
  const [msgConvPage, setMsgConvPage] = useState(1);
  const [, setMsgConvTotal] = useState(0);
  const [msgConvQuery, setMsgConvQuery] = useState('');
  const [msgConvLoading, setMsgConvLoading] = useState(false);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [selectedConvMessages, setSelectedConvMessages] = useState<Message[]>([]);
  const [selectedConvMeta, setSelectedConvMeta] = useState<{
    client: { email: string; firstName?: string | null; lastName?: string | null };
    provider: { email: string; firstName?: string | null; lastName?: string | null };
    job?: { title: string };
    status: string;
  } | null>(null);
  const [msgReports, setMsgReports] = useState<MessageReport[]>([]);
  const [msgReportsTotal, setMsgReportsTotal] = useState(0);
  const [msgReportsPage, setMsgReportsPage] = useState(1);
  const [msgReportStatus, setMsgReportStatus] = useState('pending');
  const [msgReportsLoading, setMsgReportsLoading] = useState(false);
  const [msgSubTab, setMsgSubTab] = useState<'conversations' | 'reports'>('reports');

  const loadCore = async () => {
    setLoading(true);
    try {
      const [m, p] = await Promise.all([api.getAdminMetrics(), api.getPendingVerifications()]);
      setMetrics(m);
      setPending(p);
    } catch {
      addToast('Accès admin requis', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadAudit = async () => {
    setAuditLoading(true);
    try {
      const data = await api.getAuditLogs({ page: auditPage, action: auditAction || undefined });
      setAuditLogs(data.logs || []);
      setAuditTotal(data.total || 0);
    } catch {
      setAuditLogs([]);
    } finally {
      setAuditLoading(false);
    }
  };

  const loadJobs = async () => {
    setJobsLoading(true);
    try {
      const data = await api.getAdminJobs({
        page: jobsPage,
        status: jobsStatus || undefined,
        q: jobsQuery || undefined,
      });
      setAdminJobs(data.jobs);
      setJobsTotal(data.total);
    } catch {
      addToast('Erreur chargement tâches', 'error');
    } finally {
      setJobsLoading(false);
    }
  };

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const data = await api.getAdminUsers({
        page: usersPage,
        role: usersRole || undefined,
        q: usersQuery || undefined,
      });
      setAdminUsers(data.users);
      setUsersTotal(data.total);
    } catch {
      addToast('Erreur chargement utilisateurs', 'error');
    } finally {
      setUsersLoading(false);
    }
  };

  const [digestSending, setDigestSending] = useState(false);
  const [autoTabDone, setAutoTabDone] = useState(false);

  useEffect(() => {
    loadCore();
  }, []);

  // Soft-launch: open Vérifications first when queue is non-empty
  useEffect(() => {
    if (!loading && !autoTabDone && pending.length > 0) {
      setTab('verifications');
      setAutoTabDone(true);
    }
  }, [loading, pending.length, autoTabDone]);

  const sendVerificationDigest = async () => {
    setDigestSending(true);
    try {
      const res = await api.triggerVerificationDigest();
      if (res.sent) {
        addToast(
          `Digest envoyé : ${res.count} en attente${res.overdue ? ` (${res.overdue} >48h)` : ''}`,
          'success',
        );
      } else {
        addToast(
          res.count === 0
            ? 'Aucun dossier en attente — digest non envoyé'
            : 'Digest non envoyé (vérifier ADMIN_EMAIL / RESEND)',
          'error',
        );
      }
    } catch {
      addToast('Échec envoi digest', 'error');
    } finally {
      setDigestSending(false);
    }
  };

  const loadMsgConversations = async () => {
    setMsgConvLoading(true);
    try {
      const data = await api.getAdminConversations({
        page: msgConvPage,
        q: msgConvQuery || undefined,
      });
      setMsgConversations(data.conversations);
      setMsgConvTotal(data.total);
    } catch {
      addToast('Erreur chargement conversations', 'error');
    } finally {
      setMsgConvLoading(false);
    }
  };

  const loadMsgReports = async () => {
    setMsgReportsLoading(true);
    try {
      const data = await api.getMessageReports({
        page: msgReportsPage,
        status: msgReportStatus || undefined,
      });
      setMsgReports(data.reports);
      setMsgReportsTotal(data.total);
    } catch {
      addToast('Erreur chargement signalements', 'error');
    } finally {
      setMsgReportsLoading(false);
    }
  };

  const openAdminConversation = async (id: string) => {
    setSelectedConvId(id);
    try {
      const data = await api.getAdminConversation(id);
      setSelectedConvMessages(data.messages);
      setSelectedConvMeta({
        client: data.client,
        provider: data.provider,
        job: data.job,
        status: data.status,
      });
    } catch {
      addToast('Erreur chargement fil', 'error');
    }
  };

  const handleResolveReport = async (reportId: string, status: 'reviewed' | 'dismissed') => {
    const note = window.prompt('Note admin (optionnel):') ?? undefined;
    setProcessing(reportId);
    try {
      await api.resolveMessageReport(reportId, status, note || undefined);
      addToast(status === 'reviewed' ? 'Signalement traité' : 'Signalement rejeté', 'success');
      await loadMsgReports();
    } catch {
      addToast('Erreur', 'error');
    } finally {
      setProcessing(null);
    }
  };

  useEffect(() => {
    if (tab === 'audit') loadAudit();
    if (tab === 'jobs') loadJobs();
    if (tab === 'users') loadUsers();
    if (tab === 'messages') {
      loadMsgReports();
      loadMsgConversations();
    }
  }, [tab, auditPage, auditAction, jobsPage, jobsStatus, usersPage, usersRole, msgConvPage, msgReportsPage, msgReportStatus]);

  useEffect(() => {
    const interval = setInterval(loadCore, 60000);
    return () => clearInterval(interval);
  }, []);

  const approve = async (providerId: string) => {
    setProcessing(providerId);
    try {
      await api.approveVerification(providerId);
      addToast('Travailleur vérifié', 'success');
      await loadCore();
    } catch {
      addToast('Erreur', 'error');
    } finally {
      setProcessing(null);
    }
  };

  const reject = async () => {
    if (!rejecting) return;
    if (!rejectConfirm) {
      setRejectConfirm(true);
      return;
    }
    const reason = rejectReason.trim();
    if (!reason) {
      addToast('Motif requis pour rejeter', 'error');
      return;
    }
    setProcessing(rejecting.id);
    try {
      await api.rejectVerification(rejecting.id, reason);
      addToast('Document rejeté — motif envoyé par courriel', 'info');
      setRejecting(null);
      setRejectReason('');
      setRejectConfirm(false);
      await loadCore();
    } catch {
      addToast('Erreur', 'error');
    } finally {
      setProcessing(null);
    }
  };

  const cancelReject = () => {
    setRejecting(null);
    setRejectReason('');
    setRejectConfirm(false);
  };

  const handleJobAction = async (job: AdminJob) => {
    const isPending = job.status === 'pending';
    const msg = isPending
      ? 'Supprimer cette tâche? Les candidats seront remboursés.'
      : 'Annuler cette tâche?';
    if (!window.confirm(msg)) return;
    setProcessing(job.id);
    try {
      if (isPending) await api.deleteJob(job.id);
      else await api.cancelJob(job.id);
      addToast(isPending ? 'Tâche supprimée' : 'Tâche annulée', 'success');
      await loadJobs();
      await loadCore();
    } catch {
      addToast('Action impossible', 'error');
    } finally {
      setProcessing(null);
    }
  };

  const handleSuspend = async (user: AdminUser) => {
    const reason = window.prompt(
      `Motif de suspension pour ${user.email} (optionnel) :`,
      '',
    );
    if (reason === null) return;
    setProcessing(user.id);
    try {
      await api.suspendUser(user.id, reason.trim() || undefined);
      addToast('Compte suspendu', 'success');
      await loadUsers();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      addToast(msg ?? 'Erreur', 'error');
    } finally {
      setProcessing(null);
    }
  };

  const handleUnsuspend = async (user: AdminUser) => {
    if (!window.confirm(`Réactiver le compte ${user.email} ?`)) return;
    setProcessing(user.id);
    try {
      await api.unsuspendUser(user.id);
      addToast('Compte réactivé', 'success');
      await loadUsers();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      addToast(msg ?? 'Erreur', 'error');
    } finally {
      setProcessing(null);
    }
  };

  const handleRoleChange = async (userId: string, role: string) => {
    if (!window.confirm(`Changer le rôle vers « ${ROLE_LABELS[role] ?? role} » ?`)) return;
    setProcessing(userId);
    try {
      await api.updateUserRole(userId, role);
      addToast('Rôle mis à jour', 'success');
      await loadUsers();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      addToast(msg ?? 'Erreur', 'error');
    } finally {
      setProcessing(null);
    }
  };

  const handleSeedDemo = async () => {
    if (!window.confirm('Rotation des tâches démo? Les jobs ouverts des comptes démo seront remplacés par le jeu actuel.')) return;
    setSeeding(true);
    try {
      const result = await api.seedDemoJobs();
      const parts = [
        `${result.created} créée(s)`,
        result.updated ? `${result.updated} mise(s) à jour` : null,
        result.cancelled ? `${result.cancelled} ancienne(s) retirée(s)` : null,
        result.rotationIndex != null ? `jeu ${result.rotationIndex + 1}` : null,
      ].filter(Boolean);
      addToast(parts.join(' · '), 'success');
      await loadCore();
      if (tab === 'jobs') await loadJobs();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      addToast(msg ?? 'Erreur', 'error');
    } finally {
      setSeeding(false);
    }
  };

  const handleGenerateInvite = async () => {
    setProcessing('invite');
    try {
      const result = await api.generateInvite();
      setInviteCode(result.code);
      addToast('Code généré', 'success');
    } catch {
      addToast('Erreur', 'error');
    } finally {
      setProcessing(null);
    }
  };

  const copyInvite = async () => {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(inviteCode);
      addToast('Code copié', 'success');
    } catch {
      addToast('Copie impossible', 'error');
    }
  };

  if (loading) {
    return (
      <div className="leather" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid rgba(217,179,140,0.2)', borderBottomColor: gold, animation: 'spin 0.9s linear infinite' }} />
      </div>
    );
  }

  return (
    <div className="leather admin-page" style={{ minHeight: '100vh' }}>
      <div className="admin-page-inner" style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <BarChart3 className="w-8 h-8" style={{ color: gold }} />
            <div>
              <h1 className="serif cream-hi" style={{ fontSize: 28, fontWeight: 900 }}>Administration</h1>
              <p className="body-f muted2" style={{ fontSize: 14 }}>
                {profile?.firstName} {profile?.lastName} · {profile?.email}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link to="/jobs" className="ghost-btn" style={{ padding: '8px 14px', fontSize: 13, textDecoration: 'none' }}>
              Voir le tableau des jobs
            </Link>
            <button
              type="button"
              disabled={seeding}
              onClick={handleSeedDemo}
              className="gold-btn"
              style={{ padding: '8px 14px', fontSize: 13 }}
            >
              {seeding ? 'Restauration…' : 'Restaurer démos'}
            </button>
          </div>
        </div>

        {pending.length > 0 && (
          <div
            className="stitch-box"
            style={{
              ...card,
              marginBottom: 16,
              borderColor: 'rgba(184,123,68,0.55)',
              background: 'rgba(184,123,68,0.12)',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 12,
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <p className="serif cream-hi" style={{ fontWeight: 800, fontSize: 16, margin: 0 }}>
                🔔 {pending.length} pièce(s) d&apos;identité à vérifier
              </p>
              <p className="body-f muted2" style={{ fontSize: 13, margin: '6px 0 0' }}>
                SLA soft-launch : &lt; 24 h. Sans approbation, les founding taskers ne peuvent pas postuler.
              </p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <button
                type="button"
                className="gold-btn"
                style={{ padding: '8px 14px', fontSize: 13 }}
                onClick={() => setTab('verifications')}
              >
                Ouvrir la file
              </button>
              <button
                type="button"
                className="ghost-btn"
                disabled={digestSending}
                style={{ padding: '8px 14px', fontSize: 13 }}
                onClick={sendVerificationDigest}
              >
                {digestSending ? 'Envoi…' : 'Envoyer digest email'}
              </button>
            </div>
          </div>
        )}

        <div className="admin-tabs" style={{ display: 'flex', gap: 8, flexWrap: 'nowrap', marginBottom: 24 }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={tab === t.id ? 'gold-btn' : 'ghost-btn'}
              style={{ padding: '8px 16px', fontSize: 13 }}
            >
              {t.label}
              {t.id === 'verifications' && pending.length > 0 && ` (${pending.length})`}
              {t.id === 'messages' && msgReports.filter((r) => r.status === 'pending').length > 0
                && ` (${msgReports.filter((r) => r.status === 'pending').length})`}
            </button>
          ))}
        </div>

        {tab === 'overview' && metrics && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 28 }}>
              {[
                { label: 'Tâches publiées', value: metrics.tasksPosted },
                { label: 'Ouvertes', value: metrics.tasksOpen },
                { label: 'Candidatures', value: metrics.applicationsTotal },
                { label: 'En attente', value: metrics.pendingApplications },
                { label: 'Moy. candidatures/job', value: metrics.avgApplicationsPerOpenJob },
                { label: 'Taux sélection', value: `${metrics.selectionRatePercent}%` },
                { label: 'Taux complétion', value: `${metrics.completionRatePercent}%` },
                { label: 'Remboursements', value: metrics.refundTransactions },
                {
                  label: 'ID à vérifier',
                  value: metrics.pendingVerifications,
                  highlight: metrics.pendingVerifications > 0,
                  onClick: () => setTab('verifications'),
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="stitch-box"
                  role={s.onClick ? 'button' : undefined}
                  onClick={s.onClick}
                  style={{
                    ...card,
                    cursor: s.onClick ? 'pointer' : undefined,
                    borderColor: s.highlight ? 'rgba(184,123,68,0.55)' : undefined,
                    background: s.highlight ? 'rgba(184,123,68,0.12)' : card.background,
                  }}
                >
                  <p className="body-f muted2" style={{ fontSize: 12 }}>{s.label}</p>
                  <p className="serif cream-hi" style={{ fontSize: 24, fontWeight: 900 }}>{s.value}</p>
                </div>
              ))}
            </div>
            {metrics.recentTasks.length > 0 && (
              <div className="stitch-box" style={card}>
                <h2 className="serif cream-hi" style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Tâches récentes</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {metrics.recentTasks.map((t) => (
                    <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 14 }}>
                      <Link to={`/jobs/${t.id}`} className="body-f cream-hi" style={{ textDecoration: 'none' }}>{t.title}</Link>
                      <span className="body-f muted2">{t.applications} candid. · {t.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {tab === 'verifications' && (
          <div className="stitch-box" style={card}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 className="serif cream-hi" style={{ fontSize: 18, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Shield className="w-5 h-5" style={{ color: gold }} /> Vérifications en attente ({pending.length})
              </h2>
              <button
                type="button"
                className="ghost-btn"
                disabled={digestSending || pending.length === 0}
                style={{ padding: '8px 12px', fontSize: 12 }}
                onClick={sendVerificationDigest}
              >
                {digestSending ? 'Envoi…' : 'Renvoyer digest email'}
              </button>
            </div>
            {pending.length === 0 ? (
              <p className="body-f muted">Aucun document en attente.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {pending.map((p) => {
                  const hours = Math.max(
                    0,
                    Math.floor((Date.now() - new Date(p.updatedAt).getTime()) / (60 * 60 * 1000)),
                  );
                  const overdue = hours >= 48;
                  return (
                  <div key={p.id} style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', padding: 12, background: overdue ? 'rgba(196,107,107,0.1)' : 'rgba(15,25,36,0.5)', borderRadius: 8, border: overdue ? '1px solid rgba(196,107,107,0.35)' : undefined }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <p className="serif cream-hi" style={{ fontWeight: 700 }}>{p.firstName} {p.lastName}</p>
                      <p className="body-f muted2" style={{ fontSize: 13 }}>{p.email}</p>
                      <p className="body-f muted2" style={{ fontSize: 12 }}>{p.serviceTypes.join(', ')}</p>
                      <p className="body-f" style={{ fontSize: 12, marginTop: 4, color: overdue ? '#E8A0A0' : '#C4A882' }}>
                        En attente depuis {hours}h{overdue ? ' · SLA dépassé' : ''}
                      </p>
                      {p.rejectedAt && p.rejectionReason && (
                        <div style={{ marginTop: 6, padding: '6px 10px', background: 'rgba(196,107,107,0.12)', border: '1px solid rgba(196,107,107,0.3)', borderRadius: 6 }}>
                          <p className="body-f" style={{ fontSize: 11, color: '#E8A0A0', fontWeight: 600 }}>Rejet précédent</p>
                          <p className="body-f" style={{ fontSize: 12, color: '#E8D5C5' }}>{p.rejectionReason}</p>
                        </div>
                      )}
                    </div>
                    {p.licenseDocumentUrl && (
                      <a href={p.licenseDocumentUrl} target="_blank" rel="noreferrer" className="ghost-btn" style={{ padding: '8px 12px', fontSize: 13, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <ExternalLink className="w-4 h-4" /> Voir document
                      </a>
                    )}
                    <button type="button" disabled={processing === p.id} onClick={() => approve(p.id)} className="gold-btn" style={{ padding: '8px 14px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <Check className="w-4 h-4" /> Approuver
                    </button>
                    <button type="button" disabled={processing === p.id} onClick={() => { setRejecting(p); setRejectConfirm(false); setRejectReason(''); }} className="ghost-btn" style={{ padding: '8px 14px', fontSize: 13, color: '#C46B6B', borderColor: 'rgba(196,107,107,0.35)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <X className="w-4 h-4" /> Rejeter
                    </button>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === 'jobs' && (
          <div className="stitch-box" style={card}>
            <h2 className="serif cream-hi" style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Briefcase className="w-5 h-5" style={{ color: gold }} /> Toutes les tâches ({jobsTotal})
            </h2>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <input
                className="q-field"
                placeholder="Rechercher titre, ville, email…"
                value={jobsQuery}
                onChange={(e) => setJobsQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadJobs()}
                style={{ flex: 1, minWidth: 180 }}
              />
              <select className="q-field" value={jobsStatus} onChange={(e) => { setJobsStatus(e.target.value); setJobsPage(1); }} style={{ maxWidth: 160 }}>
                <option value="">Tous statuts</option>
                <option value="pending">Ouvertes</option>
                <option value="accepted">Acceptées</option>
                <option value="in_progress">En cours</option>
                <option value="completed">Terminées</option>
                <option value="cancelled">Annulées</option>
              </select>
              <button type="button" onClick={() => { setJobsPage(1); loadJobs(); }} className="ghost-btn" style={{ padding: '8px 14px' }}>Filtrer</button>
            </div>
            {jobsLoading ? (
              <p className="body-f muted" style={{ textAlign: 'center', padding: 24 }}>Chargement…</p>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {adminJobs.length === 0 ? (
                    <p className="body-f muted2">Aucune tâche trouvée.</p>
                  ) : adminJobs.map((job) => (
                    <div key={job.id} style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', padding: 12, background: 'rgba(15,25,36,0.5)', borderRadius: 8 }}>
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <Link to={`/jobs/${job.id}`} className="serif cream-hi" style={{ fontWeight: 700, textDecoration: 'none' }}>{job.title}</Link>
                        <p className="body-f muted2" style={{ fontSize: 12 }}>
                          {job.clientName} · {job.clientEmail} · {job.city ?? '—'}
                        </p>
                        <p className="body-f muted2" style={{ fontSize: 11 }}>
                          {job.serviceType} · {job.applications} candid. · {job.estimatedPrice}$ · {new Date(job.createdAt).toLocaleDateString('fr-CA')}
                        </p>
                      </div>
                      <span className="body-f" style={{ fontSize: 12, color: gold }}>{job.status}</span>
                      {['pending', 'accepted', 'in_progress'].includes(job.status) && (
                        <button
                          type="button"
                          disabled={processing === job.id}
                          onClick={() => handleJobAction(job)}
                          className="ghost-btn"
                          style={{ padding: '6px 12px', fontSize: 12, color: '#C46B6B', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          {job.status === 'pending' ? 'Supprimer' : 'Annuler'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
                  <button disabled={jobsPage <= 1} onClick={() => setJobsPage(jobsPage - 1)} className="ghost-btn">←</button>
                  <span className="body-f cream-hi" style={{ fontSize: 13 }}>{jobsPage} / {Math.ceil(jobsTotal / 50) || 1}</span>
                  <button disabled={jobsPage >= Math.ceil(jobsTotal / 50)} onClick={() => setJobsPage(jobsPage + 1)} className="ghost-btn">→</button>
                </div>
              </>
            )}
          </div>
        )}

        {tab === 'users' && (
          <div className="stitch-box" style={card}>
            <h2 className="serif cream-hi" style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Users className="w-5 h-5" style={{ color: gold }} /> Utilisateurs ({usersTotal})
            </h2>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <input
                className="q-field"
                placeholder="Rechercher nom, email, téléphone…"
                value={usersQuery}
                onChange={(e) => setUsersQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadUsers()}
                style={{ flex: 1, minWidth: 180 }}
              />
              <select className="q-field" value={usersRole} onChange={(e) => { setUsersRole(e.target.value); setUsersPage(1); }} style={{ maxWidth: 160 }}>
                <option value="">Tous rôles</option>
                <option value="client">Clients</option>
                <option value="provider">Travailleurs</option>
                <option value="admin">Admins</option>
              </select>
              <button type="button" onClick={() => { setUsersPage(1); loadUsers(); }} className="ghost-btn" style={{ padding: '8px 14px' }}>Filtrer</button>
            </div>
            {usersLoading ? (
              <p className="body-f muted" style={{ textAlign: 'center', padding: 24 }}>Chargement…</p>
            ) : (
              <>
                <div className="admin-mobile-cards">
                  {adminUsers.length === 0 ? (
                    <p className="body-f muted2" style={{ padding: 16, textAlign: 'center' }}>Aucun utilisateur</p>
                  ) : adminUsers.map((u) => (
                    <div key={`card-${u.id}`} className="admin-mobile-card">
                      <p className="serif cream-hi" style={{ fontWeight: 700, fontSize: 15 }}>{u.firstName} {u.lastName}</p>
                      <p className="body-f muted2" style={{ fontSize: 13 }}>{u.email}</p>
                      {u.suspendedAt && (
                        <span style={{ fontSize: 11, color: '#C46B6B', fontWeight: 700 }}>Suspendu</span>
                      )}
                      {u.isVerified && !u.suspendedAt && (
                        <span style={{ fontSize: 11, color: '#7FB069' }}>✓ vérifié</span>
                      )}
                      {u.suspensionReason && (
                        <p className="body-f muted2" style={{ fontSize: 12, marginTop: 4 }}>{u.suspensionReason}</p>
                      )}
                      <p className="body-f muted2" style={{ fontSize: 12, marginTop: 6 }}>
                        Inscrit {new Date(u.createdAt).toLocaleDateString('fr-CA')}
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10, alignItems: 'center' }}>
                        <select
                          className="q-field"
                          value={u.role}
                          disabled={processing === u.id || u.suspendedAt != null || (u.id === profile?.id && u.role === 'admin')}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          style={{ fontSize: 12, padding: '6px 10px', flex: 1, minWidth: 120 }}
                        >
                          <option value="client">Client</option>
                          <option value="provider">Travailleur</option>
                          <option value="admin">Admin</option>
                        </select>
                        {u.id !== profile?.id && u.role !== 'admin' && (
                          u.suspendedAt ? (
                            <button type="button" className="ghost-btn" disabled={processing === u.id} onClick={() => handleUnsuspend(u)} style={{ padding: '6px 12px', fontSize: 12 }}>
                              Réactiver
                            </button>
                          ) : (
                            <button type="button" className="ghost-btn" disabled={processing === u.id} onClick={() => handleSuspend(u)} style={{ padding: '6px 12px', fontSize: 12, color: '#C46B6B', borderColor: 'rgba(196,107,107,0.35)' }}>
                              Suspendre
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <table className="body-f admin-table-desktop" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ color: gold, borderBottom: '1px solid rgba(217,179,140,0.2)' }}>
                      <th style={{ padding: 8, textAlign: 'left' }}>Utilisateur</th>
                      <th style={{ padding: 8, textAlign: 'left' }}>Rôle</th>
                      <th style={{ padding: 8, textAlign: 'left' }}>Inscrit</th>
                      <th style={{ padding: 8, textAlign: 'left' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminUsers.length === 0 ? (
                      <tr><td colSpan={4} className="muted2" style={{ padding: 16, textAlign: 'center' }}>Aucun utilisateur</td></tr>
                    ) : adminUsers.map((u) => (
                      <tr key={u.id} style={{ borderBottom: '1px solid rgba(217,179,140,0.06)' }}>
                        <td style={{ padding: 8 }}>
                          <p className="cream-hi" style={{ fontWeight: 600 }}>{u.firstName} {u.lastName}</p>
                          <p className="muted2" style={{ fontSize: 12 }}>{u.email}</p>
                          {u.suspendedAt && (
                            <span style={{ fontSize: 10, color: '#C46B6B', fontWeight: 700 }}>Suspendu</span>
                          )}
                          {u.isVerified && !u.suspendedAt && <span style={{ fontSize: 10, color: '#7FB069' }}>✓ vérifié</span>}
                          {u.suspensionReason && (
                            <p className="muted2" style={{ fontSize: 11, marginTop: 4 }}>{u.suspensionReason}</p>
                          )}
                        </td>
                        <td style={{ padding: 8 }}>
                          <select
                            className="q-field"
                            value={u.role}
                            disabled={processing === u.id || u.suspendedAt != null || (u.id === profile?.id && u.role === 'admin')}
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            style={{ fontSize: 12, padding: '4px 8px' }}
                          >
                            <option value="client">Client</option>
                            <option value="provider">Travailleur</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td className="muted2" style={{ padding: 8, fontSize: 12 }}>
                          {new Date(u.createdAt).toLocaleDateString('fr-CA')}
                        </td>
                        <td style={{ padding: 8 }}>
                          {u.id !== profile?.id && u.role !== 'admin' && (
                            u.suspendedAt ? (
                              <button
                                type="button"
                                className="ghost-btn"
                                disabled={processing === u.id}
                                onClick={() => handleUnsuspend(u)}
                                style={{ padding: '4px 10px', fontSize: 12 }}
                              >
                                Réactiver
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="ghost-btn"
                                disabled={processing === u.id}
                                onClick={() => handleSuspend(u)}
                                style={{ padding: '4px 10px', fontSize: 12, color: '#C46B6B', borderColor: 'rgba(196,107,107,0.35)' }}
                              >
                                Suspendre
                              </button>
                            )
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
                  <button disabled={usersPage <= 1} onClick={() => setUsersPage(usersPage - 1)} className="ghost-btn">←</button>
                  <span className="body-f cream-hi" style={{ fontSize: 13 }}>{usersPage} / {Math.ceil(usersTotal / 50) || 1}</span>
                  <button disabled={usersPage >= Math.ceil(usersTotal / 50)} onClick={() => setUsersPage(usersPage + 1)} className="ghost-btn">→</button>
                </div>
              </>
            )}
          </div>
        )}

        {tab === 'messages' && (
          <div className="admin-messages-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 380px) 1fr', gap: 16, alignItems: 'start' }}>
            <div className="stitch-box" style={card}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <button
                  type="button"
                  onClick={() => setMsgSubTab('reports')}
                  className={msgSubTab === 'reports' ? 'gold-btn' : 'ghost-btn'}
                  style={{ padding: '6px 12px', fontSize: 12 }}
                >
                  Signalements
                </button>
                <button
                  type="button"
                  onClick={() => setMsgSubTab('conversations')}
                  className={msgSubTab === 'conversations' ? 'gold-btn' : 'ghost-btn'}
                  style={{ padding: '6px 12px', fontSize: 12 }}
                >
                  Conversations
                </button>
              </div>

              {msgSubTab === 'reports' ? (
                <>
                  <select
                    className="q-field"
                    value={msgReportStatus}
                    onChange={(e) => { setMsgReportStatus(e.target.value); setMsgReportsPage(1); }}
                    style={{ width: '100%', marginBottom: 12, fontSize: 13 }}
                  >
                    <option value="pending">En attente</option>
                    <option value="reviewed">Traités</option>
                    <option value="dismissed">Rejetés</option>
                    <option value="">Tous</option>
                  </select>
                  {msgReportsLoading ? (
                    <p className="body-f muted" style={{ padding: 16, textAlign: 'center' }}>Chargement…</p>
                  ) : msgReports.length === 0 ? (
                    <p className="body-f muted2" style={{ fontSize: 13 }}>Aucun signalement.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 520, overflowY: 'auto' }}>
                      {msgReports.map((r) => (
                        <div key={r.id} style={{ padding: 10, background: 'rgba(15,25,36,0.5)', borderRadius: 8 }}>
                          <p className="body-f cream-hi" style={{ fontSize: 13, fontWeight: 600 }}>{r.reason} · {r.status}</p>
                          <p className="body-f muted2" style={{ fontSize: 12 }}>{r.messagePreview}</p>
                          <p className="body-f muted2" style={{ fontSize: 11 }}>
                            {r.reporterEmail} · {r.jobTitle ?? '—'}
                          </p>
                          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                            <button type="button" onClick={() => openAdminConversation(r.conversationId)} className="ghost-btn" style={{ padding: '4px 10px', fontSize: 11 }}>
                              Voir fil
                            </button>
                            {r.status === 'pending' && (
                              <>
                                <button type="button" disabled={processing === r.id} onClick={() => handleResolveReport(r.id, 'reviewed')} className="gold-btn" style={{ padding: '4px 10px', fontSize: 11 }}>
                                  Traiter
                                </button>
                                <button type="button" disabled={processing === r.id} onClick={() => handleResolveReport(r.id, 'dismissed')} className="ghost-btn" style={{ padding: '4px 10px', fontSize: 11 }}>
                                  Rejeter
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12 }}>
                    <button disabled={msgReportsPage <= 1} onClick={() => setMsgReportsPage(msgReportsPage - 1)} className="ghost-btn">←</button>
                    <span className="body-f cream-hi" style={{ fontSize: 12 }}>{msgReportsPage}</span>
                    <button disabled={msgReportsPage >= Math.ceil(msgReportsTotal / 50)} onClick={() => setMsgReportsPage(msgReportsPage + 1)} className="ghost-btn">→</button>
                  </div>
                </>
              ) : (
                <>
                  <input
                    className="q-field"
                    placeholder="Email, tâche, ID…"
                    value={msgConvQuery}
                    onChange={(e) => setMsgConvQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && loadMsgConversations()}
                    style={{ width: '100%', marginBottom: 12, fontSize: 13 }}
                  />
                  <button type="button" onClick={() => { setMsgConvPage(1); loadMsgConversations(); }} className="ghost-btn" style={{ padding: '6px 12px', fontSize: 12, marginBottom: 12 }}>
                    Rechercher
                  </button>
                  {msgConvLoading ? (
                    <p className="body-f muted" style={{ padding: 16, textAlign: 'center' }}>Chargement…</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 520, overflowY: 'auto' }}>
                      {msgConversations.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => openAdminConversation(c.id)}
                          style={{
                            textAlign: 'left',
                            padding: 10,
                            borderRadius: 8,
                            border: selectedConvId === c.id ? '1px solid rgba(184,123,68,0.5)' : '1px solid rgba(217,179,140,0.12)',
                            background: selectedConvId === c.id ? 'rgba(184,123,68,0.12)' : 'rgba(15,25,36,0.5)',
                            cursor: 'pointer',
                          }}
                        >
                          <p className="body-f cream-hi" style={{ fontSize: 13, fontWeight: 600 }}>{c.jobTitle ?? 'Sans tâche'}</p>
                          <p className="body-f muted2" style={{ fontSize: 11 }}>{c.clientEmail} ↔ {c.providerEmail}</p>
                          <p className="body-f muted2" style={{ fontSize: 11 }}>
                            {c.messageCount} msg · {c.status}
                            {c.pendingReports > 0 && <span style={{ color: gold }}> · {c.pendingReports} signalement(s)</span>}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="stitch-box" style={{ ...card, minHeight: 400 }}>
              <h2 className="serif cream-hi" style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <MessageSquare className="w-5 h-5" style={{ color: gold }} /> Fil (lecture seule)
              </h2>
              {!selectedConvId || !selectedConvMeta ? (
                <p className="body-f muted2" style={{ fontSize: 14 }}>Sélectionnez une conversation ou un signalement.</p>
              ) : (
                <>
                  <p className="body-f muted2" style={{ fontSize: 13, marginBottom: 12 }}>
                    {selectedConvMeta.job?.title && <strong className="cream-hi">{selectedConvMeta.job.title}</strong>}
                    {' · '}{selectedConvMeta.status}
                    <br />
                    Client: {selectedConvMeta.client.email}
                    <br />
                    Travailleur: {selectedConvMeta.provider.email}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 480, overflowY: 'auto' }}>
                    {selectedConvMessages.map((m) => (
                      <div key={m.id} style={{ padding: '8px 12px', borderRadius: 8, background: m.type === 'system' ? 'rgba(217,179,140,0.08)' : 'rgba(15,25,36,0.5)' }}>
                        <p className="body-f muted2" style={{ fontSize: 11, marginBottom: 4 }}>
                          {m.senderName || 'Système'} · {new Date(m.createdAt).toLocaleString('fr-CA')}
                        </p>
                        {m.type === 'image' && m.attachmentUrl ? (
                          <a href={m.attachmentUrl} target="_blank" rel="noreferrer" className="body-f cream-hi" style={{ fontSize: 13 }}>📷 Photo</a>
                        ) : (
                          <p className="body-f cream-hi" style={{ fontSize: 14 }}>{m.content}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {tab === 'invites' && (
          <div className="stitch-box" style={card}>
            <h2 className="serif cream-hi" style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Gift className="w-5 h-5" style={{ color: gold }} /> Codes fondateur
            </h2>
            <p className="body-f muted2" style={{ fontSize: 14, marginBottom: 20 }}>
              Générez un code d&apos;invitation pour les travailleurs fondateurs (100 crédits, 15% rabais à vie).
            </p>
            <button
              type="button"
              disabled={processing === 'invite'}
              onClick={handleGenerateInvite}
              className="gold-btn"
              style={{ padding: '10px 20px', marginBottom: 20 }}
            >
              {processing === 'invite' ? 'Génération…' : 'Générer un code'}
            </button>
            {inviteCode && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16, background: 'rgba(15,25,36,0.5)', borderRadius: 8 }}>
                <code className="serif cream-hi" style={{ fontSize: 18, letterSpacing: 1 }}>{inviteCode}</code>
                <button type="button" onClick={copyInvite} className="ghost-btn" style={{ padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Copy className="w-4 h-4" /> Copier
                </button>
              </div>
            )}
          </div>
        )}

        {tab === 'audit' && (
          <div className="stitch-box" style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 className="serif cream-hi" style={{ fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Shield className="w-5 h-5" style={{ color: gold }} /> Logs d&apos;audit ({auditTotal})
              </h2>
              <button onClick={loadAudit} className="ghost-btn" style={{ padding: '6px 14px', fontSize: 12 }}>Actualiser</button>
            </div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <select className="q-field" style={{ maxWidth: 220 }} value={auditAction} onChange={(e) => { setAuditAction(e.target.value); setAuditPage(1); }}>
                <option value="">Toutes les actions</option>
                <option value="provider_verified">Vérification approuvée</option>
                <option value="provider_verification_rejected">Vérification rejetée</option>
                <option value="user_suspended">Compte suspendu</option>
                <option value="user_unsuspended">Compte réactivé</option>
                <option value="user_role_updated">Rôle modifié</option>
                <option value="task_deleted">Tâche supprimée</option>
                <option value="task_cancelled">Tâche annulée</option>
                <option value="demo_jobs_seeded">Démos restaurées</option>
                <option value="demo_jobs_rotated">Démos rotées (cron)</option>
                <option value="deletion_requested">Suppression demandée</option>
                <option value="message_reported">Message signalé</option>
                <option value="message_report_resolved">Signalement traité</option>
              </select>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                <button disabled={auditPage <= 1} onClick={() => setAuditPage(auditPage - 1)} className="ghost-btn">←</button>
                <span className="body-f cream-hi" style={{ fontSize: 13 }}>{auditPage} / {Math.ceil(auditTotal / 50) || 1}</span>
                <button disabled={auditPage >= Math.ceil(auditTotal / 50)} onClick={() => setAuditPage(auditPage + 1)} className="ghost-btn">→</button>
              </div>
            </div>
            {auditLoading ? (
              <div className="body-f muted" style={{ padding: 24, textAlign: 'center' }}>Chargement…</div>
            ) : (
              <>
                <div className="admin-mobile-cards">
                  {auditLogs.length === 0 ? (
                    <p className="body-f muted2" style={{ padding: 16, textAlign: 'center' }}>Aucun log</p>
                  ) : auditLogs.map((log) => (
                    <div key={`audit-card-${log.id}`} className="admin-mobile-card">
                      <p className="body-f cream-hi" style={{ fontWeight: 600, fontSize: 14 }}>{log.action}</p>
                      <p className="body-f muted2" style={{ fontSize: 12 }}>{log.resource}</p>
                      <p className="body-f muted2" style={{ fontSize: 11, marginTop: 4 }}>
                        {new Date(log.createdAt).toLocaleString('fr-CA')}
                        {log.userId ? ` · ${log.userId.slice(0, 8)}` : ''}
                      </p>
                    </div>
                  ))}
                </div>
                <table className="body-f admin-table-desktop" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ color: gold, borderBottom: '1px solid rgba(217,179,140,0.2)' }}>
                      <th style={{ padding: 8, textAlign: 'left' }}>Date</th>
                      <th style={{ padding: 8, textAlign: 'left' }}>Action</th>
                      <th style={{ padding: 8, textAlign: 'left' }}>Ressource</th>
                      <th style={{ padding: 8, textAlign: 'left' }}>Utilisateur</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.length === 0 ? (
                      <tr><td colSpan={4} className="muted2" style={{ padding: 16, textAlign: 'center' }}>Aucun log</td></tr>
                    ) : auditLogs.map((log) => (
                      <tr key={log.id} style={{ borderBottom: '1px solid rgba(217,179,140,0.06)' }}>
                        <td className="muted2" style={{ padding: 8 }}>{new Date(log.createdAt).toLocaleString('fr-CA')}</td>
                        <td className="cream-hi" style={{ padding: 8 }}>{log.action}</td>
                        <td className="muted2" style={{ padding: 8 }}>{log.resource}</td>
                        <td className="muted2" style={{ padding: 8 }}>{log.userId?.slice(0, 8) || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        )}
      </div>

      {rejecting && (
        <div role="dialog" aria-modal="true" onClick={cancelReject} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} className="stitch-box" style={{ ...card, maxWidth: 520, width: '100%' }}>
            <h3 className="serif cream-hi" style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Rejeter le document</h3>
            <p className="body-f muted2" style={{ fontSize: 13, marginBottom: 16 }}>{rejecting.firstName} {rejecting.lastName} — {rejecting.email}</p>
            <textarea
              value={rejectReason}
              onChange={(e) => { setRejectReason(e.target.value); if (rejectConfirm) setRejectConfirm(false); }}
              placeholder="Expliquez pourquoi le document est refusé..."
              rows={4}
              maxLength={500}
              style={{ width: '100%', padding: '10px 12px', background: 'rgba(15,25,36,0.6)', border: '1px solid rgba(217,179,140,0.25)', color: '#F5E6D3', fontFamily: 'inherit', fontSize: 14, resize: 'vertical', marginBottom: 10 }}
            />
            <div style={{ marginBottom: 16 }}>
              <p className="body-f muted2" style={{ fontSize: 11, marginBottom: 6 }}>Suggestions rapides :</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {REJECTION_PRESETS.map((preset) => (
                  <button key={preset} type="button" onClick={() => setRejectReason(preset)} style={{ padding: '4px 10px', fontSize: 11, background: 'rgba(217,179,140,0.08)', border: '1px solid rgba(217,179,140,0.2)', color: '#D9B38C', borderRadius: 12, cursor: 'pointer' }}>
                    {preset}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" onClick={cancelReject} className="ghost-btn" style={{ padding: '10px 16px', fontSize: 14 }}>Annuler</button>
              <button
                type="button"
                disabled={processing === rejecting.id || !rejectReason.trim()}
                onClick={reject}
                className="ghost-btn"
                style={{ padding: '10px 16px', fontSize: 14, color: rejectConfirm ? '#fff' : '#C46B6B', background: rejectConfirm ? '#C46B6B' : 'transparent', borderColor: '#C46B6B', opacity: !rejectReason.trim() ? 0.5 : 1 }}
              >
                {processing === rejecting.id ? 'Envoi...' : rejectConfirm ? 'Confirmer le rejet' : 'Rejeter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}