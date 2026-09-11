import Login from './Login';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import Register from './Register'
import HomePage from './pages/HomePage';
import ProductPage from './pages/ProductPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path='/' element= {<Navigate to = "/home"/>}/>
        <Route path="/login" element={<Login/>} />
        <Route path='/home' element= {<HomePage/>}/>
        <Route path="/register" element={<Register />} />
        <Route path="/product/*" element= {<ProductPage/>}/>

      </Routes>
    </BrowserRouter>

  );
}