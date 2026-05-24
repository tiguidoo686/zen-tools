import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import Transformateur from './tools/Transformateur'
import Masterclass from './tools/Masterclass'
import Apprentissage from './tools/Apprentissage'
import Translator from './tools/Translator'

const TOOLS = [
  { path: '/transformateur', icon: '✦', title: 'Transformateur de prompt', desc: 'Transforme tes idées en prompts parfaits pour Claude Code', color: '#534AB7' },
  { path: '/masterclass', icon: '🎓', title: 'Claude Max Masterclass', desc: 'Apprends à utiliser Claude Max à pleine capacité', color: '#7c3aed' },
  { path: '/apprentissage', icon: '📖', title: 'Apprendre le code', desc: 'Les bases du développement expliquées simplement', color: '#0891b2' },
  { path: '/translator', icon: '🔍', title: 'Claude Translator', desc: "Comprends ce que fait une commande — évalue les risques avant d'exécuter", color: '#059669' },
]

function Home() {
  const navigate = useNavigate()
  return (
    <div style={{ minHeight: '100vh', background: '#0d0d14', fontFamily: 'system-ui,sans-serif', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✦</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: 'white', margin: '0 0 8px' }}>Zen Tools</h1>
          <p style={{ fontSize: 15, color: '#7b6fa0', margin: 0 }}>Tes outils pour construire ZenAlpha</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {TOOLS.map(t => (
            <button key={t.path} onClick={() => navigate(t.path)}
              style={{ background: '#1a1a2e', border: '1px solid #2a2a40', borderRadius: 16, padding: '1.5rem', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 20, transition: 'border-color .15s' }}
              onMouseOver={e => e.currentTarget.style.borderColor = t.color}
              onMouseOut={e => e.currentTarget.style.borderColor = '#2a2a40'}>
              <div style={{ width: 52, height: 52, borderRadius: 12, background: t.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>{t.icon}</div>
              <div>
                <p style={{ fontSize: 16, fontWeight: 700, color: 'white', margin: '0 0 4px' }}>{t.title}</p>
                <p style={{ fontSize: 13, color: '#7b6fa0', margin: 0 }}>{t.desc}</p>
              </div>
              <span style={{ marginLeft: 'auto', color: '#3a3a5a', fontSize: 20 }}>→</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function Layout({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const tool = TOOLS.find(t => t.path === location.pathname)
  return (
    <div style={{ minHeight: '100vh', background: '#f5f4ff', fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ background: '#534AB7', padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate('/')}
          style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
          ← Accueil
        </button>
        <span style={{ fontSize: 15, fontWeight: 700, color: 'white' }}>{tool?.title || ''}</span>
      </div>
      {children}
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/transformateur" element={<Layout><Transformateur /></Layout>} />
      <Route path="/masterclass" element={<Layout><Masterclass /></Layout>} />
      <Route path="/apprentissage" element={<Layout><Apprentissage /></Layout>} />
      <Route path="/translator" element={<Layout><Translator /></Layout>} />
    </Routes>
  )
}
