import { useState, useEffect, useRef } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { toast } from "sonner";
import {
  MapPin, Phone, Star, Clock, Users, ArrowRight, ArrowUpRight, X, Play,
  Menu, CheckCircle2, ChevronLeft, ChevronRight,
} from "lucide-react";
import { api, WHATSAPP } from "@/lib/api";
import { IMAGES, AMENITIES, PACKAGES, REVIEWS } from "@/lib/content";
import { Reveal, MaskLine } from "@/components/Motion";

const fmtID = (iso) => {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
};
const toISO = (d) => d.toLocaleDateString("en-CA");

// ---------------- Nav ----------------
const Nav = () => {
  const [open, setOpen] = useState(false);
  const links = [
    ["Ringkasan", "about"],
    ["Galeri", "galeri"],
    ["Suasana", "suasana"],
    ["Harga", "harga"],
    ["Booking", "booking"],
  ];
  const go = (id) => {
    setOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };
  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 mt-4">
        <div className="flex items-center justify-between rounded-full px-5 py-3 backdrop-blur-xl bg-white/60 border border-white/40 shadow-sm">
          <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} data-testid="nav-logo" className="font-serif text-xl tracking-tight" style={{ color: "var(--primary)" }}>
            Royale Villa <span className="italic">Malino</span>
          </button>
          <nav className="hidden md:flex items-center gap-8">
            {links.map(([label, id]) => (
              <button key={id} onClick={() => go(id)} data-testid={`nav-${id}`} className="text-sm font-medium hover-lift" style={{ color: "var(--text-soft)" }}>
                {label}
              </button>
            ))}
          </nav>
          <button onClick={() => go("booking")} data-testid="nav-book-btn" className="hidden md:inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white hover-lift" style={{ background: "var(--primary)" }}>
            Pesan Sekarang <ArrowRight size={16} />
          </button>
          <button className="md:hidden" onClick={() => setOpen(!open)} data-testid="nav-menu-toggle">
            {open ? <X /> : <Menu />}
          </button>
        </div>
        <AnimatePresence>
          {open && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="md:hidden mt-2 rounded-2xl backdrop-blur-xl bg-white/80 border border-white/40 p-4 flex flex-col gap-3">
              {links.map(([label, id]) => (
                <button key={id} onClick={() => go(id)} className="text-left py-2 font-medium">{label}</button>
              ))}
              <button onClick={() => go("booking")} className="rounded-full px-5 py-3 text-sm font-semibold text-white" style={{ background: "var(--primary)" }}>Pesan Sekarang</button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
};

// ---------------- Hero ----------------
const Hero = () => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "28%"]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.15]);
  return (
    <section ref={ref} className="relative h-[100svh] overflow-hidden" data-testid="hero">
      <motion.div className="absolute inset-0" style={{ y, scale }}>
        <img src={IMAGES.heroExterior} alt="Royale Villa Malino" className="w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.15) 40%, rgba(30,42,35,0.55) 100%)" }} />
      </motion.div>
      <div className="relative z-10 h-full max-w-[1400px] mx-auto px-6 md:px-12 flex flex-col justify-end pb-24 md:pb-28">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex items-center gap-3 mb-6 text-white/90">
          <span className="flex items-center gap-1 overline"><Star size={14} fill="#C26D5C" stroke="#C26D5C" /> 5,0 · 86 Ulasan</span>
          <span className="w-1 h-1 rounded-full bg-white/50" />
          <span className="overline flex items-center gap-1"><MapPin size={14} /> Malino, Gowa</span>
        </motion.div>
        <h1 className="font-serif font-light text-white text-[3.4rem] leading-[0.95] sm:text-7xl md:text-8xl lg:text-[8.5rem] tracking-tighter">
          <MaskLine delay={0.35}>Menepi di</MaskLine>
          <MaskLine delay={0.5}><span className="italic" style={{ color: "#EAE5DC" }}>Ketinggian</span> Malino</MaskLine>
        </h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} className="mt-8 max-w-xl text-white/85 text-base md:text-lg leading-relaxed">
          Villa privat berdiri di antara pinus sejuk Tinggimoncong. Sempurna untuk keluarga, gathering, dan momen yang layak dikenang.
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.05 }} className="mt-10 flex flex-wrap gap-4">
          <button onClick={() => document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" })} data-testid="hero-book-btn" className="inline-flex items-center gap-2 rounded-full px-7 py-4 text-sm font-semibold text-white hover-lift" style={{ background: "var(--secondary)" }}>
            Cek Ketersediaan <ArrowRight size={16} />
          </button>
          <button onClick={() => document.getElementById("galeri")?.scrollIntoView({ behavior: "smooth" })} data-testid="hero-gallery-btn" className="inline-flex items-center gap-2 rounded-full px-7 py-4 text-sm font-semibold text-white border border-white/40 backdrop-blur-md hover-lift">
            Jelajahi Villa
          </button>
        </motion.div>
      </div>
    </section>
  );
};

// ---------------- Marquee ----------------
const Marquee = () => (
  <div className="py-6 overflow-hidden border-y" style={{ background: "var(--surface)", borderColor: "var(--border)" }} data-testid="marquee">
    <div className="marquee-track">
      {[0, 1].map((k) => (
        <div key={k} className="flex items-center">
          {AMENITIES.concat(["Buka 24 Jam"]).map((a, i) => (
            <span key={i} className="font-serif text-3xl md:text-4xl mx-8" style={{ color: "var(--primary)" }}>
              {a} <span style={{ color: "var(--secondary)" }}>✦</span>
            </span>
          ))}
        </div>
      ))}
    </div>
  </div>
);

// ---------------- About / Manifesto ----------------
const chapters = [
  ["01", "Alam Pegunungan", "Berada di dataran tinggi Malino yang sejuk, dikelilingi hutan pinus dan udara segar sepanjang hari."],
  ["02", "Ruang yang Lapang", "Kamar luas, dapur besar, dan area berkumpul yang nyaman untuk keluarga maupun rombongan."],
  ["03", "Layak Dirayakan", "Area hiburan mendukung acara keluarga, arisan, hingga gathering perusahaan."],
];
const About = () => (
  <section id="about" className="py-24 md:py-32 max-w-[1400px] mx-auto px-6 md:px-12" data-testid="about">
    <div className="grid md:grid-cols-12 gap-10 items-end mb-16">
      <div className="md:col-span-7">
        <Reveal><span className="overline" style={{ color: "var(--secondary)" }}>Ringkasan</span></Reveal>
        <Reveal delay={0.1}>
          <h2 className="font-serif font-light text-4xl md:text-6xl tracking-tight mt-4 leading-tight">
            Sebuah rumah peristirahatan yang <span className="italic" style={{ color: "var(--primary)" }}>ditinggali</span>, bukan sekadar disewa.
          </h2>
        </Reveal>
      </div>
      <div className="md:col-span-5 md:col-start-9">
        <Reveal delay={0.2}>
          <p className="text-base md:text-lg leading-relaxed" style={{ color: "var(--text-soft)" }}>
            Royale Villa Malino dirawat dengan hangat oleh pemiliknya. Setiap sudut dirancang agar tamu merasa di rumah — dengan pemandangan indah di depan dan belakang.
          </p>
        </Reveal>
      </div>
    </div>
    <div className="grid md:grid-cols-3 gap-px" style={{ background: "var(--border)" }}>
      {chapters.map(([num, title, desc], i) => (
        <Reveal key={num} delay={i * 0.12}>
          <div className="p-8 md:p-10 h-full hover-lift" style={{ background: "var(--bg)" }}>
            <span className="font-serif text-5xl" style={{ color: "var(--secondary)" }}>{num}</span>
            <h3 className="font-serif text-2xl md:text-3xl mt-6">{title}</h3>
            <p className="mt-4 leading-relaxed" style={{ color: "var(--text-soft)" }}>{desc}</p>
          </div>
        </Reveal>
      ))}
    </div>
  </section>
);

// ---------------- Gallery ----------------
const galleryItems = [
  { src: IMAGES.heroExterior, label: "Tampak Depan", span: "md:col-span-8 md:row-span-2" },
  { src: IMAGES.forest, label: "Panorama Pinus", span: "md:col-span-4" },
  { src: IMAGES.interiorHall, label: "Aula Berkumpul", span: "md:col-span-4" },
  { src: IMAGES.bedroom, label: "Kamar Tidur", span: "md:col-span-4" },
  { src: IMAGES.kitchen, label: "Dapur Besar", span: "md:col-span-4" },
  { src: IMAGES.exteriorNight, label: "Teras & Balkon", span: "md:col-span-4" },
];
const Gallery = () => {
  const [idx, setIdx] = useState(null);
  const items = galleryItems;
  const close = () => setIdx(null);
  const next = (e) => { e?.stopPropagation(); setIdx((p) => (p + 1) % items.length); };
  const prev = (e) => { e?.stopPropagation(); setIdx((p) => (p - 1 + items.length) % items.length); };
  return (
    <section id="galeri" className="py-24 md:py-32" style={{ background: "var(--surface)" }} data-testid="gallery">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-12">
          <div>
            <Reveal><span className="overline" style={{ color: "var(--secondary)" }}>Galeri Interaktif</span></Reveal>
            <Reveal delay={0.1}><h2 className="font-serif font-light text-4xl md:text-6xl tracking-tight mt-3">Jelajahi Setiap Sudut</h2></Reveal>
          </div>
          <Reveal delay={0.2}><p className="max-w-sm" style={{ color: "var(--text-soft)" }}>Klik foto untuk melihat lebih dekat suasana villa dari berbagai sisi.</p></Reveal>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-12 auto-rows-[220px] md:auto-rows-[260px] gap-4">
          {items.map((it, i) => (
            <Reveal key={i} delay={(i % 3) * 0.08} className={it.span}>
              <button onClick={() => setIdx(i)} data-testid={`gallery-item-${i}`} className="group relative w-full h-full overflow-hidden rounded-lg cursor-pointer block">
                <img src={it.src} alt={it.label} className="w-full h-full object-cover img-zoom" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-500" />
                <div className="absolute bottom-4 left-4 flex items-center gap-2 text-white opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-500">
                  <span className="overline">{it.label}</span><ArrowUpRight size={16} />
                </div>
              </button>
            </Reveal>
          ))}
        </div>
      </div>
      <AnimatePresence>
        {idx !== null && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close} className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4" data-testid="gallery-lightbox">
            <button onClick={close} className="absolute top-6 right-6 text-white" data-testid="lightbox-close"><X size={28} /></button>
            <button onClick={prev} className="absolute left-4 md:left-10 text-white/80 hover:text-white"><ChevronLeft size={40} /></button>
            <motion.img key={idx} initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} src={items[idx].src} alt="" className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg" />
            <button onClick={next} className="absolute right-4 md:right-10 text-white/80 hover:text-white"><ChevronRight size={40} /></button>
            <span className="absolute bottom-8 text-white/70 overline">{items[idx].label}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

// ---------------- Video Ambiance ----------------
const VideoSection = () => {
  const [videos, setVideos] = useState([]);
  const [active, setActive] = useState(null);
  useEffect(() => {
    api.get("/videos").then((r) => setVideos(r.data)).catch(() => {});
  }, []);
  const backend = process.env.REACT_APP_BACKEND_URL;
  return (
    <section id="suasana" className="py-24 md:py-32" style={{ background: "var(--forest)" }} data-testid="video-section">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12">
        <div className="mb-12">
          <Reveal><span className="overline" style={{ color: "var(--secondary)" }}>Suasana Villa</span></Reveal>
          <Reveal delay={0.1}><h2 className="font-serif font-light text-4xl md:text-6xl tracking-tight mt-3" style={{ color: "#F4F1EB" }}>Rasakan Sebelum Tiba</h2></Reveal>
        </div>
        {videos.length === 0 ? (
          <Reveal>
            <div className="relative rounded-xl overflow-hidden aspect-video" style={{ background: "var(--surface)" }}>
              <img src={IMAGES.exteriorNight} alt="" className="w-full h-full object-cover opacity-60" />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6" style={{ background: "rgba(30,42,35,0.55)" }}>
                <Play size={48} className="text-white/80 mb-4" />
                <p className="text-white/90 font-serif text-2xl">Video suasana segera hadir</p>
                <p className="text-white/60 mt-2 text-sm">Pemilik dapat mengunggah video melalui panel admin.</p>
              </div>
            </div>
          </Reveal>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {videos.map((v) => (
              <Reveal key={v.id}>
                <div className="relative rounded-xl overflow-hidden aspect-video bg-black" data-testid={`video-${v.id}`}>
                  <video controls playsInline preload="metadata" className="w-full h-full object-cover" src={`${backend}/api/media/${v.storage_path}`} />
                  <span className="absolute top-4 left-4 overline text-white/90 bg-black/40 px-3 py-1 rounded-full pointer-events-none">{v.title}</span>
                </div>
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

// ---------------- Facilities ----------------
const Facilities = () => (
  <section className="py-24 md:py-32 max-w-[1400px] mx-auto px-6 md:px-12" data-testid="facilities">
    <div className="grid md:grid-cols-2 gap-12 items-center">
      <Reveal>
        <div className="relative rounded-xl overflow-hidden aspect-[4/5]">
          <img src={IMAGES.guests} alt="Suasana tamu di villa" className="w-full h-full object-cover" />
        </div>
      </Reveal>
      <div>
        <Reveal><span className="overline" style={{ color: "var(--secondary)" }}>Fasilitas</span></Reveal>
        <Reveal delay={0.1}><h2 className="font-serif font-light text-4xl md:text-5xl tracking-tight mt-3">Semua yang Anda butuhkan</h2></Reveal>
        <div className="mt-8 grid sm:grid-cols-2 gap-px" style={{ background: "var(--border)" }}>
          {AMENITIES.map((a, i) => (
            <Reveal key={a} delay={i * 0.06}>
              <div className="flex items-center gap-3 p-5" style={{ background: "var(--bg)" }}>
                <CheckCircle2 size={20} style={{ color: "var(--primary)" }} />
                <span className="font-medium">{a}</span>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={0.3}>
          <div className="flex items-center gap-6 mt-8 text-sm" style={{ color: "var(--text-soft)" }}>
            <span className="flex items-center gap-2"><Clock size={16} /> Buka 24 Jam</span>
            <span className="flex items-center gap-2"><Users size={16} /> Hingga 50 Orang</span>
          </div>
        </Reveal>
      </div>
    </div>
  </section>
);

// ---------------- Pricing ----------------
const Pricing = () => (
  <section id="harga" className="py-24 md:py-32" style={{ background: "var(--surface)" }} data-testid="pricing">
    <div className="max-w-[1400px] mx-auto px-6 md:px-12">
      <div className="text-center md:text-left mb-14">
        <Reveal><span className="overline" style={{ color: "var(--secondary)" }}>Harga Booking</span></Reveal>
        <Reveal delay={0.1}><h2 className="font-serif font-light text-4xl md:text-6xl tracking-tight mt-3">Pilih Paket Menginap</h2></Reveal>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        {PACKAGES.map((p, i) => (
          <Reveal key={p.id} delay={i * 0.12}>
            <div className="p-8 md:p-10 rounded-xl h-full flex flex-col hover-lift border" style={{ background: p.featured ? "var(--forest)" : "var(--bg)", borderColor: p.featured ? "var(--forest)" : "var(--border)", color: p.featured ? "#F4F1EB" : "var(--text)" }} data-testid={`pricing-${p.id}`}>
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-3xl md:text-4xl">{p.name}</h3>
                {p.featured && <span className="overline px-3 py-1 rounded-full" style={{ background: "var(--secondary)", color: "#fff" }}>Populer</span>}
              </div>
              <p className="mt-2 text-sm" style={{ color: p.featured ? "#A3B3A8" : "var(--text-soft)" }}>{p.capacity}</p>
              <div className="mt-8 grid grid-cols-2 gap-4">
                <div>
                  <span className="overline" style={{ color: "var(--secondary)" }}>Sen – Kam</span>
                  <p className="font-serif text-2xl md:text-3xl mt-1">Rp {p.weekday}</p>
                </div>
                <div>
                  <span className="overline" style={{ color: "var(--secondary)" }}>Jum – Min</span>
                  <p className="font-serif text-2xl md:text-3xl mt-1">Rp {p.weekend}</p>
                </div>
              </div>
              <ul className="mt-8 space-y-3 flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm" style={{ color: p.featured ? "#D4E0D8" : "var(--text-soft)" }}>
                    <CheckCircle2 size={16} style={{ color: p.featured ? "#D4E0D8" : "var(--primary)" }} /> {f}
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-xs italic" style={{ color: p.featured ? "#A3B3A8" : "var(--text-soft)" }}>{p.note}</p>
              <button onClick={() => document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" })} data-testid={`pricing-book-${p.id}`} className="mt-6 inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold hover-lift" style={{ background: p.featured ? "#F4F1EB" : "var(--primary)", color: p.featured ? "var(--forest)" : "#fff" }}>
                Pesan Paket Ini <ArrowRight size={16} />
              </button>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  </section>
);

// ---------------- Booking ----------------
const Booking = () => {
  const [range, setRange] = useState(undefined);
  const [booked, setBooked] = useState([]);
  const [form, setForm] = useState({ name: "", phone: "", package: "Per Lantai", guests: 2, notes: "" });
  const [loading, setLoading] = useState(false);

  const load = () => api.get("/bookings/booked-dates").then((r) => setBooked(r.data.booked)).catch(() => {});
  useEffect(() => { load(); }, []);

  const disabledDays = [{ before: new Date() }, ...booked.map((d) => new Date(d + "T00:00:00"))];

  const submit = async () => {
    if (!form.name || !form.phone) return toast.error("Isi nama dan nomor WhatsApp.");
    if (!range?.from || !range?.to) return toast.error("Pilih tanggal check-in dan check-out.");
    setLoading(true);
    const payload = {
      ...form,
      guests: Number(form.guests),
      check_in: toISO(range.from),
      check_out: toISO(range.to),
    };
    try {
      await api.post("/bookings", payload);
      toast.success("Booking tersimpan! Melanjutkan ke WhatsApp untuk konfirmasi.");
      const msg = `Halo Royale Villa Malino, saya ingin booking:%0A%0ANama: ${form.name}%0ANo. HP: ${form.phone}%0APaket: ${form.package}%0AJumlah tamu: ${form.guests}%0ACheck-in: ${fmtID(payload.check_in)}%0ACheck-out: ${fmtID(payload.check_out)}%0ACatatan: ${form.notes || "-"}`;
      setTimeout(() => window.open(`https://wa.me/${WHATSAPP}?text=${msg}`, "_blank"), 800);
      setRange(undefined);
      setForm({ name: "", phone: "", package: "Per Lantai", guests: 2, notes: "" });
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Gagal menyimpan booking.");
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full rounded-lg border px-4 py-3 text-sm outline-none focus:ring-2";
  return (
    <section id="booking" className="py-24 md:py-32 max-w-[1400px] mx-auto px-6 md:px-12" data-testid="booking">
      <div className="mb-12">
        <Reveal><span className="overline" style={{ color: "var(--secondary)" }}>Booking Otomatis</span></Reveal>
        <Reveal delay={0.1}><h2 className="font-serif font-light text-4xl md:text-6xl tracking-tight mt-3">Cek Tanggal & Pesan</h2></Reveal>
        <Reveal delay={0.2}><p className="mt-4 max-w-lg" style={{ color: "var(--text-soft)" }}>Tanggal yang dicoret sudah terisi. Pilih rentang menginap Anda, isi data, lalu konfirmasi via WhatsApp.</p></Reveal>
      </div>
      <div className="grid lg:grid-cols-2 gap-8 items-start">
        <Reveal>
          <div className="rounded-xl border p-6 md:p-8 flex justify-center" style={{ background: "var(--bg)", borderColor: "var(--border)" }} data-testid="booking-calendar">
            <DayPicker mode="range" selected={range} onSelect={setRange} disabled={disabledDays} numberOfMonths={1} showOutsideDays weekStartsOn={1} />
          </div>
        </Reveal>
        <Reveal delay={0.15}>
          <div className="rounded-xl border p-6 md:p-8 space-y-5" style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between rounded-lg px-4 py-3" style={{ background: "var(--surface)" }}>
              <div><span className="overline block" style={{ color: "var(--secondary)" }}>Check-in</span><span className="text-sm font-medium">{range?.from ? fmtID(toISO(range.from)) : "—"}</span></div>
              <ArrowRight size={16} style={{ color: "var(--text-soft)" }} />
              <div className="text-right"><span className="overline block" style={{ color: "var(--secondary)" }}>Check-out</span><span className="text-sm font-medium">{range?.to ? fmtID(toISO(range.to)) : "—"}</span></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <input data-testid="booking-name" placeholder="Nama lengkap" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} style={{ borderColor: "var(--border)", background: "#fff" }} />
              <input data-testid="booking-phone" placeholder="No. WhatsApp" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} style={{ borderColor: "var(--border)", background: "#fff" }} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <select data-testid="booking-package" value={form.package} onChange={(e) => setForm({ ...form, package: e.target.value })} className={inputCls} style={{ borderColor: "var(--border)", background: "#fff" }}>
                <option>Per Lantai</option>
                <option>Full Villa</option>
              </select>
              <input data-testid="booking-guests" type="number" min="1" placeholder="Jumlah tamu" value={form.guests} onChange={(e) => setForm({ ...form, guests: e.target.value })} className={inputCls} style={{ borderColor: "var(--border)", background: "#fff" }} />
            </div>
            <textarea data-testid="booking-notes" placeholder="Catatan (opsional) — misal jumlah tamu lebih dari kapasitas" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className={inputCls} style={{ borderColor: "var(--border)", background: "#fff" }} />
            <button onClick={submit} disabled={loading} data-testid="booking-submit" className="w-full inline-flex items-center justify-center gap-2 rounded-full px-6 py-4 text-sm font-semibold text-white hover-lift disabled:opacity-60" style={{ background: "var(--primary)" }}>
              {loading ? "Memproses..." : "Pesan & Konfirmasi via WhatsApp"} <ArrowRight size={16} />
            </button>
            <p className="text-xs text-center" style={{ color: "var(--text-soft)" }}>Kapasitas lebih dari batas? Tulis di catatan, kami bantu atur.</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

// ---------------- Reviews ----------------
const Reviews = () => (
  <section className="py-24 md:py-32" style={{ background: "var(--forest)" }} data-testid="reviews">
    <div className="max-w-[1400px] mx-auto px-6 md:px-12">
      <div className="flex flex-wrap items-end justify-between gap-6 mb-14">
        <div>
          <Reveal><span className="overline" style={{ color: "var(--secondary)" }}>Ulasan Google</span></Reveal>
          <Reveal delay={0.1}><h2 className="font-serif font-light text-4xl md:text-6xl tracking-tight mt-3" style={{ color: "#F4F1EB" }}>Kata Para Tamu</h2></Reveal>
        </div>
        <Reveal delay={0.2}>
          <div className="flex items-center gap-3" style={{ color: "#F4F1EB" }}>
            <span className="font-serif text-6xl">5,0</span>
            <div>
              <div className="flex gap-1">{[...Array(5)].map((_, i) => <Star key={i} size={16} fill="#C26D5C" stroke="#C26D5C" />)}</div>
              <span className="text-sm" style={{ color: "#A3B3A8" }}>86 Ulasan</span>
            </div>
          </div>
        </Reveal>
      </div>
      <div className="grid md:grid-cols-3 gap-6">
        {REVIEWS.map((r, i) => (
          <Reveal key={i} delay={i * 0.12}>
            <div className="p-8 rounded-xl h-full" style={{ background: "var(--surface)" }} data-testid={`review-${i}`}>
              <div className="flex gap-1 mb-4">{[...Array(5)].map((_, j) => <Star key={j} size={14} fill="#C26D5C" stroke="#C26D5C" />)}</div>
              <p className="font-serif text-xl leading-snug">“{r.text}”</p>
              <p className="mt-6 overline" style={{ color: "var(--text-soft)" }}>{r.name}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  </section>
);

// ---------------- Footer ----------------
const Footer = () => (
  <footer className="py-20 max-w-[1400px] mx-auto px-6 md:px-12" data-testid="footer">
    <div className="grid md:grid-cols-3 gap-10">
      <div>
        <h3 className="font-serif text-3xl" style={{ color: "var(--primary)" }}>Royale Villa <span className="italic">Malino</span></h3>
        <p className="mt-4 leading-relaxed max-w-sm" style={{ color: "var(--text-soft)" }}>Villa privat di dataran tinggi Malino. Buka 24 jam untuk keluarga & gathering Anda.</p>
      </div>
      <div>
        <span className="overline" style={{ color: "var(--secondary)" }}>Lokasi</span>
        <p className="mt-4 flex items-start gap-2" style={{ color: "var(--text-soft)" }}><MapPin size={18} className="shrink-0 mt-1" /> Malino, Kec. Tinggimoncong, Kabupaten Gowa, Sulawesi Selatan 92174</p>
      </div>
      <div>
        <span className="overline" style={{ color: "var(--secondary)" }}>Kontak</span>
        <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noreferrer" data-testid="footer-wa" className="mt-4 flex items-center gap-2 font-medium hover-lift" style={{ color: "var(--primary)" }}><Phone size={18} /> 0853-9551-2330</a>
        <a href="https://maps.google.com/?q=Royale+Villa+Malino" target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm" style={{ color: "var(--text-soft)" }}>Lihat di Peta <ArrowUpRight size={14} /></a>
      </div>
    </div>
    <div className="mt-16 pt-8 border-t flex flex-wrap justify-between gap-4 text-sm" style={{ borderColor: "var(--border)", color: "var(--text-soft)" }}>
      <span>© {new Date().getFullYear()} Royale Villa Malino</span>
      <a href="/admin" data-testid="footer-admin-link">Panel Admin</a>
    </div>
  </footer>
);

export default function Landing() {
  return (
    <div>
      <Nav />
      <Hero />
      <Marquee />
      <About />
      <Gallery />
      <VideoSection />
      <Facilities />
      <Pricing />
      <Booking />
      <Reviews />
      <Footer />
    </div>
  );
}
