import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const readAuthState = () => {
    const token = localStorage.getItem('token');
    if (!token) {
        return { isLoggedIn: false, user: null };
    }
    try {
        const rawUser = localStorage.getItem('user');
        return { isLoggedIn: true, user: rawUser ? JSON.parse(rawUser) : null };
    } catch {
        return { isLoggedIn: true, user: null };
    }
};

function NavBar(){
    const location = useLocation();
    const navigate = useNavigate();
    const currentPath = location.pathname;
    const isProduct = currentPath.startsWith('/product');
    const isHome = currentPath === '/home' || currentPath === '/';

    const [isOpen, setIsOpen] = useState(false);
    const [authState, setAuthState] = useState(readAuthState);

    useEffect(() => {
        setAuthState(readAuthState());
    }, [location.pathname]);

    const handleDropDownMenu = ()=>{
        setIsOpen((prev) => !prev);
    }

    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = ()=>{
        const token = localStorage.getItem("token");
        if(!token){
            return;
        }
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
        setIsOpen(false);
        setAuthState({ isLoggedIn: false, user: null });
        navigate('/home');
    }

    const displayName =
        authState.user?.name?.trim() ||
        authState.user?.ho_ten?.trim() ||
        authState.user?.email?.split('@')[0] ||
        'Tài khoản';
    const avatarLetter = displayName.charAt(0).toUpperCase();


    return(
        <div ref={dropdownRef} className='border border-b border-gray-300 bg-white'>
            <div className="flex items-center justify-center text-white w-full bg-orange-400 text-xs p-2">
                <p className="flex items-center gap-3">
                    <svg className='w-5 h-5' xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="1" y="3" width="13" height="13"></rect>
                        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                        <circle cx="5.5" cy="18.5" r="2.5"></circle>
                        <circle cx="18.5" cy="18.5" r="2.5"></circle>
                    </svg>
                    Miễn phí vận chuyển cho đơn hàng trên 2.000.000đ | Đổi trả trong 30 ngày
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
                    <Link to='/home' className={isHome ? 'text-orange-400 p-3' : 'p-3'}>Trang chủ </Link>
                    <Link to='/products' className={isProduct ? 'text-orange-400 p-3' : 'p-3'}>Sản phẩm</Link>
                </div>

                <div className='flex relative items-center gap-4'>
                    <Link to="/cart" className='hover:text-orange-500'>
                        <svg xmlns="http://www.w3.org/2000/svg" className='w-5 h-5' width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M0 1.5A.5.5 0 0 1 .5 1H2a.5.5 0 0 1 .485.379L2.89 3H14.5a.5.5 0 0 1 .491.592l-1.5 8A.5.5 0 0 1 13 12H4a.5.5 0 0 1-.491-.408L2.01 3.607 1.61 2H.5a.5.5 0 0 1-.5-.5zM3.102 4l1.313 7h8.17l1.313-7H3.102zM5 12a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm7 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-7 1a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm7 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
                        </svg>                
                    </Link>

                    {!authState.isLoggedIn ? (
                        <div className='flex items-center gap-2'>
                            <Link
                                to='/login'
                                className='px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-xl hover:border-orange-400 hover:text-orange-500 transition'
                            >
                                Đăng nhập
                            </Link>
                            <Link
                                to='/register'
                                className='px-4 py-2 text-sm font-medium text-white bg-orange-400 rounded-xl hover:bg-orange-500 transition'
                            >
                                Đăng ký
                            </Link>
                        </div>
                    ) : (
                        <>
                            <button onClick={handleDropDownMenu} className='flex items-center gap-2 cursor-pointer'>
                                <div className='font-bold text-orange-400 flex items-center justify-center w-8 h-8 rounded-full bg-orange-100'>
                                    {avatarLetter}
                                </div>

                                <p>{displayName}</p>

                                <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M7 10l5 5 5-5z" fill="currentColor"/>
                                </svg>
                            </button>

                            {isOpen && (
                                <div className="absolute right-0 mt-60 w-48 bg-white border border-gray-300 rounded-xl z-50">
                                    <div className="grid grid-cols-1 p-3">
                                        <Link className='hover:bg-gray-100 p-2 rounded-xl flex gap-2 items-center' to='/profile'>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                                                <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6m2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0m4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4m-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10s-3.516.68-4.168 1.332c-.678.678-.83 1.418-.832 1.664z"/>
                                            </svg>
                                            <p>Hồ sơ</p>
                                        </Link>
                                        <Link to='/order' className='hover:bg-gray-100 p-2 rounded-xl mt-4 flex gap-2 items-center'>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                                <polyline points="14 2 14 8 20 8"></polyline>
                                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                                <line x1="16" y1="17" x2="8" y2="17"></line>
                                                <polyline points="10 9 9 9 8 9"></polyline>
                                            </svg>
                                            <p>Đơn hàng</p>
                                        </Link>

                                        <button onClick={handleLogout} className='hover:bg-red-200 p-2 rounded-xl text-red-400 mt-4 flex gap-2 items-center cursor-pointer'>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                                <polyline points="16 17 21 12 16 7"></polyline>
                                                <line x1="21" y1="12" x2="9" y2="12"></line>
                                            </svg>
                                            <p>Đăng xuất</p>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                </div>
            </div>
        </div>
    );
}

export default NavBar;
