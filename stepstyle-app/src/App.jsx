import Login from './pages/Login';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import Register from './pages/Register'
import HomePage from './pages/HomePage';
import ProductPage from './pages/ProductPage';
import Cart from './pages/Cart';
import Profile from './pages/Profile';
import Order from './pages/Order';
import CheckOut from './pages/Checkout';

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
        <Route path='/profile' element= {<Profile/>}/>
        <Route path='/order' element={<Order/>}/>
        <Route path='/checkout' element= {<CheckOut/>}/>
      </Routes>
    </BrowserRouter>

  );
}