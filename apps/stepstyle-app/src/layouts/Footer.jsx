function Footer(){
    return(
        <footer className='bg-slate-900'>
            <div className='max-w-7xl mx-auto px-5 sm:px-8 py-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 text-white gap-8'>
                <div className='col-span-1 flex items-start lg:justify-center'>
                    <div>
                        <div className='flex items-center gap-3'>
                            {/* Logo */}
                            <div className="flex items-center justify-center rounded-xl bg-orange-400 w-10 h-10 shrink-0">
                                <p className="text-white text-2xl font-bold">S</p>
                            </div>
                            {/* Project name */}
                            <p className="text-white text-2xl sm:text-3xl font-bold">Step<span className="text-orange-400">Style</span></p>
                        </div>

                        <p className='mt-4 text-xs text-slate-300 leading-relaxed'>Thương hiệu giày dép hàng đầu Việt Nam<br/> với hơn 10 năm kinh nghiệm.</p>
                    </div>
                </div>

                <div className='col-span-1 flex items-start lg:justify-center'>
                    <div>
                        <p className='font-bold text-base'>Sản phẩm</p>
                        <div className='mt-3 space-y-1.5 text-sm text-slate-300'>
                            <p>Sneaker</p>
                            <p>Boots</p>
                            <p>Sandals</p>
                        </div>
                    </div>
                </div>

                <div className='col-span-1 flex items-start lg:justify-center'>
                    <div>
                        <p className='font-bold text-base'>Hỗ trợ</p>
                        <div className='mt-3 space-y-1.5 text-sm text-slate-300'>
                            <p>Chính sách đổi trả</p>
                            <p>Hướng dẫn chọn size</p>
                            <p>Liên hệ</p>
                        </div>
                    </div>
                </div>

                <div className='col-span-1 flex items-start lg:justify-center'>
                    <div>
                        <p className='font-bold text-base'>Liên hệ</p>
                        <div className='mt-3 space-y-1.5 text-sm text-slate-300'>
                            <p>123 Lê Lợi, Q1, TP.HCM</p>
                            <p>1800-STEPSTYLE</p>
                            <p>hello@stepstyle.vn</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className='border-t border-gray-700 px-4 py-5 flex items-center justify-center text-center text-gray-400 text-xs'>
                © 2025 StepStyle. Tất cả quyền được bảo lưu.
            </div>
        </footer>
    );
}

export default Footer;
