import Login from './pages/Login';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import Register from './pages/Register'
import HomePage from './pages/HomePage';
import ProductPage from './pages/ProductPage';
import Cart from './pages/Cart';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path='/' element= {<Navigate to = "/home"/>}/>
        <Route path="/login" element={<Login/>} />
        <Route path='/home' element= {<HomePage/>}/>
        <Route path="/register" element={<Register />} />
        <Route path="/product/*" element= {<ProductPage/>}/>
        <Route path='/cart' element= {<Cart/>}/>
      </Routes>
    </BrowserRouter>

  );
}