

import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Archivo:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');

        :root{
          --paper:#FFFFFF;
          --cream:#F6F1E6;
          --ink:#221E19;
          --ink-soft:#5B564C;
          --brass:#A5793A;
          --brass-dark:#7C5A29;
          --line:#E5DFD1;
        }

        .pc-footer { background: var(--paper); border-top: 1px solid var(--line); padding: 64px 0 40px; font-family: 'Archivo', sans-serif; }
        .pc-footer-inner { max-width: 1240px; margin: 0 auto; padding: 0 48px; }

        .pc-footer-grid { display: grid; grid-template-columns: 1.4fr 1fr 1fr 1fr; gap: 40px; padding-bottom: 40px; border-bottom: 1px solid var(--line); margin-bottom: 24px; }

        .pc-footer-brand-row { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
        .pc-footer-brand-mark { width: 38px; height: 38px; border-radius: 50%; background: var(--ink); color: var(--paper); display: flex; align-items: center; justify-content: center; font-family: 'Instrument Serif', serif; font-size: 20px; flex-shrink: 0; }
        .pc-footer-brand-name { font-family: 'Instrument Serif', serif; font-size: 19px; color: var(--ink); }
        .pc-footer-brand p { font-size: 13.5px; color: var(--ink-soft); max-width: 260px; line-height: 1.6; margin: 0 0 20px; }

        .pc-footer-socials { display: flex; gap: 16px; }
        .pc-footer-social-link { color: var(--ink-soft); font-size: 17px; text-decoration: none; transition: color 0.2s; }
        .pc-footer-social-link:hover { color: var(--brass-dark); }

        .pc-footer-col h4 { font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-soft); margin: 0 0 16px; font-weight: 500; }
        .pc-footer-col ul { list-style: none; margin: 0; padding: 0; }
        .pc-footer-col ul a, .pc-footer-col ul span { display: flex; align-items: center; font-size: 14px; color: var(--ink); text-decoration: none; margin-bottom: 11px; transition: color 0.2s; }
        .pc-footer-col ul a:hover { color: var(--brass-dark); }

        .pc-footer-bottom { display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; }
        .pc-footer-copy { font-size: 12.5px; color: var(--ink-soft); margin: 0; }
        .pc-footer-legal { display: flex; gap: 1.25rem; }
        .pc-footer-legal a { font-size: 12.5px; color: var(--ink-soft); text-decoration: none; transition: color 0.2s; }
        .pc-footer-legal a:hover { color: var(--ink); }

        @media (max-width: 900px) {
          .pc-footer-inner { padding: 0 24px; }
          .pc-footer-grid { grid-template-columns: 1fr 1fr; gap: 32px; }
        }
        @media (max-width: 600px) {
          .pc-footer-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <footer className="pc-footer" role="contentinfo">
        <div className="pc-footer-inner">
          <div className="pc-footer-grid">
            {/* Brand column */}
            <div className="pc-footer-brand">
              <div className="pc-footer-brand-row">
                <div className="pc-footer-brand-mark">P</div>
                <span className="pc-footer-brand-name">Perry's Collection</span>
              </div>
              <p>Curated fashion and accessories for the modern Kenyan woman. Quality pieces, delivered to your door.</p>
              <div className="pc-footer-socials">
                {[["ti-brand-instagram","Instagram"],["ti-brand-tiktok","TikTok"],["ti-brand-whatsapp","WhatsApp"],["ti-brand-facebook","Facebook"]].map(([icon,label]) => (
                  <a key={icon} href="#" className="pc-footer-social-link" aria-label={label}>
                    <i className={`ti ${icon}`} aria-hidden="true" />
                  </a>
                ))}
              </div>
            </div>

            <div className="pc-footer-col">
              <h4>Shop</h4>
              <ul>
                {[["New Arrivals","/products?featured=true"],["All Products","/products"],["Bags","/categories/bags"],["Jewellery","/categories/jewellery"],["Clothing","/categories/clothing"]].map(([label,to]) => (
                  <li key={label}><Link to={to}>{label}</Link></li>
                ))}
              </ul>
            </div>

            <div className="pc-footer-col">
              <h4>Help</h4>
              <ul>
                {["Track Order","Returns","Shipping Info","Size Guide","FAQs","Contact Us"].map((item) => (
                  <li key={item}><a href="#">{item}</a></li>
                ))}
              </ul>
            </div>

            <div className="pc-footer-col">
              <h4>Contact</h4>
              <ul>
                <li><a href="#"><i className="ti ti-map-pin" style={{ marginRight: 8 }} />Nairobi, Kenya</a></li>
                <li><a href="#"><i className="ti ti-brand-whatsapp" style={{ marginRight: 8 }} />WhatsApp us</a></li>
                <li><a href="#"><i className="ti ti-mail" style={{ marginRight: 8 }} />Email us</a></li>
                <li><span><i className="ti ti-clock" style={{ marginRight: 8 }} />Mon–Sat, 8am–7pm</span></li>
              </ul>
            </div>
          </div>

          <div className="pc-footer-bottom">
            <p className="pc-footer-copy">© {new Date().getFullYear()} Perry's Collection</p>
            <nav className="pc-footer-legal" aria-label="Legal">
              <a href="#">Privacy Policy</a>
              <a href="#">Terms of Service</a>
            </nav>
          </div>
        </div>
      </footer>
    </>
  );
}