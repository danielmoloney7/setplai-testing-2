import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Drill, DrillCategory, User, UserRole } from '../../types';
import { Button } from '../../components/Button';
import { DrillCard } from '../common/DrillCard';
import { Plus } from 'lucide-react';
import { DrillEditModal } from './DrillEditModal';

const DrillLibrary: React.FC<{ 
    drills: Drill[], 
    onAddDrill: (d: Drill) => void,
    user: User,
    onUpdateDrill: (d: Drill) => void,
}> = ({ drills, onAddDrill, user, onUpdateDrill }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [filter, setFilter] = useState<string>('ALL');
    const [showCreate, setShowCreate] = useState(false);
    const [editingDrill, setEditingDrill] = useState<Drill | null>(null);

    useEffect(() => {
        if (location.state?.openCreateModal) {
            setShowCreate(true);
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location, navigate]);
    
    const [newDrillName, setNewDrillName] = useState('');
    const [newDrillCategory, setNewDrillCategory] = useState<DrillCategory>(DrillCategory.FOREHAND);
    const [newDrillDesc, setNewDrillDesc] = useState('');

    const filteredDrills = filter === 'ALL' ? drills : drills.filter(d => d.category === filter);

    const handleCreate = () => {
        const newDrill: Drill = {
            id: Math.random().toString(36).substr(2, 9),
            name: newDrillName,
            category: newDrillCategory,
            description: newDrillDesc,
            difficulty: 'Intermediate',
            defaultDurationMin: 10
        };
        onAddDrill(newDrill);
        setShowCreate(false);
        setNewDrillName('');
        setNewDrillDesc('');
    };

    const handleCardClick = (drill: Drill) => {
        if (user.role === UserRole.COACH) {
            setEditingDrill(drill);
        }
    };

    return (
        <div className="min-h-screen bg-brand-dark text-white pb-24">
            <header className="bg-brand-surface p-4 border-b border-slate-700 sticky top-0 z-20 flex justify-between items-center">
                 <h1 className="text-xl font-bold text-slate-900">Drill Library</h1>
                 <Button size="sm" onClick={() => setShowCreate(true)}><Plus size={16} className="mr-1"/> New Drill</Button>
            </header>
            
            <div className="p-4 overflow-x-auto no-scrollbar flex gap-2 border-b border-slate-800">
                <button onClick={() => setFilter('ALL')} className={`px-4 py-2 rounded-full text-xs font-bold transition-colors ${filter === 'ALL' ? 'bg-brand-primary text-white' : 'bg-slate-800 text-slate-400'}`}>All</button>
                {(Object.values(DrillCategory) as string[]).map(cat => (
                    <button key={cat} onClick={() => setFilter(cat)} className={`px-4 py-2 rounded-full text-xs font-bold transition-colors whitespace-nowrap ${filter === cat ? 'bg-brand-primary text-white' : 'bg-slate-800 text-slate-400'}`}>{cat}</button>
                ))}
            </div>

            <main className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredDrills.map(drill => (
                    <DrillCard key={drill.id} drill={drill} onSelect={() => handleCardClick(drill)} />
                ))}
            </main>

            {showCreate && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6" onClick={() => setShowCreate(false)}>
                    <div className="bg-brand-surface w-full max-w-sm rounded-2xl p-6 border border-slate-700" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold">Create Custom Drill</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Name</label>
                                <input className="w-full p-2 rounded-lg bg-slate-800 border border-slate-700 text-white" value={newDrillName} onChange={e => setNewDrillName(e.target.value)} placeholder="Drill Name" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Category</label>
                                <select className="w-full p-2 rounded-lg bg-slate-800 border border-slate-700 text-white" value={newDrillCategory} onChange={e => setNewDrillCategory(e.target.value as DrillCategory)}>
                                    {(Object.values(DrillCategory) as string[]).map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Description</label>
                                <textarea className="w-full p-2 rounded-lg bg-slate-800 border border-slate-700 text-white" value={newDrillDesc} onChange={e => setNewDrillDesc(e.target.value)} placeholder="Instructions..." />
                            </div>
                            <Button fullWidth onClick={handleCreate} disabled={!newDrillName}>Add to Library</Button>
                        </div>
                    </div>
                </div>
            )}

            {editingDrill && (
                <DrillEditModal
                    isOpen={!!editingDrill}
                    onClose={() => setEditingDrill(null)}
                    drill={editingDrill}
                    onSave={(updatedDrill) => {
                        onUpdateDrill(updatedDrill);
                        setEditingDrill(null);
                    }}
                />
            )}
        </div>
    );
};

export default DrillLibrary;