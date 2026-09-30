import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { RoleLayout } from './layouts';
import { SafeAreaProvider, ActivityIndicator } from './ui';

const RoleSelect=lazy(()=>import('../app/index'));
const TherapistLogin=lazy(()=>import('../app/therapist-login'));
const TherapistClients=lazy(()=>import('../app/(tabs)/index'));
const TherapistBuilder=lazy(()=>import('../app/(tabs)/builder'));
const TherapistLibrary=lazy(()=>import('../app/(tabs)/library'));
const TherapistProfile=lazy(()=>import('../app/(tabs)/profile'));
const ParentProgress=lazy(()=>import('../app/(parent)/index'));
const ParentTasks=lazy(()=>import('../app/(parent)/tasks'));
const ParentReports=lazy(()=>import('../app/(parent)/reports'));
const ParentProfile=lazy(()=>import('../app/(parent)/profile'));
const ClinicOverview=lazy(()=>import('../app/(clinic)/index'));
const ClinicTeam=lazy(()=>import('../app/(clinic)/team'));
const ClinicClients=lazy(()=>import('../app/(clinic)/clients'));
const ClinicSchedule=lazy(()=>import('../app/(clinic)/schedule'));
const ClinicSettings=lazy(()=>import('../app/(clinic)/settings'));
const ChildAdd=lazy(()=>import('../app/child/add'));
const ChildDetails=lazy(()=>import('../app/child/[id]'));
const LessonDetails=lazy(()=>import('../app/lesson/[id]'));
const ExerciseNew=lazy(()=>import('../app/exercise/new'));
const ExerciseDetails=lazy(()=>import('../app/exercise/[id]'));
const ClinicClient=lazy(()=>import('../app/clinic-client/[id]'));
const Report=lazy(()=>import('../app/report/[id]'));
const ParentChat=lazy(()=>import('../app/parent-chat'));
const League=lazy(()=>import('../app/league'));
const HomePractice=lazy(()=>import('../app/home-practice'));
const ChildMode=lazy(()=>import('../app/child-mode.web'));
const PlayWorld=lazy(()=>import('../app/play-world.web'));
const PlaySoundmine=lazy(()=>import('../app/play-soundmine.web'));
const Loading=()=> <div className="loading-screen"><ActivityIndicator size="large"/><span>Загружаем SpeechSteps…</span></div>;
export default function App(){return <BrowserRouter><SafeAreaProvider><Suspense fallback={<Loading/>}><Routes>
  <Route path="/" element={<RoleSelect/>}/><Route path="/therapist-login" element={<TherapistLogin/>}/>
  <Route path="/therapist" element={<RoleLayout section="therapist"/>}><Route index element={<Navigate to="clients" replace/>}/><Route path="clients" element={<TherapistClients/>}/><Route path="builder" element={<TherapistBuilder/>}/><Route path="library" element={<TherapistLibrary/>}/><Route path="profile" element={<TherapistProfile/>}/></Route>
  <Route path="/parent" element={<RoleLayout section="parent"/>}><Route index element={<Navigate to="progress" replace/>}/><Route path="progress" element={<ParentProgress/>}/><Route path="tasks" element={<ParentTasks/>}/><Route path="reports" element={<ParentReports/>}/><Route path="profile" element={<ParentProfile/>}/></Route>
  <Route path="/clinic" element={<RoleLayout section="clinic"/>}><Route index element={<Navigate to="overview" replace/>}/><Route path="overview" element={<ClinicOverview/>}/><Route path="team" element={<ClinicTeam/>}/><Route path="clients" element={<ClinicClients/>}/><Route path="schedule" element={<ClinicSchedule/>}/><Route path="settings" element={<ClinicSettings/>}/></Route>
  <Route path="/child/add" element={<ChildAdd/>}/><Route path="/child/:id" element={<ChildDetails/>}/><Route path="/lesson/:id" element={<LessonDetails/>}/><Route path="/exercise/new" element={<ExerciseNew/>}/><Route path="/exercise/:id" element={<ExerciseDetails/>}/><Route path="/clinic-client/:id" element={<ClinicClient/>}/><Route path="/report/:id" element={<Report/>}/>
  <Route path="/parent-chat" element={<ParentChat/>}/><Route path="/league" element={<League/>}/><Route path="/home-practice" element={<HomePractice/>}/><Route path="/child-mode" element={<ChildMode/>}/><Route path="/play-world" element={<PlayWorld/>}/><Route path="/play-soundmine" element={<PlaySoundmine/>}/>
  <Route path="*" element={<Navigate to="/" replace/>}/>
</Routes></Suspense></SafeAreaProvider></BrowserRouter>}
