// src/components/Footer.jsx
// Extracted from HomePage into a standalone component so it
// appears on EVERY page (rendered in App.jsx below <Routes>).

import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <>
      <style>{`
        .pc-footer { background:#0d0703; border-top:1px solid rgba(196,148,72,0.12); padding:3rem 0 1.5rem; }
        .pc-footer-inner { max-width:1200px; margin:0 auto; padding:0 1.5rem; }
        .pc-footer-grid { display:grid; grid-template-columns:2fr 1fr 1fr 1fr; gap:2.5rem; padding-bottom:2rem; border-bottom:1px solid rgba(196,148,72,0.1); margin-bottom:1.5rem; }
        .pc-footer-brand p { font-size:13px; color:#7a5e3a; line-height:1.7; margin:0.75rem 0 1.25rem; max-width:240px; }
        .pc-footer-socials { display:flex; gap:0.5rem; }
        .pc-footer-social-btn { width:34px; height:34px; border-radius:8px; border:1px solid rgba(196,148,72,0.2); background:transparent; display:flex; align-items:center; justify-content:center; color:#9a7a4a; font-size:16px; text-decoration:none; transition:background 0.2s,color 0.2s; }
        .pc-footer-social-btn:hover { background:rgba(196,148,72,0.1); color:#e8c87a; }
        .pc-footer-col h4 { font-size:12px; font-weight:600; color:#c49448; letter-spacing:0.1em; text-transform:uppercase; margin:0 0 1rem; }
        .pc-footer-col ul { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:0.5rem; }
        .pc-footer-col ul a { font-size:13px; color:#7a5e3a; text-decoration:none; transition:color 0.2s; }
        .pc-footer-col ul a:hover { color:#c4ab82; }
        .pc-footer-bottom { display:flex; justify-content:space-between; align-items:center; gap:1rem; flex-wrap:wrap; }
        .pc-footer-copy { font-size:12px; color:#4a3420; }
        .pc-footer-legal { display:flex; gap:1.25rem; }
        .pc-footer-legal a { font-size:12px; color:#4a3420; text-decoration:none; transition:color 0.2s; }
        .pc-footer-legal a:hover { color:#7a5e3a; }
        @media(max-width:900px){ .pc-footer-grid{ grid-template-columns:1fr 1fr; } }
        @media(max-width:600px){ .pc-footer-grid{ grid-template-columns:1fr; } }
      `}</style>

      <footer className="pc-footer" role="contentinfo">
        <div className="pc-footer-inner">
          <div className="pc-footer-grid">
            {/* Brand column */}
            <div className="pc-footer-brand">
              <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
                <div style={{ width:34,height:34,borderRadius:"50%",background:"linear-gradient(135deg,#c49448,#8b5e1a)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:"#120a06",fontFamily:"Georgia,serif" }}>P</div>
                <span style={{ fontSize:15,fontWeight:600,color:"#e8c87a",fontFamily:"Georgia,serif" }}>Perry's Collection</span>
              </div>
              <p>Curated fashion and accessories for the modern Kenyan woman. Quality pieces, delivered to your door.</p>
              <div className="pc-footer-socials">
                {[["ti-brand-instagram","Instagram"],["ti-brand-tiktok","TikTok"],["ti-brand-whatsapp","WhatsApp"],["ti-brand-facebook","Facebook"]].map(([icon,label]) => (
                  <a key={icon} href="#" className="pc-footer-social-btn" aria-label={label}>
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
                <li><a href="#"><i className="ti ti-map-pin" style={{ marginRight:6 }} />Nairobi, Kenya</a></li>
                <li><a href="#"><i className="ti ti-brand-whatsapp" style={{ marginRight:6 }} />WhatsApp us</a></li>
                <li><a href="#"><i className="ti ti-mail" style={{ marginRight:6 }} />Email us</a></li>
                <li><a href="t#"><i className="ti ti-clock" style={{ marginRight:6 }} />Mon–Sat, 8am–7pm</a></li>
              </ul>
            </div>
          </div>

          <div className="pc-footer-bottom">
            <p className="pc-footer-copy">© {new Date().getFullYear()} Perry's Collection. All rights reserved.</p>
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