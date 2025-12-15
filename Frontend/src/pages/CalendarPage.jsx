import { useState, useEffect, useMemo } from 'react'
import { Calendar, dateFnsLocalizer } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay, addMonths, subMonths } from 'date-fns'
import { vi } from 'date-fns/locale'
import { calendarAPI } from '../api'
import { useAuth } from '../context/AuthContext'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Palmtree, ClipboardList, Cake } from 'lucide-react'
import 'react-big-calendar/lib/css/react-big-calendar.css'

const locales = { 'vi': vi }

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
    getDay,
    locales,
})

const EVENT_TYPES = {
    leave: { label: 'Nghỉ phép', icon: Palmtree, color: 'bg-green-500' },
    task: { label: 'Công việc', icon: ClipboardList, color: 'bg-blue-500' },
    birthday: { label: 'Sinh nhật', icon: Cake, color: 'bg-pink-500' }
}

export default function CalendarPage() {
    const { user } = useAuth()
    const [events, setEvents] = useState([])
    const [loading, setLoading] = useState(true)
    const [currentDate, setCurrentDate] = useState(new Date())
    const [selectedEvent, setSelectedEvent] = useState(null)

    useEffect(() => {
        loadEvents()
    }, [currentDate])

    const loadEvents = async () => {
        setLoading(true)
        try {
            const month = currentDate.getMonth() + 1
            const year = currentDate.getFullYear()
            const res = await calendarAPI.getEvents(month, year)

            // Transform events for react-big-calendar
            const transformedEvents = res.data.map(event => ({
                ...event,
                start: new Date(event.start),
                end: new Date(event.end),
                allDay: event.allDay || true
            }))

            setEvents(transformedEvents)
        } catch (error) {
            console.error('Failed to load events:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleNavigate = (action) => {
        if (action === 'PREV') {
            setCurrentDate(subMonths(currentDate, 1))
        } else if (action === 'NEXT') {
            setCurrentDate(addMonths(currentDate, 1))
        } else if (action === 'TODAY') {
            setCurrentDate(new Date())
        }
    }

    const eventStyleGetter = (event) => {
        return {
            style: {
                backgroundColor: event.color || '#3b82f6',
                borderRadius: '6px',
                border: 'none',
                color: 'white',
                fontSize: '12px',
                padding: '2px 6px'
            }
        }
    }

    const CustomToolbar = () => (
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
                <button onClick={() => handleNavigate('PREV')} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
                    <ChevronLeft size={20} className="text-slate-600" />
                </button>
                <button onClick={() => handleNavigate('TODAY')} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-medium">
                    Hôm nay
                </button>
                <button onClick={() => handleNavigate('NEXT')} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
                    <ChevronRight size={20} className="text-slate-600" />
                </button>
            </div>

            <h2 className="text-xl font-semibold text-slate-800">
                {format(currentDate, 'MMMM yyyy', { locale: vi })}
            </h2>

            <div className="flex items-center gap-4">
                {Object.entries(EVENT_TYPES).map(([key, { label, color }]) => (
                    <div key={key} className="flex items-center gap-2 text-sm text-slate-600">
                        <span className={`w-3 h-3 rounded-full ${color}`}></span>
                        <span>{label}</span>
                    </div>
                ))}
            </div>
        </div>
    )

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <CalendarIcon size={28} className="text-blue-500" />
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Lịch tổng hợp</h1>
                        <p className="text-slate-500">Xem nghỉ phép, công việc, sinh nhật</p>
                    </div>
                </div>
            </div>

            {/* Calendar */}
            <div className="glass-card p-6">
                <CustomToolbar />

                {loading ? (
                    <div className="flex items-center justify-center h-96">
                        <div className="spinner"></div>
                    </div>
                ) : (
                    <div className="h-[600px]">
                        <Calendar
                            localizer={localizer}
                            events={events}
                            startAccessor="start"
                            endAccessor="end"
                            date={currentDate}
                            onNavigate={() => { }}
                            toolbar={false}
                            eventPropGetter={eventStyleGetter}
                            onSelectEvent={(event) => setSelectedEvent(event)}
                            messages={{
                                today: 'Hôm nay',
                                previous: 'Trước',
                                next: 'Sau',
                                month: 'Tháng',
                                week: 'Tuần',
                                day: 'Ngày',
                                noEventsInRange: 'Không có sự kiện trong khoảng thời gian này'
                            }}
                            views={['month']}
                            defaultView="month"
                        />
                    </div>
                )}
            </div>

            {/* Event Detail Modal */}
            {selectedEvent && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => setSelectedEvent(null)}>
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: selectedEvent.color }}>
                                {selectedEvent.type === 'leave' && <Palmtree size={20} className="text-white" />}
                                {selectedEvent.type === 'task' && <ClipboardList size={20} className="text-white" />}
                                {selectedEvent.type === 'birthday' && <Cake size={20} className="text-white" />}
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-slate-800">{selectedEvent.title}</h3>
                                <p className="text-sm text-slate-500">
                                    {format(selectedEvent.start, 'dd/MM/yyyy')}
                                    {selectedEvent.start.getTime() !== selectedEvent.end.getTime() &&
                                        ` - ${format(selectedEvent.end, 'dd/MM/yyyy')}`
                                    }
                                </p>
                            </div>
                        </div>

                        {selectedEvent.data && (
                            <div className="space-y-2 mb-4">
                                {selectedEvent.data.leave_type && (
                                    <p className="text-sm text-slate-600">Loại: <span className="font-medium">{selectedEvent.data.leave_type}</span></p>
                                )}
                                {selectedEvent.data.days && (
                                    <p className="text-sm text-slate-600">Số ngày: <span className="font-medium">{selectedEvent.data.days}</span></p>
                                )}
                                {selectedEvent.data.status && (
                                    <p className="text-sm text-slate-600">Trạng thái: <span className="font-medium">{selectedEvent.data.status}</span></p>
                                )}
                            </div>
                        )}

                        <button onClick={() => setSelectedEvent(null)} className="w-full btn-secondary">
                            Đóng
                        </button>
                    </div>
                </div>
            )}

            <style>{`
                .rbc-calendar {
                    font-family: inherit;
                }
                .rbc-header {
                    padding: 12px;
                    font-weight: 600;
                    color: #475569;
                    border-bottom: 1px solid #e2e8f0;
                    text-transform: capitalize;
                }
                .rbc-month-view {
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    overflow: hidden;
                }
                .rbc-day-bg {
                    background: white;
                }
                .rbc-day-bg + .rbc-day-bg {
                    border-left: 1px solid #e2e8f0;
                }
                .rbc-month-row + .rbc-month-row {
                    border-top: 1px solid #e2e8f0;
                }
                .rbc-off-range-bg {
                    background: #f8fafc;
                }
                .rbc-today {
                    background: #eff6ff !important;
                }
                .rbc-date-cell {
                    padding: 8px;
                    text-align: right;
                }
                .rbc-date-cell > a {
                    color: #64748b;
                    font-weight: 500;
                }
                .rbc-event {
                    padding: 4px 8px !important;
                }
                .rbc-show-more {
                    color: #3b82f6;
                    font-size: 12px;
                    font-weight: 500;
                }
            `}</style>
        </div>
    )
}
