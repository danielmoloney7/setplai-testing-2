
import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { User, UserRole, Program, SessionLog, Drill, Squad, Notification, ProgramStatus, ConsultationLog, ConsultationResult, ProgramSession } from '../../types';
import { MOCK_USERS, MOCK_DRILLS, MOCK_SQUADS, MOCK_NOTIFICATIONS, CONSULTATION_DRILLS } from '../../constants';

import LoginScreen from '../screens/auth/LoginScreen';
import OnboardingFlow from '../screens/auth/OnboardingFlow';
import CoachDashboard from '../screens/coach/CoachDashboard';
import PlayerDashboard from '../screens/player/PlayerDashboard';
import DrillLibrary from '../screens/shared/DrillLibrary';
import CoachAthletesView from '../screens/coach/CoachAthletesView';
import PlayerDetailView from '../screens/coach/PlayerDetailView';
import SquadDetailView from '../screens/coach/SquadDetailView';
import CoachCreationMenu from '../screens/coach/CoachCreationMenu';
import ProgramCreator from '../screens/shared/ProgramCreator/ProgramCreator';
import ProgramDetailView from '../screens/player/ProgramDetailView';
import SessionView from '../screens/player/SessionView';
import PlayerProgressView from '../screens/player/PlayerProgressView';
import CoachAllProgramsView from '../screens/coach/CoachAllProgramsView';
import AccountView from '../screens/shared/AccountView';
import ConsultationView from '../screens/player/ConsultationView';
import NotificationsView from '../screens/player/NotificationsView';
import PlayerProgramsView from '../screens/player/PlayerProgramsView';
import BottomNav from './BottomNav';
import SessionLogDetailView from '../screens/coach/SessionLogDetailView';

const AppRouter: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [isOnboarding, setIsOnboarding] = useState(false);
  
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [drills, setDrills] = useState<Drill[]>(MOCK_DRILLS);
  const [squads, setSquads] = useState<Squad[]>(MOCK_SQUADS);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [sessions, setSessions] = useState<SessionLog[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const [consultationLogs, setConsultationLogs] = useState<ConsultationLog[]>([]);
  const [suggestedProgram, setSuggestedProgram] = useState<Partial<Program> | null>(null);

  const handleAddDrill = (d: Drill) => setDrills([...drills, d]);
  
  const handleUpdateDrill = (updatedDrill: Drill) => {
    setDrills(prevDrills => prevDrills.map(d => d.id === updatedDrill.id ? updatedDrill : d));
  };

  const handleCreateSquad = (name: string, members: string[], level: string) => {
      if (!user) return;
      const newSquad: Squad = {
          id: Math.random().toString(36).substr(2, 9),
          name,
          coachId: user.id,
          memberIds: members,
          level: level as any
      };
      setSquads([...squads, newSquad]);
  };
  
  const handleUpdateSquad = (id: string, name: string, members: string[], level: string) => {
      setSquads(squads.map(s => s.id === id ? { ...s, name, memberIds: members, level: level as any } : s));
  };
  
  const handleDeleteSquad = (id: string) => {
      setSquads(squads.filter(s => s.id !== id));
  };
  
  const handleUpdateUser = (updatedUser: User) => {
    setUser(updatedUser);
    setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
  };

  const handleConsultationComplete = (results: ConsultationResult[]) => {
    if (!user) return;
    const totalScore = results.reduce((acc, r) => acc + r.score, 0);
    const maxScore = results.reduce((acc, r) => acc + r.target, 0);
    const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
    
    let calculatedLevel: 'Beginner' | 'Intermediate' | 'Advanced' = 'Beginner';
    if (percentage > 75) {
        calculatedLevel = 'Advanced';
    } else if (percentage >= 40) {
        calculatedLevel = 'Intermediate';
    }

    const newLog: ConsultationLog = {
        id: `clog_${Date.now()}`,
        playerId: user.id,
        dateCompleted: new Date().toISOString(),
        results,
        totalScore,
        calculatedLevel
    };

    setConsultationLogs(prev => [...prev, newLog]);
    const updatedUser = { ...user, level: calculatedLevel };
    handleUpdateUser(updatedUser);
  };

    const handleSaveProgram = (programData: Partial<Program>, recipients: string[]) => {
        if (!user) return;
        setSuggestedProgram(null);
        if (user.role === UserRole.PLAYER) {
            const newProgram: Program = {
                ...programData,
                id: Math.random().toString(36).substr(2, 9),
                assignedBy: 'SELF',
                assignedTo: user.id,
                createdAt: new Date().toISOString(),
                completed: false,
                status: ProgramStatus.ACCEPTED,
                isTemplate: false,
                sessions: programData.sessions?.map(s => ({ ...s, id: Math.random().toString(36).substr(2, 9), completed: false })) || []
            } as Program;
            setPrograms(prev => [...prev, newProgram]);
            return;
        }

        if (recipients.length > 0) {
            const newPrograms: Program[] = [];
            recipients.forEach(rId => {
                const isSquad = squads.some(s => s.id === rId);
                if (isSquad) {
                     newPrograms.push({
                        ...programData,
                        id: Math.random().toString(36).substr(2, 9),
                        assignedBy: user.id,
                        assignedTo: rId,
                        createdAt: new Date().toISOString(),
                        completed: false,
                        status: ProgramStatus.ACCEPTED,
                        isTemplate: false,
                        sessions: programData.sessions?.map(s => ({ ...s, id: Math.random().toString(36).substr(2, 9), completed: false })) || []
                    } as Program);
                } else {
                    newPrograms.push({
                        ...programData,
                        id: Math.random().toString(36).substr(2, 9),
                        assignedBy: user.id,
                        assignedTo: rId,
                        createdAt: new Date().toISOString(),
                        completed: false,
                        status: ProgramStatus.PENDING,
                        isTemplate: false,
                        sessions: programData.sessions?.map(s => ({ ...s, id: Math.random().toString(36).substr(2, 9), completed: false })) || []
                    } as Program);
                }
            });
            setPrograms(prev => [...prev, ...newPrograms]);
        } else {
            const newTemplate: Program = {
                ...programData,
                id: Math.random().toString(36).substr(2, 9),
                assignedBy: user.id,
                assignedTo: '',
                createdAt: new Date().toISOString(),
                completed: false,
                status: ProgramStatus.ARCHIVED,
                isTemplate: true,
                sessions: programData.sessions?.map(s => ({ ...s, id: Math.random().toString(36).substr(2, 9), completed: false })) || []
            } as Program;
            setPrograms(prev => [...prev, newTemplate]);
        }
    };

    const handleUpdateSquadSession = (programId: string, oldSessionId: string, newSession: ProgramSession) => {
        setPrograms(currentPrograms => 
            currentPrograms.map(prog => {
                if (prog.id === programId) {
                    return {
                        ...prog,
                        sessions: prog.sessions.map(ses => 
                            ses.id === oldSessionId 
                                ? { ...newSession, id: oldSessionId } 
                                : ses
                        )
                    };
                }
                return prog;
            })
        );
    };

  const handleAddProgram = (template: Partial<Program>): Program => {
      if (!user) throw new Error("User not found");
      const newProgram: Program = {
          ...template,
          id: template.id || Math.random().toString(36).substr(2, 9),
          assignedBy: 'SELF',
          assignedTo: user.id,
          createdAt: new Date().toISOString(),
          completed: false,
          status: ProgramStatus.ACCEPTED,
          isQuickStart: template.isQuickStart || false,
          sessions: template.sessions?.map(s => ({...s, id: s.id || Math.random().toString(36).substr(2, 9), completed: false})) || []
      } as Program;
      setPrograms(prev => [...prev, newProgram]);
      setSuggestedProgram(null);
      return newProgram;
  };

  const handleSessionComplete = (log: SessionLog, isProgression: boolean, isQuick: boolean): boolean => {
      setSessions(prev => [...prev, log]);

      let isProgramNowComplete = false;

      if (log.programId) {
          const programToUpdate = programs.find(p => p.id === log.programId);
          
          if (programToUpdate) {
              const otherSessionsCompleted = programToUpdate.sessions
                  .filter(s => s.id !== log.sessionId)
                  .every(s => s.completed);
              
              if (otherSessionsCompleted) {
                   isProgramNowComplete = true;
              }
          }
          
          setPrograms(prevPrograms => {
              return prevPrograms.map(p => {
                  if (p.id === log.programId) {
                      const updatedSessions = p.sessions.map(s => s.id === log.sessionId ? { ...s, completed: true, dateCompleted: new Date().toISOString() } : s);
                      const allCompleted = updatedSessions.every(s => s.completed);
                      return { ...p, sessions: updatedSessions, completed: allCompleted };
                  }
                  return p;
              });
          });
      }

      if (user) {
          const newXp = (user.xp || 0) + (log.durationMin * 10);
          const updatedUser = { ...user, xp: newXp };
          setUser(updatedUser);
          setUsers(users.map(u => u.id === user.id ? updatedUser : u));
      }
      
      return isProgramNowComplete;
  };

  const handleRespondProgram = (id: string, accept: boolean) => {
      setPrograms(programs.map(p => p.id === id ? { ...p, status: accept ? ProgramStatus.ACCEPTED : ProgramStatus.REJECTED } : p));
  };

  const handleStartQuickPlan = (template: Partial<Program>): Program => {
      return handleAddProgram(template);
  };

  const handleLogout = () => {
      setUser(null);
      setDrills(MOCK_DRILLS);
      navigate('/');
  };

  const handleLogin = (u: User) => {
    setUser(u);
    setDrills(MOCK_DRILLS);
    navigate('/');
  };
  
  const handleOnboardingComplete = (u: User) => {
    setUsers([...users, u]); 
    setUser(u); 
    setIsOnboarding(false); 
    navigate('/');
  }

  const isFlowActive = location.pathname.includes('/session/') || location.pathname.startsWith('/create-program') || location.pathname.startsWith('/consultation');

  if (!user && !isOnboarding) {
      return <LoginScreen users={users} onLogin={handleLogin} onStartOnboarding={() => setIsOnboarding(true)} />;
  }

  if (isOnboarding) {
      return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  return (
      <div className="max-w-7xl mx-auto bg-brand-dark min-h-screen shadow-2xl relative">
         <Routes>
            <Route path="/" element={
                user?.role === UserRole.COACH 
                ? <CoachDashboard user={user} users={users} programs={programs} squads={squads} sessions={sessions} setSQUADS={setSquads} />
                : <PlayerDashboard user={user!} programs={programs} sessions={sessions} drills={drills} notifications={notifications} consultationLogs={consultationLogs} onRespondProgram={handleRespondProgram} onStartQuickPlan={handleStartQuickPlan} suggestedProgram={suggestedProgram} setSuggestedProgram={setSuggestedProgram} />
            } />
            
            <Route path="/drills" element={<DrillLibrary drills={drills} onAddDrill={handleAddDrill} user={user!} onUpdateDrill={handleUpdateDrill} />} />
            
            <Route path="/athletes" element={
                <CoachAthletesView user={user!} users={users} squads={squads} onCreateSquad={handleCreateSquad} />
            } />
            
            <Route path="/player/:playerId" element={
                <PlayerDetailView currentUser={user!} users={users} programs={programs} sessions={sessions} />
            } />
            
            <Route path="/squad/:squadId" element={
                <SquadDetailView currentUser={user!} squads={squads} users={users} programs={programs} sessions={sessions} onUpdateSquad={handleUpdateSquad} onDeleteSquad={handleDeleteSquad} onUpdateSquadSession={handleUpdateSquadSession} />
            } />

            <Route path="/coach/create" element={<CoachCreationMenu />} />
            
            <Route path="/create-program" element={
                <ProgramCreator user={user!} users={users} squads={squads} drills={drills} onSave={handleSaveProgram} programs={programs} />
            } />
            
            <Route path="/program/:programId" element={
                <ProgramDetailView programs={programs} sessions={sessions} onLeaveProgram={(p) => setPrograms(programs.filter(pr => pr.id !== p.id))} />
            } />
            
            <Route path="/session/:programId/:sessionId" element={
                <SessionView user={user!} programs={programs} sessions={sessions} onComplete={handleSessionComplete} />
            } />
            
            <Route path="/progress" element={
                <PlayerProgressView user={user!} sessions={sessions} consultationLogs={consultationLogs} />
            } />
            
            <Route path="/programs" element={
                 <CoachAllProgramsView user={user!} programs={programs} users={users} />
            } />

            <Route path="/profile" element={
                <AccountView user={user!} onLogout={handleLogout} onUpdateUser={handleUpdateUser} />
            } />

            <Route path="/consultation" element={
                <ConsultationView onComplete={handleConsultationComplete} />
            } />
            
            <Route path="/notifications" element={
                <NotificationsView notifications={notifications}/>
            } />
            
            <Route path="/plans" element={<PlayerProgramsView user={user!} programs={programs} sessions={sessions} />} />

            <Route path="/session-log/:logId" element={
                <SessionLogDetailView users={users} programs={programs} sessions={sessions} drills={drills} />
            } />

            <Route path="*" element={<Navigate to="/" replace />} />
         </Routes>

         {!isFlowActive && user && <BottomNav user={user} />}
      </div>
  );
};

export default AppRouter;
