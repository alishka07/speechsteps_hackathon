import React from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Sparkles, ChevronRight } from 'lucide-react';
import { Ionicons } from './Icon';

type Section = 'therapist' | 'parent' | 'clinic';
const menus: Record<Section, { title: string; path: string; icon: string }[]> = {
  therapist: [{title:'Дети',path:'/therapist/clients',icon:'people'},{title:'Конструктор',path:'/therapist/builder',icon:'sparkles'},{title:'Библиотека',path:'/therapist/library',icon:'book'},{title:'Профиль',path:'/therapist/profile',icon:'person'}],
  parent: [{title:'Прогресс',path:'/parent/progress',icon:'trending-up'},{title:'Задания',path:'/parent/tasks',icon:'checkmark-done'},{title:'Отчёты',path:'/parent/reports',icon:'document-text-outline'},{title:'Профиль',path:'/parent/profile',icon:'person'}],
  clinic: [{title:'Обзор',path:'/clinic/overview',icon:'grid'},{title:'Команда',path:'/clinic/team',icon:'people'},{title:'Клиенты',path:'/clinic/clients',icon:'folder-open'},{title:'Расписание',path:'/clinic/schedule',icon:'calendar'},{title:'Настройки',path:'/clinic/settings',icon:'business'}],
};
const sectionNames: Record<Section,string> = {therapist:'Кабинет логопеда',parent:'Кабинет родителя',clinic:'Кабинет клиники'};
export function RoleLayout({ section }: { section: Section }) {
  const location=useLocation();
  const page=menus[section].find((item)=>item.path===location.pathname)?.title??sectionNames[section];
  return <div className={`app-frame ${section}`}>
    <aside className="sidebar">
      <Link to="/" className="brand"><span className="brand-mark"><Sparkles size={19}/></span><span>SpeechSteps<small>речь растёт шаг за шагом</small></span></Link>
      <div className="side-caption">{sectionNames[section]}</div>
      <nav className="side-nav">{menus[section].map((item)=><NavLink key={item.path} to={item.path} className={({isActive})=>`nav-link${isActive?' active':''}`}><Ionicons name={item.icon} size={19}/><span>{item.title}</span><ChevronRight className="nav-chevron" size={15}/></NavLink>)}</nav>
      <div className="side-bottom"><div className="support-card"><div className="support-icon">✦</div><b>Маленькие шаги — большой прогресс</b><span>Продолжайте заниматься в комфортном ритме.</span></div><Link to="/" className="back-link"><Ionicons name="arrow-back" size={16}/> Выбор роли</Link></div>
    </aside>
    <main className="main-column"><header className="topbar"><div><span className="eyebrow">SPEECHSTEPS</span><h1>{page}</h1></div><div className="topbar-right"><span className="online-dot"/>Все данные сохранены</div></header><div className="page-content"><Outlet/></div></main>
    <nav className="mobile-nav">{menus[section].map((item)=><NavLink key={item.path} to={item.path} className={({isActive})=>isActive?'selected':''}><Ionicons name={item.icon} size={19}/><span>{item.title}</span></NavLink>)}</nav>
  </div>;
}
