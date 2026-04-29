import { useState } from "react";
import {
  Bot, FileText, MessageCircle, Send, Facebook, Mail,
  Sun, Moon, HelpCircle, Bug, ChevronRight,
  CalendarDays, ChevronLeft, ChevronDown,
} from "lucide-react";

const agents = [
  { name: "Agente Kardex",      icon: FileText, desc: "Historial académico y notas",    color: "text-umsa-green" },
  { name: "Agente Información", icon: Bot,      desc: "Carreras, trámites y calendario", color: "text-blue-400"  },
];

const channels = [
  { name: "Canal WhatsApp",     icon: MessageCircle, status: "Online",                 statusColor: "text-umsa-green",                         dot: "bg-umsa-green" },
  { name: "Canal Telegram",     icon: Send,          status: "Actualizado hace 5 min", statusColor: "text-sky-400",                            dot: "bg-sky-400"    },
  { name: "Página de Facebook", icon: Facebook,      status: "Página Oficial FCPN",    statusColor: "text-blue-400",                           dot: "bg-blue-400"   },
  { name: "Correo Electrónico", icon: Mail,          status: "Actualizado hace 1 hora",statusColor: "text-light-muted dark:text-umsa-muted",   dot: "bg-yellow-400" },
];

const academicEvents = {
  1:  [
    { day: 6,  label: "Inicio matriculación alumnos antiguos", type: "enroll" },
    { day: 13, label: "Inicio inscripciones PSA I-2026",       type: "enroll" },
  ],
  2:  [
    { day: 15, label: "Inicio inscripciones 1er semestre",     type: "enroll" },
    { day: 28, label: "Fin inscripciones 1er semestre",        type: "deadline" },
  ],
  3:  [
    { day: 3,  label: "Inicio clases 1er semestre",            type: "class" },
    { day: 21, label: "Fin calendario oficial matriculación",  type: "deadline" },
  ],
  4:  [
    { day: 17, label: "Jueves Santo – Asueto",                 type: "holiday" },
    { day: 18, label: "Viernes Santo – Asueto",                type: "holiday" },
  ],
  5:  [
    { day: 1,  label: "Día del Trabajo – Asueto",              type: "holiday" },
    { day: 22, label: "1er Examen parcial (aprox.)",           type: "exam" },
  ],
  6:  [
    { day: 5,  label: "Corpus Christi – Asueto",               type: "holiday" },
    { day: 20, label: "2do Examen parcial (aprox.)",           type: "exam" },
  ],
  7:  [
    { day: 9,  label: "Cierre inscripciones PSA II-2025",      type: "deadline" },
    { day: 12, label: "Examen PSA II-2025 – FCPN",             type: "exam" },
    { day: 16, label: "Asueto – Día de la Independencia",      type: "holiday" },
  ],
  8:  [
    { day: 6,  label: "Inicio clases 2do semestre",            type: "class" },
    { day: 22, label: "Fin calendario matriculación II",       type: "deadline" },
  ],
  9:  [
    { day: 24, label: "Asueto – Batalla de Boyacá",            type: "holiday" },
    { day: 26, label: "1er Examen parcial II semestre",        type: "exam" },
  ],
  10: [
    { day: 12, label: "Día de la Hispanidad – Asueto",         type: "holiday" },
    { day: 13, label: "Inicio inscripciones PSA I-2026",       type: "enroll" },
  ],
  11: [
    { day: 2,  label: "Día de Difuntos – Asueto",              type: "holiday" },
    { day: 14, label: "2do Examen parcial II semestre",        type: "exam" },
  ],
  12: [
    { day: 5,  label: "Exámenes finales 2do semestre",         type: "exam" },
    { day: 19, label: "Fin gestión académica 2025",            type: "deadline" },
    { day: 25, label: "Navidad – Asueto",                      type: "holiday" },
  ],
};

const MONTH_NAMES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DAY_NAMES   = ["Do","Lu","Ma","Mi","Ju","Vi","Sa"];

const EVENT_STYLES = {
  exam:     { dot: "bg-red-400",    badge: "bg-red-400/15 text-red-500 dark:text-red-400",         label: "Examen"       },
  enroll:   { dot: "bg-umsa-green", badge: "bg-green-400/15 text-green-600 dark:text-green-400",   label: "Inscripción"  },
  class:    { dot: "bg-blue-400",   badge: "bg-blue-400/15 text-blue-600 dark:text-blue-400",      label: "Clases"       },
  holiday:  { dot: "bg-yellow-400", badge: "bg-yellow-400/15 text-yellow-600 dark:text-yellow-400",label: "Asueto"       },
  deadline: { dot: "bg-orange-400", badge: "bg-orange-400/15 text-orange-600 dark:text-orange-400",label: "Fecha límite" },
};

function getDaysInMonth(year, month)  { return new Date(year, month, 0).getDate(); }
function getFirstDayOfMonth(year, month) { return new Date(year, month - 1, 1).getDay(); }

function AcademicCalendar() {
  const today = new Date();
  const [year, setYear]         = useState(today.getFullYear());
  const [month, setMonth]       = useState(today.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState(null);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay    = getFirstDayOfMonth(year, month);
  const events      = academicEvents[month] || [];
  const eventDays   = {};
  events.forEach(e => { eventDays[e.day] = e; });

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); setSelectedDay(null); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); setSelectedDay(null); };

  const selectedEvent = selectedDay ? eventDays[selectedDay] : null;
  const isToday = (d) => d === today.getDate() && month === today.getMonth() + 1 && year === today.getFullYear();

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="bg-light-surface dark:bg-umsa-surface border border-light-border dark:border-umsa-border rounded-xl overflow-hidden transition-colors duration-300">
      {/* Header */}
      <div className="px-4 py-3 border-b border-light-border dark:border-umsa-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays size={13} className="text-umsa-green" />
          <span className="text-light-text dark:text-umsa-text font-display font-semibold text-xs tracking-wide uppercase">
            Calendario FCPN · UMSA
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={prevMonth} className="w-6 h-6 rounded-md flex items-center justify-center text-light-muted dark:text-umsa-muted hover:text-light-text dark:hover:text-umsa-text hover:bg-light-hover dark:hover:bg-umsa-hover transition-colors">
            <ChevronLeft size={12} />
          </button>
          <span className="text-light-text dark:text-umsa-text text-xs font-semibold w-[100px] text-center">
            {MONTH_NAMES[month - 1]} {year}
          </span>
          <button onClick={nextMonth} className="w-6 h-6 rounded-md flex items-center justify-center text-light-muted dark:text-umsa-muted hover:text-light-text dark:hover:text-umsa-text hover:bg-light-hover dark:hover:bg-umsa-hover transition-colors">
            <ChevronRight size={12} />
          </button>
        </div>
      </div>

      <div className="px-3 pt-2 pb-1">
        <div className="grid grid-cols-7 mb-1">
          {DAY_NAMES.map(d => (
            <div key={d} className="text-center text-light-muted dark:text-umsa-muted text-[10px] font-semibold py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-0.5">
          {cells.map((day, i) => {
            if (!day) return <div key={`e-${i}`} />;
            const ev = eventDays[day];
            const todayCell = isToday(day);
            const selected  = selectedDay === day;
            return (
              <button
                key={day}
                onClick={() => setSelectedDay(selected ? null : day)}
                className={`relative flex flex-col items-center justify-center h-8 w-full rounded-lg text-xs font-medium transition-all
                  ${selected
                    ? "bg-umsa-green text-white font-bold"
                    : todayCell
                    ? "bg-umsa-green/20 text-umsa-green font-bold ring-1 ring-umsa-green/50"
                    : "text-light-text dark:text-umsa-text hover:bg-light-hover dark:hover:bg-umsa-hover"
                  }`}
              >
                {day}
                {ev && !selected && (
                  <span className={`absolute bottom-0.5 w-1 h-1 rounded-full ${EVENT_STYLES[ev.type].dot}`} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {selectedEvent ? (
        <div className="mx-3 mb-3 mt-1 rounded-lg border border-light-border dark:border-umsa-border bg-light-card dark:bg-umsa-card px-3 py-2 flex items-start gap-2">
          <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${EVENT_STYLES[selectedEvent.type].dot}`} />
          <div className="min-w-0">
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${EVENT_STYLES[selectedEvent.type].badge}`}>
              {EVENT_STYLES[selectedEvent.type].label}
            </span>
            <p className="text-light-text dark:text-umsa-text text-xs mt-1 leading-snug">{selectedEvent.label}</p>
            <p className="text-light-muted dark:text-umsa-muted text-[10px] mt-0.5">
              {selectedDay} de {MONTH_NAMES[month - 1]} de {year}
            </p>
          </div>
        </div>
      ) : events.length > 0 ? (
        <div className="px-3 pb-2">
          <p className="text-light-muted dark:text-umsa-muted text-[10px] font-semibold uppercase mb-1.5 px-0.5">Eventos este mes</p>
          <ul className="space-y-0.5">
            {events.map((ev, i) => (
              <li key={i}
                onClick={() => setSelectedDay(ev.day)}
                className="flex items-center gap-2 cursor-pointer hover:bg-light-hover dark:hover:bg-umsa-hover rounded-lg px-2 py-1.5 transition-colors"
              >
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${EVENT_STYLES[ev.type].dot}`} />
                <span className="text-light-muted dark:text-umsa-muted text-[10px] font-bold w-4 shrink-0">{ev.day}</span>
                <span className="text-light-text dark:text-umsa-text text-[10px] leading-tight truncate">{ev.label}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-light-muted dark:text-umsa-muted text-[10px] text-center pb-3">Sin eventos este mes</p>
      )}

      <div className="px-3 pb-3 pt-1 flex flex-wrap gap-x-3 gap-y-1 border-t border-light-border dark:border-umsa-border">
        {Object.entries(EVENT_STYLES).map(([key, val]) => (
          <div key={key} className="flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${val.dot}`} />
            <span className="text-light-muted dark:text-umsa-muted text-[9px]">{val.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Clases reutilizables
const panel   = "bg-light-surface dark:bg-umsa-surface border border-light-border dark:border-umsa-border rounded-xl overflow-hidden transition-colors duration-300";
const divider = "divide-y divide-light-border dark:divide-umsa-border";
const iconBox = "w-9 h-9 rounded-lg bg-light-card dark:bg-umsa-card flex items-center justify-center shrink-0";
const rowBase = "w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-150 hover:bg-light-hover dark:hover:bg-umsa-hover";

export default function AgentsPanel({ activeAgent, setActiveAgent, darkMode, setDarkMode }) {
  // Estado colapsable del panel de canales
  const [channelsOpen, setChannelsOpen] = useState(true);

  return (
    <aside className="flex flex-col gap-3">

      {/* ── Agentes ── */}
      <div className={panel}>
        <div className="px-4 py-3 border-b border-light-border dark:border-umsa-border text-light-text dark:text-umsa-text font-display font-semibold text-xs tracking-wide uppercase">
          Agentes de la Facultad
        </div>
        <ul className={divider}>
          {agents.map(({ name, icon: Icon, desc, color }) => (
            <li key={name}>
              <button
                onClick={() => setActiveAgent(name)}
                className={`${rowBase} ${
                  activeAgent === name
                    ? "bg-light-hover dark:bg-umsa-hover border-l-2 border-umsa-green"
                    : "border-l-2 border-transparent"
                }`}
              >
                <div className={`${iconBox} ${color}`}><Icon size={17} /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-light-text dark:text-umsa-text text-xs font-semibold truncate">{name}</p>
                  <p className="text-light-muted dark:text-umsa-muted text-xs truncate">{desc}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="w-2 h-2 rounded-full bg-umsa-green" />
                  {activeAgent === name && <ChevronRight size={12} className="text-umsa-green" />}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* ── Canales colapsables ── */}
      <div className={panel}>
        {/* Header clicable para colapsar/expandir */}
        <button
          onClick={() => setChannelsOpen(o => !o)}
          className="w-full px-4 py-3 border-b border-light-border dark:border-umsa-border flex items-center justify-between
            hover:bg-light-hover dark:hover:bg-umsa-hover transition-colors duration-150"
        >
          <span className="text-light-text dark:text-umsa-text font-display font-semibold text-xs tracking-wide uppercase">
            Canales de Comunicación
          </span>
          <ChevronDown
            size={14}
            className={`text-light-muted dark:text-umsa-muted transition-transform duration-300 ${channelsOpen ? "rotate-180" : "rotate-0"}`}
          />
        </button>

        {/* Lista colapsable con animación suave */}
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            channelsOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <ul className={divider}>
            {channels.map(({ name, icon: Icon, status, statusColor, dot }) => (
              <li key={name}>
                <button className={rowBase}>
                  <div className={`${iconBox} text-light-muted dark:text-umsa-muted`}><Icon size={17} /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-light-text dark:text-umsa-text text-xs font-semibold truncate">{name}</p>
                    <p className={`text-xs truncate ${statusColor}`}>{status}</p>
                  </div>
                  <div className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── Calendario Académico ── */}
      <AcademicCalendar />

      {/* ── Botones inferiores ── */}
      <div className="flex gap-3">
        <button
          onClick={() => setDarkMode(!darkMode)}
          className={`flex-1 flex flex-col items-center gap-1.5 rounded-xl py-3
            border transition-all duration-200 group
            bg-light-surface dark:bg-umsa-surface
            border-light-border dark:border-umsa-border
            hover:bg-light-hover dark:hover:bg-umsa-hover
            hover:border-umsa-green dark:hover:border-umsa-green`}
          title="Modo Claro/Oscuro"
        >
          {darkMode
            ? <Sun  size={18} className="text-yellow-400 group-hover:scale-110 transition-transform" />
            : <Moon size={18} className="text-sky-400   group-hover:scale-110 transition-transform" />
          }
          <span className="text-light-muted dark:text-umsa-muted text-xs">
            {darkMode ? "Modo Claro" : "Modo Oscuro"}
          </span>
        </button>

        <button
          className={`flex-1 flex flex-col items-center gap-1.5 rounded-xl py-3
            border transition-all duration-200 group
            bg-light-surface dark:bg-umsa-surface
            border-light-border dark:border-umsa-border
            hover:bg-light-hover dark:hover:bg-umsa-hover
            hover:border-umsa-green dark:hover:border-umsa-green`}
          title="FAQ & Bug Report"
        >
          <div className="flex gap-1 items-center">
            <HelpCircle size={14} className="text-light-muted dark:text-umsa-muted group-hover:text-umsa-green transition-colors" />
            <Bug        size={14} className="text-light-muted dark:text-umsa-muted group-hover:text-umsa-green transition-colors" />
          </div>
          <span className="text-light-muted dark:text-umsa-muted text-xs">FAQ & Bug Report</span>
        </button>
      </div>
    </aside>
  );
}