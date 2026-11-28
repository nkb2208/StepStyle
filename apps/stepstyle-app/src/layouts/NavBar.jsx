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
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [authState, setAuthState] = useState(readAuthState);

    useEffect(() => {
        setAuthState(readAuthState());
        setIsOpen(false);
        setMobileMenuOpen(false);
    }, [location.pathname]);

    const handleDropDownMenu = ()=>{
        setIsOpen((prev) => !prev);
    }

    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
                setMobileMenuOpen(false);
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
        setMobileMenuOpen(false);
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
        <header ref={dropdownRef} className='border-b border-gray-300 bg-white sticky top-0 z-40'>
            <div className="flex items-center justify-center text-white w-full bg-orange-400 text-[11px] sm:text-xs px-3 py-2 text-center">
                <p className="flex items-center justify-center gap-2 leading-snug">
                    <svg className='w-4 h-4 sm:w-5 sm:h-5 shrink-0' xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="1" y="3" width="13" height="13"></rect>
                        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                        <circle cx="5.5" cy="18.5" r="2.5"></circle>
                        <circle cx="18.5" cy="18.5" r="2.5"></circle>
                    </svg>
                    <span>Miễn phí vận chuyển cho đơn hàng trên 2.000.000đ | Đổi trả trong 30 ngày</span>
                </p>
            </div>

            <div className="flex items-center justify-between px-3 sm:px-6 py-3 gap-2">
                <Link to='/home' className="flex items-center gap-2 sm:gap-3 shrink-0">
                    {/* Logo */}
                    <div className="flex items-center justify-center rounded-xl bg-orange-400 w-9 h-9 sm:w-10 sm:h-10">
                        <p className="text-white text-xl sm:text-2xl font-bold">S</p>
                    </div>
                    {/* Project name */}
                    <p className="text-2xl sm:text-3xl font-bold tracking-tight">Step<span className="text-orange-400">Style</span></p>
                </Link>

                {/* Desktop Navigation */}
                <nav className='hidden md:flex gap-3 font-bold'>
                    <Link to='/home' className={isHome ? 'text-orange-400 px-3 py-2' : 'px-3 py-2 hover:text-orange-400 transition'}>Trang chủ</Link>
                    <Link to='/products' className={isProduct ? 'text-orange-400 px-3 py-2' : 'px-3 py-2 hover:text-orange-400 transition'}>Sản phẩm</Link>
                </nav>

                <div className='flex relative items-center gap-2 sm:gap-4'>
                    <Link to="/cart" aria-label="Giỏ hàng" className='p-2 rounded-lg hover:bg-gray-100 hover:text-orange-500 transition'>
                        <svg xmlns="http://www.w3.org/2000/svg" className='w-5 h-5' width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M0 1.5A.5.5 0 0 1 .5 1H2a.5.5 0 0 1 .485.379L2.89 3H14.5a.5.5 0 0 1 .491.592l-1.5 8A.5.5 0 0 1 13 12H4a.5.5 0 0 1-.491-.408L2.01 3.607 1.61 2H.5a.5.5 0 0 1-.5-.5zM3.102 4l1.313 7h8.17l1.313-7H3.102zM5 12a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm7 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-7 1a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm7 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
                        </svg>
                    </Link>

                    {/* Desktop Auth / User Dropdown */}
                    {!authState.isLoggedIn ? (
                        <div className='hidden md:flex items-center gap-2'>
                            <Link
                                to='/login'
                                className='px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-xl hover:border-orange-400 hover:text-orange-500 transition whitespace-nowrap'
                            >
                                Đăng nhập
                            </Link>
                            <Link
                                to='/register'
                                className='px-4 py-2 text-sm font-medium text-white bg-orange-400 rounded-xl hover:bg-orange-500 transition whitespace-nowrap'
                            >
                                Đăng ký
                            </Link>
                        </div>
                    ) : (
                        <div className='hidden md:block relative'>
                            <button onClick={handleDropDownMenu} className='flex items-center gap-2 cursor-pointer py-1 px-1.5 rounded-xl hover:bg-gray-50'>
                                <div className='font-bold text-orange-400 flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 shrink-0'>
                                    {avatarLetter}
                                </div>

                                <p className='max-w-[140px] truncate text-sm font-medium'>{displayName}</p>

                                <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M7 10l5 5 5-5z" fill="currentColor"/>
                                </svg>
                            </button>

                            {isOpen && (
                                <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-50">
                                    <div className="grid grid-cols-1 p-2 gap-1">
                                        <Link className='hover:bg-gray-100 p-2.5 rounded-xl flex gap-2.5 items-center text-sm' to='/profile'>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                                                <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6m2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0m4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4m-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10s-3.516.68-4.168 1.332c-.678.678-.83 1.418-.832 1.664z"/>
                                            </svg>
                                            <p>Hồ sơ</p>
                                        </Link>
                                        <Link to='/order' className='hover:bg-gray-100 p-2.5 rounded-xl flex gap-2.5 items-center text-sm'>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                                <polyline points="14 2 14 8 20 8"></polyline>
                                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                                <line x1="16" y1="17" x2="8" y2="17"></line>
                                                <polyline points="10 9 9 9 8 9"></polyline>
                                            </svg>
                                            <p>Đơn hàng</p>
                                        </Link>

                                        <button onClick={handleLogout} className='hover:bg-red-50 p-2.5 rounded-xl text-red-500 flex gap-2.5 items-center text-sm cursor-pointer text-left'>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                                <polyline points="16 17 21 12 16 7"></polyline>
                                                <line x1="21" y1="12" x2="9" y2="12"></line>
                                            </svg>
                                            <p>Đăng xuất</p>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Mobile Hamburger Button */}
                    <button
                        type="button"
                        onClick={() => setMobileMenuOpen((prev) => !prev)}
                        aria-label="Mở menu điều hướng"
                        aria-expanded={mobileMenuOpen}
                        className="md:hidden p-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-100 cursor-pointer"
                    >
                        {mobileMenuOpen ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={() => setMobileMenuOpen((prev) => !prev)}
                        aria-label="Mở menu điều hướng"
                        aria-expanded={mobileMenuOpen}
                        className="md:hidden p-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-100 cursor-pointer"
                    >
                        {mobileMenuOpen ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        )}
                    </button>
                </div>
            </div>

            {/* Mobile Drawer Menu */}
            {mobileMenuOpen && (
                <div className="md:hidden border-t border-gray-200 bg-white px-4 py-3 space-y-3 shadow-md">
                    <nav className="flex flex-col gap-1 font-semibold">
                        <Link
                            to='/home'
                            className={`px-3 py-2.5 rounded-xl text-sm ${isHome ? 'bg-orange-50 text-orange-500' : 'text-gray-700 hover:bg-gray-50'}`}
                        >
                            Trang chủ
                        </Link>
                        <Link
                            to='/products'
                            className={`px-3 py-2.5 rounded-xl text-sm ${isProduct ? 'bg-orange-50 text-orange-500' : 'text-gray-700 hover:bg-gray-50'}`}
                        >
                            Sản phẩm
                        </Link>
                        <Link
                            to='/cart'
                            className={`px-3 py-2.5 rounded-xl text-sm ${currentPath === '/cart' ? 'bg-orange-50 text-orange-500' : 'text-gray-700 hover:bg-gray-50'}`}
                        >
                            Giỏ hàng
                        </Link>
                    </nav>

                    <div className="border-t border-gray-100 pt-3">
                        {!authState.isLoggedIn ? (
                            <div className="grid grid-cols-2 gap-2">
                                <Link
                                    to='/login'
                                    className='py-2.5 text-center text-sm font-semibold text-gray-700 border border-gray-300 rounded-xl hover:border-orange-400 hover:text-orange-500 transition'
                                >
                                    Đăng nhập
                                </Link>
                                <Link
                                    to='/register'
                                    className='py-2.5 text-center text-sm font-semibold text-white bg-orange-400 rounded-xl hover:bg-orange-500 transition'
                                >
                                    Đăng ký
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                <div className="flex items-center gap-2.5 px-3 py-2 bg-gray-50 rounded-xl mb-2">
                                    <div className='font-bold text-orange-500 flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 shrink-0'>
                                        {avatarLetter}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-gray-900 truncate">{displayName}</p>
                                        {authState.user?.email && (
                                            <p className="text-xs text-gray-500 truncate">{authState.user.email}</p>
                                        )}
                                    </div>
                                </div>
                                <Link to='/profile' className='block px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50'>
                                    Hồ sơ của tôi
                                </Link>
                                <Link to='/order' className='block px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50'>
                                    Đơn hàng của tôi
                                </Link>
                                <button
                                    type="button"
                                    onClick={handleLogout}
                                    className='w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 cursor-pointer'
                                >
                                    Đăng xuất
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </header>
    );
}

export default NavBar;
