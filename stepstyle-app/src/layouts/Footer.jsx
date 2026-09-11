function Footer(){
    return(
        <div className='bg-slate-900'>
            <div className='p-5 pt-10 pb-10 grid grid-cols-4 text-white gap-3'>
                <div className='col-span-1 flex items-center justify-center'>
                    <div>     
                        <div className='flex gap-3'>
                            {/* Logo */}
                            <div className="flex items-center justify-center rounded-xl bg-orange-400 w-10 h-10">
                                <p className="text-white text-2xl font-bold">S</p>
                            </div>
                            {/* Project name */}
                            <p className="text-white text-3xl font-bold">Step<span className="text-orange-400">Style</span></p>
                        </div>

                        <p className='mt-4 text-xs'>Thương hiệu giày dép hàng đầu Việt Nam<br/> với hơn 10 năm kinh nghiệm.</p>
                    </div>

                </div>

                <div className='col-span-1 flex items-center justify-center'>
                    <div>
                        <p>Sản phẩm</p>
                        <p className='mt-4'>Sneaker</p>
                        <p>Boots</p>
                        <p>Sandals</p>
                    </div>
                </div>

                <div className='col-span-1 flex items-center justify-center'>
                    <div>
                        <p>Hỗ trợ</p>
                        <p className='mt-4'>Chính sách đổi trả</p>
                        <p>Hướng dẫn chọn size</p>
                        <p>Liên hệ</p>
                    </div>
                </div>

                <div className='col-span-1 flex items-center justify-center'>
                    <div>
                        <p>Liên hệ</p>
                        <p className='mt-4'>123 Lê Lợi, Q1, TP.HCM</p>
                        <p>1800-STEPSTYLE</p>
                        <p>hello@stepstyle.vn</p>
                    </div>
                </div>
            </div>

            <div className='border-t border-gray-700 p-5 flex items-center justify-center text-gray-500 text-xs'>
                © 2025 StepStyle. Tất cả quyền được bảo lưu.
            </div>
        </div>
    );
}

export default Footer;