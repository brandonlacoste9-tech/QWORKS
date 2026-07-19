import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { ReviewModal } from '../components/ReviewModal';
import { TaskerCard } from '../components/TaskerCard';
import type { Conversation, Job, JobStatus, TaskApplication } from '../types';
import { JOB_STATUS_LABELS, SERVICE_TYPE_LABELS } from '../types';
import {
  ArrowLeft, Briefcase, Calendar, Check, Clock, DollarSign,
  Loader2, MapPin, MessageSquare, Play, Star, Trash2, X, CreditCard, Send,
} from 'lucide-react';
import { formatDate, formatDistance, formatDuration, formatPrice, formatJobLocation } from '../utils';
import { gold } from '../styles/design-tokens';
import { UserAvatar } from '../components/UserAvatar';
import { CreditsLink } from '../components/CreditsLink';
import {
  canTaskerApply,
  getTaskerVerificationStatus,
  VERIFICATION_HINTS,
  VERIFICATION_LABELS,
} from '../utils/taskerVerification';

export function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { profile, canTask, isClientMode } = useAuth();
  const { addToast } = useToast();

  const [job, setJob] = useState<Job | null>(null);
  const [applications, setApplications] = useState<TaskApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [hasReview, setHasReview] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [applyMessage, setApplyMessage] = useState('');
  const [inquiryDraft, setInquiryDraft] = useState('');
  const [sendingQuestion, setSendingQuestion] = useState(false);
  const [questionSent, setQuestionSent] = useState(false);
  const [paying, setPaying] = useState(false);
  const [jobConversation, setJobConversation] = useState<Conversation | null>(null);
  const [applicantConversations, setApplicantConversations] = useState<Record<string, Conversation>>({});

  useEffect(() => {
    if (searchParams.get('paid')) addToast('Paiement reçu — merci!', 'success');
    else if (searchParams.get('cancelled')) addToast('Paiement annulé', 'info');
  }, [searchParams, addToast]);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await api.getJob(id);
      setJob(data);
      if (data.status === 'completed') {
        const reviews = await api.getReviewsForTask(id);
        const myReview = Array.isArray(reviews) ? reviews.find((r: any) => r.reviewerId === profile?.id) : null;
        setHasReview(!!myReview);
      }
      if (data.clientId === profile?.id && data.status === 'pending') {
        const apps = await api.getJobApplications(id);
        setApplications(apps);
      } else {
        setApplications([]);
      }
      try {
        const convs = await api.getJobConversations(id);
        if (data.clientId === profile?.id) {
          const byTasker: Record<string, Conversation> = {};
          for (const c of convs) {
            if (c.providerId) byTasker[c.providerId] = c;
          }
          setApplicantConversations(byTasker);
        } else {
          setApplicantConversations({});
        }
        const mine = convs.find((c) => profile?.id && c.providerId === profile.id) ?? null;
        setJobConversation(mine);
      } catch {
        setJobConversation(null);
        setApplicantConversations({});
      }
    } catch {
      addToast('Tâche introuvable', 'error');
      navigate('/jobs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    if (canTask) {
      api.getCreditBalance().then((b) => setCreditBalance(b.balance)).catch(() => undefined);
    }
  }, [id, canTask, profile?.id]);

  const runAction = async (action: () => Promise<void>, success: string) => {
    setProcessing(true);
    try {
      await action();
      addToast(success, 'success');
      await load();
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? (err.response?.data as { message?: string })?.message
        : undefined;
      addToast(msg ?? 'Action impossible', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!job || !window.confirm('Supprimer cette tâche? Les candidats seront remboursés.')) return;
    setProcessing(true);
    try {
      await api.deleteJob(job.id);
      addToast('Tâche supprimée', 'success');
      navigate('/jobs');
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? (err.response?.data as { message?: string })?.message
        : undefined;
      addToast(msg ?? 'Impossible de supprimer la tâche', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!job) return;
    const msg = job.status === 'pending'
      ? 'Supprimer cette tâche? Les candidats seront remboursés.'
      : 'Annuler cette tâche? Remboursement du crédit au travailleur si plus de 24 h avant la date prévue.';
    if (!window.confirm(msg)) return;
    setProcessing(true);
    try {
      if (job.status === 'pending') {
        await api.deleteJob(job.id);
      } else {
        await api.cancelJob(job.id);
      }
      addToast('Tâche annulée', 'success');
      navigate('/jobs');
    } catch (err) {
      const errMsg = axios.isAxiosError(err)
        ? (err.response?.data as { message?: string })?.message
        : undefined;
      addToast(errMsg ?? 'Impossible d\'annuler', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleApply = async () => {
    if (!job || processing) return;
    setProcessing(true);
    try {
      const updated = await api.applyToJob(job.id, applyMessage || undefined);
      setJob(updated);
      setApplyMessage('');
      addToast('Candidature envoyée!', 'success');
      if (canTask) {
        const bal = await api.getCreditBalance();
        setCreditBalance(bal.balance);
      }
      await load();
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? (err.response?.data as { message?: string })?.message
        : undefined;
      addToast(msg ?? 'Impossible de postuler', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handlePay = async () => {
    if (!job) return;
    setPaying(true);
    try {
      const { checkoutUrl } = await api.createTaskPaymentCheckout(job.id);
      if (checkoutUrl) window.location.href = checkoutUrl;
      else addToast('Stripe non configuré', 'error');
    } catch {
      addToast('Impossible de démarrer le paiement', 'error');
    } finally {
      setPaying(false);
    }
  };

  if (loading || !job) {
    return (
      <div className="leather" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 className="w-8 h-8" style={{ color: gold, animation: 'spin 0.9s linear infinite' }} />
      </div>
    );
  }

  const statusColors: Record<JobStatus, string> = {
    pending: '#D9A441', accepted: '#7FB069', in_progress: '#6BA3C4',
    completed: '#9A8468', cancelled: '#C46B6B', declined: '#C46B6B',
  };

  const isJobOwner = job.clientId === profile?.id;
  const showTaskerActions = canTask && !isJobOwner;
  const hasApplied = job.myApplicationStatus === 'pending';
  const taskerCanApply = canTaskerApply(profile, profile?.verificationExpiresAt);
  const verificationStatus = getTaskerVerificationStatus(profile, profile?.verificationExpiresAt);
  const canApply = showTaskerActions && job.status === 'pending' && !hasApplied && (creditBalance ?? 0) > 0 && taskerCanApply;
  const canAskQuestion = showTaskerActions && job.status === 'pending' && !hasApplied;
  const hasMessageThread = !!jobConversation || !!job.myConversationStatus;

  const inquiryConversations = isJobOwner
    ? Object.values(applicantConversations).filter(
        (c) => c.status === 'inquiry' && c.providerId && !applications.some((a) => a.taskerId === c.providerId),
      )
    : [];

  const handleSendQuestion = async () => {
    if (!job || !inquiryDraft.trim() || sendingQuestion) return;
    setSendingQuestion(true);
    try {
      let conversationId = jobConversation?.id;
      if (!conversationId) {
        const result = await api.startJobInquiry(job.id);
        conversationId = result.conversationId;
        setJob((prev) => (prev ? { ...prev, myConversationStatus: result.status } : prev));
      }
      await api.sendMessage(conversationId, inquiryDraft.trim());
      setInquiryDraft('');
      setQuestionSent(true);
      setTimeout(() => setQuestionSent(false), 2500);
      addToast('Message envoyé au client!', 'success');
      await load();
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? (err.response?.data as { message?: string })?.message
        : undefined;
      addToast(msg ?? 'Impossible d\'envoyer le message', 'error');
    } finally {
      setSendingQuestion(false);
    }
  };

  return (
    <div className="leather" style={{ minHeight: '100vh' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 24px' }}>
        <Link to="/jobs" className="body-f muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, textDecoration: 'none', marginBottom: 20 }}>
          <ArrowLeft className="w-4 h-4" /> Retour aux tâches
        </Link>

        <div className="stitch-box" style={{ background: 'rgba(21,35,50,0.7)', padding: 24, marginBottom: 20 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="svc-icon" style={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Briefcase className="w-6 h-6" style={{ color: gold }} />
              </div>
              <div>
                <p className="body-f muted2" style={{ fontSize: 12 }}>{SERVICE_TYPE_LABELS[job.serviceType]}</p>
                <h1 className="serif cream-hi" style={{ fontSize: 'clamp(1.4rem, 3vw, 1.8rem)', fontWeight: 900 }}>{job.title}</h1>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              {hasApplied && (
                <span
                  className="body-f"
                  style={{
                    fontSize: 12,
                    color: '#1F2F3F',
                    background: '#7FB069',
                    padding: '4px 12px',
                    borderRadius: 999,
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  <Check className="w-3.5 h-3.5" /> Postulé
                </span>
              )}
              <span className="body-f" style={{ fontSize: 12, color: '#1F2F3F', background: statusColors[job.status], padding: '4px 12px', borderRadius: 999, fontWeight: 700 }}>
                {JOB_STATUS_LABELS[job.status]}
              </span>
            </div>
          </div>

          <p className="body-f muted" style={{ fontSize: 15, lineHeight: 1.6, marginBottom: 20 }}>{job.description}</p>

          {job.photoUrls && job.photoUrls.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
              {job.photoUrls.map((url) => (
                <a key={url} href={url} target="_blank" rel="noreferrer">
                  <img
                    src={url}
                    alt=""
                    style={{
                      width: 96,
                      height: 96,
                      objectFit: 'cover',
                      borderRadius: 8,
                      border: '2px solid rgba(217,179,140,0.25)',
                    }}
                  />
                </a>
              ))}
            </div>
          )}

          <div className="body-f muted" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 24, fontSize: 14 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Calendar className="w-4 h-4" />{formatDate(job.scheduledDate)}</span>
            {job.estimatedDuration > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Clock className="w-4 h-4" />{formatDuration(job.estimatedDuration)}</span>
            )}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><MapPin className="w-4 h-4" />{formatJobLocation(job)}</span>
            {!job.addressRedacted && job.distance != null && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><MapPin className="w-4 h-4" />{formatDistance(job.distance)}</span>
            )}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><DollarSign className="w-4 h-4" /><span className="cream-hi" style={{ fontWeight: 700 }}>{formatPrice(job.estimatedPrice)}</span></span>
          </div>

          {job.contactRedacted && showTaskerActions && !hasApplied && (
            <p className="body-f muted2" style={{ fontSize: 13, marginBottom: 20, fontStyle: 'italic' }}>
              Contact et adresse masqués. Posez une question gratuite au client ou postulez pour être considéré.
            </p>
          )}

          {showTaskerActions && !taskerCanApply && job.status === 'pending' && !hasApplied && (
            <div className="stitch-box body-f" style={{ padding: 14, marginBottom: 20, background: 'rgba(184,123,68,0.12)' }}>
              <p className="cream-hi" style={{ fontWeight: 600, marginBottom: 6 }}>
                {VERIFICATION_LABELS[verificationStatus]} — postuler bloqué
              </p>
              <p className="muted" style={{ fontSize: 13, marginBottom: 10 }}>{VERIFICATION_HINTS[verificationStatus]}</p>
              <p className="muted2" style={{ fontSize: 12, marginBottom: 10 }}>
                Astuce bêta : utilisez « Poser une question » (gratuit) pendant l&apos;attente d&apos;approbation.
              </p>
              <Link to="/profile" className="gold-btn" style={{ padding: '8px 14px', fontSize: 13, textDecoration: 'none', display: 'inline-block' }}>
                Compléter la vérification
              </Link>
            </div>
          )}

          {showTaskerActions && taskerCanApply && (creditBalance ?? 0) === 0 && job.status === 'pending' && !hasApplied && (
            <div className="stitch-box body-f" style={{ padding: 14, marginBottom: 20, background: 'rgba(21,35,50,0.55)' }}>
              <p className="cream-hi" style={{ fontWeight: 600, marginBottom: 6 }}>0 crédit</p>
              <p className="muted" style={{ fontSize: 13, marginBottom: 10 }}>
                Il faut 1 crédit pour postuler (remboursé si non retenu). Les questions gratuites restent disponibles.
              </p>
              <Link to="/credits" className="gold-btn" style={{ padding: '8px 14px', fontSize: 13, textDecoration: 'none', display: 'inline-block' }}>
                Obtenir des crédits
              </Link>
            </div>
          )}

          {!job.contactRedacted && job.addressRedacted && showTaskerActions && (
            <p className="body-f muted2" style={{ fontSize: 13, marginBottom: 20, fontStyle: 'italic' }}>
              Vous pouvez contacter le client. Démarrez le job pour voir l&apos;adresse complète.
            </p>
          )}

          {showTaskerActions && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, background: 'rgba(15,25,36,0.5)', borderRadius: 8, marginBottom: 20 }}>
              <UserAvatar name={job.clientName} avatarUrl={job.clientAvatar} size={40} />
              <div>
                <p className="body-f cream-hi" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {job.clientName}
                  {job.clientReviewCount ? (
                    <span style={{ fontSize: 13, color: gold, display: 'flex', alignItems: 'center', gap: 2, fontWeight: 500 }}>
                      <Star className="w-3 h-3" style={{ fill: gold }} />
                      {job.clientRating?.toFixed(1)} <span className="muted2">({job.clientReviewCount})</span>
                    </span>
                  ) : (
                    <span className="body-f muted2" style={{ fontSize: 12, fontWeight: 400 }}>Nouveau</span>
                  )}
                </p>
                {job.clientPhone && (
                  <p className="body-f muted2" style={{ fontSize: 13 }}>{job.clientPhone}</p>
                )}
                {!job.clientPhone && job.contactRedacted && (
                  <p className="body-f muted2" style={{ fontSize: 13 }}>Contact masqué jusqu&apos;à la sélection</p>
                )}
              </div>
            </div>
          )}

          {canAskQuestion && (
            <div
              className="stitch-box body-f"
              style={{
                padding: 16,
                marginBottom: 20,
                background: 'rgba(107,163,196,0.12)',
                border: '1px solid rgba(107,163,196,0.35)',
              }}
            >
              <p className="cream-hi" style={{ fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                <MessageSquare className="w-4 h-4" style={{ color: gold }} />
                {hasMessageThread ? 'Message au client' : 'Poser une question (gratuit)'}
              </p>
              <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
                Écrivez ici pour contacter le client — <strong className="cream-hi">sans crédit</strong>.
                {canApply && ' Postuler est séparé ci-dessous.'}
              </p>
              <textarea
                className="q-field"
                value={inquiryDraft}
                onChange={(e) => setInquiryDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (inquiryDraft.trim() && !sendingQuestion) void handleSendQuestion();
                  }
                }}
                placeholder="Ex: Combien de pièces? Quels meubles? Quelle heure?"
                rows={3}
                style={{ width: '100%', marginBottom: 10, resize: 'vertical' }}
              />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                <button
                  type="button"
                  disabled={sendingQuestion || !inquiryDraft.trim()}
                  onClick={() => void handleSendQuestion()}
                  className={questionSent ? 'gold-btn' : 'gold-btn'}
                  style={{
                    padding: '10px 20px',
                    fontSize: 14,
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    ...(questionSent
                      ? {
                          border: '2px solid #7FB069',
                          background: 'linear-gradient(180deg, #8BC47A, #6FA85E)',
                          color: '#1F2F3F',
                        }
                      : {}),
                  }}
                >
                  {sendingQuestion ? (
                    <Loader2 className="w-4 h-4" style={{ animation: 'spin 0.9s linear infinite' }} />
                  ) : questionSent ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {sendingQuestion ? 'Envoi…' : questionSent ? 'Envoyé ✓' : 'Envoyer'}
                </button>
                {hasMessageThread && (
                  <Link
                    to={`/messages?jobId=${job.id}`}
                    className="ghost-btn"
                    style={{ padding: '10px 16px', fontSize: 14, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    Voir la conversation
                    {jobConversation && jobConversation.unreadCount > 0 && (
                      <span style={{ background: gold, color: '#1F2F3F', borderRadius: 999, fontSize: 10, fontWeight: 800, padding: '1px 6px' }}>
                        {jobConversation.unreadCount}
                      </span>
                    )}
                  </Link>
                )}
              </div>
              {jobConversation?.lastMessage && (
                <p className="body-f muted2" style={{ fontSize: 12, marginTop: 12, marginBottom: 0 }}>
                  Dernier message :{' '}
                  {jobConversation.lastMessage.type === 'image'
                    ? '📷 Photo'
                    : jobConversation.lastMessage.content.slice(0, 80)}
                </p>
              )}
            </div>
          )}

          {canApply && (
            <div
              className="stitch-box body-f"
              style={{
                padding: 16,
                marginBottom: 20,
                background: 'rgba(21,35,50,0.45)',
                border: '1px dashed rgba(217,179,140,0.25)',
              }}
            >
              <p className="cream-hi" style={{ fontWeight: 700, marginBottom: 4 }}>Postuler à cette tâche</p>
              <p className="muted2" style={{ fontSize: 13, marginBottom: 12 }}>
                La candidature coûte <strong className="cream-hi">1 crédit</strong>. Le message ci-dessous n&apos;est envoyé que si vous postulez.
              </p>
              <textarea
                className="q-field"
                value={applyMessage}
                onChange={(e) => setApplyMessage(e.target.value)}
                placeholder="Note optionnelle pour votre candidature…"
                rows={2}
                style={{ width: '100%', marginBottom: 10, resize: 'vertical' }}
              />
              <button
                type="button"
                onClick={handleApply}
                disabled={processing}
                className="gold-btn"
                style={{ padding: '10px 18px', fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                {processing ? (
                  <Loader2 className="w-4 h-4" style={{ animation: 'spin 0.9s linear infinite' }} />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {processing ? 'Envoi de la candidature…' : 'Postuler (1 crédit)'}
              </button>
              {(creditBalance ?? 0) <= 0 && (
                <CreditsLink
                  className="ghost-btn"
                  style={{ padding: '10px 16px', fontSize: 14, textDecoration: 'none', display: 'inline-flex', marginLeft: 10 }}
                >
                  Acheter des crédits
                </CreditsLink>
              )}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {(job.status !== 'pending' || hasApplied) && (
            <Link to={`/messages?jobId=${job.id}`} className="ghost-btn" style={{ padding: '10px 16px', fontSize: 14, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <MessageSquare className="w-4 h-4" /> {hasApplied && job.status === 'pending' ? 'Message au client' : 'Messages'}
              {jobConversation && jobConversation.unreadCount > 0 && (
                <span style={{ background: gold, color: '#1F2F3F', borderRadius: 999, fontSize: 10, fontWeight: 800, padding: '1px 6px' }}>
                  {jobConversation.unreadCount}
                </span>
              )}
            </Link>
            )}

            {hasApplied && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', width: '100%' }}>
                <span
                  className="body-f"
                  style={{
                    padding: '10px 18px',
                    fontSize: 14,
                    fontWeight: 700,
                    borderRadius: 8,
                    border: '2px solid #7FB069',
                    background: 'linear-gradient(180deg, #8BC47A, #6FA85E)',
                    color: '#1F2F3F',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Check className="w-4 h-4" />
                  Postulé — en attente du client
                </span>
                <button
                  type="button"
                  onClick={() => runAction(() => api.withdrawApplication(job.id).then(), 'Candidature retirée')}
                  disabled={processing}
                  className="ghost-btn"
                  style={{ padding: '10px 16px', fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 6, color: '#C46B6B', borderColor: 'rgba(196,107,107,0.35)' }}
                >
                  <X className="w-4 h-4" /> Retirer ma candidature
                </button>
              </div>
            )}

            {showTaskerActions && job.status === 'accepted' && (
              <>
                <button onClick={() => runAction(() => api.startJob(job.id).then(), 'Job démarré!')} disabled={processing} className="gold-btn" style={{ padding: '10px 16px', fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Play className="w-4 h-4" /> Démarrer
                </button>
                <button onClick={() => runAction(() => api.completeJob(job.id).then(), 'Job terminé!')} disabled={processing} className="ghost-btn" style={{ padding: '10px 16px', fontSize: 14 }}>
                  Terminer
                </button>
              </>
            )}

            {showTaskerActions && job.status === 'in_progress' && (
              <button onClick={() => runAction(() => api.completeJob(job.id).then(), 'Job terminé!')} disabled={processing} className="gold-btn" style={{ padding: '10px 16px', fontSize: 14 }}>
                Terminer le job
              </button>
            )}

            {isJobOwner && job.paymentStatus === 'paid' && (
              <span className="body-f" style={{ fontSize: 13, color: '#7FB069', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Check className="w-4 h-4" /> Payé
              </span>
            )}

            {isJobOwner && job.paymentStatus !== 'paid' && ['accepted', 'in_progress', 'completed'].includes(job.status) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <button
                  type="button"
                  onClick={handlePay}
                  disabled={paying}
                  className="gold-btn"
                  style={{ padding: '10px 16px', fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 8, alignSelf: 'flex-start' }}
                >
                  <CreditCard className="w-4 h-4" />
                  {paying ? 'Redirection…' : `Payer ${formatPrice(job.estimatedPrice)}`}
                </button>
                <span className="body-f muted2" style={{ fontSize: 12 }}>
                  Paiement Stripe optionnel — vous pouvez aussi payer le travailleur directement.
                </span>
              </div>
            )}

            {job.status === 'completed' && !hasReview && (
              <button onClick={() => setShowReview(true)} className="ghost-btn" style={{ padding: '10px 16px', fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Star className="w-4 h-4" /> Laisser une évaluation
              </button>
            )}

            {job.status === 'completed' && hasReview && (
              <span className="body-f muted2" style={{ fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Check className="w-4 h-4" style={{ color: '#7FB069' }} /> Évaluation envoyée
              </span>
            )}

            {isJobOwner && job.status === 'pending' && (
              <>
                <span className="body-f muted2" style={{ fontSize: 14 }}>
                  {(job.pendingApplicationCount ?? applications.length) > 0
                    ? `${job.pendingApplicationCount ?? applications.length} candidature(s) en attente`
                    : 'En attente de candidatures'}
                </span>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={processing}
                  className="ghost-btn"
                  style={{ padding: '6px 12px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 5, color: '#C46B6B', borderColor: 'rgba(196,107,107,0.35)' }}
                >
                  <Trash2 className="w-3 h-3" /> Supprimer
                </button>
              </>
            )}

            {isJobOwner && (job.status === 'accepted' || job.status === 'in_progress') && (
              <button
                type="button"
                onClick={handleCancel}
                disabled={processing}
                className="ghost-btn"
                style={{ padding: '6px 12px', fontSize: 13, color: '#C46B6B', borderColor: 'rgba(196,107,107,0.35)' }}
              >
                Annuler la tâche
              </button>
            )}
          </div>
        </div>
        </div>

        {isJobOwner && isClientMode && job.status === 'pending' && inquiryConversations.length > 0 && (
          <div className="stitch-box" style={{ background: 'rgba(21,35,50,0.7)', padding: 24, marginBottom: 20 }}>
            <h2 className="serif cream-hi" style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
              Questions ({inquiryConversations.length})
            </h2>
            <p className="body-f muted2" style={{ fontSize: 13, marginBottom: 12 }}>
              Travailleurs qui posent des questions avant de postuler.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {inquiryConversations.map((c) => (
                <div key={c.id} style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', padding: 12, background: 'rgba(15,25,36,0.5)', borderRadius: 8 }}>
                  <p className="body-f cream-hi" style={{ flex: 1, fontWeight: 600 }}>{c.clientName}</p>
                  <Link
                    to={`/messages?jobId=${job.id}&taskerId=${c.providerId}`}
                    className="ghost-btn"
                    style={{ padding: '8px 14px', fontSize: 13, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <MessageSquare className="w-4 h-4" />
                    Répondre
                    {c.unreadCount > 0 && (
                      <span style={{ background: gold, color: '#1F2F3F', borderRadius: 999, fontSize: 10, fontWeight: 800, padding: '1px 6px' }}>
                        {c.unreadCount}
                      </span>
                    )}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {isJobOwner && isClientMode && job.status === 'pending' && applications.length > 0 && (
          <div className="stitch-box" style={{ background: 'rgba(21,35,50,0.7)', padding: 24 }}>
            <h2 className="serif cream-hi" style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
              Candidatures ({applications.length})
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {applications.map((app) => (
                <TaskerCard
                  key={app.id}
                  tasker={{ ...app.tasker, message: app.message }}
                  action={
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                      <Link
                        to={`/messages?jobId=${job.id}&taskerId=${app.taskerId}`}
                        className="ghost-btn"
                        style={{ padding: '8px 14px', fontSize: 13, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                      >
                        <MessageSquare className="w-4 h-4" />
                        Message
                        {(applicantConversations[app.taskerId]?.unreadCount ?? 0) > 0 && (
                          <span style={{ background: gold, color: '#1F2F3F', borderRadius: 999, fontSize: 10, fontWeight: 800, padding: '1px 6px' }}>
                            {applicantConversations[app.taskerId].unreadCount}
                          </span>
                        )}
                      </Link>
                      <button
                        type="button"
                        disabled={processing}
                        onClick={() => runAction(() => api.selectTasker(job.id, app.taskerId).then(), 'Travailleur choisi!')}
                        className="gold-btn"
                        style={{ padding: '8px 14px', fontSize: 13 }}
                      >
                        Choisir
                      </button>
                    </div>
                  }
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {showReview && (
        <ReviewModal
          taskId={job.id}
          taskTitle={job.title}
          onClose={() => setShowReview(false)}
          onSubmitted={() => { setHasReview(true); load(); }}
        />
      )}
    </div>
  );
}
