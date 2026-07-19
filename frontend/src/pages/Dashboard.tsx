import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Briefcase,
  DollarSign,
  Star,
  Bell,
  Calendar,
  MapPin,
  ChevronRight,
  Clock,
  Trash2,
  MessageSquare,
} from 'lucide-react';
import { useUnreadMessages } from '../hooks/useUnreadMessages';
import { useToast } from '../components/Toast';
import type { DashboardStats, Notification, Job, JobStatus } from '../types';
import { JOB_STATUS_LABELS } from '../types';
import { api } from '../services/api';
import { TaskerOnboarding } from '../components/TaskerOnboarding';
import { NotificationList } from '../components/NotificationList';
import { formatPrice, formatShortDate, formatDistance } from '../utils';
import { gold } from '../styles/design-tokens';
import {
  canTaskerApply,
  getTaskerVerificationStatus,
  VERIFICATION_CTA,
  VERIFICATION_HINTS,
  VERIFICATION_LABELS,
} from '../utils/taskerVerification';

const wrap: React.CSSProperties = { maxWidth: 1200, margin: '0 auto', padding: '32px 24px' };
const card: React.CSSProperties = { background: 'rgba(21,35,50,0.7)', padding: 20 };

export function Dashboard() {
  const { profile, isClientMode } = useAuth();
  const { addToast } = useToast();
  const { unreadTotal } = useUnreadMessages();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [upcomingJobs, setUpcomingJobs] = useState<Job[]>([]);
  const [myPostedJobs, setMyPostedJobs] = useState<Job[]>([]);
  const [creditBalance, setCreditBalance] = useState(0);
  const [isFoundingTasker, setIsFoundingTasker] = useState(false);
  const [hasAcceptedJob, setHasAcceptedJob] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        if (isClientMode) {
          const [jobsData, notificationsData] = await Promise.all([
            api.getJobs({ perspective: 'mine' }),
            api.getNotifications(),
          ]);
          setMyPostedJobs(jobsData.slice(0, 8));
          setNotifications(notificationsData.slice(0, 5));
        } else {
          const [statsData, notificationsData, jobsData, balance, allJobs] = await Promise.all([
            api.getDashboardStats(),
            api.getNotifications(),
            api.getJobs({ status: 'accepted', perspective: 'board' }),
            api.getCreditBalance(),
            api.getJobs({ perspective: 'board' }),
          ]);
          setStats(statsData);
          setNotifications(notificationsData.slice(0, 5));
          setUpcomingJobs(jobsData.slice(0, 3));
          setCreditBalance(balance.balance);
          setIsFoundingTasker(!!balance.isFoundingTasker);
          setHasAcceptedJob(allJobs.some((j) => j.status !== 'pending'));
        }
      } catch (error) {
        console.error('Failed to load dashboard:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadDashboard();
  }, [isClientMode]);

  const handleCancelOrDeleteJob = async (job: Job) => {
    const isPending = job.status === 'pending';
    const msg = isPending
      ? 'Supprimer cette tâche? Les candidats seront remboursés.'
      : 'Annuler cette tâche? Le travailleur sera notifié.';
    if (!window.confirm(msg)) return;
    try {
      if (isPending) await api.deleteJob(job.id);
      else await api.cancelJob(job.id);
      addToast(isPending ? 'Tâche supprimée' : 'Tâche annulée', 'success');
      setMyPostedJobs((prev) => prev.filter((j) => j.id !== job.id));
    } catch {
      addToast('Impossible d\'annuler la tâche', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="leather" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', border: `3px solid rgba(217,179,140,0.2)`, borderBottomColor: gold, animation: 'spin 0.9s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (isClientMode) {
    const pendingReview = myPostedJobs.filter(
      (j) => j.status === 'pending' && (j.pendingApplicationCount ?? 0) > 0,
    );
    const totalApplicants = pendingReview.reduce(
      (sum, j) => sum + (j.pendingApplicationCount ?? 0),
      0,
    );

    return (
      <div className="leather" style={{ minHeight: '100vh' }}>
        <div style={wrap}>
          <div style={{ marginBottom: 28 }}>
            <h1 className="serif cream-hi" style={{ fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', fontWeight: 900 }}>
              Bonjour, {profile?.firstName} ⚜
            </h1>
            <p className="body-f muted" style={{ fontSize: 15, marginTop: 4 }}>
              De quoi avez-vous besoin aujourd&apos;hui ?
            </p>
          </div>

          <Link to="/post-job" style={{ textDecoration: 'none', display: 'block', marginBottom: 20 }}>
            <div className="gold-btn" style={{ padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontSize: 17 }}>
              <Briefcase className="w-5 h-5" />
              Publier une tâche
            </div>
          </Link>

          {unreadTotal > 0 && (
            <Link to="/messages" style={{ textDecoration: 'none', display: 'block', marginBottom: 20 }}>
              <div className="stitch-box stitch-box-interactive" style={{ ...card, borderColor: 'rgba(184,123,68,0.4)' }}>
                <p className="serif cream-hi" style={{ fontSize: 17, fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MessageSquare className="w-5 h-5" style={{ color: gold }} />
                  {unreadTotal} message{unreadTotal > 1 ? 's' : ''} non lu{unreadTotal > 1 ? 's' : ''}
                </p>
                <p className="body-f muted" style={{ fontSize: 14 }}>Répondez à vos travailleurs pour coordonner les tâches</p>
              </div>
            </Link>
          )}

          {pendingReview.length > 0 && (
            <Link to={`/jobs/${pendingReview[0].id}`} style={{ textDecoration: 'none', display: 'block', marginBottom: 28 }}>
              <div className="stitch-box stitch-box-interactive" style={{ ...card, borderColor: 'rgba(184,123,68,0.55)', background: 'rgba(184,123,68,0.12)' }}>
                <p className="serif cream-hi" style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>
                  {totalApplicants} candidature{totalApplicants > 1 ? 's' : ''} à consulter
                </p>
                <p className="body-f muted" style={{ fontSize: 14 }}>
                  Comparez les travailleurs et choisissez celui qui vous convient — « {pendingReview[0].title} »
                </p>
              </div>
            </Link>
          )}

          {myPostedJobs.length === 0 && (
            <div className="stitch-box" style={{ ...card, marginBottom: 28, textAlign: 'center' }}>
              <p className="serif cream-hi" style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>
                Bêta : publiez votre première tâche
              </p>
              <p className="body-f muted" style={{ fontSize: 14, lineHeight: 1.55, marginBottom: 16, maxWidth: 420, marginLeft: 'auto', marginRight: 'auto' }}>
                Gratuit pour les clients. Des travailleurs locaux postulent; vous choisissez. Paiement en ligne optionnel (Stripe) ou direct.
              </p>
              <Link to="/post-job" className="gold-btn" style={{ padding: '12px 22px', fontSize: 15, textDecoration: 'none', display: 'inline-block' }}>
                Publier maintenant
              </Link>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 28 }}>
            {[
              { label: 'Ménage', service: 'menage', need: 'Ménage' },
              { label: 'Déménagement', service: 'demenagement', need: 'Déménagement' },
              { label: 'Montage', service: 'montage_meubles', need: 'Montage de meubles' },
            ].map((item) => (
              <Link
                key={item.service}
                to={`/post-job?service=${item.service}&need=${encodeURIComponent(item.need)}`}
                className="ghost-btn"
                style={{ padding: '12px 10px', fontSize: 13, textAlign: 'center', textDecoration: 'none' }}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {notifications.length > 0 && (
            <div className="stitch-box" style={{ ...card, marginBottom: 28 }}>
              <h3 className="serif cream-hi" style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Bell className="w-5 h-5" style={{ color: gold }} /> Notifications
              </h3>
              <NotificationList
                notifications={notifications}
                onChange={setNotifications}
                compact
              />
            </div>
          )}

          <div className="stitch-box" style={card}>
            <h3 className="serif cream-hi" style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
              Mes tâches publiées
            </h3>
            {myPostedJobs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <Calendar className="w-12 h-12" style={{ margin: '0 auto 12px', color: 'rgba(217,179,140,0.3)' }} />
                <p className="body-f muted" style={{ marginBottom: 16 }}>Aucune tâche publiée pour le moment</p>
                <Link to="/post-job" className="gold-btn" style={{ padding: '8px 18px', fontSize: 14 }}>
                  Publier ma première tâche
                </Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {myPostedJobs.map((job) => (
                  <div key={job.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: 12, borderRadius: 8, background: 'rgba(15,25,36,0.5)' }}>
                    <Link to={`/jobs/${job.id}`} style={{ textDecoration: 'none', flex: 1, color: 'inherit' }}>
                      <h4 className="serif cream-hi" style={{ fontSize: 15, fontWeight: 700 }}>{job.title}</h4>
                      <p className="body-f muted2" style={{ fontSize: 13, marginTop: 4 }}>
                        {job.address.city} · {formatPrice(job.estimatedPrice)}
                        {job.status === 'pending' && (job.pendingApplicationCount ?? 0) > 0 && (
                          <> · {job.pendingApplicationCount} candidature{(job.pendingApplicationCount ?? 0) > 1 ? 's' : ''} en attente</>
                        )}
                      </p>
                    </Link>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <span className="body-f" style={{ fontSize: 11, color: '#1F2F3F', background: gold, padding: '2px 8px', borderRadius: 999, fontWeight: 700 }}>
                        {JOB_STATUS_LABELS[job.status as JobStatus]}
                      </span>
                      {['pending', 'accepted', 'in_progress'].includes(job.status) && (
                        <button
                          type="button"
                          onClick={() => handleCancelOrDeleteJob(job)}
                          className="ghost-btn"
                          title={job.status === 'pending' ? 'Supprimer' : 'Annuler'}
                          aria-label={job.status === 'pending' ? 'Supprimer la tâche' : 'Annuler la tâche'}
                          style={{ padding: 4, minWidth: 0, lineHeight: 0, color: '#C46B6B', borderColor: 'rgba(196,107,107,0.35)', flexShrink: 0 }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const StatCard = ({ label, value, icon }: { label: string; value: React.ReactNode; icon: React.ReactNode }) => (
    <div className="stitch-box" style={card}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p className="body-f muted2" style={{ fontSize: 13, marginBottom: 4 }}>{label}</p>
          <p className="serif cream-hi" style={{ fontSize: 28, fontWeight: 900, lineHeight: 1 }}>{value}</p>
        </div>
        <div className="svc-icon" style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {icon}
        </div>
      </div>
    </div>
  );

  return (
    <div className="leather" style={{ minHeight: '100vh' }}>
      <div style={wrap}>
        <TaskerOnboarding
          steps={[
            {
              id: 'profile',
              label: 'Compléter votre profil',
              description: 'Types de services, ville et rayon',
              done: (profile?.serviceTypes?.length ?? 0) > 0 && !!profile?.address?.street,
              link: '/profile',
            },
            {
              id: 'verify',
              label: 'Vérifier votre identité',
              description: 'Téléversez une pièce d\'identité — approbation sous 24 h en bêta',
              done: !!profile?.isVerified,
              link: '/profile',
            },
            {
              id: 'credits',
              label: 'Obtenir des crédits',
              description: '1 crédit = 1 candidature',
              done: creditBalance > 0,
              link: '/credits',
            },
            {
              id: 'job',
              label: 'Postuler à une première job',
              description: 'Parcourir les tâches disponibles près de chez vous',
              done: hasAcceptedJob,
              link: '/jobs',
            },
          ]}
        />

        {/* Welcome */}
        <div style={{ marginBottom: 28 }}>
          <h1 className="serif cream-hi" style={{ fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', fontWeight: 900 }}>
            Bonjour, {profile?.firstName} ⚜
          </h1>
          <p className="body-f muted" style={{ fontSize: 15, marginTop: 4 }}>Voici ce qui se passe aujourd'hui</p>
          {isFoundingTasker && (
            <p
              className="body-f"
              style={{
                display: 'inline-block',
                marginTop: 10,
                fontSize: 13,
                padding: '6px 12px',
                borderRadius: 8,
                border: '1px dashed rgba(184,123,68,0.45)',
                background: 'rgba(184,123,68,0.1)',
                color: '#E8CDB0',
              }}
            >
              🏆 Founding Tasker — {creditBalance} crédit{creditBalance !== 1 ? 's' : ''} · 20 % à vie sur les packs
            </p>
          )}
        </div>

        {/* Soft-launch readiness (verify gate is the #1 blocker) */}
        {(() => {
          const vStatus = getTaskerVerificationStatus(profile, profile?.verificationExpiresAt);
          const canApply = canTaskerApply(profile, profile?.verificationExpiresAt);
          if (canApply && creditBalance > 0) return null;
          return (
            <div
              className="stitch-box"
              style={{
                ...card,
                marginBottom: 24,
                borderColor: 'rgba(184,123,68,0.5)',
                background: 'rgba(184,123,68,0.1)',
              }}
            >
              <p className="serif cream-hi" style={{ fontSize: 17, fontWeight: 800, marginBottom: 6 }}>
                {!canApply
                  ? `Prochaine étape : ${VERIFICATION_LABELS[vStatus].toLowerCase()}`
                  : 'Prochaine étape : crédits pour postuler'}
              </p>
              <p className="body-f muted" style={{ fontSize: 14, lineHeight: 1.55, marginBottom: 14 }}>
                {!canApply
                  ? VERIFICATION_HINTS[vStatus]
                  : 'Vous êtes vérifié, mais il vous faut au moins 1 crédit pour candidater (remboursé si non retenu).'}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                <Link
                  to={!canApply ? '/profile' : '/credits'}
                  className="gold-btn"
                  style={{ padding: '10px 16px', fontSize: 13, textDecoration: 'none' }}
                >
                  {!canApply ? VERIFICATION_CTA[vStatus] : 'Obtenir des crédits'}
                </Link>
                <Link
                  to="/jobs"
                  className="ghost-btn"
                  style={{ padding: '10px 16px', fontSize: 13, textDecoration: 'none' }}
                >
                  Parcourir les jobs (questions gratuites)
                </Link>
              </div>
            </div>
          );
        })()}

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 28 }}>
          <StatCard label="Jobs aujourd'hui" value={stats?.jobsToday || 0} icon={<Briefcase className="w-5 h-5" style={{ color: gold }} />} />
          <StatCard label="Cette semaine" value={stats?.jobsThisWeek || 0} icon={<Calendar className="w-5 h-5" style={{ color: gold }} />} />
          <StatCard label="Gains (sem.)" value={formatPrice(stats?.earningsThisWeek || 0)} icon={<DollarSign className="w-5 h-5" style={{ color: gold }} />} />
          <StatCard
            label="Évaluation"
            value={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>{stats?.rating?.toFixed(1) || '0.0'}<Star className="w-5 h-5" style={{ color: gold, fill: gold }} /></span>}
            icon={<Star className="w-5 h-5" style={{ color: gold }} />}
          />
        </div>

        {unreadTotal > 0 && (
          <Link to="/messages" style={{ textDecoration: 'none', display: 'block', marginBottom: 20 }}>
            <div className="stitch-box stitch-box-interactive" style={{ ...card, borderColor: 'rgba(184,123,68,0.4)' }}>
              <p className="serif cream-hi" style={{ fontSize: 17, fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                <MessageSquare className="w-5 h-5" style={{ color: gold }} />
                {unreadTotal} message{unreadTotal > 1 ? 's' : ''} non lu{unreadTotal > 1 ? 's' : ''}
              </p>
              <p className="body-f muted" style={{ fontSize: 14 }}>Coordonnez vos jobs avec les clients</p>
            </div>
          </Link>
        )}

        {/* Quick action */}
        <Link to="/jobs" style={{ textDecoration: 'none', display: 'block', marginBottom: 28 }}>
          <div className="stitch-box stitch-box-interactive" style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div className="svc-icon" style={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Briefcase className="w-6 h-6" style={{ color: gold }} />
              </div>
              <div>
                <h3 className="serif cream-hi" style={{ fontSize: 18, fontWeight: 700 }}>Voir les nouvelles jobs</h3>
                <p className="body-f muted2" style={{ fontSize: 13 }}>
                  {stats?.pendingJobs || 0} job{stats?.pendingJobs !== 1 ? 's' : ''} en attente
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5" style={{ color: gold }} />
          </div>
        </Link>

        {/* Two column */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, alignItems: 'start' }}>
          {/* Upcoming jobs */}
          <div className="stitch-box" style={{ ...card, gridColumn: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 className="serif cream-hi" style={{ fontSize: 18, fontWeight: 700 }}>Jobs à venir</h3>
              <Link to="/jobs" className="nav-link" style={{ fontSize: 13, color: gold }}>Voir tout</Link>
            </div>
            {upcomingJobs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <Calendar className="w-12 h-12" style={{ margin: '0 auto 12px', color: 'rgba(217,179,140,0.3)' }} />
                <p className="body-f muted" style={{ marginBottom: 16 }}>Aucun job prévu pour le moment</p>
                <Link to="/jobs" className="ghost-btn" style={{ padding: '8px 18px', fontSize: 14 }}>Parcourir les jobs</Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {upcomingJobs.map((job) => (
                  <Link key={job.id} to={`/jobs/${job.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: 12, borderRadius: 8, background: 'rgba(15,25,36,0.5)' }}>
                    <div className="svc-icon" style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Briefcase className="w-5 h-5" style={{ color: gold }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <h4 className="serif cream-hi" style={{ fontSize: 15, fontWeight: 700 }}>{job.title}</h4>
                        <span className="body-f" style={{ fontSize: 11, color: '#1F2F3F', background: '#7FB069', padding: '2px 8px', borderRadius: 999, fontWeight: 700 }}>Acceptée</span>
                      </div>
                      <div className="body-f muted2" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', marginTop: 6, fontSize: 13 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Calendar className="w-4 h-4" />{formatShortDate(job.scheduledDate)}</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Clock className="w-4 h-4" />{job.scheduledTime || 'Heure à confirmer'}</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><MapPin className="w-4 h-4" />{job.distance ? formatDistance(job.distance) : job.address.city}</span>
                      </div>
                    </div>
                    <p className="serif cream-hi" style={{ fontSize: 15, fontWeight: 700, whiteSpace: 'nowrap' }}>{formatPrice(job.estimatedPrice)}</p>
                  </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Notifications */}
          <div className="stitch-box" style={card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 className="serif cream-hi" style={{ fontSize: 18, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Bell className="w-5 h-5" style={{ color: gold }} /> Notifications
              </h3>
              {notifications.some((n) => !n.isRead) && (
                <span className="body-f" style={{ fontSize: 12, color: '#1F2F3F', background: gold, padding: '2px 8px', borderRadius: 999, fontWeight: 700 }}>
                  {notifications.filter((n) => !n.isRead).length}
                </span>
              )}
            </div>
            {notifications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <Bell className="w-10 h-10" style={{ margin: '0 auto 8px', color: 'rgba(217,179,140,0.3)' }} />
                <p className="body-f muted2" style={{ fontSize: 14 }}>Aucune notification</p>
              </div>
            ) : (
              <NotificationList notifications={notifications} onChange={setNotifications} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
