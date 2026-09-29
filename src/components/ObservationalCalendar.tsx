import { useState, useEffect, useMemo } from 'react';
import { HistoricalDataPoint } from '../types';
import { Card } from './ui/Card';

export function ObservationalCalendar() {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    // Use America/Sao_Paulo for initialization
    const spTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    return `${spTime.getFullYear()}-${(spTime.getMonth() + 1).toString().padStart(2, '0')}`;
  });

  const [data, setData] = useState<HistoricalDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Parse YYYY-MM
  const [yearStr, monthStr] = currentMonth.split('-');
  const year = parseInt(yearStr);
  const month = parseInt(monthStr); // 1-12

  // Today in SP timezone to restrict future navigation
  const now = new Date();
  const spNow = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const currentMaxMonth = `${spNow.getFullYear()}-${(spNow.getMonth() + 1).toString().padStart(2, '0')}`;

  // Earliest observational month (approximate launch date of the platform, say January 2026 for now, or don't restrict too much but keep it reasonable)

  useEffect(() => {
    async function fetchMonthData() {
      setLoading(true);
      try {
        const res = await fetch(`/api/history?month=${currentMonth}`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
        } else {
          setData([]);
        }
      } catch (e) {
        console.error("Failed to fetch calendar data", e);
        setData([]);
      } finally {
        setLoading(false);
      }
    }
    fetchMonthData();
  }, [currentMonth]);

  // Group data by day in America/Sao_Paulo timezone
  const dataByDay = useMemo(() => {
    const map = new Map<string, HistoricalDataPoint[]>();
    data.forEach(point => {
      const spDateStr = new Date(point.timestamp).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      // spDateStr is DD/MM/YYYY
      const parts = spDateStr.split('/');
      if (parts.length === 3) {
        const isoLocal = `${parts[2]}-${parts[1]}-${parts[0]}`; // YYYY-MM-DD
        if (!map.has(isoLocal)) {
          map.set(isoLocal, []);
        }
        map.get(isoLocal)!.push(point);
      }
    });
    return map;
  }, [data]);

  const handlePrevMonth = () => {
    let m = month - 1;
    let y = year;
    if (m < 1) {
      m = 12;
      y--;
    }
    setCurrentMonth(`${y}-${m.toString().padStart(2, '0')}`);
    setSelectedDate(null);
  };

  const handleNextMonth = () => {
    if (currentMonth >= currentMaxMonth) return;
    let m = month + 1;
    let y = year;
    if (m > 12) {
      m = 1;
      y++;
    }
    setCurrentMonth(`${y}-${m.toString().padStart(2, '0')}`);
    setSelectedDate(null);
  };

  // Generate calendar grid
  const calendarDays = useMemo(() => {
    // 1st of the month in local conceptual time
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay(); // 0 is Sunday

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  }, [year, month]);

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const selectedDateData = selectedDate ? dataByDay.get(selectedDate) || [] : [];
  
  // Create readable date for details view
  let selectedDateReadable = "";
  if (selectedDate) {
    const [y, m, d] = selectedDate.split('-');
    selectedDateReadable = `${parseInt(d)} de ${monthNames[parseInt(m) - 1].toLowerCase()} de ${y}`;
  }

  return (
    <div className="mt-16 mb-8">
      <h2 className="text-xl font-medium tracking-wide text-text-main border-b border-border pb-2 mb-6">
        ARQUIVO OBSERVACIONAL
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card className="p-4">
            <div className="flex justify-between items-center mb-6">
              <button 
                onClick={handlePrevMonth}
                className="px-3 py-1 bg-surface-hover hover:bg-border rounded text-text-main transition-colors"
                aria-label="Mês anterior"
              >
                ←
              </button>
              <div className="text-lg font-medium text-text-main">
                {monthNames[month - 1]} {year}
              </div>
              <button 
                onClick={handleNextMonth}
                disabled={currentMonth >= currentMaxMonth}
                className={`px-3 py-1 rounded transition-colors ${currentMonth >= currentMaxMonth ? 'text-text-muted cursor-not-allowed opacity-50' : 'bg-surface-hover hover:bg-border text-text-main'}`}
                aria-label="Mês seguinte"
              >
                →
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                <div key={i} className="text-center text-xs font-semibold text-text-muted py-2">
                  {d}
                </div>
              ))}
            </div>

            {loading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1 md:gap-2">
                {calendarDays.map((day, idx) => {
                  if (!day) return <div key={`empty-${idx}`} className="h-14 md:h-16" />;
                  
                  const isoDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                  const obsCount = dataByDay.has(isoDate) ? dataByDay.get(isoDate)!.length : 0;
                  const isSelected = selectedDate === isoDate;
                  
                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDate(isoDate)}
                      aria-label={`${day} de ${monthNames[month - 1]} de ${year} — ${obsCount} observação`}
                      className={`relative flex flex-col items-center justify-center h-14 md:h-16 rounded border transition-colors ${
                        isSelected 
                          ? 'border-primary bg-primary/10 text-primary' 
                          : obsCount > 0 
                            ? 'border-border bg-surface hover:border-text-muted text-text-main' 
                            : 'border-transparent bg-surface/30 text-text-muted hover:bg-surface'
                      }`}
                    >
                      <span className="text-sm font-medium">{day}</span>
                      {obsCount > 0 && (
                        <span className="text-[10px] mt-1 text-text-muted flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-text-muted inline-block"></span>
                          {obsCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="p-5 h-full flex flex-col min-h-[400px]">
            {selectedDate ? (
              <>
                <h3 className="text-lg font-medium text-text-main mb-4 pb-2 border-b border-border">
                  {selectedDateReadable}
                </h3>
                
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  {selectedDateData.length > 0 ? (
                    <div className="space-y-6">
                      {selectedDateData.map((obs, i) => {
                        const timeStr = new Date(obs.timestamp).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
                        return (
                          <div key={i} className="bg-surface-hover/30 rounded p-4 border border-border/50">
                            <div className="text-xl font-light text-primary mb-3">{timeStr}</div>
                            
                            <div className="space-y-1 mb-4">
                              <div className="flex justify-between text-sm">
                                <span className="text-text-muted">F1</span>
                                <span className="font-medium text-text-main">{obs.f1?.toFixed(2) || '--'} Hz</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-text-muted">F2</span>
                                <span className="font-medium text-text-main">{obs.f2?.toFixed(2) || '--'} Hz</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-text-muted">F3</span>
                                <span className="font-medium text-text-main">{obs.f3?.toFixed(2) || '--'} Hz</span>
                              </div>
                            </div>
                            
                            <div className="pt-3 border-t border-border/50 text-xs text-text-muted space-y-1">
                              <div><span className="uppercase tracking-widest text-[9px] mr-2">Qualidade:</span> {obs.quality}</div>
                              <div><span className="uppercase tracking-widest text-[9px] mr-2">Fonte:</span> Dataset JSON — Ressonância Schumann Hoje</div>
                              {obs.derivedFromImage && (
                                <div className="mt-2 text-primary font-medium">Dado derivado de espectrograma</div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-center text-text-muted text-sm px-4">
                      Nenhuma observação Schumann disponível nesta data.
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-center text-text-muted text-sm px-4">
                Selecione um dia no calendário para visualizar as observações.
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
