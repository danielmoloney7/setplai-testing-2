import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Notification } from '../../types';
import { ChevronLeft } from 'lucide-react';

interface NotificationsViewProps {
  notifications: Notification[];
}

const NotificationsView: React.FC<NotificationsViewProps> = ({ notifications }) => {
  const navigate = useNavigate();

  return (
    <div className="p-6 text-white min-h-screen bg-brand-dark">
        <div className="flex items-center gap-4 mb-6">
            <button onClick={() => navigate(-1)}><ChevronLeft/></button>
            <h1 className="text-xl font-bold">Notifications</h1>
        </div>
        <div className="space-y-4">
            {notifications.length === 0 && <p className="text-slate-500">No notifications.</p>}
            {notifications.map(n => (
                <div key={n.id} className="p-4 bg-brand-surface border border-slate-700 rounded-xl">
                    <h3 className="font-bold text-white">{n.title}</h3>
                    <p className="text-sm text-slate-400">{n.message}</p>
                </div>
            ))}
        </div>
    </div>
  );
};

export default NotificationsView;