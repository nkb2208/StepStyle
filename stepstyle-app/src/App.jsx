import Login from './Login';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import Register from './Register'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path='/' element= {<Navigate to = ""/>}/>
        <Route path="/login" element={<Login/>} />
        <Route path="/register" element={<Register />} />

      </Routes>
    </BrowserRouter>

  );
}