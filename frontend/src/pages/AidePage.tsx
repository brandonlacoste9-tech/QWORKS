import { useState } from 'react';
import { Link } from 'react-router-dom';
import { SiteNav } from '../components/SiteNav';
import { SiteFooter } from '../components/SiteFooter';
import { Copy, MapPin, Shield, Sparkles, Users } from 'lucide-react';
import { colors, gold } from '../styles/design-tokens';
import { sitePath } from '../utils/siteConfig';

type Lang = 'fr' | 'en';

function sharePosts(lang: Lang) {
  const aide = sitePath('/aide');
  const client = sitePath('/register/client');
  if (lang === 'fr') {
    return {
      fb: `🏠 BESOIN D'AIDE? Québec Emplois — bêta gratuite (Montréal / Rive-Sud)

Ménage, déménagement, montage de meubles, jardinage… Publiez votre tâche en 3 minutes.

✅ Des travailleurs locaux postulent — VOUS choisissez
✅ Votre adresse reste privée jusqu'au démarrage
✅ Fourchettes de prix affichées d'avance
✅ Gratuit en bêta (pas de frais plateforme)

👉 ${aide}

#Montréal #Aide #Services #Québec`,
      kijiji: `Titre: Trouvez de l'aide locale — ménage, déménagement, montage (GRATUIT bêta)

Description:
Québec Emplois est un marché de services québécois en bêta à Montréal et sur la Rive-Sud.

Pour les clients:
1. Créez un compte gratuit
2. Publiez votre tâche (description, date, budget)
3. Recevez des candidatures de travailleurs locaux vérifiés
4. Choisissez celui qui vous convient
5. Coordonnez et faites le travail

Avantages:
- Vous choisissez le travailleur (pas le premier qui accepte)
- Vie privée: adresse masquée jusqu'au démarrage
- Fourchettes de prix suggérées
- Conforme Loi 25 (Québec)

Inscription gratuite: ${client}
Publier une tâche: ${aide}`,
      court: `🏠 Besoin d'aide à la maison? Ménage, déménagement, montage — Q-Emplois (bêta gratuite MTL/Rive-Sud). Vous choisissez votre travailleur. ${aide}`,
      need: `Je cherche de l'aide pour [ménage / montage / déménagement] à [quartier]. Quelqu'un a déjà utilisé Q-Emplois? C'est gratuit en bêta et tu choisis ton travailleur 👉 ${aide}`,
    };
  }
  return {
    fb: `🏠 NEED HELP? Q-Emplois — free beta (Montreal / South Shore)

Cleaning, moving, furniture assembly, yard work… Post your task in 3 minutes.

✅ Local taskers apply — YOU choose
✅ Address private until work starts
✅ Price ranges shown upfront
✅ Free in beta

👉 ${aide}`,
    kijiji: `Title: Find local help — cleaning, moving, assembly (FREE beta)

Q-Emplois is a Québec services marketplace in beta.

For clients: post a task, receive applications, pick your tasker, coordinate and done.

Free signup: ${client}
Post a task: ${aide}`,
    court: `🏠 Home help needed? Q-Emplois free beta MTL/South Shore. You pick your tasker. ${aide}`,
    need: `Looking for help with [cleaning / assembly / moving] in [area]. Anyone tried Q-Emplois? Free beta, you choose your tasker 👉 ${aide}`,
  };
}

const T = {
  fr: {
    badge: 'Bêta Montréal & Rive-Sud — gratuit pour les clients',
    h1: 'Trouvez de l\'aide locale en quelques clics',
    sub: 'Publiez ce dont vous avez besoin — ménage, déménagement, montage de meubles, jardinage. Des travailleurs locaux postulent; vous choisissez celui qui vous convient. Votre adresse reste privée jusqu\'au démarrage du travail.',
    cta: 'Publier une tâche — gratuit',
    register: 'Créer un compte client',
    login: 'Déjà inscrit? Connexion',
    howTitle: 'Comment ça marche',
    steps: [
      { t: 'Décrivez votre besoin', d: 'Type de service, date, budget estimé — 3 minutes.' },
      { t: 'Recevez des candidatures', d: 'Plusieurs travailleurs postulent avec profil, avis et message.' },
      { t: 'Choisissez votre travailleur', d: 'Vous comparez et sélectionnez — pas de « premier arrivé, premier servi ».' },
      { t: 'Coordonnez', d: 'Messagerie et contact une fois votre choix fait.' },
      { t: 'Travail terminé', d: 'Laissez une évaluation; payez en ligne (Stripe) ou directement avec le travailleur.' },
    ],
    perksTitle: 'Pourquoi les clients nous choisissent',
    perks: [
      { ic: '🔒', t: 'Vie privée', d: 'Secteur visible sur le tableau; adresse exacte seulement au démarrage.' },
      { ic: '👥', t: 'Vous choisissez', d: 'Comparez candidats, avis et badge vérifié.' },
      { ic: '🧾', t: 'Prix clairs', d: 'Fourchettes typiques affichées avant de publier.' },
      { ic: '⚜', t: 'Québécois', d: 'Conforme Loi 25; garantie satisfaction.' },
    ],
    examplesTitle: 'Exemples de tâches populaires',
    examples: [
      { t: 'Ménage avant déménagement', p: '49–129 $' },
      { t: 'Montage de meubles IKEA', p: '45–99 $' },
      { t: 'Aide au déménagement', p: '89–249 $' },
      { t: 'Tonte / jardin', p: '39–89 $/h' },
      { t: 'Nettoyage de condo', p: '49–149 $' },
    ],
    betaNote: 'Bêta gratuite : aucun frais plateforme pour publier une tâche. Après avoir choisi votre travailleur, vous pouvez payer en ligne (Stripe) depuis la fiche de la tâche ou vous arranger directement (virement, comptant, etc.).',
    shareTitle: 'Textes prêts à publier',
    shareHint: 'Partagez dans vos groupes Facebook, Nextdoor ou Kijiji pour trouver des voisins qui ont besoin d\'aide — ou postez vous-même si vous cherchez.',
    copied: 'Copié!',
    taskerLink: 'Vous voulez travailler? Devenez travailleur',
  },
  en: {
    badge: 'Montreal & South Shore beta — free for clients',
    h1: 'Find trusted local help in a few clicks',
    sub: 'Post what you need — cleaning, moving, furniture assembly, yard work. Local taskers apply; you pick the one you want. Your address stays private until work starts.',
    cta: 'Post a task — free',
    register: 'Create client account',
    login: 'Already signed up? Log in',
    howTitle: 'How it works',
    steps: [
      { t: 'Describe your need', d: 'Service type, date, estimated budget — 3 minutes.' },
      { t: 'Get applications', d: 'Multiple taskers apply with profile, reviews and message.' },
      { t: 'Pick your tasker', d: 'Compare and choose — no first-accept race.' },
      { t: 'Coordinate', d: 'Messaging and contact after your choice.' },
      { t: 'Job done', d: 'Leave a review; pay online (Stripe) or directly with your tasker.' },
    ],
    perksTitle: 'Why clients choose us',
    perks: [
      { ic: '🔒', t: 'Privacy', d: 'Area shown on board; full address only when work starts.' },
      { ic: '👥', t: 'You choose', d: 'Compare applicants, reviews and verified badge.' },
      { ic: '🧾', t: 'Clear pricing', d: 'Typical ranges shown before you post.' },
      { ic: '⚜', t: 'Québec-built', d: 'Law 25 compliant; satisfaction pledge.' },
    ],
    examplesTitle: 'Popular task examples',
    examples: [
      { t: 'Move-out cleaning', p: '$49–129' },
      { t: 'IKEA furniture assembly', p: '$45–99' },
      { t: 'Moving help', p: '$89–249' },
      { t: 'Lawn / yard work', p: '$39–89/h' },
      { t: 'Condo cleaning', p: '$49–149' },
    ],
    betaNote: 'Free beta: no platform fee to post. After you pick your tasker, pay online (Stripe) from the job page or arrange payment directly (e-transfer, cash, etc.).',
    shareTitle: 'Ready-to-post copy',
    shareHint: 'Share in Facebook groups, Nextdoor or Kijiji.',
    copied: 'Copied!',
    taskerLink: 'Want to work? Become a tasker',
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

export function AidePage() {
  const [lang, setLang] = useState<Lang>('fr');
  const t = T[lang];
  const posts = sharePosts(lang);

  return (
    <div className="leather" style={{ minHeight: '100vh', color: colors.cream }}>
      <SiteNav lang={lang} onToggleLang={() => setLang(lang === 'fr' ? 'en' : 'fr')} />

      <section style={{ padding: '120px 24px 48px', maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', padding: '6px 16px', marginBottom: 20, borderRadius: 999, border: '1px dashed rgba(217,179,140,0.4)', background: 'rgba(184,123,68,0.08)', fontSize: 12, letterSpacing: '0.08em' }}>
          ⚜ {t.badge}
        </div>
        <h1 className="serif cream-hi" style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 900, lineHeight: 1.1, marginBottom: 16 }}>
          {t.h1}
        </h1>
        <p className="body-f muted" style={{ fontSize: 'clamp(1rem, 2.2vw, 1.15rem)', lineHeight: 1.65, marginBottom: 28 }}>
          {t.sub}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
          <Link to="/register/client" className="gold-btn" style={{ padding: '14px 28px', fontSize: 16, textDecoration: 'none' }}>
            {t.cta}
          </Link>
          <Link to="/login" className="ghost-btn" style={{ padding: '14px 28px', fontSize: 15, textDecoration: 'none' }}>
            {t.login}
          </Link>
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

      <section style={{ maxWidth: 640, margin: '0 auto 48px', padding: '0 24px' }}>
        <h2 className="serif cream-hi" style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Sparkles className="w-5 h-5" style={{ color: gold }} /> {t.examplesTitle}
        </h2>
        <div className="stitch-box" style={{ background: 'rgba(21,35,50,0.6)', padding: 16 }}>
          {t.examples.map((ex) => (
            <div key={ex.t} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderBottom: '1px dashed rgba(217,179,140,0.15)' }}>
              <span className="body-f muted" style={{ fontSize: 14 }}>{ex.t}</span>
              <span className="body-f cream-hi" style={{ fontSize: 14, fontWeight: 600 }}>{ex.p}</span>
            </div>
          ))}
        </div>
        <p className="body-f muted2" style={{ fontSize: 13, marginTop: 16, lineHeight: 1.55, textAlign: 'center' }}>{t.betaNote}</p>
        <p className="body-f muted2" style={{ fontSize: 13, marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
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
        <CopyBlock label="Message court" text={posts.court} copiedLabel={t.copied} />
        <CopyBlock label="Post « je cherche de l'aide »" text={posts.need} copiedLabel={t.copied} />
      </section>

      <section style={{ maxWidth: 640, margin: '0 auto 64px', padding: '0 24px', textAlign: 'center' }}>
        <Link to="/register/client" className="gold-btn" style={{ padding: '16px 36px', fontSize: 17, textDecoration: 'none', display: 'inline-block' }}>
          {t.register}
        </Link>
        <p style={{ marginTop: 16 }}>
          <Link to="/recrute" className="body-f muted2" style={{ fontSize: 14 }}>{t.taskerLink} →</Link>
        </p>
        <p className="body-f muted2" style={{ fontSize: 12, marginTop: 24, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Shield className="w-4 h-4" /> <Link to="/garantie" style={{ color: 'inherit' }}>Garantie satisfaction</Link> · Loi 25
        </p>
      </section>

      <SiteFooter lang={lang} />
    </div>
  );
}
