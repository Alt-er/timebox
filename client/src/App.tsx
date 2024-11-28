import './App.css'
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home'
import Settings from './pages/Settings'
import Login from './pages/Login';

function App() {
  // console.info(process.env.VITE_PUBLIC)
  return (
    <Router>
      <div className='App'>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/settings" element={<Settings />} />
          {/* 可以添加更多的路由 */}
        </Routes>
      </div>
    </Router>
  );
}

export default App