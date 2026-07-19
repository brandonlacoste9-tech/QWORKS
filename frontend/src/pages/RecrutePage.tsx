import { useState } from 'react';
import { Link } from 'react-router-dom';
import { SiteNav } from '../components/SiteNav';
import { SiteFooter } from '../components/SiteFooter';
import { Copy, Coins, MapPin, Shield, Users } from 'lucide-react';
import { colors, gold } from '../styles/design-tokens';
import { sitePath } from '../utils/siteConfig';

type Lang = 'fr' | 'en';

function sharePosts(lang: Lang) {
  const recrute = sitePath('/recrute');
  const tasker = sitePath('/register/tasker');
  if (lang === 'fr') {
    return {
      fb: `🔧 BÊTA Québec Emplois — travailleurs recherchés (Montréal / Rive-Sud)

Tu cherches des jobs flexibles près de chez toi? Ménage, déménagement, montage de meubles, jardinage…

✅ Tu postules aux tâches qui t'intéressent (pas de course)
✅ 60 crédits GRATUITS pour les 50 premiers inscrits
✅ Crédit remboursé si tu n'es pas choisi

Inscription gratuite 👉 ${recrute}

#Montréal #Job #SideHustle #Québec`,
      kijiji: `Titre: Travailleur autonome — jobs locaux (ménage, déménagement, montage)

Description:
Québec Emplois recrute des travailleurs pour sa bêta à Montréal et sur la Rive-Sud.

Comment ça marche:
- Vous créez un profil (services + secteur)
- Vous postulez aux jobs publiés près de chez vous
- Le client choisit le travailleur qui lui convient
- Vous faites le travail et êtes payé (en ligne optionnel ou direct)

Avantages bêta:
- 60 crédits gratuits pour les 50 premiers inscrits
- 1 crédit = 1 candidature; remboursé si non retenu
- Plateforme québécoise, conforme Loi 25

Inscription: ${tasker}`,
      court: `💼 Jobs flexibles Montréal/Rive-Sud — Q-Emplois (bêta). Ménage, déménagement, montage. 60 crédits gratuits aux premiers inscrits. ${recrute}`,
    };
  }
  return {
    fb: `🔧 Q-Emplois BETA — taskers wanted (Montreal / South Shore)

Looking for flexible local gigs? Cleaning, moving, furniture assembly, yard work…

✅ Apply to jobs you want (no race)
✅ 60 FREE credits for the first 50 signups
✅ Credit refunded if you're not selected

Free signup 👉 ${recrute}`,
    kijiji: `Title: Local tasker — cleaning, moving, assembly (beta)

Q-Emplois is recruiting taskers for our Montreal / South Shore beta.

- Create a profile (services + area)
- Apply to jobs near you
- Client picks the best fit
- Do the work and get paid (optional online or direct)

Beta perks: 60 free credits (first 50), refund if not selected.

Sign up: ${tasker}`,
    court: `💼 Flexible gigs Montreal/South Shore — Q-Emplois beta. 60 free credits for early taskers. ${recrute}`,
  };
}

const T = {
  fr: {
    badge: 'Bêta Montréal & Rive-Sud',
    h1: 'Gagnez de l\'argent près de chez vous',
    sub: 'Inscrivez-vous comme travailleur sur Québec Emplois — le marché local québécois. Vous postulez aux jobs qui vous conviennent; le client vous choisit. Pas de course pour « accepter en premier ».',
    cta: 'Devenir travailleur — gratuit',
    login: 'Déjà inscrit? Connexion',
    founding: 'Offre Founding Tasker',
    foundingDesc: 'Les 50 premiers inscrits reçoivent 60 crédits gratuits + 20 % de rabais à vie sur les packs.',
    howTitle: 'Comment ça marche',
    steps: [
      { t: 'Créez votre profil', d: 'Services, ville, rayon — 5 minutes.' },
      { t: 'Parcourez les jobs', d: 'Ménage, déménagement, montage, jardinage… près de chez vous.' },
      { t: 'Postulez (1 crédit)', d: 'Crédit remboursé si le client choisit quelqu\'un d\'autre.' },
      { t: 'Le client vous choisit', d: 'Contact débloqué; vous coordonnez la date.' },
      { t: 'Faites le travail', d: 'Adresse exacte visible au démarrage — vie privée respectée.' },
    ],
    perksTitle: 'Pourquoi Québec Emplois',
    perks: [
      { ic: '🛡️', t: 'Vie privée', d: 'Adresse masquée jusqu\'au démarrage du job.' },
      { ic: '📱', t: 'Alertes Telegram', d: 'Soyez avisé quand une tâche correspond à vos services — postulez par message.' },
      { ic: '💰', t: 'Crédits simples', d: 'Pas de commission cachée en bêta — vous gardez ce que vous négociez avec le client.' },
      { ic: '⭐', t: 'Badge vérifié', d: 'Téléversez votre ID; les clients voient votre réputation.' },
      { ic: '📍', t: 'Local', d: 'Jobs filtrés par votre rayon de service.' },
    ],
    typesTitle: 'Types de jobs populaires',
    types: ['Ménage', 'Déménagement', 'Montage de meubles', 'Jardinage', 'Nettoyage', 'Livraison', 'Bricolage', 'Aide aux aînés'],
    shareTitle: 'Textes prêts à publier',
    shareHint: 'Copiez-collez sur Facebook, Kijiji ou dans un groupe de quartier.',
    copied: 'Copié!',
    clientLink: 'Vous cherchez de l\'aide? Publiez une tâche',
  },
  en: {
    badge: 'Montreal & South Shore beta',
    h1: 'Earn near where you live',
    sub: 'Join Québec Emplois as a tasker — Québec\'s local marketplace. You apply to jobs you want; the client picks you. No race to accept first.',
    cta: 'Become a tasker — free',
    login: 'Already signed up? Log in',
    founding: 'Founding Tasker offer',
    foundingDesc: 'First 50 signups get 60 free credits + 20% lifetime discount on packs.',
    howTitle: 'How it works',
    steps: [
      { t: 'Create your profile', d: 'Services, city, radius — 5 minutes.' },
      { t: 'Browse jobs', d: 'Cleaning, moving, assembly, yard work… near you.' },
      { t: 'Apply (1 credit)', d: 'Credit refunded if the client picks someone else.' },
      { t: 'Client chooses you', d: 'Contact unlocked; you schedule together.' },
      { t: 'Do the work', d: 'Full address shown when you start — privacy built in.' },
    ],
    perksTitle: 'Why Québec Emplois',
    perks: [
      { ic: '🛡️', t: 'Privacy', d: 'Address hidden until job start.' },
      { ic: '📱', t: 'Telegram alerts', d: 'Get notified when a matching task is posted — apply by reply.' },
      { ic: '💰', t: 'Simple credits', d: 'No hidden commission in beta — you keep what you agree with the client.' },
      { ic: '⭐', t: 'Verified badge', d: 'Upload ID; clients see your reputation.' },
      { ic: '📍', t: 'Local', d: 'Jobs filtered by your service radius.' },
    ],
    typesTitle: 'Popular job types',
    types: ['Cleaning', 'Moving', 'Furniture assembly', 'Yard work', 'Deep clean', 'Delivery', 'Handyman', 'Senior help'],
    shareTitle: 'Ready-to-post copy',
    shareHint: 'Copy-paste to Facebook, Kijiji or a neighborhood group.',
    copied: 'Copied!',
    clientLink: 'Need help? Post a task',
  },
};

function CopyBlock({ label, text, copiedLabel }: { label: string; text: string; copiedLabel: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="stitch-box" style={{ background: 'rgba(15,25,36,0.55)', padding: 16, marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <p className="body-f cream-hi" style={{ fontSize: 14, fontWeight: 600 }}>{label}</p>
        <button type="button" onClick={copy} className="ghost-btn" style={{ padding: '6px 10px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Copy className="w-3 h-3" /> {copied ? copiedLabel : 'Copier'}
        </button>
      </div>
      <pre className="body-f muted2" style={{ fontSize: 12, lineHeight: 1.55, whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'inherit' }}>{text}</pre>
    </div>
  );
}

export function RecrutePage() {
  const [lang, setLang] = useState<Lang>('fr');
  const t = T[lang];
  const posts = sharePosts(lang);

  return (
    <div className="leather" style={{ minHeight: '100vh', color: colors.cream }}>
      <SiteNav lang={lang} onToggleLang={() => setLang(lang === 'fr' ? 'en' : 'fr')} />

      <section style={{ padding: '120px 24px 48px', maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', padding: '6px 16px', marginBottom: 20, borderRadius: 999, border: '1px dashed rgba(217,179,140,0.4)', background: 'rgba(184,123,68,0.08)', fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          ⚜ {t.badge}
        </div>
        <h1 className="serif cream-hi" style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 900, lineHeight: 1.1, marginBottom: 16 }}>
          {t.h1}
        </h1>
        <p className="body-f muted" style={{ fontSize: 'clamp(1rem, 2.2vw, 1.15rem)', lineHeight: 1.65, marginBottom: 28 }}>
          {t.sub}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
          <Link to="/register/tasker" className="gold-btn" style={{ padding: '14px 28px', fontSize: 16, textDecoration: 'none' }}>
            {t.cta}
          </Link>
          <Link to="/login" className="ghost-btn" style={{ padding: '14px 28px', fontSize: 15, textDecoration: 'none' }}>
            {t.login}
          </Link>
        </div>
      </section>

      <section style={{ maxWidth: 640, margin: '0 auto 48px', padding: '0 24px' }}>
        <div className="stitch-box" style={{ background: 'rgba(184,123,68,0.12)', border: `1px dashed ${gold}`, padding: 20, textAlign: 'center' }}>
          <Coins className="w-8 h-8" style={{ color: gold, margin: '0 auto 10px' }} />
          <h2 className="serif cream-hi" style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>{t.founding}</h2>
          <p className="body-f muted" style={{ fontSize: 15, lineHeight: 1.55 }}>{t.foundingDesc}</p>
        </div>
      </section>

      <section style={{ maxWidth: 800, margin: '0 auto 48px', padding: '0 24px' }}>
        <h2 className="serif cream-hi" style={{ fontSize: 22, fontWeight: 800, marginBottom: 20, textAlign: 'center' }}>{t.howTitle}</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {t.steps.map((s, i) => (
            <div key={i} className="stitch-box" style={{ background: 'rgba(21,35,50,0.6)', padding: 16, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <span className="serif" style={{ width: 32, height: 32, borderRadius: '50%', background: gold, color: '#1F2F3F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0 }}>{i + 1}</span>
              <div>
                <p className="serif cream-hi" style={{ fontWeight: 700, marginBottom: 4 }}>{s.t}</p>
                <p className="body-f muted2" style={{ fontSize: 14 }}>{s.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ maxWidth: 900, margin: '0 auto 48px', padding: '0 24px' }}>
        <h2 className="serif cream-hi" style={{ fontSize: 22, fontWeight: 800, marginBottom: 20, textAlign: 'center' }}>{t.perksTitle}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          {t.perks.map((p) => (
            <div key={p.t} className="stitch-box" style={{ padding: 18, textAlign: 'center' }}>
              <span style={{ fontSize: 28 }}>{p.ic}</span>
              <p className="serif cream-hi" style={{ fontWeight: 700, marginTop: 8, marginBottom: 6 }}>{p.t}</p>
              <p className="body-f muted2" style={{ fontSize: 13, lineHeight: 1.5 }}>{p.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ maxWidth: 720, margin: '0 auto 48px', padding: '0 24px', textAlign: 'center' }}>
        <h2 className="serif cream-hi" style={{ fontSize: 20, fontWeight: 700, marginBottom: 14 }}>{t.typesTitle}</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
          {t.types.map((type) => (
            <span key={type} className="body-f" style={{ fontSize: 13, padding: '6px 14px', borderRadius: 999, border: '1px dashed rgba(217,179,140,0.35)', color: '#D9B38C' }}>{type}</span>
          ))}
        </div>
        <p className="body-f muted2" style={{ fontSize: 13, marginTop: 20, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <MapPin className="w-4 h-4" /> Montréal · Laval · Longueuil · Rive-Sud · West Island
        </p>
      </section>

      <section style={{ maxWidth: 720, margin: '0 auto 48px', padding: '0 24px' }}>
        <h2 className="serif cream-hi" style={{ fontSize: 22, fontWeight: 800, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Users className="w-6 h-6" style={{ color: gold }} /> {t.shareTitle}
        </h2>
        <p className="body-f muted2" style={{ fontSize: 14, marginBottom: 16 }}>{t.shareHint}</p>
        <CopyBlock label="Facebook / groupes de quartier" text={posts.fb} copiedLabel={t.copied} />
        <CopyBlock label="Kijiji" text={posts.kijiji} copiedLabel={t.copied} />
        <CopyBlock label="Message court (SMS / story)" text={posts.court} copiedLabel={t.copied} />
      </section>

      <section style={{ maxWidth: 640, margin: '0 auto 64px', padding: '0 24px', textAlign: 'center' }}>
        <Link to="/register/tasker" className="gold-btn" style={{ padding: '16px 36px', fontSize: 17, textDecoration: 'none', display: 'inline-block' }}>
          {t.cta}
        </Link>
        <p style={{ marginTop: 16 }}>
          <Link to="/aide" className="body-f muted2" style={{ fontSize: 14 }}>{t.clientLink} →</Link>
        </p>
        <p className="body-f muted2" style={{ fontSize: 12, marginTop: 24, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Shield className="w-4 h-4" /> Conforme Loi 25 · Vie privée par étapes
        </p>
      </section>

      <SiteFooter lang={lang} />
    </div>
  );
}
