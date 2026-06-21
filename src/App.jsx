import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  UserPlus,
  LogIn,
  LogOut,
  Eye,
  FileWarning,
  Check,
  X,
  Network,
  Lock,
  ChevronRight,
  Loader2,
  Info,
  MessageCircle,
  Link2,
} from "lucide-react";
import { db } from "./firebase";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
} from "firebase/firestore";

/* ─────────────────────────────────────────────────────────────────────────
   CONFIG
   Cambiá esta contraseña antes de desplegar. Quien la tenga entra al
   panel del propietario. No es un sistema de seguridad real: ver
   advertencia de seguridad en la respuesta de Claude / README.md.
───────────────────────────────────────────────────────────────────────── */
const OWNER_PASSWORD = "centinela2026";

// Número de WhatsApp del propietario (con código de país, sin + ni espacios)
const OWNER_WHATSAPP = "543834264312";

function whatsappLink(text) {
  return `https://wa.me/${OWNER_WHATSAPP}?text=${encodeURIComponent(text)}`;
}

const FONT_IMPORT =
  "@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');";

const COLORS = {
  bg: "#0F1420",
  surface: "#161C2C",
  surfaceAlt: "#1D2436",
  border: "#2A3247",
  text: "#E8EAF0",
  muted: "#8B93A7",
  amber: "#E8A23D",
  red: "#D9554F",
  teal: "#3FA796",
  violet: "#7C6FE0",
};

/* ───────────────────────────── Firestore helpers ─────────────────────────────
   admins/{username}  y  reports/{reportId}  son las dos colecciones.
───────────────────────────────────────────────────────────────────────── */
async function getDocData(col, id) {
  try {
    const snap = await getDoc(doc(db, col, id));
    return snap.exists() ? snap.data() : null;
  } catch {
    return null;
  }
}
async function getCollectionData(col) {
  try {
    const snap = await getDocs(collection(db, col));
    return snap.docs.map((d) => d.data());
  } catch {
    return [];
  }
}
async function saveDoc(col, id, data) {
  await setDoc(doc(db, col, id), data);
}
async function patchDoc(col, id, partial) {
  await updateDoc(doc(db, col, id), partial);
}

function StatusChip({ status }) {
  const map = {
    pending: { label: "PENDIENTE", color: COLORS.amber },
    approved: { label: "APROBADO", color: COLORS.teal },
    rejected: { label: "RECHAZADO", color: COLORS.muted },
  };
  const s = map[status] || map.pending;
  return (
    <span
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
        letterSpacing: "0.06em",
        color: s.color,
        border: `1px solid ${s.color}55`,
        background: `${s.color}14`,
        padding: "3px 8px",
        borderRadius: 4,
        whiteSpace: "nowrap",
      }}
    >
      {s.label}
    </span>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: "block", marginBottom: 14 }}>
      <span
        style={{
          display: "block",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          letterSpacing: "0.08em",
          color: COLORS.muted,
          marginBottom: 6,
        }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

const inputStyle = {
  width: "100%",
  background: COLORS.surfaceAlt,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 6,
  padding: "10px 12px",
  color: COLORS.text,
  fontFamily: "'Inter', sans-serif",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};

function Btn({ children, onClick, variant = "primary", disabled, type = "button", style }) {
  const variants = {
    primary: { background: COLORS.violet, color: "#fff", border: "1px solid transparent" },
    ghost: { background: "transparent", color: COLORS.text, border: `1px solid ${COLORS.border}` },
    approve: { background: `${COLORS.teal}1A`, color: COLORS.teal, border: `1px solid ${COLORS.teal}55` },
    reject: { background: `${COLORS.red}1A`, color: COLORS.red, border: `1px solid ${COLORS.red}55` },
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        ...variants[variant],
        fontFamily: "'Inter', sans-serif",
        fontWeight: 600,
        fontSize: 13.5,
        padding: "10px 16px",
        borderRadius: 6,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        transition: "filter 0.15s",
        ...style,
      }}
      onMouseOver={(e) => !disabled && (e.currentTarget.style.filter = "brightness(1.12)")}
      onMouseOut={(e) => (e.currentTarget.style.filter = "none")}
    >
      {children}
    </button>
  );
}

function Card({ children, style }) {
  return (
    <div
      style={{
        background: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 10,
        padding: 20,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Empty({ text }) {
  return (
    <div
      style={{
        border: `1px dashed ${COLORS.border}`,
        borderRadius: 10,
        padding: "32px 20px",
        textAlign: "center",
        color: COLORS.muted,
        fontSize: 13.5,
      }}
    >
      {text}
    </div>
  );
}

/* ───────────────────────────── concept map ───────────────────────────── */
function ConceptMap({ reports, showPending }) {
  const data = useMemo(() => {
    const list = reports.filter((r) =>
      showPending ? r.status !== "rejected" : r.status === "approved"
    );
    const communities = [...new Set(list.map((r) => r.community || "Sin comunidad"))];
    const W = 800,
      H = 560,
      cx = W / 2,
      cy = H / 2,
      R1 = Math.min(W, H) * 0.33;
    const hubs = communities.map((name, i) => {
      const angle = (2 * Math.PI * i) / communities.length - Math.PI / 2;
      return { name, x: cx + R1 * Math.cos(angle), y: cy + R1 * Math.sin(angle) };
    });
    const nodes = [];
    hubs.forEach((hub) => {
      const people = list.filter((r) => (r.community || "Sin comunidad") === hub.name);
      const R2 = 95;
      people.forEach((p, j) => {
        const angle = (2 * Math.PI * j) / Math.max(people.length, 1);
        nodes.push({
          ...p,
          x: hub.x + R2 * Math.cos(angle),
          y: hub.y + R2 * Math.sin(angle),
          hub,
        });
      });
    });
    return { hubs, nodes, cx, cy, W, H };
  }, [reports, showPending]);

  if (data.hubs.length === 0) {
    return <Empty text="Todavía no hay reportes aprobados para mostrar en el mapa. Cuando se aprueben, las conexiones aparecen acá." />;
  }

  return (
    <div
      style={{
        background: "radial-gradient(circle at 1px 1px, #232b3f 1px, transparent 0)",
        backgroundSize: "18px 18px",
        backgroundColor: COLORS.surfaceAlt,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 10,
        overflow: "hidden",
      }}
    >
      <svg viewBox={`0 0 ${data.W} ${data.H}`} style={{ width: "100%", height: "auto", display: "block" }}>
        {data.hubs.map((h) => (
          <line key={"l-" + h.name} x1={data.cx} y1={data.cy} x2={h.x} y2={h.y} stroke={COLORS.border} strokeWidth={1} />
        ))}
        {data.nodes.map((n, i) => (
          <line key={"pl-" + i} x1={n.hub.x} y1={n.hub.y} x2={n.x} y2={n.y} stroke={n.status === "pending" ? `${COLORS.amber}66` : `${COLORS.red}66`} strokeWidth={1.25} />
        ))}
        <circle cx={data.cx} cy={data.cy} r={8} fill={COLORS.text} opacity={0.8} />
        {data.hubs.map((h) => (
          <g key={"h-" + h.name}>
            <circle cx={h.x} cy={h.y} r={16} fill={COLORS.violet} stroke="#0F1420" strokeWidth={2} />
            <text x={h.x} y={h.y - 22} textAnchor="middle" fill={COLORS.text} fontFamily="'Space Grotesk', sans-serif" fontSize={12} fontWeight={600}>
              {h.name}
            </text>
          </g>
        ))}
        {data.nodes.map((n, i) => (
          <g key={"n-" + i}>
            <circle cx={n.x} cy={n.y} r={9} fill={n.status === "pending" ? COLORS.amber : COLORS.red} stroke="#0F1420" strokeWidth={1.5} />
            <text x={n.x} y={n.y + 20} textAnchor="middle" fill={COLORS.muted} fontFamily="'JetBrains Mono', monospace" fontSize={10}>
              {n.alias}
            </text>
          </g>
        ))}
      </svg>
      <div style={{ display: "flex", gap: 18, padding: "10px 16px", borderTop: `1px solid ${COLORS.border}`, fontSize: 11.5, color: COLORS.muted, fontFamily: "'JetBrains Mono', monospace", flexWrap: "wrap" }}>
        <span><span style={{ color: COLORS.violet }}>●</span> comunidad</span>
        <span><span style={{ color: COLORS.red }}>●</span> persona reportada (aprobado)</span>
        {showPending && <span><span style={{ color: COLORS.amber }}>●</span> pendiente de revisión</span>}
      </div>
    </div>
  );
}

function EvidenceLinkEditor({ value, onSave }) {
  const [val, setVal] = useState(value || "");
  const [saved, setSaved] = useState(false);
  return (
    <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
      <input
        style={{ ...inputStyle, fontSize: 12.5, padding: "7px 10px" }}
        placeholder="Pegá acá el enlace una vez que subas la prueba (opcional)"
        value={val}
        onChange={(e) => {
          setVal(e.target.value);
          setSaved(false);
        }}
      />
      <Btn
        variant="ghost"
        style={{ padding: "7px 10px" }}
        onClick={() => {
          onSave(val);
          setSaved(true);
        }}
      >
        <Link2 size={13} /> {saved ? "Guardado" : "Guardar"}
      </Btn>
    </div>
  );
}

/* ───────────────────────────── report card ───────────────────────────── */
function ReportCard({ r, actions, onSaveEvidence }) {
  return (
    <Card style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
        <div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 16 }}>{r.alias}</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, color: COLORS.muted, marginTop: 2 }}>
            {r.community} · {new Date(r.createdAt).toLocaleDateString()} · caso {r.id}
          </div>
        </div>
        <StatusChip status={r.status} />
      </div>
      <div style={{ fontSize: 13.5, color: COLORS.text, lineHeight: 1.5, marginBottom: 10 }}>{r.description}</div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12.5 }}>
        <span style={{ color: COLORS.muted }}>Tel: <span style={{ fontFamily: "'JetBrains Mono', monospace", color: COLORS.text }}>{r.phone}</span></span>
        {r.evidenceLink ? (
          <a href={r.evidenceLink} target="_blank" rel="noreferrer" style={{ color: COLORS.violet }}>
            Ver evidencia →
          </a>
        ) : (
          <span style={{ color: COLORS.amber }}>Esperando captura por WhatsApp</span>
        )}
        <span style={{ color: COLORS.muted }}>Reportado por <span style={{ color: COLORS.text }}>{r.submittedBy}</span></span>
      </div>
      {onSaveEvidence && <EvidenceLinkEditor value={r.evidenceLink} onSave={onSaveEvidence} />}
      {actions && <div style={{ display: "flex", gap: 8, marginTop: 14 }}>{actions}</div>}
    </Card>
  );
}

/* ───────────────────────────── main app ───────────────────────────── */
export default function Centinela() {
  const [screen, setScreen] = useState("gate"); // gate | adminAuth | dashboard | ownerAuth | owner
  const [authView, setAuthView] = useState("login");
  const [currentUser, setCurrentUser] = useState(null);
  const [admins, setAdmins] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [dashTab, setDashTab] = useState("supervision");
  const [ownerTab, setOwnerTab] = useState("solicitudes");

  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [regForm, setRegForm] = useState({ username: "", password: "", community: "" });
  const [justRegistered, setJustRegistered] = useState(null);
  const [ownerPwInput, setOwnerPwInput] = useState("");
  const [reportForm, setReportForm] = useState({ phone: "", alias: "", community: "", description: "" });
  const [justReported, setJustReported] = useState(null);

  const refreshAll = useCallback(async () => {
    const [a, r] = await Promise.all([getCollectionData("admins"), getCollectionData("reports")]);
    setAdmins(a);
    setReports(r.sort((x, y) => y.createdAt - x.createdAt));
  }, []);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  function flash(text, type = "info") {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 4000);
  }

  async function handleRegister(e) {
    e.preventDefault();
    if (!regForm.username || !regForm.password || !regForm.community) {
      flash("Completá todos los campos.", "error");
      return;
    }
    setLoading(true);
    const existing = await getDocData("admins", regForm.username);
    if (existing) {
      setLoading(false);
      flash("Ese nombre de usuario ya existe.", "error");
      return;
    }
    const record = { ...regForm, evidenceLink: "", status: "pending", createdAt: Date.now() };
    await saveDoc("admins", regForm.username, record);
    setLoading(false);
    setJustRegistered({
      username: regForm.username,
      community: regForm.community,
      link: whatsappLink(
        `Hola, soy ${regForm.username} y quiero registrarme como administrador del grupo "${regForm.community}" en Centinela. Te adjunto la captura que prueba que soy admin.`
      ),
    });
    setRegForm({ username: "", password: "", community: "" });
    refreshAll();
  }

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    const record = await getDocData("admins", loginForm.username);
    setLoading(false);
    if (!record) return flash("Usuario no encontrado.", "error");
    if (record.password !== loginForm.password) return flash("Contraseña incorrecta.", "error");
    if (record.status === "pending") return flash("Tu registro todavía está pendiente de aprobación.", "error");
    if (record.status === "rejected") return flash("Tu solicitud fue rechazada.", "error");
    setCurrentUser(record);
    setScreen("dashboard");
    refreshAll();
  }

  async function handleOwnerAuth(e) {
    e.preventDefault();
    if (ownerPwInput === OWNER_PASSWORD) {
      setScreen("owner");
      setOwnerPwInput("");
      refreshAll();
    } else {
      flash("Contraseña de propietario incorrecta.", "error");
    }
  }

  async function handleSubmitReport(e) {
    e.preventDefault();
    if (!reportForm.phone || !reportForm.alias || !reportForm.community || !reportForm.description) {
      flash("Completá teléfono, alias, comunidad y descripción.", "error");
      return;
    }
    setLoading(true);
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const record = { id, ...reportForm, evidenceLink: "", submittedBy: currentUser.username, status: "pending", createdAt: Date.now() };
    await saveDoc("reports", id, record);
    setLoading(false);
    setJustReported({
      shortId: id,
      link: whatsappLink(
        `Reporte ${id} — enviado por ${currentUser.username}. Alias reportado: ${reportForm.alias}. Comunidad: ${reportForm.community}. Te adjunto las pruebas.`
      ),
    });
    setReportForm({ phone: "", alias: "", community: "", description: "" });
    refreshAll();
  }

  async function setAdminStatus(username, status) {
    await patchDoc("admins", username, { status });
    refreshAll();
  }

  async function setAdminEvidence(username, link) {
    await patchDoc("admins", username, { evidenceLink: link });
    refreshAll();
  }

  async function setReportEvidence(id, link) {
    await patchDoc("reports", id, { evidenceLink: link });
    refreshAll();
  }

  async function setReportStatus(id, status) {
    await patchDoc("reports", id, { status });
    refreshAll();
  }

  function logout() {
    setCurrentUser(null);
    setScreen("gate");
    setDashTab("supervision");
  }

  const approvedReports = reports.filter((r) => r.status === "approved");
  const myReports = currentUser ? reports.filter((r) => r.submittedBy === currentUser.username) : [];
  const pendingAdmins = admins.filter((a) => a.status === "pending");
  const decidedAdmins = admins.filter((a) => a.status !== "pending");
  const pendingReports = reports.filter((r) => r.status === "pending");
  const decidedReports = reports.filter((r) => r.status !== "pending");

  const shell = (children) => (
    <div
      style={{
        minHeight: "100vh",
        background: COLORS.bg,
        color: COLORS.text,
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <style>{`
        ${FONT_IMPORT}
        * { box-sizing: border-box; }
        ::selection { background: ${COLORS.violet}55; }
        :focus-visible { outline: 2px solid ${COLORS.violet}; outline-offset: 2px; }
        @media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }
      `}</style>
      {children}
    </div>
  );

  const Toast = msg && (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        left: "50%",
        transform: "translateX(-50%)",
        background: msg.type === "error" ? `${COLORS.red}22` : `${COLORS.teal}22`,
        border: `1px solid ${msg.type === "error" ? COLORS.red : COLORS.teal}66`,
        color: COLORS.text,
        padding: "10px 18px",
        borderRadius: 8,
        fontSize: 13.5,
        zIndex: 50,
        maxWidth: "90%",
        textAlign: "center",
      }}
    >
      {msg.text}
    </div>
  );

  /* ── GATE ── */
  if (screen === "gate") {
    return shell(
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, color: COLORS.violet, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, letterSpacing: "0.1em", marginBottom: 10 }}>
            <ShieldAlert size={16} /> REGISTRO ENTRE COMUNIDADES
          </div>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 36, fontWeight: 700, margin: 0 }}>Centinela</h1>
          <p style={{ color: COLORS.muted, fontSize: 14, maxWidth: 360, margin: "10px auto 0" }}>
            Los administradores de grupo reportan a quienes rompen las reglas. Vos revisás cada caso antes de que quede visible.
          </p>
        </div>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center" }}>
          <Card style={{ width: 260, cursor: "pointer" }}>
            <div onClick={() => setScreen("adminAuth")} style={{ cursor: "pointer" }}>
              <UserPlus size={22} color={COLORS.violet} />
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 16, margin: "10px 0 4px" }}>Soy administrador</div>
              <div style={{ color: COLORS.muted, fontSize: 13 }}>Iniciá sesión o registrá tu grupo.</div>
              <div style={{ color: COLORS.violet, fontSize: 13, marginTop: 12, display: "flex", alignItems: "center", gap: 4 }}>
                Continuar <ChevronRight size={14} />
              </div>
            </div>
          </Card>
          <Card style={{ width: 260 }}>
            <div onClick={() => setScreen("ownerAuth")} style={{ cursor: "pointer" }}>
              <Lock size={22} color={COLORS.amber} />
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 16, margin: "10px 0 4px" }}>Panel del propietario</div>
              <div style={{ color: COLORS.muted, fontSize: 13 }}>Aprobá administradores y reportes.</div>
              <div style={{ color: COLORS.amber, fontSize: 13, marginTop: 12, display: "flex", alignItems: "center", gap: 4 }}>
                Continuar <ChevronRight size={14} />
              </div>
            </div>
          </Card>
        </div>
        {Toast}
      </div>
    );
  }

  /* ── OWNER AUTH ── */
  if (screen === "ownerAuth") {
    return shell(
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <Card style={{ width: 340 }}>
          <div onClick={() => setScreen("gate")} style={{ color: COLORS.muted, fontSize: 12.5, cursor: "pointer", marginBottom: 16 }}>← Volver</div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 18, marginBottom: 16 }}>Acceso del propietario</div>
          <form onSubmit={handleOwnerAuth}>
            <Field label="CONTRASEÑA">
              <input type="password" style={inputStyle} value={ownerPwInput} onChange={(e) => setOwnerPwInput(e.target.value)} autoFocus />
            </Field>
            <Btn type="submit" style={{ width: "100%", justifyContent: "center" }}>Entrar</Btn>
          </form>
        </Card>
        {Toast}
      </div>
    );
  }

  /* ── ADMIN AUTH ── */
  if (screen === "adminAuth") {
    return shell(
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <Card style={{ width: 380 }}>
          <div onClick={() => setScreen("gate")} style={{ color: COLORS.muted, fontSize: 12.5, cursor: "pointer", marginBottom: 16 }}>← Volver</div>
          <div style={{ display: "flex", gap: 6, marginBottom: 20, background: COLORS.surfaceAlt, padding: 4, borderRadius: 8 }}>
            {["login", "register"].map((v) => (
              <button
                key={v}
                onClick={() => {
                  setAuthView(v);
                  setJustRegistered(null);
                }}
                style={{
                  flex: 1,
                  padding: "8px 0",
                  borderRadius: 6,
                  border: "none",
                  background: authView === v ? COLORS.violet : "transparent",
                  color: authView === v ? "#fff" : COLORS.muted,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                {v === "login" ? "Iniciar sesión" : "Registrarme"}
              </button>
            ))}
          </div>

          {authView === "login" ? (
            <form onSubmit={handleLogin}>
              <Field label="USUARIO">
                <input style={inputStyle} value={loginForm.username} onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })} />
              </Field>
              <Field label="CONTRASEÑA">
                <input type="password" style={inputStyle} value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} />
              </Field>
              <Btn type="submit" disabled={loading} style={{ width: "100%", justifyContent: "center" }}>
                {loading ? <Loader2 size={15} className="spin" /> : <LogIn size={15} />} Iniciar sesión
              </Btn>
            </form>
          ) : justRegistered ? (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: COLORS.teal, marginBottom: 10 }}>
                <Check size={16} /> <span style={{ fontWeight: 600, fontSize: 14 }}>Registro enviado</span>
              </div>
              <p style={{ fontSize: 13, color: COLORS.muted, lineHeight: 1.5, marginBottom: 16 }}>
                Quedó pendiente de aprobación. Ahora tocá el botón para enviar por WhatsApp la captura que prueba que sos admin de "{justRegistered.community}".
              </p>
              <a href={justRegistered.link} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
                <Btn style={{ width: "100%", justifyContent: "center", background: "#25D366", marginBottom: 10 }}>
                  <MessageCircle size={15} /> Enviar prueba por WhatsApp
                </Btn>
              </a>
              <Btn
                variant="ghost"
                style={{ width: "100%", justifyContent: "center" }}
                onClick={() => {
                  setJustRegistered(null);
                  setAuthView("login");
                }}
              >
                Ya la envié, ir a iniciar sesión
              </Btn>
            </div>
          ) : (
            <form onSubmit={handleRegister}>
              <Field label="USUARIO">
                <input style={inputStyle} value={regForm.username} onChange={(e) => setRegForm({ ...regForm, username: e.target.value })} />
              </Field>
              <Field label="CONTRASEÑA">
                <input type="password" style={inputStyle} value={regForm.password} onChange={(e) => setRegForm({ ...regForm, password: e.target.value })} />
              </Field>
              <Field label="COMUNIDAD / GRUPO QUE ADMINISTRÁS">
                <input style={inputStyle} value={regForm.community} onChange={(e) => setRegForm({ ...regForm, community: e.target.value })} />
              </Field>
              <p style={{ fontSize: 12, color: COLORS.muted, marginBottom: 14, lineHeight: 1.5 }}>
                Después de enviar este formulario te vamos a pedir que mandes por WhatsApp la captura que prueba que sos admin.
              </p>
              <Btn type="submit" disabled={loading} style={{ width: "100%", justifyContent: "center" }}>
                {loading ? <Loader2 size={15} className="spin" /> : <UserPlus size={15} />} Enviar registro
              </Btn>
            </form>
          )}
        </Card>
        {Toast}
      </div>
    );
  }

  /* ── ADMIN DASHBOARD ── */
  if (screen === "dashboard" && currentUser) {
    return shell(
      <div style={{ maxWidth: 880, margin: "0 auto", padding: "28px 18px 60px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 10 }}>
          <div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: COLORS.muted, letterSpacing: "0.08em" }}>CENTINELA</div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 700 }}>Hola, {currentUser.username}</div>
          </div>
          <Btn variant="ghost" onClick={logout}><LogOut size={14} /> Cerrar sesión</Btn>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 22, borderBottom: `1px solid ${COLORS.border}` }}>
          {[
            { id: "supervision", label: "Supervisión", icon: Eye },
            { id: "reportes", label: "Reportes", icon: FileWarning },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setDashTab(t.id)}
              style={{
                background: "none",
                border: "none",
                padding: "10px 4px",
                marginRight: 18,
                color: dashTab === t.id ? COLORS.text : COLORS.muted,
                borderBottom: dashTab === t.id ? `2px solid ${COLORS.violet}` : "2px solid transparent",
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <t.icon size={15} /> {t.label}
            </button>
          ))}
        </div>

        {dashTab === "supervision" && (
          <>
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 15, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                <Network size={16} color={COLORS.violet} /> Mapa de comunidades y personas reportadas
              </div>
              <ConceptMap reports={reports} showPending={false} />
            </div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 15, margin: "26px 0 10px" }}>
              Reportes aprobados ({approvedReports.length})
            </div>
            {approvedReports.length === 0 ? (
              <Empty text="Todavía no hay reportes aprobados. Cuando el propietario apruebe alguno, aparece acá." />
            ) : (
              approvedReports.map((r) => <ReportCard key={r.id} r={r} />)
            )}
          </>
        )}

        {dashTab === "reportes" && (
          <>
            <Card style={{ marginBottom: 24 }}>
              {justReported ? (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: COLORS.teal, marginBottom: 10 }}>
                    <Check size={16} /> <span style={{ fontWeight: 600, fontSize: 14 }}>Reporte {justReported.shortId} enviado</span>
                  </div>
                  <p style={{ fontSize: 13, color: COLORS.muted, lineHeight: 1.5, marginBottom: 16 }}>
                    Quedó pendiente de aprobación. Ahora tocá el botón para mandar por WhatsApp las capturas de prueba — ya van a llegar con el número de caso.
                  </p>
                  <a href={justReported.link} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
                    <Btn style={{ width: "100%", justifyContent: "center", background: "#25D366", marginBottom: 10 }}>
                      <MessageCircle size={15} /> Enviar pruebas por WhatsApp
                    </Btn>
                  </a>
                  <Btn variant="ghost" style={{ width: "100%", justifyContent: "center" }} onClick={() => setJustReported(null)}>
                    Hacer otro reporte
                  </Btn>
                </div>
              ) : (
                <>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 15, marginBottom: 14 }}>Reportar a una persona</div>
                  <form onSubmit={handleSubmitReport}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <Field label="TELÉFONO">
                        <input style={inputStyle} value={reportForm.phone} onChange={(e) => setReportForm({ ...reportForm, phone: e.target.value })} />
                      </Field>
                      <Field label="ALIAS (ficticio)">
                        <input style={inputStyle} value={reportForm.alias} onChange={(e) => setReportForm({ ...reportForm, alias: e.target.value })} />
                      </Field>
                    </div>
                    <Field label="COMUNIDAD A LA QUE PERTENECE">
                      <input style={inputStyle} value={reportForm.community} onChange={(e) => setReportForm({ ...reportForm, community: e.target.value })} />
                    </Field>
                    <Field label="DESCRIPCIÓN DEL ATAQUE / INFRACCIÓN">
                      <textarea rows={4} style={{ ...inputStyle, resize: "vertical" }} value={reportForm.description} onChange={(e) => setReportForm({ ...reportForm, description: e.target.value })} />
                    </Field>
                    <p style={{ fontSize: 12, color: COLORS.muted, marginBottom: 14, lineHeight: 1.5 }}>
                      Después de enviar te vamos a pedir que mandes las capturas de prueba por WhatsApp.
                    </p>
                    <Btn type="submit" disabled={loading}>
                      {loading ? <Loader2 size={15} className="spin" /> : <FileWarning size={15} />} Enviar reporte
                    </Btn>
                  </form>
                </>
              )}
            </Card>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 15, marginBottom: 10 }}>
              Mis reportes enviados ({myReports.length})
            </div>
            {myReports.length === 0 ? <Empty text="Todavía no enviaste ningún reporte." /> : myReports.map((r) => <ReportCard key={r.id} r={r} />)}
          </>
        )}
        {Toast}
      </div>
    );
  }

  /* ── OWNER PANEL ── */
  if (screen === "owner") {
    return shell(
      <div style={{ maxWidth: 920, margin: "0 auto", padding: "28px 18px 60px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 10 }}>
          <div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: COLORS.amber, letterSpacing: "0.08em" }}>CENTINELA · PROPIETARIO</div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 700 }}>Panel de control</div>
          </div>
          <Btn variant="ghost" onClick={() => setScreen("gate")}><LogOut size={14} /> Salir</Btn>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 22, borderBottom: `1px solid ${COLORS.border}`, flexWrap: "wrap" }}>
          {[
            { id: "solicitudes", label: `Solicitudes (${pendingAdmins.length})`, icon: UserPlus },
            { id: "reportes", label: `Reportes (${pendingReports.length})`, icon: FileWarning },
            { id: "mapa", label: "Mapa completo", icon: Network },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setOwnerTab(t.id)}
              style={{
                background: "none",
                border: "none",
                padding: "10px 4px",
                marginRight: 18,
                color: ownerTab === t.id ? COLORS.text : COLORS.muted,
                borderBottom: ownerTab === t.id ? `2px solid ${COLORS.amber}` : "2px solid transparent",
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <t.icon size={15} /> {t.label}
            </button>
          ))}
        </div>

        {ownerTab === "solicitudes" && (
          <>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 15, marginBottom: 10 }}>Pendientes de revisión</div>
            {pendingAdmins.length === 0 ? (
              <Empty text="No hay solicitudes de administrador pendientes." />
            ) : (
              pendingAdmins.map((a) => (
                <Card key={a.username} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 220 }}>
                      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>{a.username}</div>
                      <div style={{ fontSize: 12.5, color: COLORS.muted, marginTop: 2 }}>Grupo: {a.community}</div>
                      {a.evidenceLink ? (
                        <a href={a.evidenceLink} target="_blank" rel="noreferrer" style={{ color: COLORS.violet, fontSize: 12.5 }}>Ver evidencia guardada →</a>
                      ) : (
                        <div style={{ fontSize: 12, color: COLORS.amber }}>Esperando captura por WhatsApp</div>
                      )}
                      <EvidenceLinkEditor value={a.evidenceLink} onSave={(link) => setAdminEvidence(a.username, link)} />
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <Btn variant="approve" onClick={() => setAdminStatus(a.username, "approved")}><Check size={14} /> Aprobar</Btn>
                      <Btn variant="reject" onClick={() => setAdminStatus(a.username, "rejected")}><X size={14} /> Rechazar</Btn>
                    </div>
                  </div>
                </Card>
              ))
            )}
            {decidedAdmins.length > 0 && (
              <>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 15, margin: "24px 0 10px" }}>Historial</div>
                {decidedAdmins.map((a) => (
                  <Card key={a.username} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <div>
                        <span style={{ fontWeight: 600 }}>{a.username}</span>
                        <span style={{ color: COLORS.muted, fontSize: 12.5, marginLeft: 8 }}>{a.community}</span>
                      </div>
                      <StatusChip status={a.status} />
                    </div>
                  </Card>
                ))}
              </>
            )}
          </>
        )}

        {ownerTab === "reportes" && (
          <>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 15, marginBottom: 10 }}>Pendientes de revisión</div>
            {pendingReports.length === 0 ? (
              <Empty text="No hay reportes pendientes." />
            ) : (
              pendingReports.map((r) => (
                <ReportCard
                  key={r.id}
                  r={r}
                  onSaveEvidence={(link) => setReportEvidence(r.id, link)}
                  actions={
                    <>
                      <Btn variant="approve" onClick={() => setReportStatus(r.id, "approved")}><Check size={14} /> Aprobar</Btn>
                      <Btn variant="reject" onClick={() => setReportStatus(r.id, "rejected")}><X size={14} /> Rechazar</Btn>
                    </>
                  }
                />
              ))
            )}
            {decidedReports.length > 0 && (
              <>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 15, margin: "24px 0 10px" }}>Historial ({decidedReports.length})</div>
                {decidedReports.map((r) => <ReportCard key={r.id} r={r} />)}
              </>
            )}
          </>
        )}

        {ownerTab === "mapa" && (
          <>
            <div style={{ display: "flex", gap: 8, alignItems: "center", color: COLORS.muted, fontSize: 12.5, marginBottom: 12 }}>
              <Info size={14} /> Incluye reportes pendientes (ámbar) y aprobados (rojo). Los rechazados no se muestran.
            </div>
            <ConceptMap reports={reports} showPending={true} />
          </>
        )}
        {Toast}
      </div>
    );
  }

  return shell(<div style={{ padding: 40, textAlign: "center", color: COLORS.muted }}>Cargando…</div>);
}
