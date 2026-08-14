import { useState, useEffect } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { motion } from "framer-motion";
import { LogOut, Upload, Trash2, Calendar, Phone, Users, CheckCircle2, XCircle, Clock } from "lucide-react";

const fmt = (iso) => new Date(iso + (iso.length === 10 ? "T00:00:00" : "")).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      localStorage.setItem("rv_token", data.token);
      onLogin(data.user);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Login gagal");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "var(--forest)" }}>
      <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} onSubmit={submit} className="w-full max-w-md rounded-2xl p-8 md:p-10" style={{ background: "var(--bg)" }} data-testid="admin-login-form">
        <h1 className="font-serif text-4xl" style={{ color: "var(--primary)" }}>Panel Admin</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--text-soft)" }}>Royale Villa Malino</p>
        <input data-testid="login-email" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full mt-6 rounded-lg border px-4 py-3 text-sm outline-none focus:ring-2" style={{ borderColor: "var(--border)", background: "#fff" }} />
        <input data-testid="login-password" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full mt-4 rounded-lg border px-4 py-3 text-sm outline-none focus:ring-2" style={{ borderColor: "var(--border)", background: "#fff" }} />
        <button data-testid="login-submit" disabled={loading} className="w-full mt-6 rounded-full px-6 py-3.5 text-sm font-semibold text-white hover-lift disabled:opacity-60" style={{ background: "var(--primary)" }}>
          {loading ? "Masuk..." : "Masuk"}
        </button>
      </motion.form>
    </div>
  );
};

const statusMeta = {
  pending: { label: "Menunggu", color: "#C26D5C", Icon: Clock },
  confirmed: { label: "Terkonfirmasi", color: "#4A6B53", Icon: CheckCircle2 },
  cancelled: { label: "Dibatalkan", color: "#9a9a9a", Icon: XCircle },
};

const Dashboard = ({ user, onLogout }) => {
  const [bookings, setBookings] = useState([]);
  const [videos, setVideos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");

  const load = () => {
    api.get("/admin/bookings").then((r) => setBookings(r.data)).catch(() => onLogout());
    api.get("/videos").then((r) => setVideos(r.data)).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const setStatus = async (id, status) => {
    try {
      await api.patch(`/admin/bookings/${id}`, { status });
      toast.success("Status diperbarui");
      load();
    } catch { toast.error("Gagal memperbarui"); }
  };

  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("title", title || file.name);
    try {
      await api.post("/admin/videos", fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Video terunggah");
      setTitle("");
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Gagal mengunggah video");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removeVideo = async (id) => {
    try { await api.delete(`/admin/videos/${id}`); toast.success("Video dihapus"); load(); } catch { toast.error("Gagal"); }
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--surface)" }}>
      <div className="max-w-[1200px] mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="font-serif text-4xl" style={{ color: "var(--primary)" }}>Dashboard</h1>
            <p className="text-sm" style={{ color: "var(--text-soft)" }}>Masuk sebagai {user.email}</p>
          </div>
          <button onClick={onLogout} data-testid="admin-logout" className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium border hover-lift" style={{ borderColor: "var(--border)", background: "#fff" }}>
            <LogOut size={16} /> Keluar
          </button>
        </div>

        {/* Video upload */}
        <div className="rounded-xl p-6 mb-8" style={{ background: "var(--bg)" }} data-testid="video-manager">
          <h2 className="font-serif text-2xl mb-4">Video Suasana</h2>
          <div className="flex flex-wrap items-center gap-3">
            <input placeholder="Judul video (opsional)" value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-lg border px-4 py-2.5 text-sm outline-none focus:ring-2" style={{ borderColor: "var(--border)", background: "#fff" }} />
            <label className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white cursor-pointer hover-lift" style={{ background: "var(--primary)" }} data-testid="video-upload-btn">
              <Upload size={16} /> {uploading ? "Mengunggah..." : "Unggah Video"}
              <input type="file" accept="video/*" onChange={upload} disabled={uploading} className="hidden" />
            </label>
          </div>
          {videos.length > 0 && (
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 mt-5">
              {videos.map((v) => (
                <div key={v.id} className="flex items-center justify-between rounded-lg px-4 py-3 text-sm" style={{ background: "var(--surface)" }}>
                  <span className="truncate mr-2">{v.title}</span>
                  <button onClick={() => removeVideo(v.id)} data-testid={`delete-video-${v.id}`} className="text-red-500 shrink-0"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bookings */}
        <div className="rounded-xl p-6" style={{ background: "var(--bg)" }} data-testid="bookings-manager">
          <h2 className="font-serif text-2xl mb-4">Daftar Booking ({bookings.length})</h2>
          {bookings.length === 0 ? (
            <p className="text-sm py-8 text-center" style={{ color: "var(--text-soft)" }}>Belum ada booking.</p>
          ) : (
            <div className="space-y-3">
              {bookings.map((b) => {
                const m = statusMeta[b.status] || statusMeta.pending;
                return (
                  <div key={b.id} className="rounded-lg border p-4 flex flex-wrap items-center gap-4 justify-between" style={{ borderColor: "var(--border)" }} data-testid={`booking-row-${b.id}`}>
                    <div className="min-w-[180px]">
                      <p className="font-semibold">{b.name}</p>
                      <p className="text-sm flex items-center gap-1" style={{ color: "var(--text-soft)" }}><Phone size={13} /> {b.phone}</p>
                    </div>
                    <div className="text-sm" style={{ color: "var(--text-soft)" }}>
                      <p className="flex items-center gap-1"><Calendar size={13} /> {fmt(b.check_in)} → {fmt(b.check_out)}</p>
                      <p className="flex items-center gap-1 mt-1"><Users size={13} /> {b.package} · {b.guests} org</p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full" style={{ color: m.color, background: `${m.color}1a` }}>
                      <m.Icon size={13} /> {m.label}
                    </span>
                    <div className="flex gap-2">
                      <button onClick={() => setStatus(b.id, "confirmed")} data-testid={`confirm-${b.id}`} className="rounded-full px-3 py-1.5 text-xs font-medium text-white hover-lift" style={{ background: "var(--primary)" }}>Konfirmasi</button>
                      <button onClick={() => setStatus(b.id, "cancelled")} data-testid={`cancel-${b.id}`} className="rounded-full px-3 py-1.5 text-xs font-medium border hover-lift" style={{ borderColor: "var(--border)" }}>Batal</button>
                    </div>
                    {b.notes && <p className="w-full text-xs italic mt-1" style={{ color: "var(--text-soft)" }}>Catatan: {b.notes}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function Admin() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  useEffect(() => {
    if (!localStorage.getItem("rv_token")) { setChecking(false); return; }
    api.get("/auth/me").then((r) => setUser(r.data)).catch(() => localStorage.removeItem("rv_token")).finally(() => setChecking(false));
  }, []);
  const logout = () => { localStorage.removeItem("rv_token"); setUser(null); };
  if (checking) return <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--forest)", color: "#F4F1EB" }}>Memuat...</div>;
  return user ? <Dashboard user={user} onLogout={logout} /> : <Login onLogin={setUser} />;
}
