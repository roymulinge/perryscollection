// src/pages/CheckoutPage.jsx
// Two-step checkout: shipping details → payment method → place order.
// Handles M-Pesa (STK Push) and Cash on Delivery flows separately.
// Redirects to /login if user is not authenticated.

import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import apiClient from "../api/client";

const STEPS = ["Delivery details", "Payment", "Confirm"];

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { cart, clearCart } = useCart();
  const { user } = useAuth();

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [mpesaError, setMpesaError] = useState(""); // separate so order success still shows
  const [placedOrder, setPlacedOrder] = useState(null);

  const [form, setForm] = useState({
    full_name: user?.full_name || "",
    email: user?.email || "",
    phone_number: "",
    delivery_address: "",
    payment_method: "cash_on_delivery",
    notes: "",
  });

  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (!user) navigate("/login", { state: { from: "/checkout" } });
  }, [user, navigate]);

  useEffect(() => {
    if (!placedOrder && cart.items?.length === 0 && !submitting) {
      navigate("/cart");
    }
  }, [cart.items, placedOrder, submitting, navigate]);

  useEffect(() => {
    if (user) {
      setForm((f) => ({
        ...f,
        full_name: f.full_name || user.full_name || "",
        email: f.email || user.email || "",
      }));
    }
  }, [user]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (fieldErrors[name]) setFieldErrors((f) => ({ ...f, [name]: "" }));
  }

  function validateDelivery() {
    const errs = {};
    if (!form.full_name.trim()) errs.full_name = "Full name is required.";
    if (!form.email.trim()) errs.email = "Email is required.";
    if (!form.phone_number.trim()) errs.phone_number = "Phone number is required.";
    if (!form.delivery_address.trim()) errs.delivery_address = "Delivery address is required.";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleNextStep() {
    if (step === 0 && !validateDelivery()) return;
    setStep((s) => s + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handlePlaceOrder() {
    setSubmitting(true);
    setError("");
    setMpesaError("");

    try {
      const response = await apiClient.post("/checkout/", {
        email: form.email,
        full_name: form.full_name,
        phone_number: form.phone_number,
        address_line1: form.delivery_address,
        address_line2: "",
        city: "Nairobi",
        postal_code: "00100",
        country: "Kenya",
        payment_method: form.payment_method,
        notes: form.notes,
      });

      const order = response.data;
      setPlacedOrder(order);

      if (form.payment_method === "mpesa") {
        try {
          await apiClient.post("/checkout/mpesa/push/", {
            order_id: order.id,
          });
        } catch (mpesaErr) {
          // Order exists — just warn the user, don't block the success screen.
          // They can retry from /orders.
          const detail =
            mpesaErr.response?.data?.error ||
            mpesaErr.response?.data?.detail ||
            "STK Push failed. You can retry payment from your orders page.";
          setMpesaError(detail);
          console.error("STK Push failed:", mpesaErr.response?.data || mpesaErr.message);
        }
      }

      await clearCart();
      setStep(2);
    } catch (err) {
      const detail =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        (typeof err.response?.data === "string" ? err.response.data : null) ||
        "Something went wrong placing your order. Please try again.";
      setError(detail);
      console.error("Checkout error:", err.response?.data || err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const total = parseFloat(cart.total_price || 0);
  const items = cart.items || [];

  // ── Success screen ──
  if (step === 2 && placedOrder) {
    return (
      <main style={{ background: "#120a06", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
        <div style={{ maxWidth: 520, textAlign: "center" }}>
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem", fontSize: 36, color: "#86efac" }}>
            <i className="ti ti-check" aria-hidden="true" />
          </div>
          <h1 style={{ fontFamily: "Georgia,serif", fontSize: "2rem", color: "#f0dba8", margin: "0 0 0.75rem", fontWeight: 400 }}>
            Order placed!
          </h1>
          <p style={{ color: "#7a5e3a", fontSize: 15, lineHeight: 1.7, margin: "0 0 0.5rem" }}>
            Thank you, {placedOrder.full_name.split(" ")[0]}. Your order{" "}
            <strong style={{ color: "#c49448" }}>#{placedOrder.id}</strong> has been received.
          </p>

          {placedOrder.payment_method === "mpesa" ? (
            <>
              <p style={{ color: "#c4ab82", fontSize: 14, lineHeight: 1.7, margin: "0 0 1rem", padding: "1rem", background: "rgba(196,148,72,0.06)", border: "1px solid rgba(196,148,72,0.15)", borderRadius: 10 }}>
                An M-Pesa prompt has been sent to <strong>{placedOrder.phone_number}</strong>. Enter your PIN to complete payment.
              </p>
              {/* Show STK push error inline without hiding the success state */}
              {mpesaError && (
                <p style={{ color: "#fca5a5", fontSize: 13, lineHeight: 1.6, margin: "0 0 1rem", padding: "10px 14px", background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10 }}>
                  ⚠️ {mpesaError}
                </p>
              )}
            </>
          ) : (
            <p style={{ color: "#7a5e3a", fontSize: 14, lineHeight: 1.7, margin: "0 0 2rem" }}>
              You'll pay <strong style={{ color: "#c49448" }}>KES {parseInt(placedOrder.total_amount).toLocaleString()}</strong> on delivery. We'll contact you on {placedOrder.phone_number} to confirm delivery.
            </p>
          )}

          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap", marginTop: "1.5rem" }}>
            <Link to="/orders" style={styles.goldBtn}>View my orders</Link>
            <Link to="/products" style={styles.ghostBtn}>Continue shopping</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <>
      <style>{`
        @keyframes pc-spin { to { transform: rotate(360deg); } }
        .ck-input { width:100%;height:50px;padding:0 16px;border-radius:10px;border:1px solid rgba(196,148,72,0.2);background:#120a06;color:#f0dba8;font-size:15px;outline:none;transition:border-color 0.2s,box-shadow 0.2s; }
        .ck-input.error { border-color:rgba(239,68,68,0.5); }
        .ck-input::placeholder { color:#5a3e22; }
        .ck-input:focus { border-color:#c49448;box-shadow:0 0 0 3px rgba(196,148,72,0.12); }
        .ck-textarea { width:100%;padding:12px 16px;border-radius:10px;border:1px solid rgba(196,148,72,0.2);background:#120a06;color:#f0dba8;font-size:15px;outline:none;resize:vertical;min-height:90px;transition:border-color 0.2s,box-shadow 0.2s;font-family:inherit; }
        .ck-textarea:focus { border-color:#c49448;box-shadow:0 0 0 3px rgba(196,148,72,0.12); }
        .ck-payment-opt { display:flex;align-items:flex-start;gap:14px;padding:16px;border-radius:12px;border:2px solid transparent;cursor:pointer;transition:border-color 0.2s,background 0.2s; }
        .ck-payment-opt.selected { border-color:#c49448;background:rgba(196,148,72,0.06); }
        .ck-payment-opt:not(.selected) { border-color:rgba(196,148,72,0.15);background:#1a0f08; }
        @media(max-width:780px){ .ck-layout{ grid-template-columns:1fr !important; } }
      `}</style>

      <main style={{ background: "#120a06", minHeight: "100vh", padding: "2.5rem 1.5rem" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>

          {/* Header + step indicator */}
          <div style={{ marginBottom: "2.5rem" }}>
            <Link to="/cart" style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#7a5e3a", textDecoration: "none", fontSize: 14, marginBottom: "1.25rem" }}>
              <i className="ti ti-arrow-left" aria-hidden="true" /> Back to cart
            </Link>
            <h1 style={{ fontFamily: "Georgia,serif", fontSize: "clamp(1.8rem,3vw,2.4rem)", fontWeight: 400, color: "#f0dba8", margin: "0 0 1.5rem" }}>
              Checkout
            </h1>

            <div style={{ display: "flex", gap: "0", maxWidth: 400 }}>
              {STEPS.slice(0, 2).map((label, i) => (
                <div key={label} style={{ display: "flex", alignItems: "center", flex: i < 1 ? 1 : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                      background: i <= step ? "linear-gradient(135deg,#c49448,#8b5e1a)" : "rgba(196,148,72,0.1)",
                      border: i <= step ? "none" : "1px solid rgba(196,148,72,0.2)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 12, fontWeight: 700,
                      color: i <= step ? "#120a06" : "#5a3e22",
                    }}>
                      {i < step ? <i className="ti ti-check" aria-hidden="true" /> : i + 1}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 500, color: i === step ? "#e8c87a" : "#5a3e22", whiteSpace: "nowrap" }}>
                      {label}
                    </span>
                  </div>
                  {i < 1 && <div style={{ flex: 1, height: 1, background: i < step ? "rgba(196,148,72,0.4)" : "rgba(196,148,72,0.12)", margin: "0 12px" }} />}
                </div>
              ))}
            </div>
          </div>

          <div className="ck-layout" style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "2rem", alignItems: "start" }}>

            {/* Left: form */}
            <div>
              {error && (
                <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#fca5a5", padding: "12px 16px", borderRadius: 10, fontSize: 14, marginBottom: "1.5rem" }} role="alert">
                  {error}
                </div>
              )}

              {step === 0 && (
                <div style={styles.card}>
                  <h2 style={styles.cardTitle}>Delivery details</h2>
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {[
                      { name: "full_name", label: "Full name", type: "text", placeholder: "Jane Muthoni" },
                      { name: "email", label: "Email address", type: "email", placeholder: "you@example.com" },
                      { name: "phone_number", label: "Phone number", type: "tel", placeholder: "0712 345 678" },
                    ].map((f) => (
                      <div key={f.name}>
                        <label style={styles.label} htmlFor={f.name}>{f.label}</label>
                        <input
                          id={f.name} name={f.name} type={f.type}
                          placeholder={f.placeholder}
                          className={`ck-input ${fieldErrors[f.name] ? "error" : ""}`}
                          value={form[f.name]} onChange={handleChange}
                        />
                        {fieldErrors[f.name] && <p style={styles.fieldErr}>{fieldErrors[f.name]}</p>}
                      </div>
                    ))}

                    <div>
                      <label style={styles.label} htmlFor="delivery_address">Delivery address</label>
                      <textarea
                        id="delivery_address" name="delivery_address"
                        placeholder="House No., Street, Estate, Town e.g. House 4, Moi Avenue, Westlands, Nairobi"
                        className={`ck-textarea ${fieldErrors.delivery_address ? "error" : ""}`}
                        value={form.delivery_address} onChange={handleChange}
                      />
                      {fieldErrors.delivery_address && <p style={styles.fieldErr}>{fieldErrors.delivery_address}</p>}
                    </div>

                    <div>
                      <label style={styles.label} htmlFor="notes">
                        Order notes <span style={{ color: "#5a3e22", fontWeight: 400 }}>(optional)</span>
                      </label>
                      <textarea
                        id="notes" name="notes"
                        placeholder="Special requests, delivery instructions…"
                        className="ck-textarea"
                        value={form.notes} onChange={handleChange}
                        style={{ minHeight: 70 }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div style={styles.card}>
                  <h2 style={styles.cardTitle}>Payment method</h2>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>

                    <div
                      className={`ck-payment-opt ${form.payment_method === "mpesa" ? "selected" : ""}`}
                      onClick={() => setForm((f) => ({ ...f, payment_method: "mpesa" }))}
                      role="radio" aria-checked={form.payment_method === "mpesa"} tabIndex={0}
                      onKeyDown={(e) => e.key === "Enter" && setForm((f) => ({ ...f, payment_method: "mpesa" }))}
                    >
                      <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(34,197,94,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <i className="ti ti-device-mobile" style={{ fontSize: 22, color: "#86efac" }} aria-hidden="true" />
                      </div>
                      <div>
                        <p style={{ margin: "0 0 3px", fontWeight: 600, color: "#ddc799", fontSize: 15 }}>M-Pesa</p>
                        <p style={{ margin: 0, fontSize: 13, color: "#7a5e3a", lineHeight: 1.5 }}>
                          Pay via Lipa na M-Pesa. You'll receive a prompt on your phone after placing the order.
                        </p>
                      </div>
                      <div style={{ marginLeft: "auto", flexShrink: 0, width: 20, height: 20, borderRadius: "50%", border: `2px solid ${form.payment_method === "mpesa" ? "#c49448" : "rgba(196,148,72,0.25)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {form.payment_method === "mpesa" && <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#c49448" }} />}
                      </div>
                    </div>

                    <div
                      className={`ck-payment-opt ${form.payment_method === "cash_on_delivery" ? "selected" : ""}`}
                      onClick={() => setForm((f) => ({ ...f, payment_method: "cash_on_delivery" }))}
                      role="radio" aria-checked={form.payment_method === "cash_on_delivery"} tabIndex={0}
                      onKeyDown={(e) => e.key === "Enter" && setForm((f) => ({ ...f, payment_method: "cash_on_delivery" }))}
                    >
                      <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(196,148,72,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <i className="ti ti-cash" style={{ fontSize: 22, color: "#c49448" }} aria-hidden="true" />
                      </div>
                      <div>
                        <p style={{ margin: "0 0 3px", fontWeight: 600, color: "#ddc799", fontSize: 15 }}>Cash on Delivery</p>
                        <p style={{ margin: 0, fontSize: 13, color: "#7a5e3a", lineHeight: 1.5 }}>
                          Pay in cash when your order is delivered. Available within Nairobi.
                        </p>
                      </div>
                      <div style={{ marginLeft: "auto", flexShrink: 0, width: 20, height: 20, borderRadius: "50%", border: `2px solid ${form.payment_method === "cash_on_delivery" ? "#c49448" : "rgba(196,148,72,0.25)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {form.payment_method === "cash_on_delivery" && <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#c49448" }} />}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}>
                {step > 0 && (
                  <button onClick={() => setStep((s) => s - 1)} style={styles.ghostBtn}>
                    <i className="ti ti-arrow-left" aria-hidden="true" /> Back
                  </button>
                )}
                {step < 1 && (
                  <button onClick={handleNextStep} style={styles.goldBtn}>
                    Continue to payment <i className="ti ti-arrow-right" aria-hidden="true" />
                  </button>
                )}
                {step === 1 && (
                  <button
                    onClick={handlePlaceOrder}
                    disabled={submitting}
                    style={{ ...styles.goldBtn, opacity: submitting ? 0.6 : 1, cursor: submitting ? "not-allowed" : "pointer" }}
                  >
                    {submitting ? "Placing order…" : "Place Order"}
                    {!submitting && <i className="ti ti-check" aria-hidden="true" />}
                  </button>
                )}
              </div>
            </div>

            {/* Right: order summary */}
            <div style={{ ...styles.card, position: "sticky", top: 88 }}>
              <h2 style={styles.cardTitle}>Order summary</h2>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1rem" }}>
                {items.map((item) => (
                  // FIX: key was item.id which doesn't exist on cart items.
                  // Cart items are shaped as { product: { id, name, ... }, quantity, price }
                  // so the correct unique key is item.product.id.
                  <div key={item.product.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", fontSize: 14 }}>
                    <span style={{ color: "#c4ab82", flex: 1 }}>
                      {item.product.name}
                      <span style={{ color: "#5a3e22" }}> × {item.quantity}</span>
                    </span>
                    <span style={{ color: "#ddc799", flexShrink: 0, fontWeight: 500 }}>
                      KES {(parseFloat(item.product.price) * item.quantity).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: "1px solid rgba(196,148,72,0.12)", paddingTop: "1rem", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#ddc799" }}>Total</span>
                <span style={{ fontSize: 20, fontWeight: 700, color: "#e8c87a", fontFamily: "Georgia,serif" }}>
                  KES {total.toLocaleString()}
                </span>
              </div>

              {step === 1 && (
                <div style={{ marginTop: "1.25rem", padding: "12px 14px", background: "rgba(196,148,72,0.05)", border: "1px solid rgba(196,148,72,0.12)", borderRadius: 10, fontSize: 13, color: "#7a5e3a", lineHeight: 1.7 }}>
                  <p style={{ margin: "0 0 4px", fontWeight: 600, color: "#c4ab82" }}>Delivering to:</p>
                  <p style={{ margin: 0 }}>{form.full_name}</p>
                  <p style={{ margin: 0 }}>{form.phone_number}</p>
                  <p style={{ margin: 0 }}>{form.delivery_address}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

const styles = {
  card: { background: "#1a0f08", border: "1px solid rgba(196,148,72,0.18)", borderRadius: 16, padding: "1.75rem" },
  cardTitle: { fontSize: 14, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#c49448", margin: "0 0 1.5rem" },
  label: { display: "block", fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#7a5e3a", marginBottom: 7 },
  fieldErr: { fontSize: 12, color: "#fca5a5", margin: "5px 0 0" },
  goldBtn: { display: "inline-flex", alignItems: "center", gap: 8, padding: "0.75rem 1.75rem", background: "linear-gradient(135deg,#c49448,#8b5e1a)", border: "none", borderRadius: 10, color: "#120a06", fontWeight: 700, fontSize: 14, cursor: "pointer", textDecoration: "none", letterSpacing: "0.03em" },
  ghostBtn: { display: "inline-flex", alignItems: "center", gap: 8, padding: "0.75rem 1.5rem", background: "transparent", border: "1px solid rgba(196,148,72,0.25)", borderRadius: 10, color: "#c4ab82", fontWeight: 500, fontSize: 14, cursor: "pointer", textDecoration: "none" },
};