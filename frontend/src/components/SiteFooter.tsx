import { Link } from "react-router-dom";
import { BrandLogo } from "./BrandLogo";

type Lang = "fr" | "en";

const FOOT = {
  fr: {
    tag: "Le marché de services local du Québec.",
    legal: "Conforme à la Loi 96 (langue) et à la Loi 25 (vie privée).",
    copy: "© 2026 Québec emplois. Tous droits réservés.",
    find: "Trouver de l'aide",
    aide: "Publier une tâche (bêta)",
    become: "Offrir mes services",
    recrute: "Recrutement bêta",
    login: "Connexion",
    signup: "S'inscrire",
    garantie: "Garantie satisfaction",
    privacy: "Politique de confidentialité",
    support: "Support",
  },
  en: {
    tag: "Québec's local services marketplace.",
    legal: "Compliant with Bill 96 (language) and Law 25 (privacy).",
    copy: "© 2026 Québec emplois. All rights reserved.",
    find: "Find help",
    aide: "Post a task (beta)",
    become: "Offer my services",
    recrute: "Beta recruitment",
    login: "Log in",
    signup: "Sign up",
    garantie: "Happiness pledge",
    privacy: "Privacy policy",
    support: "Support",
  },
};

/* Shared footer — matches the homepage footer (compliance line included). */
export function SiteFooter({ lang }: { lang: Lang }) {
  const t = FOOT[lang];
  return (
    <footer className="leather" style={{ borderTop: "2px dashed rgba(217,179,140,0.2)", padding: "48px 24px 32px" }}>
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          display: "flex",
          flexWrap: "wrap",
          gap: 24,
          alignItems: "flex-start",
          justifyContent: "space-between",
        }}
      >
        <div style={{ maxWidth: 360 }}>
          <BrandLogo size="md" />
          <p className="body-f muted2" style={{ fontSize: 13, marginTop: 10, lineHeight: 1.6 }}>{t.tag}</p>
        </div>
        <div className="body-f" style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 14 }}>
          <Link to="/aide" className="nav-link">{t.aide}</Link>
          <Link to="/recrute" className="nav-link">{t.become}</Link>
          <Link to="/register/tasker" className="nav-link">{t.recrute}</Link>
          <Link to="/login" className="nav-link">{t.login}</Link>
          <Link to="/register" className="nav-link">{t.signup}</Link>
          <Link to="/garantie" className="nav-link">{t.garantie}</Link>
          <Link to="/politique-confidentialite" className="nav-link">{t.privacy}</Link>
          <a href="mailto:support@qemplois.ca" className="nav-link">{t.support}</a>
        </div>
      </div>
      <div className="stitch-h" style={{ maxWidth: 1100, margin: "28px auto 18px" }} />
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          justifyContent: "space-between",
        }}
      >
        <p className="body-f muted2" style={{ fontSize: 12 }}>{t.legal}</p>
        <p className="body-f muted2" style={{ fontSize: 12 }}>{t.copy}</p>
      </div>
    </footer>
  );
}
