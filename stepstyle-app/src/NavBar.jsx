import { useState } from 'react';
import {Link } from 'react-router-dom';
function NavBar(){

    const [switchPage, setSwitchPage] = useState('home');

    return(
        <div className='border border-b border-gray-300'>
            <div className="flex items-center justify-center text-white w-full bg-orange-400 text-xs p-2">
                <p className="flex items-center gap-3">
                    <svg xmlns="http://w3.org" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                        <path d="M3 3h11v10h-11v-10zm13 3h4l3 3v4h-7v-7zm-13 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm13 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/>
                    </svg>
                    Miễn phí vận chuyển cho đơn hàng trên 500.000đ | Đổi trả trong 30 ngày
                </p>
            </div>

            <div className="flex items-center justify-between p-3">
                <Link to='/home' className="flex items-center gap-3">
                    {/* Logo */}
                    <div className="flex items-center justify-center rounded-xl bg-orange-400 w-10 h-10">
                        <p className="text-white text-2xl font-bold">S</p>
                    </div>
                    {/* Project name */}
                    <p className="text-3xl font-bold">Step<span className="text-orange-400">Style</span></p>
                </Link>

                <div className='flex gap-3 font-bold'>
                    <Link to='/home' onClick={()=> setSwitchPage('home')} className={switchPage === 'home'?'text-orange-400 p-3':'p-3'}>Trang chủ</Link>
                    <Link to='/product' onClick={()=> setSwitchPage('product')} className={switchPage === 'product'?'text-orange-400 p-3':'p-3'}>Sản phẩm</Link>
                </div>

                <div className='flex items-center gap-4'>
                    <Link to="/cart">
                        <svg xmlns="http://w3.org" className='w-15 h-15' width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M0 1.5A.5.5 0 0 1 .5 1H2a.5.5 0 0 1 .485.379L2.89 3H14.5a.5.5 0 0 1 .491.592l-1.5 8A.5.5 0 0 1 13 12H4a.5.5 0 0 1-.491-.408L2.01 3.607 1.61 2H.5a.5.5 0 0 1-.5-.5zM3.102 4l1.313 7h8.17l1.313-7H3.102zM5 12a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm7 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-7 1a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm7 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
                        </svg>                
                    </Link>

                    <button className='flex items-center gap-2'>
                        <div className='font-bold text-orange-400 flex items-center justify-center w-8 h-8 rounded-full bg-orange-100'>
                            L
                        </div>

                        <p>Mua</p>

                        <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M7 10l5 5 5-5z" fill="currentColor"/>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}

export default NavBar;