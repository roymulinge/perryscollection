// src/pages/ProfilePage.jsx

import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { updateProfile } from "../api/auth";

export default function ProfilePage() {
  // Pull user (current data) and updateUser (to refresh context after save)
  // from AuthContext — same context LoginPage uses, but different fields
  const { user, updateUser } = useAuth();

  const [form, setForm] = useState({
    full_name: "",
    bio: "",
    phone_number: "",
    gender: "",
    username: "",
  });
  // email is NOT in the form — it's auth identity, not a profile field.
  // Changing email would need re-verification (separate flow entirely).

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState(false);
  // success: shows a "Saved!" message after a successful PATCH

  useEffect(() => {
    // When the user object is available in context, pre-fill the form.
    // Without this, the form always starts blank and the first Save
    // would overwrite real data with empty strings.
    //
    // user?.profile uses optional chaining because on first render,
    // user might still be null (AuthContext is still loading from /me/)
    if (user) {
      setForm({
        full_name:    user.full_name    || "",
        bio:          user.profile?.bio          || "",
        phone_number: user.profile?.phone_number || "",
        gender:       user.profile?.gender       || "",
        username:     user.profile?.username     || "",
      });
    }
  }, [user]);
  // [user] dependency: re-run this effect whenever user changes.
  // This handles the case where AuthContext finishes loading AFTER
  // ProfilePage mounts — the form will fill in once user arrives.

  function handleChange(e) {
    // Same controlled-input pattern as LoginPage and RegisterPage —
    // computed property key [e.target.name] updates the right field
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    // Clear success message when user starts editing again
    if (success) setSuccess(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      // PATCH /api/auth/profile/ — only sends what changed
      // Django's ProfileUpdateSerializer handles writing to both
      // User.full_name and Profile fields in one call
      const updatedUser = await updateProfile(form);
      // updatedUser is the full UserSerializer response —
      // same shape as what /me/ returns: { id, email, profile: {...} }

      // Update AuthContext so Navbar and any other component reading
      // user.full_name or user.profile reflects the new data immediately
      // without a page refresh
      updateUser(updatedUser);
      setSuccess(true);
    } catch (err) {
      // Django returns field errors as { username: ["already taken"] }
      // or a general { detail: "..." } — handle both shapes
      const data = err.response?.data;
      if (data && typeof data === "object") {
        // Flatten field errors into one readable string
        const messages = Object.entries(data)
          .map(([field, msgs]) =>
            `${field}: ${Array.isArray(msgs) ? msgs.join(" ") : msgs}`
          )
          .join(" | ");
        setError(messages);
      } else {
        setError("Failed to save profile. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  // Guard: if AuthContext is still loading, don't render a blank form
  if (!user) {
    return (
      <div style={{ color: "#f0dba8", textAlign: "center", padding: "60px" }}>
        Loading profile…
      </div>
    );
  }

  return (
    <>
      <style>{`
        .profile-page { min-height: 100vh; background: radial-gradient(ellipse at 50% 20%, #2a1708 0%, #120a06 60%); display: flex; justify-content: center; align-items: flex-start; padding: 60px 20px; }
        .profile-card { width: 100%; max-width: 560px; background: #1a0f08; border: 1px solid rgba(196,148,72,0.2); border-radius: 20px; padding: 44px 40px; box-shadow: 0 24px 64px rgba(0,0,0,0.5); }
        .profile-title { font-family: Georgia, serif; font-size: 1.8rem; font-weight: 400; color: #f0dba8; margin: 0 0 6px; }
        .profile-subtitle { color: #7a5e3a; font-size: 14px; margin: 0 0 32px; }
        .profile-email { color: #5a3e22; font-size: 13px; margin-bottom: 28px; padding: 10px 14px; background: rgba(255,255,255,0.02); border: 1px solid rgba(196,148,72,0.1); border-radius: 8px; }
        .profile-email span { color: #9a7a4a; }
        .profile-field { margin-bottom: 18px; }
        .profile-label { display: block; font-size: 12px; font-weight: 600; color: #9a7a4a; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 7px; }
        .profile-input { width: 100%; height: 50px; padding: 0 16px; border-radius: 10px; border: 1px solid rgba(196,148,72,0.2); background: #120a06; color: #f0dba8; font-size: 15px; outline: none; transition: border-color 0.2s, box-shadow 0.2s; }
        .profile-input::placeholder { color: #5a3e22; }
        .profile-input:focus { border-color: #c49448; box-shadow: 0 0 0 3px rgba(196,148,72,0.12); }
        .profile-textarea { width: 100%; min-height: 100px; padding: 12px 16px; border-radius: 10px; border: 1px solid rgba(196,148,72,0.2); background: #120a06; color: #f0dba8; font-size: 15px; outline: none; resize: vertical; font-family: inherit; transition: border-color 0.2s; }
        .profile-textarea:focus { border-color: #c49448; box-shadow: 0 0 0 3px rgba(196,148,72,0.12); }
        .profile-select { width: 100%; height: 50px; padding: 0 16px; border-radius: 10px; border: 1px solid rgba(196,148,72,0.2); background: #120a06; color: #f0dba8; font-size: 15px; outline: none; }
        .profile-btn { width: 100%; height: 52px; margin-top: 8px; border: none; border-radius: 10px; background: linear-gradient(135deg, #c49448, #8b5e1a); color: #120a06; font-size: 15px; font-weight: 700; cursor: pointer; transition: opacity 0.2s, transform 0.15s; }
        .profile-btn:hover:not(:disabled) { opacity: 0.88; transform: translateY(-2px); }
        .profile-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .profile-error { background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.25); color: #fca5a5; padding: 12px 16px; border-radius: 10px; font-size: 14px; margin-bottom: 20px; }
        .profile-success { background: rgba(34,197,94,0.08); border: 1px solid rgba(34,197,94,0.25); color: #86efac; padding: 12px 16px; border-radius: 10px; font-size: 14px; margin-bottom: 20px; text-align: center; }
        @media (max-width: 520px) { .profile-card { padding: 32px 20px; } }
      `}</style>

      <div className="profile-page">
        <div className="profile-card">
          <h1 className="profile-title">My Profile</h1>
          <p className="profile-subtitle">Update your personal details</p>

          {/* Email shown read-only — not a form field, just informational */}
          <div className="profile-email">
            <span>Email: </span>{user.email}
          </div>

          {error   && <div className="profile-error"  role="alert">{error}</div>}
          {success && <div className="profile-success" role="status">Profile saved ✓</div>}

          <form onSubmit={handleSubmit} noValidate>
            <div className="profile-field">
              <label className="profile-label" htmlFor="full_name">Full name</label>
              <input id="full_name" className="profile-input" type="text"
                name="full_name" value={form.full_name}
                onChange={handleChange} placeholder="Your full name" />
            </div>

            <div className="profile-field">
              <label className="profile-label" htmlFor="username">Username</label>
              <input id="username" className="profile-input" type="text"
                name="username" value={form.username}
                onChange={handleChange} placeholder="@handle" />
            </div>

            <div className="profile-field">
              <label className="profile-label" htmlFor="bio">Bio</label>
              {/* textarea, not input — bio is multi-line text */}
              <textarea id="bio" className="profile-textarea"
                name="bio" value={form.bio}
                onChange={handleChange} placeholder="Tell us a bit about yourself" />
            </div>

            <div className="profile-field">
              <label className="profile-label" htmlFor="phone_number">Phone number</label>
              <input id="phone_number" className="profile-input" type="tel"
                name="phone_number" value={form.phone_number}
                onChange={handleChange} placeholder="07XXXXXXXX" />
            </div>

            <div className="profile-field">
              <label className="profile-label" htmlFor="gender">Gender</label>
              {/* select not input — constrained to your GENDER_CHOICES enum */}
              <select id="gender" className="profile-select"
                name="gender" value={form.gender} onChange={handleChange}>
                <option value="">Prefer not to say</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </div>

            <button type="submit" className="profile-btn" disabled={loading}>
              {loading ? "Saving…" : "Save changes"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}