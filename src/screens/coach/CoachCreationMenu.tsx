
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, Users, Calendar, Grid, ChevronLeft } from 'lucide-react';

const CoachCreationMenu: React.FC = () => {
    const navigate = useNavigate();
    const menuItems = [
        { id: 'drill', title: 'New Drill', icon: Dumbbell, path: '/drills', desc: 'Add a drill to library', openModal: true },
        { id: 'squad', title: 'New Squad', icon: Users, path: '/athletes', desc: 'Create a training group', openModal: true },
        { id: 'program', title: 'New Program', icon: Calendar, path: '/create-program', desc: 'Build a training plan' },
        { id: 'squad_program', title: 'Squad Program', icon: Grid, path: '/create-program', desc: 'Plan for specific numbers & courts' },
    ];

    const handleNavigate = (item: typeof menuItems[0]) => {
        if (item.openModal) {
            navigate(item.path, { state: { openCreateModal: true } });
        } else {
            const navState = {
                squad: item.id === 'squad_program',
            };
            navigate(item.path, { state: navState });
        }
    };

    return (
        <div className="p-6 pb-24 min-h-screen bg-brand-dark">
            <header className="flex items-center gap-4 mb-8">
                 <button onClick={() => navigate(-1)}><ChevronLeft className="text-slate-400" /></button>
                 <h1 className="text-xl font-bold text-white">Create New</h1>
            </header>
            <div className="grid sm:grid-cols-2 gap-4">
                {menuItems.map((item) => (
                    <div key={item.id} onClick={() => handleNavigate(item)} className="bg-brand-surface p-6 rounded-2xl border border-slate-700 flex flex-col items-start gap-4 cursor-pointer hover:border-brand-primary transition-all">
                        <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-brand-primary">
                            <item.icon size={24} />
                        </div>
                        <div className="text-left">
                            <h3 className="font-bold text-lg text-white">{item.title}</h3>
                            <p className="text-sm text-slate-400">{item.desc}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CoachCreationMenu;
