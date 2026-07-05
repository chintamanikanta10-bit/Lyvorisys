import React, { useState, useEffect } from 'react';
import { Bell, X, Trash2, Loader2 } from 'lucide-react';
import { getAuthHeaders } from '../auth';
import { API_BASE } from '../config';

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newAlert, setNewAlert] = useState(false);
  const [seenIds, setSeenIds] = useState(new Set());
  const [isDeleting, setIsDeleting] = useState(null);

  const fetchNotifications = async () => {
    try {
      const response = await fetch(`${API_BASE}/notifications/pending`, { headers: getAuthHeaders() });
      if (response.ok) {
        const data = await response.json();
        const fresh = data.notifications || [];

        // Find if there are any actually NEW IDs we haven't seen in this session
        const freshIds = fresh.map(n => n.id);
        const hasNewId = freshIds.some(id => !seenIds.has(id));

        if (hasNewId && seenIds.size > 0) {
          setNewAlert(true);
          setTimeout(() => setNewAlert(false), 5000);
        }

        // Update seen IDs
        setSeenIds(prev => {
          const next = new Set(prev);
          freshIds.forEach(id => next.add(id));
          return next;
        });

        setNotifications(fresh);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000); // Slightly more frequent (20s)
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.length;

  const handleDelete = async (e, id) => {
    e.stopPropagation(); // Don't trigger any other clicks
    try {
      setIsDeleting(id);
      const response = await fetch(`${API_BASE}/objections/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        setNotifications(notifications.filter(notif => notif.id !== id));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="relative">
      {/* Notification Bell Button */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full transition"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 rounded-xl bg-white border border-slate-200 shadow-xl z-50">
          <div className="p-4 border-b border-slate-200 flex justify-between items-center">
            <h3 className="font-semibold text-slate-700">Notifications</h3>
            <button
              onClick={() => setShowDropdown(false)}
              className="text-slate-500 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-slate-500 text-sm">
                Loading...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-slate-500 text-sm">
                No new notifications
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className="p-4 hover:bg-slate-50 transition cursor-pointer border-l-4 border-red-500"
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1">
                        <div className="font-medium text-slate-900 text-sm">
                          {notif.message}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {notif.subject}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          {new Date(notif.objection_date).toLocaleDateString()}
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleDelete(e, notif.id)}
                        disabled={isDeleting === notif.id}
                        className="text-slate-400 hover:text-red-500 transition-colors p-1"
                        title="Delete notification"
                      >
                        {isDeleting === notif.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="p-3 border-t border-slate-200 text-center">
              <a
                href="/objections"
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                View All Objections
              </a>
            </div>
          )}
        </div>
      )}

      {/* New Notification 'Pop' Alert */}
      {newAlert && (
        <div className="fixed bottom-4 right-4 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl z-[100] animate-bounce flex items-center gap-3 border border-slate-700">
          <div className="bg-red-500 p-2 rounded-full">
            <Bell className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="font-bold">New Objection!</div>
            <div className="text-sm text-slate-300">A new reply has been received.</div>
          </div>
          <button onClick={() => setNewAlert(false)} className="ml-2 hover:text-slate-400">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
