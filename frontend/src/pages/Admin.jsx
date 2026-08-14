import { useState, useEffect } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { rupiah } from "@/lib/content";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { LogOut, Upload, Trash2, Calendar, Phone, Users, CheckCircle2, XCircle, Clock, Landmark, Image, Compass, Wallet, TrendingUp, ExternalLink, Save } from "lucide-react";

const BACKEND = process.env.REACT_APP_BACKEND_URL;

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
  const [photos, setPhotos] = useState([]);
  const [stats, setStats] = useState(null);
  const [settings, setSettings] = useState({ owner_email: "", bank_name: "", bank_account: "", bank_holder: "" });
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [photoKind, setPhotoKind] = useState("gallery");
  const [photoLabel, setPhotoLabel] = useState("");
  const [photoUploading, setPhotoUploading] = useState(false);

  const load = () => {
    api.get("/admin/bookings").then((r) => setBookings(r.data)).catch(() => onLogout());
    api.get("/videos").then((r) => setVideos(r.data)).catch(() => {});
    api.get("/photos").then((r) => setPhotos(r.data)).catch(() => {});
    api.get("/admin/analytics").then((r) => setStats(r.data)).catch(() => {});
    api.get("/admin/settings").then((r) => setSettings(r.data)).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const setStatus = async (id, status) => {
    try { await api.patch(`/admin/bookings/${id}`, { status }); toast.success("Status diperbarui"); load(); }
    catch { toast.error("Gagal memperbarui"); }
  };
  const setPay = async (id, status) => {
    try { await api.patch(`/admin/bookings/${id}/payment`, { status }); toast.success("Pembayaran diperbarui"); load(); }
    catch { toast.error("Gagal memperbarui"); }
  };

  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("title", title || file.name);
    try { await api.post("/admin/videos", fd, { headers: { "Content-Type": "multipart/form-data" } }); toast.success("Video terunggah"); setTitle(""); load(); }
    catch (err) { toast.error(err.response?.data?.detail || "Gagal mengunggah video"); }
    finally { setUploading(false); e.target.value = ""; }
  };
  const removeVideo = async (id) => {
    try { await api.delete(`/admin/videos/${id}`); toast.success("Video dihapus"); load(); } catch { toast.error("Gagal"); }
  };

  const uploadPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("kind", photoKind);
    fd.append("label", photoLabel || file.name);
    try { await api.post("/admin/photos", fd, { headers: { "Content-Type": "multipart/form-data" } }); toast.success("Foto terunggah"); setPhotoLabel(""); load(); }
    catch (err) { toast.error(err.response?.data?.detail || "Gagal mengunggah foto"); }
    finally { setPhotoUploading(false); e.target.value = ""; }
  };
  const removePhoto = async (id) => {
    try { await api.delete(`/admin/photos/${id}`); toast.success("Foto dihapus"); load(); } catch { toast.error("Gagal"); }
  };

  const saveSettings = async () => {
    try { await api.put("/admin/settings", settings); toast.success("Pengaturan disimpan"); load(); }
    catch { toast.error("Gagal menyimpan pengaturan"); }
  };

  const inputCls = "rounded-lg border px-4 py-2.5 text-sm outline-none focus:ring-2";
  const payMeta = {
    unpaid: { label: "Belum Bayar", color: "#9a9a9a" },
    proof_uploaded: { label: "Bukti Diunggah", color: "#C26D5C" },
    verified: { label: "Lunas/Terverifikasi", color: "#4A6B53" },
  };
  const statCards = stats ? [
    { label: "Total Booking", value: stats.total_bookings, Icon: Calendar },
    { label: "Total Omset", value: rupiah(stats.total_omset), Icon: Wallet },
    { label: "Terkonfirmasi", value: stats.confirmed, Icon: CheckCircle2 },
    { label: "Menunggu", value: stats.pending, Icon: Clock },
  ] : [];

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

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6" data-testid="stat-cards">
          {statCards.map((c) => (
            <div key={c.label} className="rounded-xl p-5" style={{ background: "var(--bg)" }}>
              <c.Icon size={20} style={{ color: "var(--secondary)" }} />
              <p className="mt-3 text-2xl font-serif">{c.value}</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-soft)" }}>{c.label}</p>
            </div>
          ))}
        </div>

        {/* Chart */}
        {stats && stats.monthly.length > 0 && (
          <div className="rounded-xl p-6 mb-6" style={{ background: "var(--bg)" }} data-testid="analytics-chart">
            <h2 className="font-serif text-2xl mb-4 flex items-center gap-2"><TrendingUp size={20} style={{ color: "var(--primary)" }} /> Booking & Omset per Bulan</h2>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={stats.monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#D8D3C8" />
                <XAxis dataKey="month" stroke="#5C5C5C" fontSize={12} />
                <YAxis stroke="#5C5C5C" fontSize={12} />
                <Tooltip formatter={(v, n) => (n === "omset" ? rupiah(v) : v)} />
                <Bar dataKey="bookings" name="Booking" fill="#C26D5C" radius={[4, 4, 0, 0]} />
                <Bar dataKey="omset" name="Omset" fill="#4A6B53" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Settings */}
        <div className="rounded-xl p-6 mb-6" style={{ background: "var(--bg)" }} data-testid="settings-manager">
          <h2 className="font-serif text-2xl mb-4 flex items-center gap-2"><Landmark size={20} style={{ color: "var(--primary)" }} /> Pengaturan</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5"><span className="text-xs" style={{ color: "var(--text-soft)" }}>Email Owner (notifikasi booking)</span>
              <input data-testid="set-owner-email" value={settings.owner_email} onChange={(e) => setSettings({ ...settings, owner_email: e.target.value })} placeholder="owner@email.com" className={inputCls} style={{ borderColor: "var(--border)", background: "#fff" }} /></label>
            <label className="flex flex-col gap-1.5"><span className="text-xs" style={{ color: "var(--text-soft)" }}>Nama Bank</span>
              <input data-testid="set-bank-name" value={settings.bank_name} onChange={(e) => setSettings({ ...settings, bank_name: e.target.value })} className={inputCls} style={{ borderColor: "var(--border)", background: "#fff" }} /></label>
            <label className="flex flex-col gap-1.5"><span className="text-xs" style={{ color: "var(--text-soft)" }}>Nomor Rekening</span>
              <input data-testid="set-bank-account" value={settings.bank_account} onChange={(e) => setSettings({ ...settings, bank_account: e.target.value })} className={inputCls} style={{ borderColor: "var(--border)", background: "#fff" }} /></label>
            <label className="flex flex-col gap-1.5"><span className="text-xs" style={{ color: "var(--text-soft)" }}>Atas Nama</span>
              <input data-testid="set-bank-holder" value={settings.bank_holder} onChange={(e) => setSettings({ ...settings, bank_holder: e.target.value })} className={inputCls} style={{ borderColor: "var(--border)", background: "#fff" }} /></label>
          </div>
          <button onClick={saveSettings} data-testid="save-settings" className="mt-4 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white hover-lift" style={{ background: "var(--primary)" }}><Save size={16} /> Simpan Pengaturan</button>
        </div>

        {/* Photo manager */}
        <div className="rounded-xl p-6 mb-6" style={{ background: "var(--bg)" }} data-testid="photo-manager">
          <h2 className="font-serif text-2xl mb-4 flex items-center gap-2"><Image size={20} style={{ color: "var(--primary)" }} /> Foto Galeri & 360°</h2>
          <div className="flex flex-wrap items-center gap-3">
            <select value={photoKind} onChange={(e) => setPhotoKind(e.target.value)} data-testid="photo-kind" className={inputCls} style={{ borderColor: "var(--border)", background: "#fff" }}>
              <option value="gallery">Galeri Foto</option>
              <option value="pano">Panorama 360°</option>
            </select>
            <input placeholder="Label / nama ruangan" value={photoLabel} onChange={(e) => setPhotoLabel(e.target.value)} className={inputCls} style={{ borderColor: "var(--border)", background: "#fff" }} />
            <label className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white cursor-pointer hover-lift" style={{ background: "var(--primary)" }} data-testid="photo-upload-btn">
              <Upload size={16} /> {photoUploading ? "Mengunggah..." : "Unggah Foto"}
              <input type="file" accept="image/*" onChange={uploadPhoto} disabled={photoUploading} className="hidden" />
            </label>
          </div>
          {photoKind === "pano" && <p className="text-xs mt-2" style={{ color: "var(--text-soft)" }}>Gunakan foto panorama equirectangular (rasio 2:1) untuk hasil 360° terbaik.</p>}
          {photos.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-5">
              {photos.map((p) => (
                <div key={p.id} className="relative rounded-lg overflow-hidden aspect-square group" style={{ background: "var(--surface)" }}>
                  <img src={`${BACKEND}/api/media/${p.storage_path}`} alt={p.label} className="w-full h-full object-cover" />
                  <span className="absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full text-white flex items-center gap-1" style={{ background: p.kind === "pano" ? "#4A6B53" : "#C26D5C" }}>
                    {p.kind === "pano" ? <Compass size={10} /> : <Image size={10} />} {p.kind === "pano" ? "360°" : "Galeri"}
                  </span>
                  <button onClick={() => removePhoto(p.id)} data-testid={`delete-photo-${p.id}`} className="absolute top-2 right-2 bg-white/90 rounded-full p-1.5 text-red-500"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Video manager */}
        <div className="rounded-xl p-6 mb-6" style={{ background: "var(--bg)" }} data-testid="video-manager">
          <h2 className="font-serif text-2xl mb-4">Video Suasana</h2>
          <div className="flex flex-wrap items-center gap-3">
            <input placeholder="Judul video (opsional)" value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} style={{ borderColor: "var(--border)", background: "#fff" }} />
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
                const pm = payMeta[b.payment_status] || payMeta.unpaid;
                return (
                  <div key={b.id} className="rounded-lg border p-4" style={{ borderColor: "var(--border)" }} data-testid={`booking-row-${b.id}`}>
                    <div className="flex flex-wrap items-center gap-4 justify-between">
                      <div className="min-w-[160px]">
                        <p className="font-semibold">{b.name}</p>
                        <p className="text-sm flex items-center gap-1" style={{ color: "var(--text-soft)" }}><Phone size={13} /> {b.phone}</p>
                      </div>
                      <div className="text-sm" style={{ color: "var(--text-soft)" }}>
                        <p className="flex items-center gap-1"><Calendar size={13} /> {fmt(b.check_in)} → {fmt(b.check_out)}</p>
                        <p className="flex items-center gap-1 mt-1"><Users size={13} /> {b.package} · {b.guests} org</p>
                      </div>
                      <div className="text-sm text-right">
                        <p className="font-semibold">{rupiah(b.total_price)}</p>
                        {b.dp_amount > 0 && <p className="text-xs" style={{ color: "var(--text-soft)" }}>DP {rupiah(b.dp_amount)}</p>}
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full" style={{ color: m.color, background: `${m.color}1a` }}><m.Icon size={12} /> {m.label}</span>
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full" style={{ color: pm.color, background: `${pm.color}1a` }}><Wallet size={12} /> {pm.label}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => setStatus(b.id, "confirmed")} data-testid={`confirm-${b.id}`} className="rounded-full px-3 py-1.5 text-xs font-medium text-white hover-lift" style={{ background: "var(--primary)" }}>Konfirmasi</button>
                        <button onClick={() => setStatus(b.id, "cancelled")} data-testid={`cancel-${b.id}`} className="rounded-full px-3 py-1.5 text-xs font-medium border hover-lift" style={{ borderColor: "var(--border)" }}>Batal</button>
                        <button onClick={() => setPay(b.id, "verified")} data-testid={`verify-pay-${b.id}`} className="rounded-full px-3 py-1.5 text-xs font-medium text-white hover-lift" style={{ background: "var(--secondary)" }}>Verifikasi Bayar</button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-4 items-center mt-2">
                      {b.notes && <p className="text-xs italic" style={{ color: "var(--text-soft)" }}>Catatan: {b.notes}</p>}
                      {b.payment_proof && (
                        <a href={`${BACKEND}/api/media/${b.payment_proof}`} target="_blank" rel="noreferrer" data-testid={`proof-link-${b.id}`} className="text-xs inline-flex items-center gap-1 font-medium" style={{ color: "var(--primary)" }}>
                          <ExternalLink size={12} /> Lihat Bukti Transfer
                        </a>
                      )}
                    </div>
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
